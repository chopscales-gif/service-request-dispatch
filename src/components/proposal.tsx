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
    <section aria-labelledby="proposal-title" className="grid gap-x-12 rounded-[1.25rem] border border-[#f1cf7e] bg-gradient-to-br from-sun-tint to-[#fffaf0] p-5 shadow-lift sm:p-7 xl:grid-cols-2">
      <div>
      <p className="tag bg-sun text-ink">Needs your decision</p>
      <h2 id="proposal-title" className="mt-3 text-balance text-2xl font-semibold leading-tight lg:text-[2rem]">
        {late.length === 1 ? "One customer" : `${late.length} customers`} will be kept waiting longer than we said
      </h2>
      <ul className="mt-3 space-y-1.5 leading-snug">
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

      <div className="mt-5 rounded-2xl border border-[#f3dfa6] bg-surface p-4 shadow-rest sm:p-5 xl:mt-0">
      {proposal.changes.length > 0 ? (
        <>
          <h3 className="text-xl font-semibold">Proposed reshuffle (written rules, not AI)</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-snug marker:text-sun-deep">
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
      <ActionButton action={acceptReshuffleAction.bind(null, proposal.signature)} pendingLabel="Updating the board" className="mt-4">
        {proposal.changes.length > 0 ? "Accept the reshuffle and queue the texts" : "Queue texts with the new times"}
      </ActionButton>
      <p className="mt-2.5 text-sm text-muted">Texts go to the outbox under Texts to customers. Nothing is sent.</p>
      </div>
    </section>
  );
}
