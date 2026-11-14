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
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <h1 className="text-4xl font-bold">Whose phone?</h1>
      <p className="mt-2 leading-relaxed text-muted">Each technician sees only their own day. What they tap here moves the dispatcher&apos;s board.</p>
      <ul className="mt-5 space-y-2">
        {TECHS.map((tech) => {
          const day = view.jobs.filter((job) => job.techId === tech.id && view.projection.slots[job.id]).sort((a, b) => a.seq - b.seq);
          const next = day.find((job) => job.status !== "done");
          return (
            <li key={tech.id} data-tone={tech.tone}>
              <Link href={`/tech/${tech.id}`} className="panel flex items-center gap-3 p-3 hover:border-ink">
                <span aria-hidden className="grid h-11 w-11 flex-none place-items-center rounded bg-(--tone) font-display text-xl font-bold text-white">
                  {tech.first[0]}
                </span>
                <span className="min-w-0 leading-snug">
                  <span className="block font-display text-lg font-bold">{tech.name}</span>
                  <span className="block text-muted">
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
