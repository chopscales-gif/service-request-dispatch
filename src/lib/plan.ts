import { SHIFT_END, SHIFT_START } from "./clock";
import type { JobType, Urgency } from "./crew";
import { SHOP, along, drive, type Point } from "./town";

/**
 * The day's plan. What is stored is only the order of each technician's jobs
 * and what has actually happened (left, arrived, finished). Every time on the
 * screen is worked out from that by `project`, so the board is never out of
 * step with itself: change the order, or let a job run long, and every later
 * arrival moves with it.
 */

export type JobStatus =
  | "new" // waiting in the inbox for a dispatcher
  | "hold" // a safety hold: not to be booked
  | "scheduled"
  | "en_route"
  | "on_site"
  | "done"
  | "tomorrow" // offered a visit tomorrow instead
  | "referred" // sent to the gas company or 911
  | "cancelled";

/** The part of a job the planning rules need. */
export type PlanJob = Point & {
  id: string;
  type: JobType;
  urgency: Urgency;
  /** The arrival window the customer was given, in minutes since midnight. */
  windowStart: number;
  windowEnd: number;
  /** Minutes the job is expected to take, and minutes added since because it ran long. */
  est: number;
  extra: number;
  status: JobStatus;
  techId: string | null;
  /** Position in the technician's day. */
  seq: number;
  departAt: number | null;
  arriveAt: number | null;
  doneAt: number | null;
};

/** When one job happens. Actual times where they exist, estimates after that. */
export type Slot = {
  id: string;
  techId: string;
  depart: number;
  arrive: number;
  end: number;
  /** Minutes of driving to get there. */
  drive: number;
  /** Where the van comes from. */
  from: Point;
  /** Minutes after the end of the customer's window that the technician arrives. 0 when on time. */
  late: number;
};

const ON_BOARD: JobStatus[] = ["scheduled", "en_route", "on_site", "done"];
export const onBoard = (job: PlanJob): job is PlanJob & { techId: string } => job.techId !== null && ON_BOARD.includes(job.status);

/** A technician's jobs in the order they do them. */
export function dayOf(jobs: PlanJob[], techId: string): PlanJob[] {
  return jobs.filter((job) => onBoard(job) && job.techId === techId).sort((a, b) => a.seq - b.seq);
}

/** Works out one technician's day from where they are now. */
export function projectTech(day: PlanJob[], now: number): Slot[] {
  let at: Point = SHOP;
  let free = SHIFT_START;
  return day.map((job) => {
    const from = at;
    const minutes = drive(from, job);
    const length = job.est + job.extra;
    let depart: number;
    let arrive: number;
    let end: number;
    if (job.status === "done") {
      arrive = job.arriveAt ?? free + minutes;
      depart = job.departAt ?? arrive - minutes;
      end = job.doneAt ?? arrive + length;
    } else if (job.status === "on_site") {
      arrive = job.arriveAt ?? now;
      depart = job.departAt ?? arrive - minutes;
      // A job past its estimate with nobody saying how much longer is taken to be finishing now.
      end = Math.max(arrive + length, now);
    } else if (job.status === "en_route") {
      depart = job.departAt ?? now;
      arrive = Math.max(depart + minutes, now);
      end = arrive + length;
    } else {
      // Leave when free, but do not turn up before the window the customer was given.
      depart = Math.max(free, now, job.windowStart - minutes);
      arrive = depart + minutes;
      end = arrive + length;
    }
    at = job;
    free = end;
    return { id: job.id, techId: job.techId!, depart, arrive, end, drive: minutes, from, late: Math.max(0, arrive - job.windowEnd) };
  });
}

export type Projection = {
  slots: Record<string, Slot>;
  /** Per technician: when their last job ends, and minutes of that past the end of the shift. */
  techs: Record<string, { end: number; overtime: number; drive: number }>;
};

