import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { fmtBetween, fmtTime, fmtWindow } from "@/lib/clock";
import { COMPANY, JOB_TYPES, TECH_BY_ID } from "@/lib/crew";
import { Avatar } from "@/components/ui";
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

  const danger = job.status === "referred" || job.status === "hold";
  return (
    <main className="flex-1">
      <div className={`relative isolate overflow-hidden pb-10 pt-8 lg:pb-14 lg:pt-14 ${danger ? "bg-flag text-white" : ""}`}>
        {!danger && (
          <>
            <Image src="/photos/vanity.jpg" alt="" fill preload sizes="100vw" className="-z-20 object-cover object-[50%_45%]" />
            <div aria-hidden className="hero-wash absolute inset-0 -z-10" />
          </>
        )}
        <div className="mx-auto max-w-[72rem] px-4 sm:px-6">
          <p className={`tag text-[0.9375rem] ${danger ? "bg-white/15 text-white" : "bg-surface text-accent-deep shadow-rest"}`}>
            {job.customer}, {job.street}, {areaOf(job).name}
          </p>
          <h1 className="mt-4 max-w-4xl text-balance text-4xl leading-[1.04] sm:text-5xl lg:text-[3.75rem]">{headline.replace(/(\d) (AM|PM)/g, "$1\u00a0$2")}</h1>
          <p className={`mt-4 max-w-2xl text-lg leading-snug lg:text-xl ${danger ? "" : "text-[#3b4270]"}`}>{detailLine}</p>

          {reached >= 0 && (
            <ol className="sheet mt-8 grid max-w-3xl grid-cols-4 gap-2 px-4 py-4 sm:gap-3 sm:px-6 sm:py-5" aria-label="Progress">
              {STEPS.map((step, index) => (
                <li key={step.status} aria-current={index === reached ? "step" : undefined} className="text-sm font-medium leading-tight sm:text-base">
                  <span className={`mb-2.5 block h-2 rounded-full ${index <= reached ? "bg-accent" : "bg-idle"}`} />
                  <span className={`flex items-center gap-1.5 ${index === reached ? "font-semibold text-accent-deep" : index < reached ? "text-ink" : "text-muted"}`}>
                    {index === reached && <span aria-hidden className="size-2 flex-none rounded-full bg-sun ring-2 ring-[#ffe6ad]" />}
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-[72rem] items-start gap-x-12 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-4">
          {late && (
            <p role="status" className="rounded-2xl border border-[#f1cf7e] bg-sun-tint p-4 leading-snug">
              {job.urgency === "emergency" ? "We are running behind and we are sorry. Keep the main water valve off if you can." : `We are running behind. That is later than the ${fmtWindow(job.windowStart, job.windowEnd)} we gave you, and we are sorry.`}
            </p>
          )}
          {tech && reached >= 0 && (
            <section data-tone={tech.tone} className="sheet flex items-center gap-4 p-5">
              <Avatar initial={tech.first[0]} className="size-16 text-[1.75rem]" />
              <p className="leading-snug">
                <span className="block text-sm font-medium text-muted">Your technician</span>
                <span className="block font-display text-2xl font-semibold">{tech.name}</span>
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
          <h2 className="text-2xl font-semibold">Texts from us</h2>
          <p className="mt-0.5 text-sm text-muted">In the demo these are shown here and never sent.</p>
          {detail.texts.length === 0 && <p className="mt-3 text-muted">None yet today.</p>}
          <ul className="mt-4 space-y-2.5">
            {detail.texts.map((text) => (
              <li key={text.id} className="mr-8 max-w-lg rounded-[1.25rem] rounded-bl-md border border-line bg-surface px-4 py-3 leading-snug shadow-rest">
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
