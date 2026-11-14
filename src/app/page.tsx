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
    <main className="mx-auto w-full max-w-[88rem] flex-1 space-y-6 px-4 py-6 sm:px-6">
      {view.now === START_NOW && (
        <section aria-labelledby="guide-title" className="panel p-4 sm:p-5">
          <h2 id="guide-title" className="text-xl font-bold">
            Three things to try
          </h2>
          <ol className="mt-2 grid list-decimal gap-x-8 gap-y-2 pl-5 leading-snug md:grid-cols-3">
            <li>
              Read <a href="#inbox" className="font-semibold underline underline-offset-4">Renee Kowalczyk&apos;s message</a> below. See what the AI pulled out of it, then who the rules would send and why. Send someone.
            </li>
            <li>
              Press <strong className="font-semibold">Skip ahead 30 minutes</strong> twice. A job runs long and an emergency comes in. Accept the reshuffle, then open Texts to customers.
            </li>
            <li>
              Switch to <Link href="/customer" className="font-semibold underline underline-offset-4">Customer</Link> and book a visit. Your booking lands on this board.
            </li>
          </ol>
        </section>
      )}

      {view.proposal && <Proposal view={view} />}

      <section aria-labelledby="board-title">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 id="board-title" className="text-3xl font-bold">
            Today&apos;s board
          </h1>
          <p className="text-muted">
            {view.inbox.length === 0 ? "Nothing is waiting for you." : <a href="#inbox" className="font-semibold text-ink underline underline-offset-4">{view.inbox.length === 1 ? "1 request is" : `${view.inbox.length} requests are`} waiting for you</a>}
            {view.lateAndTold > 0 && ` ${view.lateAndTold === 1 ? "One customer is running late and has" : `${view.lateAndTold} customers are running late and have`} been told.`}
          </p>
        </div>
        <Board jobs={view.jobs} projection={view.projection} now={view.now} />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section id="inbox" aria-labelledby="inbox-title" className="scroll-mt-4 space-y-4">
          <h2 id="inbox-title" className="text-2xl font-bold">
            Waiting for you
          </h2>
          {view.inbox.length === 0 && <p className="panel p-4 text-muted">Every request has been dealt with. Skip ahead to see what comes in next.</p>}
          {view.inbox.map((item) => (
            <InboxCard key={item.job.id} item={item} now={view.now} />
          ))}
        </section>
        <section aria-labelledby="map-title" className="space-y-4 lg:sticky lg:top-4">
          <h2 id="map-title" className="text-2xl font-bold">
            Where everyone is
          </h2>
          <TownMap jobs={view.jobs} plan={view.plan} projection={view.projection} now={view.now} />
        </section>
      </div>
    </main>
  );
}
