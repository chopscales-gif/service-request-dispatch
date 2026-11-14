import { SHIFT_END } from "./clock";
import { JOB_TYPES, type JobType, type Tech, type Urgency } from "./crew";
import type { PlanJob } from "./plan";
import { suggest } from "./suggest";
import { AREAS, GRID, type AreaKey, type Point } from "./town";

/** What a customer can pick on the request form. A smell of gas is deliberately not a job type. */
export const PROBLEMS = {
  leak: { label: "Water is leaking from a pipe, ceiling or wall", type: "leak" },
  toilet: { label: "A toilet or tap needs fixing", type: "fixture" },
  drain: { label: "A sink, tub or shower will not drain", type: "drain" },
  hot_water: { label: "No hot water, or a problem with the water heater", type: "water_heater" },
  sewer: { label: "Several drains are backing up at once", type: "sewer" },
} as const satisfies Record<string, { label: string; type: JobType }>;

export type ProblemKey = keyof typeof PROBLEMS;
export const PROBLEM_KEYS = Object.keys(PROBLEMS) as [ProblemKey, ...ProblemKey[]];

/** How long an emergency caller should have to wait, at most. */
export const EMERGENCY_MINUTES = 90;

/** Where in an area a visitor's request lands: a little off the middle, so two requests do not sit on the same spot. */
export function spot(areaKey: AreaKey, own: number): Point {
  const area = AREAS.find((candidate) => candidate.key === areaKey)!;
  return { x: Math.min(GRID.width - 1, Math.max(1, area.x + ((own * 2) % 3) - 1)), y: Math.min(GRID.height - 1, Math.max(1, area.y + (own % 2))) };
}

/** A visitor's request as the planning rules see it, before it is booked. */
export function draftJob(id: string, problem: ProblemKey, urgency: Urgency, area: AreaKey, own: number, now: number): PlanJob {
  const type = PROBLEMS[problem].type;
  return { id, ...spot(area, own), type, urgency, windowStart: now, windowEnd: urgency === "emergency" ? now + EMERGENCY_MINUTES : SHIFT_END, est: JOB_TYPES[type].minutes, extra: 0, status: "new", techId: null, seq: 0, departAt: null, arriveAt: null, doneAt: null };
}

export type Offer = { start: number; end: number; techId: string; index: number };

const WINDOW = 120;

/**
 * The arrival windows that can honestly be offered for a new job: two-hour
 * windows, starting on the hour, in which someone with the right skills can
 * arrive without making any other customer late or working past the end of
 * the shift. The form and the server both call this, so a window is only
 * shown if it would be accepted.
 */
export function windowsFor(jobs: PlanJob[], techs: Tech[], draft: PlanJob, now: number): Offer[] {
  const offers: Offer[] = [];
  for (let start = Math.ceil(now / 60) * 60; start + WINDOW <= SHIFT_END; start += 60) {
    const trial = { ...draft, status: "new" as const, techId: null, windowStart: start, windowEnd: start + WINDOW };
    const [best] = suggest([...jobs.filter((job) => job.id !== draft.id), trial], techs, draft.id, now);
    if (best?.ok && best.late === 0 && best.knocks.length === 0 && best.overtime === 0) offers.push({ start, end: start + WINDOW, techId: best.techId, index: best.index });
  }
  return offers;
}
