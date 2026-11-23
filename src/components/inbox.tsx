import Link from "next/link";
import type { Job } from "@/db/schema";
import { fmtDuration, fmtTime } from "@/lib/clock";
import { JOB_TYPES, JOB_TYPE_KEYS, TECH_BY_ID } from "@/lib/crew";
import type { Message, Reading } from "@/lib/reading";
import type { Option } from "@/lib/suggest";
import { EMERGENCY_RULE, GAS_RULE } from "@/lib/texts";
import { areaOf } from "@/lib/town";
import { assignAction, offerTomorrowAction, referGasAction, setTypeAction } from "@/server/actions";
import type { InboxItem } from "@/server/queries";
import { ActionButton } from "./action-button";
import { Tag, TechName, UrgencyTag } from "./ui";

const quotesOf = (reading: Reading) => [reading.job_type.quote, reading.urgency.quote, reading.safety?.quote, ...reading.access.map((item) => item.quote)].filter((quote): quote is string => !!quote);

/** The customer's words, with the parts the AI reading quoted marked. */
export function MessageText({ message, reading }: { message: Message; reading: Reading | null }) {
  const spans = (reading ? quotesOf(reading) : [])
    .map((quote) => ({ from: message.text.indexOf(quote), to: message.text.indexOf(quote) + quote.length }))
    .filter((span) => span.from >= 0)
    .sort((a, b) => a.from - b.from);
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const span of spans) {
    if (span.to <= at) continue;
    const from = Math.max(span.from, at);
    if (from > at) parts.push(message.text.slice(at, from));
    parts.push(
      <mark key={from} className="mark">
        {message.text.slice(from, span.to)}
      </mark>,
    );
    at = span.to;
  }
  parts.push(message.text.slice(at));
  return (
    <figure>
      <figcaption className="text-sm font-medium text-muted">{message.channel}, as it arrived</figcaption>
      <blockquote className="mt-2 whitespace-pre-line rounded-2xl rounded-tl-md bg-[#f1f3fb] px-4 py-3.5 text-[1.0625rem] leading-relaxed">{parts}</blockquote>
    </figure>
  );
}

const READ_TYPE: Record<Reading["job_type"]["value"], string> = { ...Object.fromEntries(JOB_TYPE_KEYS.map((key) => [key, JOB_TYPES[key].label])), unclear: "Not clear from the message" } as Record<Reading["job_type"]["value"], string>;
const READ_URGENCY: Record<Reading["urgency"]["value"], string> = { emergency: "Emergency", today: "Wants someone today", flexible: "Can wait", unstated: "Does not say" };

