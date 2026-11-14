import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { events, jobs, sandboxes, texts, type Job } from "@/db/schema";
import { MESSAGE_EVENT, inboxRow } from "@/db/seed";
import { LAST_NOW, STEP, fmtDuration, fmtTime, fmtWindow } from "@/lib/clock";
import { JOB_TYPES, TECHS, TECH_BY_ID, canDo, type JobType, type Urgency } from "@/lib/crew";
import { INBOUND, OVERRUN, STREETS } from "@/lib/day";
import { carryOn, dayOf, place, project, type JobStatus, type PlanJob } from "@/lib/plan";
import { reshuffle, suggest } from "@/lib/suggest";
import { TEXTS } from "@/lib/texts";
import type { AreaKey } from "@/lib/town";
import { PROBLEMS, draftJob, windowsFor, type ProblemKey } from "@/lib/windows";

/**
 * Everything that changes the day: booking, moving and cancelling jobs, what
 * technicians report from site, the clock moving on, and accepting a
 * reshuffle. Every function works inside one visitor's sandbox and refuses,
 * with a reason a person can act on, anything the rules do not allow.
 */

export type Ctx = { db: Db; sandboxId: string };

/** A refusal the screen can show as it is. */
export class WorkflowError extends Error {}

const TECH_IDS = TECHS.map((tech) => tech.id);
/** The most requests a visitor can add themselves, which bounds the size of a sandbox. */
export const MAX_OWN_REQUESTS = 6;

export async function loadNow(ctx: Ctx): Promise<number> {
  const [row] = await ctx.db.select({ now: sandboxes.now }).from(sandboxes).where(eq(sandboxes.id, ctx.sandboxId));
  if (!row) throw new WorkflowError("Your copy of the demo has gone. Reload the page to start a new one.");
  return row.now;
}

export const loadJobs = (ctx: Ctx): Promise<Job[]> => ctx.db.select().from(jobs).where(eq(jobs.sandboxId, ctx.sandboxId));

/** The jobs the planning rules can work with: everything whose kind of work is known. */
export const toPlan = (rows: Job[]): PlanJob[] => rows.filter((row): row is Job & { type: JobType } => row.type !== null);

async function load(ctx: Ctx) {
  const [now, rows] = await Promise.all([loadNow(ctx), loadJobs(ctx)]);
  return { now, rows };
}

function find(rows: Job[], id: string): Job {
  const job = rows.find((row) => row.id === id);
  if (!job) throw new WorkflowError("That job is not on the board. It may have gone when the demo was reset.");
  return job;
}

const first = (techId: string | null) => TECH_BY_ID[techId ?? ""]?.first ?? "A technician";
const update = (ctx: Ctx, id: string, values: Partial<Job>) => ctx.db.update(jobs).set(values).where(and(eq(jobs.sandboxId, ctx.sandboxId), eq(jobs.id, id)));
const log = (ctx: Ctx, jobId: string, at: number, text: string) => ctx.db.insert(events).values({ sandboxId: ctx.sandboxId, jobId, at, text });
const send = (ctx: Ctx, jobId: string, at: number, body: string) => ctx.db.insert(texts).values({ sandboxId: ctx.sandboxId, jobId, at, body });

/** Writes back the order of every job a new plan moved. */
async function savePlan(ctx: Ctx, rows: Job[], plan: PlanJob[]): Promise<void> {
  const before = new Map(rows.map((row) => [row.id, row]));
  for (const job of plan) {
    const was = before.get(job.id)!;
    if (was.techId !== job.techId || was.seq !== job.seq || was.status !== job.status) await update(ctx, job.id, { techId: job.techId, seq: job.seq, status: job.status });
  }
}

/** Why a job that is not waiting or booked cannot be changed. */
function closed(status: JobStatus): string {
  if (status === "hold") return "This request is on a safety hold and cannot be booked.";
  if (status === "cancelled") return "This job was cancelled.";
  if (status === "tomorrow") return "This customer has been offered tomorrow, so there is nothing to change today.";
  if (status === "referred") return "This request went to the gas company and is closed.";
  return "This job has already started, so it cannot be changed.";
}

