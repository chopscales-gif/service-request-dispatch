"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { fmtWindow } from "@/lib/clock";
import { COMPANY, TECHS } from "@/lib/crew";
import type { PlanJob } from "@/lib/plan";
import { AREAS, type AreaKey } from "@/lib/town";
import { PROBLEMS, PROBLEM_KEYS, draftJob, windowsFor, type ProblemKey } from "@/lib/windows";
import { requestServiceAction } from "@/server/actions";

type Props = { plan: PlanJob[]; now: number; own: number; max: number };

/**
 * The customer's request form. Every answer is a choice, so nothing a visitor
 * types is read by AI. The times offered are worked out here, from the same
 * rules the server checks them with, so a time is only shown if it can be kept.
 */
export function RequestForm({ plan, now, own, max }: Props) {
  const router = useRouter();
  const [problem, setProblem] = useState<ProblemKey | "gas" | null>(null);
  const [emergency, setEmergency] = useState<boolean | null>(null);
  const [area, setArea] = useState<AreaKey | "">("");
  const [name, setName] = useState("");
  const [windowStart, setWindowStart] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ready = problem !== null && problem !== "gas" && emergency !== null && area !== "";
  const offers = useMemo(() => (ready && !emergency ? windowsFor(plan, TECHS, draftJob("draft", problem, "today", area, own, now), now) : []), [ready, emergency, problem, area, plan, own, now]);
  const chosen = offers.some((offer) => offer.start === windowStart) ? windowStart : null;
  const canSend = ready && name.trim() !== "" && (emergency || chosen !== null || offers.length === 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setError(null);
    startTransition(async () => {
      const result = await requestServiceAction({ problem, urgency: emergency ? "emergency" : "today", area, name, windowStart: emergency ? null : chosen });
      if (!result.ok) setError(result.error);
      else if (result.goto) router.push(result.goto);
    });
  }

  // The demo stops taking bookings at its limit, and says so before anyone fills the form in.
  if (own >= max)
    return (
      <div role="status" className="max-w-2xl leading-snug">
        <h2 className="text-2xl font-bold">You have used all {max} bookings in this demo</h2>
        <p className="mt-1.5">Each visitor can book {max} visits of their own, which keeps the sample day a sensible size. Your bookings are listed above and can still be followed.</p>
        <p className="mt-1.5">
          To book again, press <strong className="font-semibold">Reset demo</strong> in the bar at the top. That puts the day back to how it started.
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <fieldset>
        <legend className="font-display text-xl font-bold">What is wrong?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {PROBLEM_KEYS.map((key) => (
            <label key={key} className="choice">
              <input type="radio" name="problem" checked={problem === key} onChange={() => setProblem(key)} />
              <span>{PROBLEMS[key].label}</span>
            </label>
          ))}
          <label className="choice">
            <input type="radio" name="problem" checked={problem === "gas"} onChange={() => setProblem("gas")} />
            <span>I can smell gas or rotten eggs</span>
          </label>
        </div>
      </fieldset>

      {problem === "gas" ? (
        <div role="alert" className="self-start rounded-[3px] border-2 border-flag bg-flag-tint p-5 leading-relaxed lg:p-6">
          <h2 className="text-3xl font-extrabold text-flag">Leave the house now</h2>
          <p className="mt-1.5">
            Take everyone with you. Do not use light switches, phones or anything with a flame indoors. From outside, call your gas company&apos;s emergency line or <strong className="font-semibold">911</strong>.
          </p>
          <p className="mt-1.5">We cannot book a visit for a smell of gas. Once the gas company says it is safe, call us on {COMPANY.phone} and we will come.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <fieldset>
            <legend className="font-display text-xl font-bold">How soon?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="choice">
                <input type="radio" name="urgency" checked={emergency === true} onChange={() => setEmergency(true)} />
                <span>
                  It is an emergency
                  <span className="block text-sm text-muted">Water is coming in and I cannot stop it.</span>
                </span>
              </label>
              <label className="choice">
                <input type="radio" name="urgency" checked={emergency === false} onChange={() => setEmergency(false)} />
                <span>
                  Today, at a time I choose
                  <span className="block text-sm text-muted">It can wait a few hours.</span>
                </span>
              </label>
            </div>
          </fieldset>

          <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <label htmlFor="area" className="block font-display text-xl font-bold">
              Which part of {COMPANY.town}?
            </label>
            <select id="area" className="field mt-2" value={area} onChange={(event) => setArea(event.target.value as AreaKey | "")}>
              <option value="">Choose an area</option>
              {AREAS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-muted">The demo gives you an invented address there. Do not enter a real one.</p>
          </div>

          <div>
            <label htmlFor="name" className="block font-display text-xl font-bold">
              A name for the booking
            </label>
            <input id="name" className="field mt-2" maxLength={40} autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} placeholder="Any made-up name" />
          </div>
          </div>

          {ready && emergency && <p className="rounded-[3px] border-l-8 border-ink bg-hivis-tint p-4 leading-snug">We will send the technician who can reach you soonest, ahead of other work. You will see who and when on the next page.</p>}

          {ready && !emergency && (
            <fieldset>
              <legend className="font-display text-xl font-bold">When should we arrive?</legend>
              {offers.length > 0 ? (
                <>
                  <p className="mt-1 text-sm leading-snug text-muted">These are the two-hour windows a technician with the right skills can keep without making another customer late.</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {offers.map((offer) => (
                      <label key={offer.start} className="choice">
                        <input type="radio" name="window" checked={chosen === offer.start} onChange={() => setWindowStart(offer.start)} />
                        <span className="tabular-nums">{fmtWindow(offer.start, offer.end)}</span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-2 leading-snug">Nobody with the right skills is free for the rest of today. We can come tomorrow morning between 8 and 10 AM.</p>
              )}
            </fieldset>
          )}

          <div>
            <button type="submit" disabled={!canSend || pending} className="btn btn-primary w-full px-8 py-3 text-lg sm:w-auto">
              {pending ? "Booking" : emergency ? "Send someone now" : ready && offers.length === 0 ? "Ask for tomorrow morning" : "Book this visit"}
            </button>
            {!canSend && !pending && <p className="mt-2 text-sm text-muted">Answer every question above to book.</p>}
            {error && (
              <p role="alert" className="mt-2 text-flag">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
