import Link from "next/link";
import { lateJobs } from "@/components/proposal";
import { Avatar, Tag, UrgencyTag, surname } from "@/components/ui";
import type { Job } from "@/db/schema";
import { fmtDuration, fmtTime } from "@/lib/clock";
import { JOB_TYPES, TECHS } from "@/lib/crew";
import { areaOf } from "@/lib/town";
import { board, type Board } from "@/server/queries";
import { getCtx } from "@/server/session";

const count = (n: number, one: string, many: string) => (n === 1 ? `One ${one}` : `${n} ${many}`);

/** The one sentence at the top: what needs the dispatcher now, in plain words. */
function headline(view: Board, late: number): string {
  const waiting = view.inbox.length;
  const asks: string[] = [];
  if (view.proposal) asks.push(`${count(late, "customer", "customers")} will be kept waiting`);
  if (waiting > 0) asks.push(`${count(waiting, "request needs", "requests need")} you`);
  if (asks.length === 0) return "Nothing needs you right now. The crew is on plan.";
  return `${asks.join(", and ").replace(/^./, (c) => c.toUpperCase())}.`;
}

function what(job: Job): string {
  const kind = job.status === "hold" ? "Mentions a smell of gas" : job.type ? JOB_TYPES[job.type].label : "Kind of job not clear yet";
  return `${kind}, ${areaOf(job).name}`;
}

export default async function TodayPage() {
  const view = await board(await getCtx());
  const late = lateJobs(view);
  const firstToRead = view.inbox.find((item) => item.job.status === "new" && item.job.type && item.message);
  const { slots } = view.projection;
  return (
    <main className="mx-auto w-full max-w-[88rem] flex-1 px-4 py-8 sm:px-6 lg:py-12">
      <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-labelledby="today-title">
          <p className="text-lg text-muted">{fmtTime(view.now)}, today</p>
          <h1 id="today-title" className="mt-1 max-w-3xl text-balance text-[2.25rem] leading-[1.08] lg:text-[3rem]">
            {headline(view, late.length)}
          </h1>
          {view.lateAndTold > 0 && <p className="mt-3 text-lg text-muted">{count(view.lateAndTold, "customer is", "customers are")} running late and already told.</p>}

          <ul data-tour="list" className="sheet mt-8 divide-y divide-line overflow-hidden">
            {view.proposal && (
              <li>
                <Link href="/reshuffle" data-tour="decision" className="flex items-center gap-4 bg-gradient-to-r from-sun-tint to-[#fffaf0] px-5 py-5 hover:to-sun-tint sm:px-6">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-semibold leading-snug">A job is running long</span>
                    <span className="mt-0.5 block text-[1.0625rem] leading-snug text-[#5b4a1c]">
                      {late.length > 0 ? `${late.map((job) => surname(job.customer)).join(", ").replace(/, ([^,]*)$/, " and $1")} would be late. The rules propose a reshuffle.` : "Customers need a text with their new time."}
                    </span>
                  </span>
                  <span className="tag bg-sun text-ink">Decide</span>
                  <Chevron />
                </Link>
              </li>
            )}
            {view.inbox.map((item) => {
              const { job } = item;
              return (
                <li key={job.id}>
                  <Link href={`/jobs/${job.id}`} data-tour={item === firstToRead ? "row" : undefined} className="flex items-center gap-4 px-5 py-5 hover:bg-[#f6f8fb] sm:px-6">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xl font-semibold leading-snug">{job.customer}</span>
                        <UrgencyTag job={job} />
                      </span>
                      <span className="mt-0.5 block text-[1.0625rem] leading-snug text-muted">
                        {what(job)}. {item.message ? item.message.channel : "Booked online"} at {fmtTime(job.receivedAt)}.
                      </span>
                    </span>
                    <Chevron />
                  </Link>
                </li>
              );
            })}
            {!view.proposal && view.inbox.length === 0 && (
              <li className="px-5 py-6 text-lg leading-snug text-muted sm:px-6">Every request has been dealt with. Skip ahead to see what comes in next.</li>
            )}
          </ul>
        </section>

        <section aria-labelledby="crew-title" className="lg:pt-2">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="crew-title" className="text-2xl font-semibold">
              The crew now
            </h2>
            <Link href="/schedule" className="link">
              Whole day
            </Link>
          </div>
          <ul className="panel mt-4 divide-y divide-line">
            {TECHS.map((tech) => {
              const day = view.jobs.filter((job) => job.techId === tech.id && slots[job.id]).sort((a, b) => a.seq - b.seq);
              const current = day.find((job) => job.status === "on_site" || job.status === "en_route");
              const next = day.find((job) => job.status === "scheduled");
              const behind = day.find((job) => (job.status === "scheduled" || job.status === "en_route") && slots[job.id].late > 0);
              const overtime = view.projection.techs[tech.id].overtime;
              const doing = current ? `${current.status === "on_site" ? "At" : "Driving to"} ${surname(current.customer)}` : next ? `Free until ${fmtTime(slots[next.id].depart)}` : "Finished for the day";
              return (
                <li key={tech.id} data-tone={tech.tone}>
                  <Link href="/schedule" className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#f6f8fb]">
                    <Avatar initial={tech.first[0]} className="size-10 text-lg" />
                    <span className="min-w-0 flex-1 leading-snug">
                      <span className="block font-semibold">{tech.first}</span>
                      <span className="block text-muted">{doing}</span>
                    </span>
                    {behind ? <Tag tone="alert">{fmtDuration(slots[behind.id].late)} behind</Tag> : overtime > 0 ? <Tag tone="alert">{fmtDuration(overtime)} past 5</Tag> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}

function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-5 flex-none text-faint">
      <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
