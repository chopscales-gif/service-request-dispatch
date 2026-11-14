import type { Metadata } from "next";
import Link from "next/link";
import { STATUS_LABEL, surname } from "@/components/ui";
import { fmtTime } from "@/lib/clock";
import { TECHS } from "@/lib/crew";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Crew" };

export default async function CrewPage() {
  const view = await board(await getCtx());
  return (
    <main className="mx-auto w-full max-w-[88rem] flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-4xl lg:text-5xl">Whose phone?</h1>
      <p className="mt-2 max-w-xl leading-relaxed text-muted">Each technician sees only their own day. What they tap here moves the dispatcher&apos;s board.</p>
      <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {TECHS.map((tech) => {
          const day = view.jobs.filter((job) => job.techId === tech.id && view.projection.slots[job.id]).sort((a, b) => a.seq - b.seq);
          const next = day.find((job) => job.status !== "done");
          return (
            <li key={tech.id} data-tone={tech.tone}>
              <Link href={`/tech/${tech.id}`} className="flex h-full items-center gap-3 rounded-[3px] border-2 border-ink bg-surface p-3 shadow-[0_4px_0_var(--tone)] hover:bg-hivis-tint xl:flex-col xl:items-start xl:p-4">
                <span aria-hidden className="grid h-12 w-12 flex-none place-items-center rounded-[3px] bg-(--tone) font-display text-2xl font-extrabold text-white">
                  {tech.first[0]}
                </span>
                <span className="min-w-0 leading-snug">
                  <span className="block font-display text-lg font-bold">{tech.name}</span>
                  <span className="block text-sm text-muted">{tech.role}</span>
                  <span className="mt-1 block font-semibold">
                    {next ? (next.status === "scheduled" ? `Next: ${surname(next.customer)}, about ${fmtTime(view.projection.slots[next.id].arrive)}` : `${STATUS_LABEL[next.status]}: ${surname(next.customer)}`) : "Finished for the day"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
