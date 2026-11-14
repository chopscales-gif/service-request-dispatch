import type { Metadata } from "next";
import Link from "next/link";
import { RequestForm } from "@/components/request-form";
import { COMPANY } from "@/lib/crew";
import type { PlanJob } from "@/lib/plan";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Request service" };

/** Only what the planning rules need goes to the browser: no other customer's name or address. */
const slim = ({ id, x, y, type, urgency, windowStart, windowEnd, est, extra, status, techId, seq, departAt, arriveAt, doneAt }: PlanJob): PlanJob => ({ id, x, y, type, urgency, windowStart, windowEnd, est, extra, status, techId, seq, departAt, arriveAt, doneAt });

export default async function CustomerPage() {
  const view = await board(await getCtx());
  const sample = view.jobs.find((job) => job.key === "m3");
  const mine = view.jobs.filter((job) => job.source === "web");
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-4xl font-bold">Request a plumber</h1>
      <p className="mt-2 text-lg leading-relaxed text-muted">
        {COMPANY.name} serves {COMPANY.town}. Tell us what is wrong and choose a time. You will get a page to follow your visit.
      </p>
      {mine.length > 0 && (
        <p className="mt-4 panel p-3 leading-snug">
          Your bookings:{" "}
          {mine.map((job, index) => (
            <span key={job.id}>
              {index > 0 && ", "}
              <Link href={`/track/${job.id}`} className="font-semibold underline underline-offset-4">
                {job.customer}
              </Link>
            </span>
          ))}
        </p>
      )}
      <div className="mt-6">
        <RequestForm plan={view.plan.map(slim)} now={view.now} own={mine.length} />
      </div>
      {sample && (
        <p className="mt-10 border-t border-line pt-4 leading-relaxed text-muted">
          Or follow a customer who is already booked:{" "}
          <Link href={`/track/${sample.id}`} className="font-semibold text-ink underline underline-offset-4">
            {sample.customer}&apos;s visit
          </Link>
          . Keep the page open in mind when you skip ahead as the dispatcher.
        </p>
      )}
    </main>
  );
}