export function project(jobs: PlanJob[], techIds: string[], now: number): Projection {
  const slots: Record<string, Slot> = {};
  const techs: Projection["techs"] = {};
  for (const techId of techIds) {
    const day = projectTech(dayOf(jobs, techId), now);
    for (const slot of day) slots[slot.id] = slot;
    const end = day.at(-1)?.end ?? SHIFT_START;
    techs[techId] = { end, overtime: Math.max(0, end - SHIFT_END), drive: day.reduce((sum, slot) => sum + slot.drive, 0) };
  }
  return { slots, techs };
}

/** Jobs nobody has arrived at yet. These are the ones a change of plan can still help. */
export const stillToCome = (job: PlanJob) => job.status === "scheduled" || job.status === "en_route";

/** Only a job nobody has set off for can be moved. */
export const movable = (job: PlanJob) => job.status === "scheduled";

/**
 * The plan with one job put into a technician's day at `index` among the jobs
 * they have not set off for (0 is next). Everyone's `seq` is renumbered.
 */
export function place(jobs: PlanJob[], jobId: string, techId: string, index: number): PlanJob[] {
  const moved = jobs.find((job) => job.id === jobId)!;
  const others = jobs.filter((job) => job.id !== jobId);
  const day = dayOf(others, techId);
  const started = day.filter((job) => !movable(job));
  const waiting = day.filter(movable);
  const order = [...started, ...waiting.slice(0, index), { ...moved, techId, status: "scheduled" as const }, ...waiting.slice(index)];
  const seq = new Map(order.map((job, position) => [job.id, position]));
  const result = others.map((job) => (seq.has(job.id) ? { ...job, seq: seq.get(job.id)! } : job));
  result.push({ ...moved, techId, status: "scheduled", seq: seq.get(jobId)!, departAt: null, arriveAt: null, doneAt: null });
  // Close the gap the job left in its old technician's day.
  if (moved.techId && moved.techId !== techId) {
    dayOf(result, moved.techId).forEach((job, position) => {
      result[result.indexOf(job)] = { ...job, seq: position };
    });
  }
  return result;
}

/** How many places a job could go in a technician's day. */
export const openings = (jobs: PlanJob[], jobId: string, techId: string) => dayOf(jobs, techId).filter((job) => movable(job) && job.id !== jobId).length + 1;

/**
 * What changes when the clock moves on with nobody touching anything: the
 * crew carries on with the plan. Returns the jobs whose state changed.
 */
export type Step = { id: string; status: JobStatus; departAt: number | null; arriveAt: number | null; doneAt: number | null; happened: ("left" | "arrived" | "finished")[] };

export function carryOn(jobs: PlanJob[], techIds: string[], from: number, to: number): Step[] {
  const { slots } = project(jobs, techIds, from);
  const steps: Step[] = [];
  for (const job of jobs) {
    if (!onBoard(job) || job.status === "done") continue;
    const slot = slots[job.id];
    const step: Step = { id: job.id, status: job.status, departAt: job.departAt, arriveAt: job.arriveAt, doneAt: job.doneAt, happened: [] };
    if (step.status === "scheduled" && slot.depart <= to) {
      step.status = "en_route";
      step.departAt = slot.depart;
      step.happened.push("left");
    }
    if (step.status === "en_route" && slot.arrive <= to) {
      step.status = "on_site";
      step.arriveAt = slot.arrive;
      step.happened.push("arrived");
    }
    if (step.status === "on_site" && slot.end <= to) {
      step.status = "done";
      step.doneAt = slot.end;
      step.happened.push("finished");
    }
    if (step.happened.length) steps.push(step);
  }
  return steps;
}

/** Where a technician's van is now: at the job they are on, part of the way to the one they are driving to, or wherever they last finished. */
export function vanAt(day: PlanJob[], slots: Record<string, Slot>, now: number): Point {
  let at: Point = SHOP;
  for (const job of day) {
    if (job.status === "done" || job.status === "on_site") {
      at = { x: job.x, y: job.y };
    } else if (job.status === "en_route") {
      const { depart, arrive, from } = slots[job.id];
      return along(from, job, arrive > depart ? (now - depart) / (arrive - depart) : 1);
    } else break;
  }
  return at;
}
