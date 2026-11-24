import type { Job } from "@/db/schema";
import { fmtDuration, fmtTime, fmtWindow } from "@/lib/clock";
import { TECH_BY_ID } from "@/lib/crew";
import { acceptReshuffleAction } from "@/server/actions";
import type { Board } from "@/server/queries";
import { ActionButton } from "./action-button";
import { TechName } from "./ui";

const first = (techId: string) => TECH_BY_ID[techId].first;

/** Customers who will now be reached later than they were told. */
export const lateJobs = (view: Board) => view.jobs.filter((job) => (job.status === "scheduled" || job.status === "en_route") && view.projection.slots[job.id]?.late > 0);

/**
 * Shown when the day has slipped: who will be kept waiting, and the repair
 * the written rules propose. Nothing changes until the dispatcher accepts.
 */
export function Proposal({ view }: { view: Board }) {
  const proposal = view.proposal!;
  const byId = new Map(view.jobs.map((job) => [job.id, job]));
  const late = lateJobs(view);
  const promised = (job: Job) => (job.urgency === "emergency" ? "emergency" : `told ${fmtWindow(job.windowStart, job.windowEnd)}`);
  const moves = proposal.changes.filter((change) => change.fromTech !== change.toTech);
  const shifts = proposal.changes.filter((change) => change.fromTech === change.toTech);
  return (
    <div className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-2">
      <section aria-labelledby="late-title" className="sheet overflow-hidden">
        <h2 id="late-title" className="border-b border-[#f5ccd4] bg-gradient-to-r from-flag-tint to-[#fff6f4] px-5 py-4 text-xl font-semibold sm:px-6">
          Who would be kept waiting
        </h2>
        <ul className="divide-y divide-line">
          {late.map((job) => {
            const slot = view.projection.slots[job.id];
            return (
              <li key={job.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 sm:px-6">
                <span className="min-w-0 flex-1 leading-snug">
                  <span className="block text-lg font-semibold">{job.customer}</span>
                  <span className="block text-muted">
                    {first(slot.techId)} arrives about {fmtTime(slot.arrive)}, {promised(job)}
                  </span>
                </span>
                <span className="tag bg-flag text-white">{fmtDuration(slot.late)} late</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section data-tour="reshuffle" aria-labelledby="fix-title" className="sheet overflow-hidden">
        <h2 id="fix-title" className="border-b border-[#f3dfa6] bg-gradient-to-r from-sun-tint to-[#fffaf0] px-5 py-4 text-xl font-semibold sm:px-6">
          The rules propose
        </h2>
        <div className="px-5 py-5 sm:px-6">
          {proposal.changes.length > 0 ? (
            <ul className="space-y-4">
              {moves.map((change) => (
                <li key={change.id} className="leading-snug">
                  <p className="text-lg">
                    Move <strong className="font-semibold">{byId.get(change.id)!.customer}</strong> from <TechName id={change.fromTech} /> to <TechName id={change.toTech} />
                  </p>
                  <p className="mt-1 text-muted">
                    {first(change.toTech)} has the right skills and arrives about <strong className="font-semibold text-ink">{fmtTime(change.arriveAfter)}</strong> in place of {fmtTime(change.arriveBefore)}.
                  </p>
                </li>
              ))}
              {shifts.map((change) => (
                <li key={change.id} className="text-lg leading-snug">
                  {byId.get(change.id)!.customer} stays with {first(change.toTech)}, now about <strong className="font-semibold">{fmtTime(change.arriveAfter)}</strong>.
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-lg leading-snug">
              <strong className="font-semibold">No reshuffle helps.</strong> Nobody else with the right skills can get there sooner without making someone else late.
            </p>
          )}
          <p className="mt-5 rounded-xl bg-[#f6f8fb] px-4 py-3 leading-snug">
            {proposal.stillLate.length === 0
              ? "After this, every customer is back inside the window they were given."
              : `Still late after this: ${proposal.stillLate.map((knock) => `${byId.get(knock.id)!.customer}, by ${fmtDuration(knock.late)}`).join("; ")}. They get a text with the new time.`}
          </p>
          <div data-tour="accept" className="mt-5">
            <ActionButton action={acceptReshuffleAction.bind(null, proposal.signature)} pendingLabel="Updating the day">
              {proposal.changes.length > 0 ? "Accept and queue the texts" : "Queue texts with the new times"}
            </ActionButton>
            <p className="mt-2.5 text-muted">Written rules, not AI. Texts wait in the outbox; nothing is sent.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
