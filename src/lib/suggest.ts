import { fmtDuration, fmtTime } from "./clock";
import { JOB_TYPES, SKILL_HAS, SKILL_LACKS, canDo, type Tech } from "./crew";
import { movable, onBoard, openings, place, project, stillToCome, type PlanJob, type Projection } from "./plan";

/**
 * Who to send, and how to repair the day when it slips. These are written
 * rules, not AI: every plan gets a score from the same short list of things a
 * dispatcher weighs, and the lowest score wins. The weights are below, in one
 * place, so they can be argued with.
 */

const WEIGHTS = {
  /** A customer kept waiting past their window, at all. */
  lateJob: 60,
  /** Each minute past the window. */
  lateMinute: 3,
  lateMinuteEmergency: 6,
  /** Each minute a technician works past the end of the shift. */
  overtimeMinute: 2,
  /** Each minute of driving. */
  driveMinute: 0.5,
  /** Each minute until someone reaches an emergency. */
  emergencyWait: 4,
  /** A slight pull towards doing "today" jobs sooner rather than later. */
  todayWait: 0.05,
};

/** The part of the score that is customers waiting past their window. */
function lateness(jobs: PlanJob[], projection: Projection): number {
  let score = 0;
  for (const job of jobs) {
    if (!stillToCome(job)) continue;
    const late = projection.slots[job.id].late;
    if (late > 0) score += WEIGHTS.lateJob + late * (job.urgency === "emergency" ? WEIGHTS.lateMinuteEmergency : WEIGHTS.lateMinute);
  }
  return score;
}

function score(jobs: PlanJob[], projection: Projection): number {
  let total = lateness(jobs, projection);
  for (const job of jobs) {
    if (!stillToCome(job)) continue;
    const { arrive } = projection.slots[job.id];
    if (job.urgency === "emergency") total += arrive * WEIGHTS.emergencyWait;
    else if (job.urgency === "today") total += arrive * WEIGHTS.todayWait;
  }
  for (const tech of Object.values(projection.techs)) total += tech.overtime * WEIGHTS.overtimeMinute + tech.drive * WEIGHTS.driveMinute;
  return total;
}

export type Knock = { id: string; late: number };

export type Option =
  | { techId: string; ok: false; reason: string }
  | {
      techId: string;
      ok: true;
      /** Where in the technician's remaining day the job would go. 0 is next. */
      index: number;
      arrive: number;
      end: number;
      /** Minutes after the customer's window. 0 when on time. */
      late: number;
      addedDrive: number;
      overtime: number;
      /** Other customers this would make late, or later. */
      knocks: Knock[];
      score: number;
      reasons: string[];
    };

/**
 * Every technician, best first, with where the job would go in their day and
 * why. Technicians who cannot do the job are listed last with the reason.
 */
export function suggest(jobs: PlanJob[], techs: Tech[], jobId: string, now: number): Option[] {
  const job = jobs.find((candidate) => candidate.id === jobId)!;
  const techIds = techs.map((tech) => tech.id);
  // Compare against the day without this job, so moving a job that is already booked is judged fairly.
  const without = jobs.map((candidate) => (candidate.id === jobId ? { ...candidate, techId: null, status: "new" as const } : candidate));
  const before = project(without, techIds, now);
  const skill = JOB_TYPES[job.type].skill;

  const options = techs.map((tech): Option => {
    if (!canDo(tech, job.type)) return { techId: tech.id, ok: false, reason: SKILL_LACKS[skill] };
    let best: Extract<Option, { ok: true }> | null = null;
    for (let index = 0; index < openings(without, jobId, tech.id); index++) {
      const plan = place(without, jobId, tech.id, index);
      const after = project(plan, techIds, now);
      const total = score(plan, after);
      if (best && total >= best.score) continue;
      const slot = after.slots[jobId];
      const knocks = plan
        .filter((other) => other.id !== jobId && stillToCome(other) && after.slots[other.id].late > before.slots[other.id].late)
        .map((other) => ({ id: other.id, late: after.slots[other.id].late }));
      best = {
        techId: tech.id,
        ok: true,
        index,
        arrive: slot.arrive,
        end: slot.end,
        late: slot.late,
        addedDrive: after.techs[tech.id].drive - before.techs[tech.id].drive,
        overtime: after.techs[tech.id].overtime,
        knocks,
        score: total,
        reasons: [],
      };
    }
    const option = best!;
    option.reasons = [
      skill === "general" ? null : SKILL_HAS[skill],
      option.index === 0 ? `Next stop, there about ${fmtTime(option.arrive)}, ${fmtDuration(option.arrive - now)} from now` : `Fits at about ${fmtTime(option.arrive)}`,
      option.addedDrive <= 0 ? "No extra driving" : `${fmtDuration(option.addedDrive)} of extra driving`,
      option.knocks.length === 0 ? "Keeps every other appointment on time" : `Makes ${option.knocks.length === 1 ? "another appointment" : `${option.knocks.length} other appointments`} late`,
      option.overtime > 0 ? `Runs ${fmtDuration(option.overtime)} past the end of the shift` : null,
    ].filter((reason): reason is string => reason !== null);
    return option;
  });

  return options.sort((a, b) => (a.ok && b.ok ? a.score - b.score : Number(b.ok) - Number(a.ok)));
}

