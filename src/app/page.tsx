import Link from "next/link";
import { Board } from "@/components/board";
import { InboxCard } from "@/components/inbox";
import { Proposal } from "@/components/proposal";
import { TownMap } from "@/components/town-map";
import { START_NOW } from "@/lib/clock";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

export default async function BoardPage() {
  const view = await board(await getCtx());
  return (
    <main className="mx-auto w-full max-w-[88rem] flex-1 space-y-8 px-4 py-6 sm:px-6 lg:py-8">
      {view.now === START_NOW && (
        <section aria-labelledby="guide-title" className="rounded-[1.25rem] border border-[#d3dae8] bg-gradient-to-br from-accent-tint to-[#f6f8fb] px-5 py-4 sm:px-6 sm:py-5">
          <h2 id="guide-title" className="text-xl font-semibold">
            Three things to try
          </h2>
          <ol className="mt-3 grid gap-x-8 gap-y-3 text-[0.9375rem] leading-snug md:grid-cols-3">
            <li className="flex gap-3">
              <span aria-hidden className="step-no bg-surface">1</span>
              <span>
                Read <a href="#inbox" className="link">Renee Kowalczyk&apos;s message</a> below. See what the AI pulled out of it, then who the rules would send and why. Send someone.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="step-no bg-surface">2</span>
              <span>
                Press <strong className="font-semibold">Skip ahead 30 minutes</strong> twice. A job runs long and an emergency comes in. Accept the reshuffle, then open Texts to customers.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="step-no bg-surface">3</span>
              <span>
                Switch to <Link href="/customer" className="link">Customer</Link> and book a visit. Your booking lands on this board.
              </span>
            </li>
          </ol>
        </section>
      )}

      {view.proposal && <Proposal view={view} />}

      <section aria-labelledby="board-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h1 id="board-title" className="text-[2rem] leading-tight lg:text-[2.5rem]">
            Today&apos;s board
          </h1>
          <p className="pb-1 text-muted">
            {view.inbox.length === 0 ? "Nothing is waiting for you." : <a href="#inbox" className="tag bg-sun-tint text-[0.9375rem] text-sun-deep underline decoration-[#e2b959] underline-offset-4">{view.inbox.length === 1 ? "1 request is" : `${view.inbox.length} requests are`} waiting for you</a>}
            {view.lateAndTold > 0 && ` ${view.lateAndTold === 1 ? "One customer is running late and has" : `${view.lateAndTold} customers are running late and have`} been told.`}
          </p>
        </div>
        <Board jobs={view.jobs} projection={view.projection} now={view.now} />
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section id="inbox" aria-labelledby="inbox-title" className="scroll-mt-4 space-y-4">
          <h2 id="inbox-title" className="text-2xl font-semibold">
            Waiting for you
          </h2>
          {view.inbox.length === 0 && <p className="panel p-5 text-muted">Every request has been dealt with. Skip ahead to see what comes in next.</p>}
          {view.inbox.map((item) => (
            <InboxCard key={item.job.id} item={item} now={view.now} />
          ))}
        </section>
        <section aria-labelledby="map-title" className="space-y-4 lg:sticky lg:top-4">
          <h2 id="map-title" className="text-2xl font-semibold">
            Where everyone is
          </h2>
          <TownMap jobs={view.jobs} plan={view.plan} projection={view.projection} now={view.now} />
        </section>
      </div>
    </main>
  );
}
