import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TechActions } from "@/components/tech-actions";
import { STATUS_LABEL, Tag } from "@/components/ui";
import { fmtDuration, fmtTime, fmtWindow } from "@/lib/clock";
import { JOB_TYPES, TECH_BY_ID } from "@/lib/crew";
import { READING_BY_KEY } from "@/lib/reading";
import { areaOf } from "@/lib/town";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "My day" };

export default async function TechPage({ params }: PageProps<"/tech/[id]">) {
  const { id } = await params;
  const tech = TECH_BY_ID[id];
  if (!tech) notFound();
  const view = await board(await getCtx());
  const { slots } = view.projection;
  const day = view.jobs.filter((job) => job.techId === id && slots[job.id]).sort((a, b) => a.seq - b.seq);
  const current = day.find((job) => job.status !== "done");
  const later = day.filter((job) => job.status !== "done" && job !== current);
  const done = day.filter((job) => job.status === "done");
  const access = current?.messageKey ? READING_BY_KEY[current.messageKey].access : [];
  return (
    <main data-tone={tech.tone} className="mx-auto w-full max-w-md flex-1 px-4 py-6 sm:px-6 lg:max-w-[88rem]">
      <Link href="/tech" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
        All technicians
      </Link>
      <h1 className="mt-1 flex items-center gap-3 text-3xl lg:text-5xl">
        <span aria-hidden className="grid h-10 w-10 flex-none place-items-center rounded-[3px] bg-(--tone) text-xl font-extrabold text-white lg:h-12 lg:w-12">
          {tech.first[0]}
        </span>
        {tech.first}&apos;s day
      </h1>
      <p className="mt-1 text-muted">
        {fmtTime(view.now)}. {done.length} done, {day.length - done.length} to go.
      </p>

      <div className="mt-4 grid items-start gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      {current ? (
        <section className="rounded-[3px] border-2 border-ink bg-surface p-4 shadow-[0_5px_0_var(--tone)] lg:p-6">
          <p className="flex flex-wrap items-center gap-2">
            <Tag tone={current.status === "scheduled" ? "quiet" : "good"}>{current.status === "scheduled" ? "Next job" : STATUS_LABEL[current.status]}</Tag>
            {current.urgency === "emergency" && <Tag tone="alert">Emergency</Tag>}
            {slots[current.id].late > 0 && current.status !== "on_site" && <Tag tone="alert">{slots[current.id].late} min behind</Tag>}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold lg:text-3xl">{current.customer}</h2>
          <p className="leading-snug">
            {current.street}, {areaOf(current).name}
          </p>
          <p className="text-muted">{current.phone}</p>
          <p className="mt-3 font-semibold">{current.type && JOB_TYPES[current.type].label}</p>
          <p className="leading-snug">{current.problem}</p>
          {access.length > 0 && <p className="mt-2 border-l-8 border-hivis bg-hivis-tint px-3 py-2 leading-snug">{access.map((item) => item.text).join(" ")}</p>}
          <p className="mt-3 text-sm leading-snug text-muted">
            {current.urgency === "emergency" ? "Go straight there." : `Customer was told ${fmtWindow(current.windowStart, current.windowEnd)}.`}{" "}
            {current.status === "on_site" ? `Planned to finish about ${fmtTime(slots[current.id].end)}.` : `${slots[current.id].drive > 0 ? `${fmtDuration(slots[current.id].drive)} drive, arriving` : "Arriving"} about ${fmtTime(slots[current.id].arrive)}.`}
          </p>
          <div className="mt-4">
            <TechActions key={`${current.id}-${current.status}`} id={current.id} status={current.status} />
          </div>
        </section>
      ) : (
        <p className="panel p-4">Nothing left today.</p>
      )}

      <div>
      {later.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">After that</h2>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {later.map((job) => (
              <li key={job.id} className="flex items-baseline gap-3 py-2.5">
                <span className="w-20 flex-none font-bold tabular-nums">{fmtTime(slots[job.id].arrive)}</span>
                <span className="min-w-0 flex-1 leading-snug">
                  <span className="font-semibold">{job.customer}</span>
                  <span className="block text-sm text-muted">
                    {job.type && JOB_TYPES[job.type].label}, {job.street}
                  </span>
                </span>
                {slots[job.id].late > 0 && <Tag tone="alert">{slots[job.id].late} min late</Tag>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <p className="mt-6 text-muted">
          Done today: {done.map((job) => job.customer).join(", ")}.
        </p>
      )}
      <p className="mt-6 border-t border-line pt-3 text-sm leading-snug text-muted">In the demo, technicians you are not playing carry on with the plan by themselves each time you skip ahead.</p>
      </div>
      </div>
    </main>
  );
}
