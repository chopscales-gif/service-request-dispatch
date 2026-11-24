"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { LAST_NOW, STEP, fmtTime } from "@/lib/clock";
import { resetDemoAction, skipAheadAction } from "@/server/actions";
import { TourButton } from "./tour";

/** Which of the three screens a page belongs to. */
export function viewOf(pathname: string): "dispatcher" | "customer" | "technician" {
  if (pathname.startsWith("/customer") || pathname.startsWith("/track")) return "customer";
  if (pathname.startsWith("/tech")) return "technician";
  return "dispatcher";
}

const VIEWS = [
  { key: "dispatcher", href: "/", label: "Dispatcher" },
  { key: "customer", href: "/customer", label: "Customer" },
  { key: "technician", href: "/tech", label: "Technician" },
] as const;

const WORD = "cursor-pointer whitespace-nowrap font-semibold underline decoration-white/40 underline-offset-4 hover:decoration-white disabled:opacity-60";

/**
 * The one line across the top of every page. It is the only part of the
 * screen that belongs to the demo and not to the fictional company's product:
 * the way back to the other demos, the notice, whose screen is showing, and
 * the demo's clock.
 */
export function DemoBar({ now }: { now: number | null }) {
  const view = viewOf(usePathname());
  return (
    <div className="demo-chrome bg-ink text-sm text-white">
      <div className="mx-auto flex max-w-[100rem] flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 sm:px-6">
        <a href="https://chopmedia.vercel.app/#service-company" className={WORD}>
          ← All demos
        </a>
        <p className="min-w-0 flex-1 basis-60 leading-snug text-white/80 lg:flex-none lg:basis-auto">
          <strong className="font-semibold text-sun">Demonstration build.</strong> Fictional company, recorded AI, nothing is sent.
        </p>
        {now !== null && (
          <nav aria-label="Whose screen" className="flex basis-full gap-0.5 rounded-full bg-white/10 p-0.5 sm:basis-auto lg:ml-auto">
            {VIEWS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={view === item.key ? "page" : undefined}
                className={`inline-flex min-h-10 flex-1 items-center justify-center rounded-full px-3.5 font-semibold sm:min-h-0 sm:flex-none sm:px-3 sm:py-1 ${view === item.key ? "bg-white text-ink shadow-sm" : "text-white/85 hover:bg-white/15"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${now === null ? "lg:ml-auto" : ""}`}>
          {now !== null && (
            <p className="flex items-center gap-1.5 whitespace-nowrap">
              <svg viewBox="0 0 16 16" role="img" aria-label="Demo time" className="size-4 flex-none text-white/70">
                <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <strong data-tour="clock" className="font-semibold tabular-nums">
                {fmtTime(now)}
              </strong>
            </p>
          )}
          {now !== null && (now < LAST_NOW ? <SkipAhead /> : <span className="text-white/75">The day ends here.</span>)}
          {now !== null && <TourButton className={WORD} />}
          <Link href="/about" className={WORD}>
            How it works
          </Link>
          {now !== null && (
            <form action={resetDemoAction} className="flex">
              <ResetButton />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function SkipAhead() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        data-tour="skip"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await skipAheadAction();
            setError(result.ok ? null : result.error);
          })
        }
        className="min-h-10 cursor-pointer whitespace-nowrap rounded-full bg-sun px-3.5 font-semibold text-ink hover:bg-white disabled:opacity-60 sm:min-h-0 sm:py-1"
      >
        {pending ? "Skipping ahead" : `Skip ahead ${STEP} min`}
      </button>
      {error && (
        <p role="alert" className="basis-full text-sun">
          {error}
        </p>
      )}
    </>
  );
}

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={WORD}>
      {pending ? "Resetting" : "Reset demo"}
    </button>
  );
}
