import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TechActions } from "@/components/tech-actions";
import { Avatar, STATUS_LABEL, Tag } from "@/components/ui";
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
    <main data-tone={tech.tone} className="mx-auto w-full max-w-md flex-1 px-4 py-7 sm:px-6 lg:max-w-[88rem] lg:py-9">
      <Link href="/tech" className="link inline-flex min-h-11 items-center">
        &larr; All technicians
      </Link>
      <h1 className="mt-1 flex items-center gap-3.5 text-3xl lg:text-[3rem]">
        <Avatar initial={tech.first[0]} className="size-11 text-xl lg:size-14 lg:text-2xl" />
        {tech.first}&apos;s day
      </h1>
      <p className="mt-2 text-muted">
        {fmtTime(view.now)}. {done.length} done, {day.length - done.length} to go.
      </p>

      <div className="mt-5 grid items-start gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      {current ? (
        <section className="sheet border-t-4 border-t-(--tone) p-5 lg:p-7">
          <p className="flex flex-wrap items-center gap-2">
            <Tag tone={current.status === "scheduled" ? "quiet" : "good"}>{current.status === "scheduled" ? "Next job" : STATUS_LABEL[current.status]}</Tag>
            {current.urgency === "emergency" && <Tag tone="alert">Emergency</Tag>}
            {slots[current.id].late > 0 && current.status !== "on_site" && <Tag tone="alert">{slots[current.id].late} min behind</Tag>}
          </p>
          <h2 className="mt-3 text-[1.75rem] font-semibold leading-tight lg:text-[2.25rem]">{current.customer}</h2>
          <p className="leading-snug">
            {current.street}, {areaOf(current).name}
          </p>
          <p className="text-muted">{current.phone}</p>
          <p className="mt-3 font-semibold">{current.type && JOB_TYPES[current.type].label}</p>
          <p className="leading-snug">{current.problem}</p>
          {access.length > 0 && <p className="mt-3 rounded-xl border border-[#f1cf7e] bg-sun-tint px-3.5 py-2.5 leading-snug">{access.map((item) => item.text).join(" ")}</p>}
          <p className="mt-3 text-sm leading-snug text-muted">
            {current.urgency === "emergency" ? "Go straight there." : `Customer was told ${fmtWindow(current.windowStart, current.windowEnd)}.`}{" "}
            {current.status === "on_site" ? `Planned to finish about ${fmtTime(slots[current.id].end)}.` : `${slots[current.id].drive > 0 ? `${fmtDuration(slots[current.id].drive)} drive, arriving` : "Arriving"} about ${fmtTime(slots[current.id].arrive)}.`}
          </p>
          <div className="mt-5 border-t border-line pt-5">
            <TechActions key={`${current.id}-${current.status}`} id={current.id} status={current.status} />
          </div>
        </section>
      ) : (
        <p className="panel p-5">Nothing left today.</p>
      )}

      <div>
      {later.length > 0 && (
        <section className="sheet p-5 lg:p-6">
          <h2 className="text-xl font-semibold">After that</h2>
          <ul className="mt-2 divide-y divide-line">
            {later.map((job) => (
              <li key={job.id} className="flex items-baseline gap-3 py-3 last:pb-0">
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
