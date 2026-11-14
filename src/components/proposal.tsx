import type { Job } from "@/db/schema";
import { fmtDuration, fmtTime, fmtWindow } from "@/lib/clock";
import { TECH_BY_ID } from "@/lib/crew";
import { acceptReshuffleAction } from "@/server/actions";
import type { Board } from "@/server/queries";
import { ActionButton } from "./action-button";

const first = (techId: string) => TECH_BY_ID[techId].first;

/**
 * Shown when the day has slipped: who will be kept waiting, and the repair
 * the written rules propose. Nothing changes until the dispatcher accepts.
 */
export function Proposal({ view }: { view: Board }) {
  const proposal = view.proposal!;
  const byId = new Map(view.jobs.map((job) => [job.id, job]));
  const late = view.jobs.filter((job) => (job.status === "scheduled" || job.status === "en_route") && view.projection.slots[job.id]?.late > 0);
  const name = (job: Job) => `${job.customer} (${job.urgency === "emergency" ? "emergency" : fmtWindow(job.windowStart, job.windowEnd)})`;
  const moves = proposal.changes.filter((change) => change.fromTech !== change.toTech);
  const shifts = proposal.changes.filter((change) => change.fromTech === change.toTech);
  return (
    <section aria-labelledby="proposal-title" className="grid gap-x-10 rounded-[3px] border-2 border-ink bg-hivis p-4 sm:p-5 xl:grid-cols-2">
      <div>
      <h2 id="proposal-title" className="text-2xl font-extrabold lg:text-3xl">
        {late.length === 1 ? "One customer" : `${late.length} customers`} will be kept waiting longer than we said
      </h2>
      <ul className="mt-2 space-y-1 leading-snug">
        {late.map((job) => {
          const slot = view.projection.slots[job.id];
          return (
            <li key={job.id}>
              <strong className="font-semibold">{name(job)}</strong>: {first(slot.techId)} now arrives about {fmtTime(slot.arrive)}, {fmtDuration(slot.late)} late.
            </li>
          );
        })}
      </ul>
      </div>

      <div className="mt-4 xl:mt-0">
      {proposal.changes.length > 0 ? (
        <>
          <h3 className="text-xl font-bold">Proposed reshuffle (written rules, not AI)</h3>
          <ul className="mt-1.5 space-y-1 leading-snug">
            {moves.map((change) => (
              <li key={change.id}>
                Move <strong className="font-semibold">{byId.get(change.id)!.customer}</strong> from {first(change.fromTech)} to <strong className="font-semibold">{first(change.toTech)}</strong>, who has the right
                skills and arrives about {fmtTime(change.arriveAfter)} in place of {fmtTime(change.arriveBefore)}.
              </li>
            ))}
            {shifts.map((change) => (
              <li key={change.id}>
                {byId.get(change.id)!.customer} stays with {first(change.toTech)}, now about {fmtTime(change.arriveAfter)} in place of {fmtTime(change.arriveBefore)}.
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="leading-snug">
          <strong className="font-semibold">No reshuffle helps.</strong> Nobody else with the right skills can get there sooner without making someone else late.
        </p>
      )}

      <p className="mt-3 leading-snug">
        {proposal.stillLate.length === 0
          ? "After this, every customer is back inside the window they were given."
          : `Still late after this: ${proposal.stillLate.map((knock) => `${byId.get(knock.id)!.customer}, by ${fmtDuration(knock.late)}`).join("; ")}. They get a text with the new time.`}
      </p>
      <ActionButton action={acceptReshuffleAction.bind(null, proposal.signature)} pendingLabel="Updating the board" className="mt-3">
        {proposal.changes.length > 0 ? "Accept the reshuffle and queue the texts" : "Queue texts with the new times"}
      </ActionButton>
      <p className="mt-2 text-sm">Texts go to the outbox under Texts to customers. Nothing is sent.</p>
      </div>
    </section>
  );
}
