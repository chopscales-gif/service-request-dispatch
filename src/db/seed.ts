import { EMERGENCY_MINUTES } from "@/lib/windows";
import { START_NOW, SHIFT_END } from "@/lib/clock";
import { JOB_TYPES, TECH_BY_ID } from "@/lib/crew";
import { BOOKED, INBOUND, type Inbound } from "@/lib/day";
import { MESSAGE_BY_KEY, READING_BY_KEY, mentionsGas } from "@/lib/reading";
import { TEXTS } from "@/lib/texts";
import type { Db } from "./client";
import { events, jobs, texts, type NewJob } from "./schema";


/**
 * A request that arrived as a message, as it lands in the inbox. The recorded
 * AI reading supplies the kind of job and how urgent it is. Written rules do
 * the rest: a smell of gas is held and never booked, and a job the reading
 * could not name waits for the dispatcher to name it.
 */
/** The readings are recordings, and the history says so. */
export const MESSAGE_EVENT = "Message received. The AI reading attached to it is a recording.";

export function inboxRow(sandboxId: string, inbound: Inbound): NewJob {
  const message = MESSAGE_BY_KEY[inbound.key];
  const reading = READING_BY_KEY[inbound.key];
  const type = reading.job_type.value === "unclear" ? null : reading.job_type.value;
  const urgency = reading.urgency.value === "unstated" ? "today" : reading.urgency.value;
  const gas = reading.safety?.hazard === "gas_smell" || mentionsGas(message.text);
  return {
    id: crypto.randomUUID(),
    sandboxId,
    source: "message",
    messageKey: inbound.key,
    receivedAt: inbound.receivedAt,
    customer: inbound.customer,
    phone: inbound.phone,
    street: inbound.street,
    x: inbound.x,
    y: inbound.y,
    type,
    urgency,
    problem: reading.summary,
    windowStart: inbound.receivedAt,
    windowEnd: urgency === "emergency" ? inbound.receivedAt + EMERGENCY_MINUTES : SHIFT_END,
    est: type ? JOB_TYPES[type].minutes : 60,
    status: gas ? "hold" : "new",
  };
}

/** Fills a new sandbox with the day as it stands at 9:30. */
export async function seedSandbox({ db, sandboxId }: { db: Db; sandboxId: string }): Promise<void> {
  const seq: Record<string, number> = {};
  const booked = BOOKED.map((job): NewJob => {
    seq[job.tech] = (seq[job.tech] ?? -1) + 1;
    return {
      id: crypto.randomUUID(),
      sandboxId,
      source: "office",
      key: job.key,
      receivedAt: 7 * 60 + 30,
      customer: job.customer,
      phone: job.phone,
      street: job.street,
      x: job.x,
      y: job.y,
      type: job.type,
      urgency: "today",
      problem: job.problem,
      windowStart: job.window * 60,
      windowEnd: job.window * 60 + 120,
      est: JOB_TYPES[job.type].minutes,
      status: job.status,
      techId: job.tech,
      seq: seq[job.tech],
      departAt: job.departAt ?? null,
      arriveAt: job.arriveAt ?? null,
      doneAt: job.doneAt ?? null,
    };
  });
  const inbox = INBOUND.filter((inbound) => inbound.receivedAt <= START_NOW).map((inbound) => inboxRow(sandboxId, inbound));
  await db.insert(jobs).values([...booked, ...inbox]);

  // The texts that have already gone out this morning.
  const sent = booked.flatMap((job) => {
    const tech = TECH_BY_ID[job.techId!].first;
    return [
      job.departAt != null ? { sandboxId, jobId: job.id, at: job.departAt, body: TEXTS.onTheWay(tech, job.arriveAt ?? job.departAt + 12) } : null,
      job.doneAt != null ? { sandboxId, jobId: job.id, at: job.doneAt, body: TEXTS.done(tech) } : null,
    ].filter((text) => text !== null);
  });
  await db.insert(texts).values(sent);
  await db.insert(events).values(inbox.map((job) => ({ sandboxId, jobId: job.id, at: job.receivedAt, text: MESSAGE_EVENT })));
}
