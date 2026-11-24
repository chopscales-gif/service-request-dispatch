import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, STATUS_LABEL, surname } from "@/components/ui";
import { fmtTime } from "@/lib/clock";
import { TECHS } from "@/lib/crew";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Crew" };

export default async function CrewPage() {
  const view = await board(await getCtx());
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-9 sm:px-6 lg:py-12">
      <h1 className="text-4xl lg:text-[3rem]">Whose phone?</h1>
      <p className="mt-2 text-lg leading-snug text-muted">Each technician sees only their own day.</p>
      <ul className="sheet mt-7 divide-y divide-line overflow-hidden">
        {TECHS.map((tech) => {
          const day = view.jobs.filter((job) => job.techId === tech.id && view.projection.slots[job.id]).sort((a, b) => a.seq - b.seq);
          const next = day.find((job) => job.status !== "done");
          return (
            <li key={tech.id} data-tone={tech.tone}>
              <Link href={`/tech/${tech.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-[#f6f8fb]">
                <Avatar initial={tech.first[0]} className="size-12 text-xl" />
                <span className="min-w-0 flex-1 leading-snug">
                  <span className="block font-display text-xl font-semibold">{tech.name}</span>
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