export type Change = {
  id: string;
  fromTech: string;
  toTech: string;
  arriveBefore: number;
  arriveAfter: number;
  lateBefore: number;
  lateAfter: number;
};

export type Reshuffle = {
  /** The repaired plan. */
  plan: PlanJob[];
  /** Appointments that change technician or move by ten minutes or more. Changes of technician first. */
  changes: Change[];
  /** Still late after the reshuffle: these customers need telling. */
  stillLate: Knock[];
  lateBefore: number;
  /** Identifies this exact proposal, so accepting it cannot apply a different one. */
  signature: string;
};

const MAX_MOVES = 5;

/**
 * Repairs a day that has slipped. It repeatedly makes the single move (one
 * job to another technician or another place in the day) that most improves
 * the score, and stops when nothing is late or no move helps. It is a simple
 * repair that a dispatcher can read and check. It is not an optimiser and does
 * not claim to find the best possible day.
 *
 * Returns null when nobody is running late.
 */
export function reshuffle(jobs: PlanJob[], techs: Tech[], now: number): Reshuffle | null {
  const techIds = techs.map((tech) => tech.id);
  const before = project(jobs, techIds, now);
  const lateBefore = jobs.filter((job) => stillToCome(job) && before.slots[job.id].late > 0);
  if (lateBefore.length === 0) return null;

  let plan = jobs;
  let current = score(plan, before);
  for (let move = 0; move < MAX_MOVES; move++) {
    if (lateness(plan, project(plan, techIds, now)) === 0) break;
    let best: { plan: PlanJob[]; total: number } | null = null;
    for (const job of plan.filter((candidate) => onBoard(candidate) && movable(candidate))) {
      for (const tech of techs) {
        if (!canDo(tech, job.type)) continue;
        for (let index = 0; index < openings(plan, job.id, tech.id); index++) {
          const candidate = place(plan, job.id, tech.id, index);
          const total = score(candidate, project(candidate, techIds, now));
          if (total < (best?.total ?? current - 1)) best = { plan: candidate, total };
        }
      }
    }
    if (!best) break;
    plan = best.plan;
    current = best.total;
  }

  const after = project(plan, techIds, now);
  // Shuffling that leaves customers waiting just as long is not worth anyone's attention.
  if (lateness(plan, after) >= lateness(jobs, before)) plan = jobs;
  const final = plan === jobs ? before : after;

  const original = new Map(jobs.map((job) => [job.id, job]));
  const changes = plan
    .filter((job) => stillToCome(job))
    .map((job): Change => ({
      id: job.id,
      fromTech: original.get(job.id)!.techId!,
      toTech: job.techId!,
      arriveBefore: before.slots[job.id].arrive,
      arriveAfter: final.slots[job.id].arrive,
      lateBefore: before.slots[job.id].late,
      lateAfter: final.slots[job.id].late,
    }))
    .filter((change) => change.fromTech !== change.toTech || Math.abs(change.arriveAfter - change.arriveBefore) >= 10)
    .sort((a, b) => Number(b.fromTech !== b.toTech) - Number(a.fromTech !== a.toTech) || a.arriveAfter - b.arriveAfter);

  const moved = plan.filter((job) => onBoard(job) && (job.techId !== original.get(job.id)!.techId || job.seq !== original.get(job.id)!.seq));
  return {
    plan,
    changes: plan === jobs ? [] : changes,
    stillLate: plan.filter((job) => stillToCome(job) && final.slots[job.id].late > 0).map((job) => ({ id: job.id, late: final.slots[job.id].late })),
    lateBefore: lateBefore.length,
    signature: moved
      .map((job) => `${job.id}:${job.techId}:${job.seq}`)
      .sort()
      .join("|"),
  };
}
