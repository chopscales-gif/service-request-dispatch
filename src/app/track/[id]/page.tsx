import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fmtBetween, fmtTime, fmtWindow } from "@/lib/clock";
import { COMPANY, JOB_TYPES, TECH_BY_ID } from "@/lib/crew";
import { areaOf } from "@/lib/town";
import { jobDetail } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Your visit" };

const STEPS = [
  { status: "scheduled", label: "Booked" },
  { status: "en_route", label: "On the way" },
  { status: "on_site", label: "Arrived" },
  { status: "done", label: "Done" },
] as const;

/** What one customer sees about their own visit. Nothing about anyone else's. */
export default async function TrackPage({ params }: PageProps<"/track/[id]">) {
  const { id } = await params;
  const detail = await jobDetail(await getCtx(), id);
  if (!detail) notFound();
  const { job, slot } = detail;
  const tech = TECH_BY_ID[job.techId ?? ""];
  const reached = STEPS.findIndex((step) => step.status === job.status);
  const late = slot !== null && slot.late > 0 && (job.status === "scheduled" || job.status === "en_route");

  let headline: string;
  let detailLine: string;
  if (job.status === "referred" || job.status === "hold") {
    // A safety hold is only ever a smell of gas, and the customer is told what to do straight away.
    headline = "Leave the house and call the gas company";
    detailLine = "Take everyone with you and call your gas company's emergency line or 911 from outside. A smell of gas is not a job for a plumber. We can come once they say it is safe.";
  } else if (job.status === "new") {
    headline = "We have your message";
    detailLine = "Our dispatcher is looking at it now and will text you shortly.";
  } else if (job.status === "tomorrow") {
    headline = "We can come tomorrow morning";
    detailLine = job.source === "web" ? "Today is full. We have offered a visit tomorrow between 8 and 10 AM." : "We have offered a visit tomorrow between 8 and 10 AM. Reply to our text to book it.";
  } else if (job.status === "cancelled") {
    headline = "This visit was cancelled";
    detailLine = `Call us on ${COMPANY.phone} if that is a mistake.`;
  } else if (job.status === "done") {
    headline = `${tech.first} has finished`;
    detailLine = `Finished at ${fmtTime(slot!.end)}. Thank you for calling us.`;
  } else if (job.status === "on_site") {
    headline = `${tech.first} is with you`;
    detailLine = `Arrived at ${fmtTime(slot!.arrive)}.`;
  } else if (job.status === "en_route") {
    headline = `${tech.first} is on the way`;
    detailLine = `Expected about ${fmtTime(slot!.arrive)}.`;
  } else if (late) {
    headline = `${tech.first} is running late`;
    detailLine = `We now expect ${tech.first} about ${fmtTime(slot!.arrive)}.`;
  } else {
    headline = job.urgency === "emergency" ? `${tech.first} is coming to you` : `${tech.first} will arrive ${fmtBetween(job.windowStart, job.windowEnd)}`;
    detailLine = `Right now we expect ${tech.first} about ${fmtTime(slot!.arrive)}.`;
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <p className="text-muted">
        {job.customer}, {job.street}, {areaOf(job).name}
      </p>
      <h1 className="mt-1 text-4xl font-bold leading-tight">{headline}</h1>
      <p className="mt-2 text-lg leading-snug">{detailLine}</p>
      {late && (
        <p role="status" className="mt-3 rounded-md border-2 border-ink bg-hivis-tint p-3 leading-snug">
          {job.urgency === "emergency" ? "We are running behind and we are sorry. Keep the main water valve off if you can." : `We are running behind. That is later than the ${fmtWindow(job.windowStart, job.windowEnd)} we gave you, and we are sorry.`}
        </p>
      )}

      {reached >= 0 && (
        <ol className="mt-6 grid grid-cols-4 gap-1.5" aria-label="Progress">
          {STEPS.map((step, index) => (
            <li key={step.status} aria-current={index === reached ? "step" : undefined} className="text-center text-sm font-semibold leading-tight">
              <span className={`mb-1.5 block h-2 rounded-full ${index <= reached ? "bg-accent" : "bg-line"}`} />
              <span className={index <= reached ? "text-ink" : "text-muted"}>{step.label}</span>
            </li>
          ))}
        </ol>
      )}

      {tech && reached >= 0 && (
        <section data-tone={tech.tone} className="panel mt-6 flex items-center gap-3 p-4">
          <span aria-hidden className="grid h-12 w-12 flex-none place-items-center rounded bg-(--tone) font-display text-xl font-bold text-white">
            {tech.first[0]}
          </span>
          <p className="leading-snug">
            <span className="block font-semibold">{tech.name}</span>
            <span className="text-muted">{job.type && JOB_TYPES[job.type].label}</span>
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-bold">Texts from us</h2>
        <p className="text-sm text-muted">In the demo these are shown here and never sent.</p>
        {detail.texts.length === 0 && <p className="mt-2 text-muted">None yet today.</p>}
        <ul className="mt-3 space-y-2">
          {detail.texts.map((text) => (
            <li key={text.id} className="mr-8 rounded-xl rounded-bl-sm bg-idle px-3.5 py-2.5 leading-snug">
              {text.body}
              <span className="mt-1 block text-sm text-muted">{fmtTime(text.at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