/** The two-hour window a customer is promised around an expected arrival. */
function promise(arrive: number): { windowStart: number; windowEnd: number } {
  const windowStart = Math.floor(arrive / 30) * 30;
  return { windowStart, windowEnd: windowStart + 120 };
}

/**
 * Books a waiting request with a technician, or moves a booked job to another
 * one. The job goes where the rules say it fits best in that technician's day.
 * Which technician is the dispatcher's call, as long as they can do the work.
 */
export async function assign(ctx: Ctx, jobId: string, techId: string): Promise<void> {
  const { now, rows } = await load(ctx);
  const job = find(rows, jobId);
  const tech = TECH_BY_ID[techId];
  if (!tech) throw new WorkflowError("That technician is not on today's crew.");
  if (job.status !== "new" && job.status !== "scheduled") throw new WorkflowError(closed(job.status));
  if (!job.type) throw new WorkflowError("Say what kind of job this is first.");
  if (!canDo(tech, job.type)) throw new WorkflowError(`${tech.first} cannot take this one: ${JOB_TYPES[job.type].label.toLowerCase()} needs equipment or a certificate ${tech.first} does not have.`);
  if (job.status === "scheduled" && job.techId === techId) return;

  const plan = toPlan(rows);
  const option = suggest(plan, TECHS, jobId, now).find((candidate) => candidate.techId === techId);
  if (!option?.ok) throw new WorkflowError(`${tech.first} cannot take this one.`);
  await savePlan(ctx, rows, place(plan, jobId, techId, option.index));

  if (job.status === "new") {
    if (job.urgency === "emergency") {
      // The time they are given now is what "late" is measured against from here on.
      await update(ctx, jobId, { toldEta: option.arrive });
      await send(ctx, jobId, now, TEXTS.emergency(tech.first, option.arrive, option.index === 0));
    } else {
      const window = promise(option.arrive);
      await update(ctx, jobId, window);
      await send(ctx, jobId, now, TEXTS.booked(tech.first, window.windowStart, window.windowEnd));
    }
    await log(ctx, jobId, now, `Booked with ${tech.name}, expected about ${fmtTime(option.arrive)}.`);
  } else {
    const told = option.late > 0;
    await send(ctx, jobId, now, told || job.urgency === "emergency" ? TEXTS.newTechSooner(tech.first, first(job.techId), option.arrive) : TEXTS.newTech(tech.first, first(job.techId), job.windowStart, job.windowEnd));
    if (told) await update(ctx, jobId, { toldEta: option.arrive });
    await log(ctx, jobId, now, `Moved from ${first(job.techId)} to ${tech.first}, expected about ${fmtTime(option.arrive)}.`);
  }
}

/** Says what kind of job a request is, when the message did not make it plain. */
export async function setType(ctx: Ctx, jobId: string, type: JobType): Promise<void> {
  const { now, rows } = await load(ctx);
  const job = find(rows, jobId);
  if (job.status !== "new") throw new WorkflowError("Only a request still waiting in the inbox can be changed.");
  if (job.type) throw new WorkflowError("This request already says what kind of job it is.");
  await update(ctx, jobId, { type, est: JOB_TYPES[type].minutes });
  await log(ctx, jobId, now, `Dispatcher set the job type: ${JOB_TYPES[type].label.toLowerCase()}.`);
}

/** Offers a visit tomorrow in place of squeezing the job into today. */
export async function offerTomorrow(ctx: Ctx, jobId: string): Promise<void> {
  const { now, rows } = await load(ctx);
  const job = find(rows, jobId);
  if (job.status !== "new") throw new WorkflowError("Only a request still waiting in the inbox can be offered tomorrow.");
  if (job.urgency === "emergency") throw new WorkflowError("An emergency cannot wait until tomorrow.");
  await update(ctx, jobId, { status: "tomorrow" });
  await send(ctx, jobId, now, TEXTS.tomorrow());
  await log(ctx, jobId, now, "Offered a visit tomorrow morning.");
}

