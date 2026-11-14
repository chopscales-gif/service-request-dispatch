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
    detailLine = `Expected about ${fmtTime(slot!.arrive).replace(" ", "\u00a0")}.`;
  } else if (late) {
    headline = `${tech.first} is running late`;
    detailLine = `We now expect ${tech.first} about ${fmtTime(slot!.arrive).replace(" ", "\u00a0")}.`;
  } else {
    headline = job.urgency === "emergency" ? `${tech.first} is coming to you` : `${tech.first} will arrive ${fmtBetween(job.windowStart, job.windowEnd)}`;
    detailLine = `Right now we expect ${tech.first} about ${fmtTime(slot!.arrive).replace(" ", "\u00a0")}.`;
  }

  return (
    <main className="flex-1">
      <div className={`${job.status === "referred" || job.status === "hold" ? "bg-flag text-white" : "bg-hivis"} pb-8 pt-6 lg:pb-10 lg:pt-10`}>
        <div className="mx-auto max-w-[72rem] px-4 sm:px-6">
          <p className="font-semibold">
            {job.customer}, {job.street}, {areaOf(job).name}
          </p>
          <h1 className="mt-2 max-w-5xl text-balance text-4xl leading-none sm:text-5xl lg:text-[3.5rem]">{headline.replace(/(\d) (AM|PM)/g, "$1\u00a0$2")}</h1>
          <p className="mt-3 max-w-2xl text-lg leading-snug lg:text-xl">{detailLine}</p>

          {reached >= 0 && (
            <ol className="mt-7 grid max-w-3xl grid-cols-4 gap-1.5" aria-label="Progress">
              {STEPS.map((step, index) => (
                <li key={step.status} aria-current={index === reached ? "step" : undefined} className="text-sm font-semibold leading-tight sm:text-base">
                  <span className={`mb-1.5 block h-3 border-2 border-ink ${index <= reached ? "bg-ink" : "bg-transparent"}`} />
                  <span className={index === reached ? "font-extrabold" : index < reached ? "" : "text-ink/75"}>{step.label}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-[72rem] items-start gap-x-12 gap-y-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-4">
          {late && (
            <p role="status" className="rounded-[3px] border-2 border-ink bg-hivis-tint p-4 leading-snug">
              {job.urgency === "emergency" ? "We are running behind and we are sorry. Keep the main water valve off if you can." : `We are running behind. That is later than the ${fmtWindow(job.windowStart, job.windowEnd)} we gave you, and we are sorry.`}
            </p>
          )}
          {tech && reached >= 0 && (
            <section data-tone={tech.tone} className="flex items-center gap-4 rounded-[3px] border-2 border-ink bg-surface p-4">
              <span aria-hidden className="grid h-14 w-14 flex-none place-items-center rounded-[3px] bg-(--tone) font-display text-2xl font-extrabold text-white">
                {tech.first[0]}
              </span>
              <p className="leading-snug">
                <span className="block text-sm text-muted">Your technician</span>
                <span className="block font-display text-xl font-bold">{tech.name}</span>
                <span className="text-muted">{job.type && JOB_TYPES[job.type].label}</span>
              </p>
            </section>
          )}
          {job.status !== "cancelled" && (
          <p className="leading-snug text-muted">
            Questions about this visit? Call {COMPANY.name} on <span className="font-semibold text-ink">{COMPANY.phone}</span>.
          </p>
          )}
        </div>

        <section>
          <h2 className="text-2xl font-bold">Texts from us</h2>
          <p className="text-sm text-muted">In the demo these are shown here and never sent.</p>
          {detail.texts.length === 0 && <p className="mt-2 text-muted">None yet today.</p>}
          <ul className="mt-3 space-y-2">
            {detail.texts.map((text) => (
              <li key={text.id} className="mr-8 max-w-lg rounded-2xl rounded-bl-sm bg-surface px-4 py-3 leading-snug shadow-[0_1px_0_rgb(20_20_20/0.15)]">
                {text.body}
                <span className="mt-1 block text-sm text-muted">{fmtTime(text.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
