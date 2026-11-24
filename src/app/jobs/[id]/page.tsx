import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { Decide, MessageText, Options, ReadingPanel } from "@/components/inbox";
import { STATUS_LABEL, Tag, TechName, UrgencyTag } from "@/components/ui";
import { fmtDuration, fmtTime, fmtWindow } from "@/lib/clock";
import { JOB_TYPES } from "@/lib/crew";
import { areaOf } from "@/lib/town";
import { cancelAction } from "@/server/actions";
import { jobDetail } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Job" };

export default async function JobPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const detail = await jobDetail(await getCtx(), id);
  if (!detail) notFound();
  const { job, slot, message, reading, options, now } = detail;
  const waiting = job.status === "new" || job.status === "hold";
  const row = (label: string, value: React.ReactNode) => (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </>
  );
  const facts = (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[1.0625rem] leading-snug [&_dd]:font-semibold">
      {row("Job", job.type ? `${JOB_TYPES[job.type].label}, about ${fmtDuration(job.est + job.extra)} on site` : "Not decided yet")}
      {!message && row("Problem", job.problem)}
      {row("Address", `${job.street}, ${areaOf(job).name}`)}
      {row("Phone", job.phone)}
      {!waiting && row("Technician", <TechName id={job.techId} full />)}
      {!waiting && job.status !== "tomorrow" && job.status !== "referred" && job.status !== "cancelled" && row(job.urgency === "emergency" ? "Aim to arrive by" : "Window given", job.urgency === "emergency" ? fmtTime(job.windowEnd) : fmtWindow(job.windowStart, job.windowEnd))}
      {slot && row(job.status === "done" || job.status === "on_site" ? "Arrived" : "Expected", `${fmtTime(slot.arrive)}, ${job.status === "done" ? "finished" : "finishing about"} ${fmtTime(slot.end)}`)}
      {slot && slot.drive > 0 && job.status !== "done" && row("Drive", `${fmtDuration(slot.drive)} to get there`)}
      {job.note && row("Technician's note", job.note)}
    </dl>
  );
  const record = (
    <div className="sheet divide-y divide-line px-5 sm:px-6">
      {waiting && (
        <details className="fold py-1.5">
          <summary className="text-lg">Address, phone and job</summary>
          <div className="pb-4 pt-1">{facts}</div>
        </details>
      )}
      <details className="fold py-1.5">
        <summary className="text-lg">Texts to this customer ({detail.texts.length})</summary>
        <div className="pb-4">
          <p className="text-muted">Queued in the outbox. Nothing is sent.</p>
          <ul className="mt-3 space-y-2">
            {detail.texts.map((text) => (
              <li key={text.id} className="rounded-2xl rounded-bl-md bg-[#f0f3f8] px-4 py-3 leading-snug">
                <span className="block font-semibold text-muted">{fmtTime(text.at)}</span>
                {text.body}
              </li>
            ))}
          </ul>
        </div>
      </details>
      <details className="fold py-1.5">
        <summary className="text-lg">History</summary>
        <div className="pb-4">
          {detail.history.length === 0 && <p className="text-muted">Booked before the demo day began. Nothing has changed since.</p>}
          <ol className="space-y-2 leading-snug">
            {detail.history.map((event) => (
              <li key={event.id} className="grid grid-cols-[5rem_1fr] gap-x-2">
                <span className="font-semibold tabular-nums text-muted">{fmtTime(event.at)}</span>
                <span>{event.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </details>
      <p className="py-4">
        <Link href={`/track/${job.id}`} className="link">
          See what this customer sees
        </Link>
      </p>
    </div>
  );
  return (
    <main className="mx-auto w-full max-w-[88rem] flex-1 px-4 py-7 sm:px-6 lg:py-9">
      <Link href="/" className="link">
        &larr; Today
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="mr-1 text-[2rem] leading-tight lg:text-[2.5rem]">{job.customer}</h1>
        {waiting ? (
          <UrgencyTag job={job} />
        ) : (
          <Tag tone={job.status === "done" || job.status === "cancelled" ? "quiet" : job.status === "tomorrow" ? "warn" : job.status === "referred" ? "alert" : "good"}>{STATUS_LABEL[job.status]}</Tag>
        )}
        {slot && slot.late > 0 && job.status !== "done" && job.status !== "on_site" && <Tag tone="alert">{fmtDuration(slot.late)} late</Tag>}
      </div>
      <p className="mt-1 text-lg text-muted">
        {job.street}, {areaOf(job).name}. Received {fmtTime(job.receivedAt)}.
      </p>

      <div className="mt-7 grid items-start gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          {message && (
            <section data-tour="reading" aria-label="The customer's message" className="sheet space-y-4 p-5 sm:p-6">
              <MessageText message={message} reading={reading} />
              {reading && <ReadingPanel reading={reading} />}
            </section>
          )}
          {(!waiting || !message) && <section className="sheet p-5 sm:p-6">{facts}</section>}
        </div>

        <div className="space-y-6">
          {waiting && (
            <section data-tour="send" className="sheet p-5 sm:p-6">
              <Decide item={detail} now={now} />
              {job.status === "new" && job.type && (
                <ActionButton action={cancelAction.bind(null, job.id)} pendingLabel="Cancelling" variant="danger" className="mt-6 border-t border-line pt-5">
                  Cancel this request
                </ActionButton>
              )}
            </section>
          )}
          {job.status === "scheduled" && job.type && (
            <section className="sheet p-5 sm:p-6">
              <h2 className="text-2xl font-semibold">Move to someone else</h2>
              <p className="mt-1 text-[1.0625rem] text-muted">Written rules, not AI.</p>
              <div className="mt-4">
                <Options job={job} options={options} now={now} />
              </div>
              <ActionButton action={cancelAction.bind(null, job.id)} pendingLabel="Cancelling" variant="danger" className="mt-4">
                Cancel this job
              </ActionButton>
            </section>
          )}
          {record}
        </div>
      </div>
    </main>
  );
}
