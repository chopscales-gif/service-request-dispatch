import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RequestForm } from "@/components/request-form";
import { COMPANY } from "@/lib/crew";
import type { PlanJob } from "@/lib/plan";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";
import { MAX_OWN_REQUESTS } from "@/server/workflow";

export const metadata: Metadata = { title: "Request service" };

/** Only what the planning rules need goes to the browser: no other customer's name or address. */
const slim = ({ id, x, y, type, urgency, windowStart, windowEnd, est, extra, status, techId, seq, departAt, arriveAt, doneAt }: PlanJob): PlanJob => ({ id, x, y, type, urgency, windowStart, windowEnd, est, extra, status, techId, seq, departAt, arriveAt, doneAt });

export default async function CustomerPage() {
  const view = await board(await getCtx());
  const sample = view.jobs.find((job) => job.key === "m3");
  const mine = view.jobs.filter((job) => job.source === "web");
  return (
    <main className="flex-1">
      {/* First screen: the company speaking, over a photograph of the kind of room it works in. */}
      <div className="relative isolate overflow-hidden pb-28 lg:pb-32">
        <Image src="/photos/kitchen.jpg" alt="" fill preload sizes="100vw" className="-z-20 object-cover object-[60%_55%]" />
        <div aria-hidden className="hero-wash absolute inset-0 -z-10" />
        <div className="mx-auto max-w-[88rem] px-4 pt-10 sm:px-6 lg:pt-16">
          <p className="tag bg-surface text-[0.9375rem] text-accent-deep shadow-rest">Plumbing and drains in {COMPANY.town}</p>
          <h1 className="mt-4 max-w-2xl text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-[4.25rem]">Request a plumber</h1>
          <p className="mt-4 max-w-xl text-xl leading-snug text-[#3b4270]">Four quick questions, then a page to follow your visit.</p>
        </div>
      </div>

      <div className="relative mx-auto -mt-20 w-full max-w-[88rem] px-4 pb-12 sm:px-6 lg:-mt-24">
        {mine.length > 0 && (
          <p className="mb-3 rounded-2xl bg-ink px-5 py-3.5 leading-snug text-white shadow-lift">
            Your bookings:{" "}
            {mine.map((job, index) => (
              <span key={job.id}>
                {index > 0 && ", "}
                <Link href={`/track/${job.id}`} className="font-semibold text-sun underline underline-offset-4">
                  {job.customer}
                </Link>
              </span>
            ))}
          </p>
        )}
        <div className="sheet p-5 sm:p-7 lg:p-9">
          <RequestForm plan={view.plan.map(slim)} now={view.now} own={mine.length} max={MAX_OWN_REQUESTS} />
        </div>

        <section aria-labelledby="after-title" className="mt-12 grid items-center gap-x-12 gap-y-8 lg:mt-16 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
          <div className="grid grid-cols-[3fr_2fr] gap-3 sm:gap-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] shadow-lift">
              <Image src="/photos/basin.jpg" alt="A bathroom with a round basin under a window" fill sizes="(min-width: 64rem) 28vw, 58vw" className="object-cover" />
            </div>
            <div className="relative overflow-hidden rounded-[1.25rem] shadow-lift">
              <Image src="/photos/tap.jpg" alt="A brushed steel tap on a white counter" fill sizes="(min-width: 64rem) 19vw, 38vw" className="object-cover object-[50%_80%]" />
            </div>
          </div>
          <div>
            <h2 id="after-title" className="text-3xl font-semibold leading-tight lg:text-[2.25rem]">What happens after you book</h2>
            <ol className="mt-5 space-y-4 text-lg leading-snug">
              <li className="flex gap-3.5">
                <span aria-hidden className="step-no mt-0.5">1</span>
                <span>You get your own page, with the technician&apos;s name and when to expect them.</span>
              </li>
              <li className="flex gap-3.5">
                <span aria-hidden className="step-no mt-0.5">2</span>
                <span>We text you when they set off, and again if the time changes.</span>
              </li>
              <li className="flex gap-3.5">
                <span aria-hidden className="step-no mt-0.5">3</span>
                <span>The page keeps up with the day, so you never have to ring to ask.</span>
              </li>
            </ol>
            {sample && (
              <p className="mt-6 max-w-xl text-lg leading-snug text-muted">
                Or follow a customer who is already booked:{" "}
                <Link href={`/track/${sample.id}`} className="link">
                  {sample.customer}&apos;s visit
                </Link>
                . It changes as the day moves on.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
