import type { Metadata } from "next";
import { Board } from "@/components/board";
import { TownMap } from "@/components/town-map";
import { fmtTime } from "@/lib/clock";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Schedule" };

/** The whole day, for when the dispatcher wants it: the board, and where everyone is. */
export default async function SchedulePage() {
  const view = await board(await getCtx());
  return (
    <main className="mx-auto w-full max-w-[88rem] flex-1 space-y-10 px-4 py-7 sm:px-6 lg:py-9">
      <section aria-labelledby="board-title">
        <h1 id="board-title" className="text-[2rem] leading-tight lg:text-[2.5rem]">
          The whole day
        </h1>
        <p className="mb-5 mt-1 text-lg text-muted">As of {fmtTime(view.now)}. Open a job for its details.</p>
        <Board jobs={view.jobs} projection={view.projection} now={view.now} />
      </section>
      <section aria-labelledby="map-title" className="max-w-2xl">
        <h2 id="map-title" className="mb-4 text-2xl font-semibold">
          Where everyone is
        </h2>
        <TownMap jobs={view.jobs} plan={view.plan} projection={view.projection} now={view.now} />
      </section>
    </main>
  );
}
