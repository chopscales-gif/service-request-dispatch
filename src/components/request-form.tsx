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
 * The customer's request form, one question at a time. Every answer is a
 * choice, so nothing a visitor types is read by AI. The times offered are worked out here, from the same
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
  const [question, setQuestion] = useState(1);

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
        <h2 className="text-2xl font-semibold">You have used all {max} bookings in this demo</h2>
        <p className="mt-1.5">Each visitor can book {max} visits of their own, which keeps the sample day a sensible size. Your bookings are listed above and can still be followed.</p>
        <p className="mt-1.5">
          To book again, press <strong className="font-semibold">Reset demo</strong> in the bar at the top. That puts the day back to how it started.
        </p>
      </div>
    );

  const QUESTIONS = 4;
  const back = () => setQuestion((at) => Math.max(1, at - 1));
  const heading = (n: number, text: string) => (
    <legend className="contents">
      <span className="block text-[1.0625rem] font-medium text-muted">
        Question {n} of {QUESTIONS}
      </span>
      <span className="mt-1 block font-display text-[1.875rem] font-semibold leading-tight lg:text-[2.25rem]">{text}</span>
    </legend>
  );
  const backButton = (
    <button type="button" onClick={back} className="btn btn-quiet">
      Back
    </button>
  );

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl">
      <div aria-hidden className="mb-6 flex gap-1.5">
        {Array.from({ length: QUESTIONS }, (_, index) => (
          <span key={index} className={`h-1.5 flex-1 rounded-full ${index < question ? "bg-accent" : "bg-idle"}`} />
        ))}
      </div>

      {question === 1 && (
        <fieldset>
          {heading(1, "What is wrong?")}
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {PROBLEM_KEYS.map((key) => (
              <label key={key} className="choice text-[1.0625rem]">
                <input
                  type="radio"
                  name="problem"
                  checked={problem === key}
                  onChange={() => {
                    setProblem(key);
                    setQuestion(2);
                  }}
                />
                <span>{PROBLEMS[key].label}</span>
              </label>
            ))}
            <label className="choice text-[1.0625rem]">
              <input type="radio" name="problem" checked={problem === "gas"} onChange={() => setProblem("gas")} />
              <span>I can smell gas or rotten eggs</span>
            </label>
          </div>
          {problem === "gas" && (
            <div role="alert" className="mt-6 rounded-[1.25rem] border-2 border-flag bg-flag-tint p-5 text-[1.0625rem] leading-relaxed lg:p-7">
              <h2 className="text-3xl font-semibold text-flag">Leave the house now</h2>
              <p className="mt-1.5">
                Take everyone with you. Do not use light switches, phones or anything with a flame indoors. From outside, call your gas company&apos;s emergency line or <strong className="font-semibold">911</strong>.
              </p>
              <p className="mt-1.5">We cannot book a visit for a smell of gas. Once the gas company says it is safe, call us on {COMPANY.phone} and we will come.</p>
            </div>
          )}
        </fieldset>
      )}

      {question === 2 && (
        <fieldset>
          {heading(2, "How soon do you need us?")}
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <label className="choice text-[1.0625rem]">
              <input
                type="radio"
                name="urgency"
                checked={emergency === true}
                onChange={() => {
                  setEmergency(true);
                  setQuestion(3);
                }}
              />
              <span>
                It is an emergency
                <span className="mt-0.5 block font-normal text-muted">Water is coming in and I cannot stop it.</span>
              </span>
            </label>
            <label className="choice text-[1.0625rem]">
              <input
                type="radio"
                name="urgency"
                checked={emergency === false}
                onChange={() => {
                  setEmergency(false);
                  setQuestion(3);
                }}
              />
              <span>
                Today, at a time I choose
                <span className="mt-0.5 block font-normal text-muted">It can wait a few hours.</span>
              </span>
            </label>
          </div>
          <div className="mt-6">{backButton}</div>
        </fieldset>
      )}

      {question === 3 && (
        <fieldset>
          {heading(3, "Where are you, and who should we ask for?")}
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="area" className="text-[1.0625rem] font-semibold">
                Part of {COMPANY.town}
              </label>
              <select id="area" className="field mt-2" value={area} onChange={(event) => setArea(event.target.value as AreaKey | "")}>
                <option value="">Choose an area</option>
                {AREAS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="name" className="text-[1.0625rem] font-semibold">
                Name for the booking
              </label>
              <input id="name" className="field mt-2" maxLength={40} autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} placeholder="Any made-up name" />
            </div>
          </div>
          <p className="mt-3 leading-snug text-muted">The demo gives you an invented address. Do not enter a real one.</p>
          <div className="mt-6 flex gap-3">
            {backButton}
            <button type="button" disabled={area === "" || name.trim() === ""} onClick={() => setQuestion(4)} className="btn btn-primary px-8">
              Next
            </button>
          </div>
        </fieldset>
      )}

      {question === 4 && ready && (
        <fieldset>
          {heading(4, emergency ? "We will come as soon as we can" : "When should we arrive?")}
          {emergency ? (
            <p className="mt-4 text-[1.0625rem] leading-snug">We send the technician who can reach you soonest, ahead of other work. You will see who and when on the next page.</p>
          ) : offers.length > 0 ? (
            <>
              <p className="mt-3 text-[1.0625rem] leading-snug text-muted">We only offer times we can keep without making another customer late.</p>
              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {offers.map((offer) => (
                  <label key={offer.start} className="choice text-[1.0625rem]">
                    <input type="radio" name="window" checked={chosen === offer.start} onChange={() => setWindowStart(offer.start)} />
                    <span className="tabular-nums">{fmtWindow(offer.start, offer.end)}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-4 text-[1.0625rem] leading-snug">Nobody with the right skills is free for the rest of today. We can come tomorrow morning between 8 and 10 AM.</p>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            {backButton}
            <button type="submit" disabled={!canSend || pending} className="btn btn-primary px-9 text-lg">
              {pending ? "Booking" : emergency ? "Send someone now" : offers.length === 0 ? "Ask for tomorrow morning" : "Book this visit"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-flag">
              {error}
            </p>
          )}
        </fieldset>
      )}
    </form>
  );
}
