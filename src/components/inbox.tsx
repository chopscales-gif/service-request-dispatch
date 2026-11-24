import type { Job } from "@/db/schema";
import { fmtDuration, fmtTime } from "@/lib/clock";
import { JOB_TYPES, JOB_TYPE_KEYS, TECH_BY_ID } from "@/lib/crew";
import type { Message, Reading } from "@/lib/reading";
import type { Option } from "@/lib/suggest";
import { EMERGENCY_RULE, GAS_RULE } from "@/lib/texts";
import { assignAction, offerTomorrowAction, referGasAction, setTypeAction } from "@/server/actions";
import type { InboxItem } from "@/server/queries";
import { ActionButton } from "./action-button";
import { Tag, TechName } from "./ui";

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
      <figcaption className="font-medium text-muted">{message.channel}, as it arrived</figcaption>
      <blockquote className="mt-2 whitespace-pre-line rounded-2xl rounded-tl-md bg-[#f0f3f8] px-4 py-3.5 text-[1.0625rem] leading-relaxed">{parts}</blockquote>
    </figure>
  );
}

const READ_TYPE: Record<Reading["job_type"]["value"], string> = { ...Object.fromEntries(JOB_TYPE_KEYS.map((key) => [key, JOB_TYPES[key].label])), unclear: "Not clear from the message" } as Record<Reading["job_type"]["value"], string>;
const READ_URGENCY: Record<Reading["urgency"]["value"], string> = { emergency: "Emergency", today: "Wants someone today", flexible: "Can wait", unstated: "Does not say" };

/** What the recorded AI reading made of the message. It describes; it does not decide. */
export function ReadingPanel({ reading }: { reading: Reading }) {
  return (
    <div className="rounded-2xl border border-[#d3dae8] bg-gradient-to-b from-accent-tint to-[#f6f8fb] p-4">
      <p className="font-semibold text-accent-deep">Read by AI (recorded). Marked words are what it quoted.</p>
      <p className="mt-2 text-[1.0625rem] leading-snug">{reading.summary}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-[#d3dae8] pt-3 leading-snug">
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
      {(reading.ask_first.length > 0 || reading.notes.length > 0) && (
        <details data-tour="asks" className="fold mt-3 border-t border-[#d3dae8] pt-1">
          <summary className="text-accent-deep">What to ask, and its notes</summary>
          {reading.ask_first.length > 0 && (
            <>
              <p className="mt-1 font-semibold">Worth asking when you call back</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 leading-snug">
                {reading.ask_first.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </>
          )}
          {reading.notes.length > 0 && (
            <>
              <p className="mt-4 font-semibold">Its notes</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 leading-snug">
                {reading.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </>
          )}
        </details>
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
                <p className="mt-1 leading-snug text-muted">{option.reasons.join(". ")}.</p>
              </div>
              <ActionButton action={assignAction.bind(null, { id: job.id, techId: option.techId })} pendingLabel="Booking" variant={index === 0 && !moving ? "primary" : "quiet"} className="sm:flex-none">
                {moving ? `Move to ${tech.first}` : `Send ${tech.first}`}
              </ActionButton>
            </li>
          );
        })}
      </ul>
      {unable.length > 0 && (
        <p className="mt-3 leading-snug text-muted">
          Ruled out: {unable.map((option) => `${TECH_BY_ID[option.techId].first} (${option.ok ? "" : option.reason.toLowerCase()})`).join(", ")}.
        </p>
      )}
      <p className="mt-2 leading-snug text-muted">As of {fmtTime(now)}. The rules only rank; the choice is yours.</p>
    </div>
  );
}

/** What the dispatcher does with a request that is waiting: deal with the hold, say what the job is, or send someone. */
export function Decide({ item, now }: { item: InboxItem; now: number }) {
  const { job, options } = item;
  if (job.status === "hold")
    return (
      <>
        <h2 className="text-2xl font-semibold text-flag">Held: the message mentions a smell of gas</h2>
        <p className="mt-2 text-[1.0625rem] leading-snug">{GAS_RULE}</p>
        <p className="mt-2 leading-snug text-muted">A written rule holds it, whatever the AI reading says. It cannot be booked.</p>
        <ActionButton action={referGasAction.bind(null, job.id)} pendingLabel="Queuing" variant="danger" className="mt-4">
          Queue the safety text and close
        </ActionButton>
      </>
    );
  if (!job.type)
    return (
      <>
        <h2 className="text-2xl font-semibold">What kind of job is this?</h2>
        <p className="mt-2 text-[1.0625rem] leading-snug text-muted">The reading could not tell, so nobody is suggested yet. Call the customer, then choose.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {JOB_TYPE_KEYS.filter((key) => key !== "water_heater_replace").map((key) => (
            <ActionButton key={key} action={setTypeAction.bind(null, { id: job.id, type: key })} pendingLabel="Saving" variant="quiet">
              {JOB_TYPES[key].label}
            </ActionButton>
          ))}
        </div>
      </>
    );
  const emergency = job.urgency === "emergency";
  return (
    <>
      <h2 className="text-2xl font-semibold">Who to send</h2>
      <p className="mt-1 text-[1.0625rem] leading-snug text-muted">
        Written rules, not AI. {JOB_TYPES[job.type].label}, about {fmtDuration(job.est)} on site.
      </p>
      {emergency && <p className="mt-3 rounded-xl bg-flag-tint px-4 py-3 leading-snug">{EMERGENCY_RULE}</p>}
      <div className="mt-4">
        <Options job={job} options={options} now={now} />
      </div>
      {!emergency && (
        <ActionButton action={offerTomorrowAction.bind(null, job.id)} pendingLabel="Queuing" variant="quiet" className="mt-4">
          Offer tomorrow morning instead
        </ActionButton>
      )}
    </>
  );
}
