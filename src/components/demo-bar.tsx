"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { DAY_NAME, LAST_NOW, STEP, fmtTime } from "@/lib/clock";
import { resetDemoAction, skipAheadAction } from "@/server/actions";

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

/**
 * The strip across the top of every page. It is the only part of the screen
 * that belongs to the demo and not to the fictional company's product. It
 * holds the demo's clock and switches between the three people's screens.
 */
export function DemoBar({ now }: { now: number | null }) {
  const view = viewOf(usePathname());
  return (
    <div className="demo-chrome bg-ink text-sm text-white">
      {/* On a phone the bar is three short rows, so the company's own screen starts as high as it can. */}
      <div className="mx-auto flex max-w-[88rem] flex-wrap items-center gap-x-3 px-4 py-1 sm:gap-x-5 sm:gap-y-2 sm:px-6 sm:py-2">
        <p className="min-w-0 flex-1 leading-snug sm:basis-72">
          <strong className="rounded-full bg-sun px-2.5 py-0.5 font-semibold text-ink">Demonstration build</strong>{" "}
          <span className="hidden pl-1 text-white/75 sm:inline">A fictional plumbing company in an invented town. The AI readings were recorded ahead of time, and no text is ever sent.</span>
        </p>
        <Link href="/about" className="inline-flex min-h-11 items-center font-semibold underline decoration-white/40 underline-offset-4 hover:decoration-white sm:min-h-0">
          How <span className="hidden sm:inline">&nbsp;this demo&nbsp;</span>
          <span className="sm:hidden">&nbsp;it&nbsp;</span> works
        </Link>
        {now !== null && (
          <form action={resetDemoAction}>
            <ResetButton />
          </form>
        )}
        <p className="-mt-0.5 basis-full pb-1.5 text-[0.8125rem] leading-snug text-white/75 sm:hidden">Fictional company, recorded AI, no texts sent.</p>
      </div>
      {now !== null && (
        <div className="border-t border-white/10 bg-white/[0.06]">
          <div className="mx-auto flex max-w-[88rem] flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 sm:gap-x-5 sm:gap-y-2 sm:px-6">
            <nav aria-label="Whose screen" className="flex basis-full items-center gap-2 sm:basis-auto">
              <span className="text-white/75">See it as</span>
              <span className="flex flex-1 gap-0.5 rounded-full bg-white/10 p-0.5 sm:flex-none">
                {VIEWS.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={view === item.key ? "page" : undefined}
                    className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-2 py-1.5 font-semibold sm:min-h-0 sm:flex-none sm:px-4 ${view === item.key ? "bg-white text-ink shadow-sm" : "text-white/85 hover:bg-white/15"}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </span>
            </nav>
            <p className="min-w-0 flex-1 sm:basis-56 sm:text-right">
              <span className="text-white/75">
                <span className="hidden sm:inline">In the demo it is</span>
                <span className="sm:hidden">Demo time</span>
              </span>{" "}
              <strong className="font-semibold tabular-nums">{fmtTime(now)}</strong> <span className="hidden text-white/75 sm:inline">on {DAY_NAME}</span>
            </p>
            {now < LAST_NOW ? <SkipAhead /> : <p className="text-white/75">The demo day ends here. Reset to start again.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function SkipAhead() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await skipAheadAction();
            setError(result.ok ? null : result.error);
          })
        }
        className="min-h-11 cursor-pointer rounded-full bg-sun px-4 py-1.5 font-semibold text-ink hover:bg-white disabled:opacity-60 sm:min-h-0"
      >
        {pending ? "Skipping ahead" : `Skip ahead ${STEP} minutes`}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-sun">
          {error}
        </p>
      )}
    </div>
  );
}

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="min-h-11 cursor-pointer rounded-full border border-white/35 px-4 py-1.5 font-semibold hover:border-white disabled:opacity-60 sm:min-h-0">
      {pending ? "Resetting" : "Reset demo"}
    </button>
  );
}
