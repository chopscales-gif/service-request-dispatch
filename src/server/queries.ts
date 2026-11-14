import { and, asc, desc, eq } from "drizzle-orm";
import { events, texts, type Job } from "@/db/schema";
import { TECHS } from "@/lib/crew";
import { project, type PlanJob, type Projection, type Slot } from "@/lib/plan";
import { MESSAGE_BY_KEY, READING_BY_KEY, type Message, type Reading } from "@/lib/reading";
import { reshuffle, suggest, type Option, type Reshuffle } from "@/lib/suggest";
import { WorkflowError, loadJobs, loadNow, needsTelling, toPlan, type Ctx } from "./workflow";

/** What each screen reads. Nothing here changes anything. */

const TECH_IDS = TECHS.map((tech) => tech.id);

export type InboxItem = {
  job: Job;
  message: Message | null;
  reading: Reading | null;
  /** Who the rules would send, best first. Empty while the job is on hold or its type is not known. */
  options: Option[];
};

export type Board = {
  now: number;
  jobs: Job[];
  plan: PlanJob[];
  projection: Projection;
  inbox: InboxItem[];
  /** Set when someone is running late and either a reshuffle helps or a customer has not been told. */
  proposal: Reshuffle | null;
  /** Running late, already told, and nothing more to do about it. */
  lateAndTold: number;
};

const URGENCY_ORDER = { emergency: 0, today: 1, flexible: 2 };

function inboxItem(job: Job, plan: PlanJob[], now: number): InboxItem {
  return {
    job,
    message: job.messageKey ? MESSAGE_BY_KEY[job.messageKey] : null,
    reading: job.messageKey ? READING_BY_KEY[job.messageKey] : null,
    options: job.type && (job.status === "new" || job.status === "scheduled") ? suggest(plan, TECHS, job.id, now) : [],
  };
}

export async function board(ctx: Ctx): Promise<Board> {
  const [now, jobs] = await Promise.all([loadNow(ctx), loadJobs(ctx)]);
  const plan = toPlan(jobs);
  const projection = project(plan, TECH_IDS, now);
  const byId = new Map(jobs.map((job) => [job.id, job]));

  const inbox = jobs
    .filter((job) => job.status === "new" || job.status === "hold")
    .sort((a, b) => Number(b.status === "hold") - Number(a.status === "hold") || URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] || a.receivedAt - b.receivedAt)
    .map((job) => inboxItem(job, plan, now));

  const repair = reshuffle(plan, TECHS, now);
  const untold = repair?.stillLate.filter((knock) => needsTelling(byId.get(knock.id)!, projection.slots[knock.id].arrive)) ?? [];
  const proposal = repair && (repair.changes.length > 0 || untold.length > 0) ? repair : null;
  return { now, jobs, plan, projection, inbox, proposal, lateAndTold: repair && !proposal ? repair.stillLate.length : 0 };
}

export type JobDetail = InboxItem & {
  now: number;
  slot: Slot | null;
  history: { id: number; at: number; text: string }[];
  texts: { id: number; at: number; body: string }[];
};

export async function jobDetail(ctx: Ctx, id: string): Promise<JobDetail | null> {
  const [now, jobs] = await Promise.all([loadNow(ctx), loadJobs(ctx)]);
  const job = jobs.find((row) => row.id === id);
  if (!job) return null;
  const plan = toPlan(jobs);
  const [history, sent] = await Promise.all([
    ctx.db.select({ id: events.id, at: events.at, text: events.text }).from(events).where(and(eq(events.sandboxId, ctx.sandboxId), eq(events.jobId, id))).orderBy(asc(events.at), asc(events.id)),
    ctx.db.select({ id: texts.id, at: texts.at, body: texts.body }).from(texts).where(and(eq(texts.sandboxId, ctx.sandboxId), eq(texts.jobId, id))).orderBy(asc(texts.at), asc(texts.id)),
  ]);
  return { ...inboxItem(job, plan, now), now, slot: project(plan, TECH_IDS, now).slots[id] ?? null, history, texts: sent };
}

/** Every text in the outbox, newest first, with who it is to. */
export async function outbox(ctx: Ctx) {
  const [now, jobs, sent] = await Promise.all([
    loadNow(ctx),
    loadJobs(ctx),
    ctx.db.select().from(texts).where(eq(texts.sandboxId, ctx.sandboxId)).orderBy(desc(texts.at), desc(texts.id)),
  ]);
  const byId = new Map(jobs.map((job) => [job.id, job]));
  return { now, texts: sent.map((text) => ({ ...text, job: byId.get(text.jobId)! })) };
}

export { WorkflowError };