/** What the recorded AI reading made of the message. It describes; it does not decide. */
export function ReadingPanel({ reading }: { reading: Reading }) {
  return (
    <div className="rounded-2xl border border-[#d5dbf8] bg-gradient-to-b from-accent-tint to-[#f4f5fe] p-4">
      <p className="text-sm font-semibold text-accent-deep">Read by AI (recorded). Marked words are what it quoted.</p>
      <p className="mt-2 leading-snug">{reading.summary}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-[#d5dbf8] pt-3 text-[0.9375rem] leading-snug">
        <dt className="text-muted">Job</dt>
        <dd className="font-semibold">{READ_TYPE[reading.job_type.value]}</dd>
        <dt className="text-muted">How soon</dt>
        <dd>
          <span className="font-semibold">{READ_URGENCY[reading.urgency.value]}.</span> {reading.urgency.why}
        </dd>
        {reading.safety && (
          <>
            <dt className="text-muted">Safety</dt>
            <dd className="font-semibold text-flag">{reading.safety.what}</dd>
          </>
        )}
        {reading.access.length > 0 && (
          <>
            <dt className="text-muted">Access</dt>
            <dd>{reading.access.map((item) => item.text).join(" ")}</dd>
          </>
        )}
      </dl>
      {reading.ask_first.length > 0 && (
        <>
          <p className="mt-4 text-sm font-semibold text-accent-deep">Worth asking when you call back</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[0.9375rem] leading-snug">
            {reading.ask_first.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </>
      )}
      {reading.notes.length > 0 && (
        <>
          <p className="mt-4 text-sm font-semibold text-accent-deep">Its notes</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[0.9375rem] leading-snug">
            {reading.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Who the written rules would send, best first, each with its reasons and a button. */
export function Options({ job, options, now }: { job: Job; options: Option[]; now: number }) {
  const moving = job.status === "scheduled";
  const able = options.filter((option) => option.ok && !(moving && option.techId === job.techId));
  const unable = options.filter((option) => !option.ok);
  return (
    <div>
      <ul className="space-y-2">
        {able.map((option, index) => {
          if (!option.ok) return null;
          const tech = TECH_BY_ID[option.techId];
          return (
            <li
              key={option.techId}
              data-tone={tech.tone}
              className={`flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-2xl border px-3.5 py-3 sm:flex-nowrap ${index === 0 && !moving ? "border-accent bg-accent-tint/60 shadow-[inset_0_0_0_1px_var(--color-accent)]" : "border-line bg-surface"}`}
            >
              <div className="min-w-0 flex-1 basis-56 sm:basis-0">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <TechName id={option.techId} full />
                  {index === 0 && !moving && <Tag tone="good">The rules&apos; first choice</Tag>}
                  {option.late > 0 && <Tag tone="alert">{fmtDuration(option.late)} after {job.urgency === "emergency" ? "the 90 minutes we aim for" : "the window"}</Tag>}
                </p>
                <p className="mt-1 text-[0.9375rem] leading-snug text-muted">{option.reasons.join(". ")}.</p>
              </div>
              <ActionButton action={assignAction.bind(null, { id: job.id, techId: option.techId })} pendingLabel="Booking" variant={index === 0 && !moving ? "primary" : "quiet"} className="sm:flex-none">
                {moving ? `Move to ${tech.first}` : `Send ${tech.first}`}
              </ActionButton>
            </li>
          );
        })}
      </ul>
      {unable.length > 0 && (
        <p className="mt-3 text-sm leading-snug text-muted">
          Ruled out: {unable.map((option) => `${TECH_BY_ID[option.techId].first} (${option.ok ? "" : option.reason.toLowerCase()})`).join(", ")}.
        </p>
      )}
      <p className="mt-2 text-sm leading-snug text-muted">Arrival times are as of {fmtTime(now)}. The choice is yours: the rules only rank.</p>
    </div>
  );
}

/** One request waiting for the dispatcher. */
export function InboxCard({ item, now }: { item: InboxItem; now: number }) {
  const { job, message, reading, options } = item;
  const hold = job.status === "hold";
  const emergency = job.urgency === "emergency" && !hold;
  return (
    <article id={`job-${job.id}`} className={`sheet overflow-hidden ${hold || emergency ? "border-[#f0b8c3]" : ""}`}>
      <header className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-5 py-3.5 ${hold || emergency ? "border-[#f5ccd4] bg-gradient-to-r from-flag-tint to-[#fff6f4]" : "border-line bg-[#f8f9fe]"}`}>
        <h3 className="text-[1.375rem] font-semibold">
          <Link href={`/jobs/${job.id}`} className="underline decoration-[#c5cdea] underline-offset-4 hover:decoration-ink">
            {job.customer}
          </Link>
        </h3>
        <UrgencyTag job={job} />
        <p className="text-sm text-muted">
          {job.street}, {areaOf(job).name}. Received {fmtTime(job.receivedAt)}.
        </p>
      </header>
      <div className="grid gap-x-8 gap-y-5 p-5 xl:grid-cols-2">
        <div className="space-y-3">
          {message && <MessageText message={message} reading={reading} />}
          {reading && <ReadingPanel reading={reading} />}
        </div>
        <div>
          {hold ? (
            <>
              <h4 className="font-display text-xl font-semibold text-flag">Held by a written rule: the message mentions a smell of gas</h4>
              <p className="mt-1.5 leading-snug">{GAS_RULE}</p>
              <p className="mt-1.5 text-sm leading-snug text-muted">This request cannot be booked from here, whatever the AI reading says about it.</p>
              <ActionButton action={referGasAction.bind(null, job.id)} pendingLabel="Queuing" variant="danger" className="mt-3">
                Queue the safety text and close
              </ActionButton>
            </>
          ) : !job.type ? (
            <>
              <h4 className="font-display text-xl font-semibold">What kind of job is this?</h4>
              <p className="mt-1.5 leading-snug text-muted">The reading could not tell from the message, so nobody is suggested yet. Call the customer, then choose.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {JOB_TYPE_KEYS.filter((key) => key !== "water_heater_replace").map((key) => (
                  <ActionButton key={key} action={setTypeAction.bind(null, { id: job.id, type: key })} pendingLabel="Saving" variant="quiet">
                    {JOB_TYPES[key].label}
                  </ActionButton>
                ))}
              </div>
            </>
          ) : (
            <>
              <h4 className="font-display text-xl font-semibold">Who to send (written rules, not AI)</h4>
              <p className="mt-1 text-sm leading-snug text-muted">
                The job: {JOB_TYPES[job.type].label.toLowerCase()}, about {fmtDuration(job.est)} on site.
              </p>
              {emergency && <p className="mt-2.5 rounded-xl bg-flag-tint px-3.5 py-2.5 text-[0.9375rem] leading-snug">{EMERGENCY_RULE}</p>}
              <div className="mt-3">
                <Options job={job} options={options} now={now} />
              </div>
              {!emergency && (
                <ActionButton action={offerTomorrowAction.bind(null, job.id)} pendingLabel="Queuing" variant="quiet" className="mt-3">
                  Offer tomorrow morning instead
                </ActionButton>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