/** Closes a request held for a smell of gas: the customer is told to leave and call the gas company. It is never booked. */
export async function referGas(ctx: Ctx, jobId: string): Promise<void> {
  const { now, rows } = await load(ctx);
  const job = find(rows, jobId);
  if (job.status !== "hold") throw new WorkflowError("This request is not on a safety hold.");
  await update(ctx, jobId, { status: "referred" });
  await send(ctx, jobId, now, TEXTS.gas());
  await log(ctx, jobId, now, "Told to leave the house and call the gas company or 911. Not booked.");
}

export async function cancel(ctx: Ctx, jobId: string): Promise<void> {
  const { now, rows } = await load(ctx);
  const job = find(rows, jobId);
  if (job.status !== "new" && job.status !== "scheduled") throw new WorkflowError(closed(job.status));
  await update(ctx, jobId, { status: "cancelled" });
  if (job.status === "scheduled") await send(ctx, jobId, now, TEXTS.cancelled());
  await log(ctx, jobId, now, "Cancelled.");
}

/**
 * Accepts the proposed reshuffle. The proposal is worked out again here, and
 * is only applied if it is the one the dispatcher was looking at. Customers
 * who get a different technician, or who will still be kept waiting, each get
 * a text in the outbox.
 */
export async function acceptReshuffle(ctx: Ctx, signature: string): Promise<void> {
  const { now, rows } = await load(ctx);
  const proposal = reshuffle(toPlan(rows), TECHS, now);
  if (!proposal) throw new WorkflowError("Nobody is running late any more, so there is nothing to change.");
  if (proposal.signature !== signature) throw new WorkflowError("The board has changed since this was proposed. Look at the new proposal.");
  await savePlan(ctx, rows, proposal.plan);

  const after = project(proposal.plan, TECH_IDS, now);
  const late = new Map(proposal.stillLate.map((knock) => [knock.id, knock.late]));
  for (const change of proposal.changes) {
    const job = find(rows, change.id);
    if (change.fromTech === change.toTech || late.has(job.id)) continue;
    await send(ctx, job.id, now, job.urgency === "emergency" ? TEXTS.newTechSooner(first(change.toTech), first(change.fromTech), change.arriveAfter) : TEXTS.newTech(first(change.toTech), first(change.fromTech), job.windowStart, job.windowEnd));
    await log(ctx, job.id, now, `Reshuffle: moved from ${first(change.fromTech)} to ${first(change.toTech)}, expected about ${fmtTime(change.arriveAfter)}.`);
  }
  for (const [id] of late) {
    const job = find(rows, id);
    const slot = after.slots[id];
    if (!needsTelling(job, slot.arrive)) continue;
    await update(ctx, id, { toldEta: slot.arrive });
    await send(ctx, id, now, job.urgency === "emergency" ? TEXTS.lateEmergency(first(slot.techId), slot.arrive) : TEXTS.late(first(slot.techId), slot.arrive, job.windowStart, job.windowEnd));
    await log(ctx, id, now, `Customer told the new arrival time, about ${fmtTime(slot.arrive)}.`);
  }
}

/** A customer needs telling when they will be kept past their window and have not been given this time, or one near it. */
export const needsTelling = (job: Pick<Job, "toldEta">, arrive: number) => job.toldEta === null || arrive > job.toldEta + 10;

/** How long before a window opens a technician may turn up, and the shortest visit there is. Both in minutes. */
const EARLY = 30;
const SHORTEST_VISIT = 10;

/** The technician's next job, and only that one, is theirs to start. */
function mustBeNext(rows: Job[], job: Job) {
  const next = dayOf(toPlan(rows), job.techId ?? "").find((candidate) => candidate.status !== "done");
  if (next?.id !== job.id) throw new WorkflowError("There is an earlier job to finish first.");
}

export async function techDepart(ctx: Ctx, jobId: string): Promise<void> {
  const { now, rows } = await load(ctx);
  const job = find(rows, jobId);
  if (job.status !== "scheduled") throw new WorkflowError("This job is not waiting to be started.");
  mustBeNext(rows, job);
  const planned = project(toPlan(rows), TECH_IDS, now).slots[jobId];
  if (job.urgency !== "emergency" && now + planned.drive < job.windowStart - EARLY)
    throw new WorkflowError(`This customer is not expecting anyone until ${fmtTime(job.windowStart)}. Skip ahead in the bar at the top, then set off.`);
  await update(ctx, jobId, { status: "en_route", departAt: now });
  const arrive = project(toPlan(rows).map((row) => (row.id === jobId ? { ...row, status: "en_route" as const, departAt: now } : row)), TECH_IDS, now).slots[jobId].arrive;
  await send(ctx, jobId, now, TEXTS.onTheWay(first(job.techId), arrive));
  await log(ctx, jobId, now, `${first(job.techId)} set off.`);
}

