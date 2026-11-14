import type { Metadata } from "next";
import Link from "next/link";
import { RequestForm } from "@/components/request-form";
import { COMPANY } from "@/lib/crew";
import { AREAS } from "@/lib/town";
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
      {/* The side of the van: the company's yellow carries on down from the header. */}
      <div className="bg-hivis pb-20 lg:pb-24">
        <div className="mx-auto grid max-w-[88rem] gap-x-12 gap-y-4 px-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:pt-8">
          <h1 className="text-[2.75rem] leading-[0.95] sm:text-6xl lg:text-[3.25rem] xl:text-6xl">Request a plumber</h1>
          <div className="max-w-xl text-lg leading-snug">
            <p>
              {COMPANY.name} serves {COMPANY.town}. Tell us what is wrong and choose a time. You will get a page to follow your visit.
            </p>
            <p className="mt-2 text-base">
              <span className="font-semibold">Where we work:</span> {AREAS.map((area) => area.name).join(", ")}.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-14 w-full max-w-[88rem] px-4 pb-10 sm:px-6 lg:-mt-16">
        {mine.length > 0 && (
          <p className="mb-3 rounded-[3px] bg-ink px-4 py-3 leading-snug text-white on-dark">
            Your bookings:{" "}
            {mine.map((job, index) => (
              <span key={job.id}>
                {index > 0 && ", "}
                <Link href={`/track/${job.id}`} className="font-semibold text-hivis underline underline-offset-4">
                  {job.customer}
                </Link>
              </span>
            ))}
          </p>
        )}
        <div className="rounded-[3px] border-2 border-ink bg-surface p-4 shadow-[0_6px_0_rgb(20_20_20/0.18)] sm:p-6 lg:p-8">
          <RequestForm plan={view.plan.map(slim)} now={view.now} own={mine.length} max={MAX_OWN_REQUESTS} />
        </div>
        {sample && (
          <p className="mt-6 max-w-3xl leading-relaxed text-muted">
            Or follow a customer who is already booked:{" "}
            <Link href={`/track/${sample.id}`} className="font-semibold text-ink underline underline-offset-4">
              {sample.customer}&apos;s visit
            </Link>
            . The page changes as the day moves on, so look again after you skip ahead.
          </p>
        )}
      </div>
    </main>
  );
}
