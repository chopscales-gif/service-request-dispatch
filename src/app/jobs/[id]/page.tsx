import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { MessageText, Options, ReadingPanel } from "@/components/inbox";
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
  const open = job.status === "new" || job.status === "scheduled";
  const row = (label: string, value: React.ReactNode) => (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </>
  );
  return (
    <main className="mx-auto w-full max-w-[88rem] flex-1 px-4 py-6 sm:px-6">
      <Link href="/" className="font-semibold underline underline-offset-4">
        Back to the board
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-3xl lg:text-4xl">{job.customer}</h1>
        <Tag tone={job.status === "done" ? "quiet" : "good"}>{STATUS_LABEL[job.status]}</Tag>
        <UrgencyTag job={job} />
        {slot && slot.late > 0 && job.status !== "done" && job.status !== "on_site" && <Tag tone="alert">{fmtDuration(slot.late)} late</Tag>}
      </div>

      <div className="mt-5 grid items-start gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-5">
          <section className="rounded-[3px] border-2 border-ink bg-surface p-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 leading-snug">
              {row("Job", job.type ? `${JOB_TYPES[job.type].label}, about ${fmtDuration(job.est + job.extra)} on site` : "Not decided yet")}
              {row("Problem", job.problem)}
              {row("Address", `${job.street}, ${areaOf(job).name}`)}
              {row("Phone", job.phone)}
              {row("Technician", <TechName id={job.techId} full />)}
              {!waiting && job.status !== "tomorrow" && job.status !== "referred" && row(job.urgency === "emergency" ? "Aim to arrive by" : "Window given", job.urgency === "emergency" ? fmtTime(job.windowEnd) : fmtWindow(job.windowStart, job.windowEnd))}
              {slot && row(job.status === "done" || job.status === "on_site" ? "Arrived" : "Expected", `${fmtTime(slot.arrive)}, ${job.status === "done" ? "finished" : "finishing about"} ${fmtTime(slot.end)}`)}
              {slot && slot.drive > 0 && job.status !== "done" && row("Drive", `${fmtDuration(slot.drive)} to get there`)}
              {job.note && row("Technician's note", job.note)}
            </dl>
          </section>

          {message && (
            <section className="space-y-3">
              <h2 className="text-xl font-bold">The customer&apos;s message</h2>
              <MessageText message={message} reading={reading} />
              {reading && <ReadingPanel reading={reading} />}
            </section>
          )}

          {job.status === "hold" && <p className="panel border-flag p-4 leading-snug">This request is held because the message mentions a smell of gas. Deal with it from the board.</p>}
          {job.status === "new" && !job.type && <p className="panel p-4 leading-snug">Say what kind of job this is from the board, and the rules will suggest who to send.</p>}

          {open && job.type && (
            <section>
              <h2 className="text-xl font-bold">{job.status === "scheduled" ? "Move to another technician" : "Who to send"} (written rules, not AI)</h2>
              <div className="mt-2">
                <Options job={job} options={options} now={now} />
              </div>
              <ActionButton action={cancelAction.bind(null, job.id)} pendingLabel="Cancelling" variant="danger" className="mt-4">
                Cancel this job
              </ActionButton>
            </section>
          )}
        </div>

        <div className="space-y-5">
          <section>
            <h2 className="text-xl font-bold">Texts to this customer</h2>
            <p className="text-sm text-muted">Queued in the outbox. Nothing is sent.</p>
            {detail.texts.length === 0 && <p className="mt-2 text-muted">None yet.</p>}
            <ul className="mt-2 space-y-2">
              {detail.texts.map((text) => (
                <li key={text.id} className="panel p-3 leading-snug">
                  <span className="block text-sm font-semibold text-muted">{fmtTime(text.at)}</span>
                  {text.body}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold">History</h2>
            {detail.history.length === 0 && <p className="mt-2 text-muted">Booked before the demo day began. Nothing has changed since.</p>}
            <ol className="mt-2 space-y-1.5 leading-snug">
              {detail.history.map((event) => (
                <li key={event.id} className="grid grid-cols-[5rem_1fr] gap-x-2">
                  <span className="font-semibold tabular-nums text-muted">{fmtTime(event.at)}</span>
                  <span>{event.text}</span>
                </li>
              ))}
            </ol>
          </section>
          <p>
            <Link href={`/track/${job.id}`} className="font-semibold underline underline-offset-4">
              See what this customer sees
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
