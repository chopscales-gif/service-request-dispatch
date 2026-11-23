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
    <main className="mx-auto w-full max-w-[88rem] flex-1 px-4 py-9 sm:px-6 lg:py-12">
      <h1 className="text-4xl lg:text-[3.25rem]">Whose phone?</h1>
      <p className="mt-2 max-w-xl leading-relaxed text-muted">Each technician sees only their own day. What they tap here moves the dispatcher&apos;s board.</p>
      <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {TECHS.map((tech) => {
          const day = view.jobs.filter((job) => job.techId === tech.id && view.projection.slots[job.id]).sort((a, b) => a.seq - b.seq);
          const next = day.find((job) => job.status !== "done");
          return (
            <li key={tech.id} data-tone={tech.tone}>
              <Link href={`/tech/${tech.id}`} className="sheet flex h-full items-center gap-4 p-4 transition-colors hover:border-(--tone) xl:flex-col xl:items-start xl:gap-5 xl:p-5">
                <Avatar initial={tech.first[0]} className="size-14 text-2xl" />
                <span className="min-w-0 leading-snug">
                  <span className="block font-display text-xl font-semibold">{tech.name}</span>
                  <span className="block text-sm text-muted">{tech.role}</span>
                  <span className="mt-2 block font-semibold text-(--tone)">
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