export async function techArrive(ctx: Ctx, jobId: string): Promise<void> {
  const { now, rows } = await load(ctx);
  const job = find(rows, jobId);
  if (job.status !== "en_route") throw new WorkflowError("Tap On my way first.");
  // The demo clock moves in half hours, so a drive that has not finished yet is counted in full.
  const arriveAt = Math.max(now, project(toPlan(rows), TECH_IDS, now).slots[jobId].arrive);
  await update(ctx, jobId, { status: "on_site", arriveAt });
  await log(ctx, jobId, arriveAt, `${first(job.techId)} arrived.`);
}

export async function techDone(ctx: Ctx, jobId: string, note: string): Promise<void> {
  const { now, rows } = await load(ctx);
  const job = find(rows, jobId);
  if (job.status !== "on_site") throw new WorkflowError("This job has not been started.");
  if (now < (job.arriveAt ?? now) + SHORTEST_VISIT) throw new WorkflowError("You have only just arrived. Skip ahead in the bar at the top, then mark it done.");
  await update(ctx, jobId, { status: "done", doneAt: now, note: note.trim() || job.note });
  await send(ctx, jobId, now, TEXTS.done(first(job.techId)));
  await log(ctx, jobId, now, `${first(job.techId)} finished.`);
}

/** A technician on site says the job will take longer. Every later arrival moves with it. */
export async function techNeedsMore(ctx: Ctx, jobId: string, minutes: number): Promise<void> {
  const { now, rows } = await load(ctx);
  const job = find(rows, jobId);
  if (job.status !== "on_site") throw new WorkflowError("This job has not been started.");
  if (job.extra + minutes > 240) throw new WorkflowError("That is more extra time than one visit can take. Call the office.");
  // The extra time counts from now if the job is already past its estimate.
  const overdue = Math.max(0, now - ((job.arriveAt ?? now) + job.est + job.extra));
  await update(ctx, jobId, { extra: job.extra + overdue + minutes });
  await log(ctx, jobId, now, `${first(job.techId)} needs ${fmtDuration(minutes)} more.`);
}

/**
 * Moves the demo clock on half an hour. The crew carries on with the plan,
 * customers get their texts, and whatever the script has arriving in that
 * half hour arrives.
 */
export async function skipAhead(ctx: Ctx): Promise<number> {
  const { now, rows } = await load(ctx);
  if (now >= LAST_NOW) throw new WorkflowError(`The demo day ends at ${fmtTime(LAST_NOW)}. Reset the demo to start again.`);
  const to = now + STEP;

  // A job runs long: the technician reports it from site.
  let plan = toPlan(rows);
  const overrun = rows.find((row) => row.key === OVERRUN.key);
  if (now < OVERRUN.at && to >= OVERRUN.at && overrun && overrun.status === "on_site") {
    await update(ctx, overrun.id, { extra: overrun.extra + OVERRUN.minutes, note: OVERRUN.note });
    await log(ctx, overrun.id, OVERRUN.at, `${first(overrun.techId)} needs ${fmtDuration(OVERRUN.minutes)} more.`);
    plan = plan.map((job) => (job.id === overrun.id ? { ...job, extra: job.extra + OVERRUN.minutes } : job));
  }

  for (const step of carryOn(plan, TECH_IDS, now, to)) {
    const job = find(rows, step.id);
    await update(ctx, step.id, { status: step.status, departAt: step.departAt, arriveAt: step.arriveAt, doneAt: step.doneAt });
    const name = first(job.techId);
    if (step.happened.includes("left")) {
      const minutes = project(plan, TECH_IDS, now).slots[step.id];
      await send(ctx, step.id, step.departAt!, TEXTS.onTheWay(name, minutes.arrive));
      await log(ctx, step.id, step.departAt!, `${name} set off.`);
    }
    if (step.happened.includes("arrived")) await log(ctx, step.id, step.arriveAt!, `${name} arrived.`);
    if (step.happened.includes("finished")) {
      await send(ctx, step.id, step.doneAt!, TEXTS.done(name));
      await log(ctx, step.id, step.doneAt!, `${name} finished.`);
    }
  }

  const arrived = INBOUND.filter((inbound) => inbound.receivedAt > now && inbound.receivedAt <= to).map((inbound) => inboxRow(ctx.sandboxId, inbound));
  if (arrived.length) {
    await ctx.db.insert(jobs).values(arrived);
    await ctx.db.insert(events).values(arrived.map((job) => ({ sandboxId: ctx.sandboxId, jobId: job.id, at: job.receivedAt, text: MESSAGE_EVENT })));
  }

  await ctx.db.update(sandboxes).set({ now: to }).where(eq(sandboxes.id, ctx.sandboxId));
  return to;
}

