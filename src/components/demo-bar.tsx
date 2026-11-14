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
    <div className="demo-chrome bg-steel text-sm text-white">
      <div className="mx-auto flex max-w-[88rem] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 sm:px-6">
        <p className="min-w-0 flex-1 basis-72 leading-snug">
          <strong className="font-bold">Demonstration build.</strong>{" "}
          <span className="text-white/75">A fictional plumbing company in an invented town. The AI readings were recorded ahead of time, and no text is ever sent.</span>
        </p>
        <Link href="/about" className="inline-flex min-h-11 items-center font-semibold underline decoration-white/40 underline-offset-4 hover:decoration-white sm:min-h-0">
          How this demo works
        </Link>
        {now !== null && (
          <form action={resetDemoAction}>
            <ResetButton />
          </form>
        )}
      </div>
      {now !== null && (
        <div className="border-t border-white/15 bg-white/5">
          <div className="mx-auto flex max-w-[88rem] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 sm:px-6">
            <nav aria-label="Whose screen" className="flex items-center gap-2">
              <span className="text-white/75">See it as</span>
              <span className="flex overflow-hidden rounded-[3px] border border-white/40">
                {VIEWS.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={view === item.key ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center px-3 py-1.5 font-semibold sm:min-h-0 ${view === item.key ? "bg-white text-ink" : "hover:bg-white/15"}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </span>
            </nav>
            <p className="min-w-0 flex-1 basis-56 sm:text-right">
              <span className="text-white/75">In the demo it is</span> <strong className="font-bold">{fmtTime(now)}</strong> <span className="text-white/75">on {DAY_NAME}</span>
            </p>
            {now < LAST_NOW ? <SkipAhead /> : <p className="text-white/75">The demo day ends here. Reset to start again.</p>}
          </div>
        </div>
      )}
      <div className="tape" aria-hidden />
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
        className="min-h-11 cursor-pointer rounded-[3px] bg-white px-3 py-1.5 font-bold text-ink hover:bg-hivis disabled:opacity-60 sm:min-h-0"
      >
        {pending ? "Skipping ahead" : `Skip ahead ${STEP} minutes`}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-hivis">
          {error}
        </p>
      )}
    </div>
  );
}

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="min-h-11 cursor-pointer rounded-[3px] border border-white/40 px-3 py-1.5 font-semibold hover:border-white disabled:opacity-60 sm:min-h-0">
      {pending ? "Resetting" : "Reset demo"}
    </button>
  );
}
