import Link from "next/link";
import type { Job } from "@/db/schema";
import { SHIFT_END, SHIFT_START, fmtDuration, fmtHour, fmtTime, fmtWindow } from "@/lib/clock";
import { JOB_TYPES, TECHS } from "@/lib/crew";
import type { Projection, Slot } from "@/lib/plan";
import { Avatar, STATUS_LABEL, Tag, surname } from "./ui";

/** The board runs from the start of the shift to an hour past its end, so overtime has somewhere to show. */
const FROM = SHIFT_START;
const TO = SHIFT_END + 60;
const pct = (minutes: number) => `${((Math.min(Math.max(minutes, FROM), TO) - FROM) / (TO - FROM)) * 100}%`;
const HOURS = Array.from({ length: (TO - FROM) / 60 }, (_, index) => FROM + index * 60);

type Props = { jobs: Job[]; projection: Projection; now: number };

const dayOf = (jobs: Job[], slots: Projection["slots"], techId: string) => jobs.filter((job) => job.techId === techId && slots[job.id]).sort((a, b) => a.seq - b.seq);

function doing(day: Job[], slots: Projection["slots"]): string {
  const current = day.find((job) => job.status === "on_site" || job.status === "en_route");
  if (current) return `${current.status === "on_site" ? "On site at" : "Driving to"} ${surname(current.customer)}`;
  const next = day.find((job) => job.status === "scheduled");
  return next ? `Free until ${fmtTime(slots[next.id].depart)}` : "Finished for the day";
}

const title = (job: Job, slot: Slot) =>
  `${job.customer}, ${job.type ? JOB_TYPES[job.type].label.toLowerCase() : "job"}. ${STATUS_LABEL[job.status]}. ${fmtTime(slot.arrive)} to ${fmtTime(slot.end)}. ${job.urgency === "emergency" ? "Emergency" : `Window ${fmtWindow(job.windowStart, job.windowEnd)}`}.${slot.late > 0 ? ` ${fmtDuration(slot.late)} late.` : ""}`;

/**
 * The day's board: technicians down the side, hours across. Every position is
 * worked out from the plan, so a job that runs long pushes the ones after it
 * along the row.
 */
export function Board({ jobs, projection, now }: Props) {
  const { slots } = projection;
  return (
    <>
      <div className="sheet hidden overflow-hidden md:block">
        <div className="relative">
          <div className="grid grid-cols-[14rem_1fr] border-b border-line bg-[#f6f8fb] text-sm text-muted">
            <div className="self-end px-5 py-2 font-medium">Technician</div>
            <div className="relative h-[4.5rem]">
              {HOURS.map((hour) => (
                <span key={hour} className="absolute bottom-2 pl-2 font-medium tabular-nums" style={{ left: pct(hour) }}>
                  {fmtHour(hour)}
                </span>
              ))}
            </div>
          </div>
          {TECHS.map((tech) => {
            const day = dayOf(jobs, slots, tech.id);
            const overtime = projection.techs[tech.id].overtime;
            return (
              <div key={tech.id} data-tone={tech.tone} className="grid grid-cols-[14rem_1fr] border-b border-line last:border-b-0">
                <div className="flex items-center gap-3 border-r border-line px-5 py-2 leading-tight">
                  <Avatar initial={tech.first[0]} className="size-9 text-base" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{tech.name}</p>
                    <p className="mt-0.5 truncate text-sm text-muted">{overtime > 0 ? <span className="font-semibold text-flag">{fmtDuration(overtime)} past 5 PM</span> : doing(day, slots)}</p>
                  </div>
                </div>
                <div className="board-track">
                  <div className="board-overtime" aria-hidden />
                  {day.map((job) => {
                    const slot = slots[job.id];
                    const late = slot.late > 0 && job.status !== "done" && job.status !== "on_site";
                    // A job that falls off the end of the board is still drawn, at the edge.
                    const from = Math.min(slot.arrive, TO - 30);
                    const until = Math.max(slot.end, from + 30);
                    return (
                      <span key={job.id}>
                        {job.status !== "done" && slot.arrive > slot.depart && <span className="board-drive" aria-hidden style={{ left: pct(slot.depart), width: `calc(${pct(slot.arrive)} - ${pct(slot.depart)})` }} />}
                        <Link
                          href={`/jobs/${job.id}`}
                          className="magnet"
                          data-status={job.status}
                          data-late={late}
                          title={title(job, slot)}
                          aria-label={title(job, slot)}
                          style={{ left: pct(from), width: `calc(${pct(until)} - ${pct(from)})`, "--n": surname(job.customer).length } as React.CSSProperties}
                        >
                          <span className="magnet-name">{surname(job.customer)}</span>
                          {late && <span className="text-xs font-bold">{slot.late} min late</span>}
                        </Link>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="pointer-events-none absolute inset-y-0 left-[14rem] right-0" aria-hidden>
            <div className="board-now" style={{ left: pct(now) }}>
              <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2.5 text-sm font-semibold leading-6 text-white tabular-nums shadow-[0_4px_10px_rgb(28_34_71/0.25)]">Now {fmtTime(now)}</span>
            </div>
          </div>
        </div>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line bg-[#f6f8fb] px-5 py-3 text-sm text-muted">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="h-3.5 w-6 rounded-[5px] bg-accent" />
            Solid: on site now.
          </span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="h-3.5 w-6 rounded-[5px] border-[1.5px] border-accent bg-surface" />
            Outlined: still to come.
          </span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="h-3.5 w-6 rounded-[5px] border border-[#d5daea] bg-idle" />
            Grey: done.
          </span>
          <span className="inline-flex items-center gap-2 font-semibold text-flag">
            <span aria-hidden className="h-3.5 w-6 rounded-[5px] border-[1.5px] border-flag bg-flag-tint" />
            Red: will arrive later than the customer was told.
          </span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="h-[3px] w-6 bg-[repeating-linear-gradient(to_right,var(--color-accent)_0_5px,transparent_5px_9px)]" />
            Dashes: driving.
          </span>
        </p>
      </div>

      {/* On a phone the same plan reads better as a list for each technician. */}
      <div className="space-y-3 md:hidden">
        {TECHS.map((tech) => {
          const day = dayOf(jobs, slots, tech.id).filter((job) => job.status !== "done");
          return (
            <section key={tech.id} data-tone={tech.tone} className="panel overflow-hidden">
              <h3 className="flex items-center gap-2.5 border-b border-line bg-[#f6f8fb] px-4 py-2.5 text-lg font-semibold">
                <Avatar initial={tech.first[0]} className="size-8 text-sm" />
                {tech.name}
              </h3>
              {day.length === 0 && <p className="px-4 py-3 text-muted">Finished for the day.</p>}
              <ul className="divide-y divide-line">
                {day.map((job) => {
                  const slot = slots[job.id];
                  const late = slot.late > 0 && (job.status === "scheduled" || job.status === "en_route");
                  return (
                    <li key={job.id}>
                      <Link href={`/jobs/${job.id}`} className="flex min-h-11 items-baseline gap-3 px-4 py-3">
                        <span className="w-20 flex-none font-bold tabular-nums">{fmtTime(slot.arrive)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold">{job.customer}</span>
                          <span className="block text-sm text-muted">{job.type && JOB_TYPES[job.type].label}</span>
                        </span>
                        {late ? <Tag tone="alert">{slot.late} min late</Tag> : job.status !== "scheduled" && <Tag tone="good">{STATUS_LABEL[job.status]}</Tag>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