export type Request = { problem: ProblemKey; urgency: Urgency; area: AreaKey; name: string; windowStart: number | null };

/**
 * A customer books for themselves. The form offers only windows the rules
 * say can be kept, and the choice is checked again here before it is booked.
 * Returns the new job's id.
 */
export async function requestService(ctx: Ctx, request: Request): Promise<string> {
  const { now, rows } = await load(ctx);
  const own = rows.filter((row) => row.source === "web");
  if (own.length >= MAX_OWN_REQUESTS) throw new WorkflowError(`The demo takes ${MAX_OWN_REQUESTS} requests of your own. Reset the demo to start again.`);

  const { label } = PROBLEMS[request.problem];
  const streets = STREETS[request.area];
  const id = crypto.randomUUID();
  const emergency = request.urgency === "emergency";
  const draft = {
    ...draftJob(id, request.problem, request.urgency, request.area, own.length, now),
    sandboxId: ctx.sandboxId,
    source: "web" as const,
    key: null,
    messageKey: null,
    receivedAt: now,
    customer: request.name,
    phone: "(555) 010-0199",
    street: `${101 + own.length * 14} ${streets[own.length % streets.length]}`,
    problem: `${label}. Booked online by the customer.`,
    status: "new" as const,
    toldEta: null,
    note: "",
  };
  const plan = toPlan(rows);

  if (emergency) {
    const [best] = suggest([...plan, draft], TECHS, id, now);
    if (!best?.ok) throw new WorkflowError("We could not find anyone to send. Call the office on (555) 010-0140.");
    await ctx.db.insert(jobs).values(draft);
    await savePlan(ctx, [...rows, draft], place([...plan, draft], id, best.techId, best.index));
    await update(ctx, id, { toldEta: best.arrive });
    await send(ctx, id, now, TEXTS.emergency(first(best.techId), best.arrive, best.index === 0));
    await log(ctx, id, now, `Emergency booked online. The rules sent ${first(best.techId)}, expected about ${fmtTime(best.arrive)}.`);
    return id;
  }

  const offered = windowsFor(plan, TECHS, draft, now);
  if (request.windowStart === null) {
    if (offered.length) throw new WorkflowError("Choose one of the times offered.");
    await ctx.db.insert(jobs).values({ ...draft, status: "tomorrow" });
    await send(ctx, id, now, TEXTS.tomorrow());
    await log(ctx, id, now, "Requested online. Today is full, so tomorrow morning was offered.");
    return id;
  }
  const window = offered.find((candidate) => candidate.start === request.windowStart);
  if (!window) throw new WorkflowError("That time has just gone. Choose another.");
  const booked = { ...draft, windowStart: window.start, windowEnd: window.end };
  await ctx.db.insert(jobs).values(booked);
  await savePlan(ctx, [...rows, booked], place([...plan, booked], id, window.techId, window.index));
  await send(ctx, id, now, TEXTS.booked(first(window.techId), window.start, window.end));
  await log(ctx, id, now, `Booked online for ${fmtWindow(window.start, window.end)}. The rules chose ${first(window.techId)}.`);
  return id;
}
