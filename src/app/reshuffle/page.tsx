import type { Metadata } from "next";
import Link from "next/link";
import { Proposal } from "@/components/proposal";
import { fmtTime } from "@/lib/clock";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Reshuffle" };

/** The one decision the day's slipping asks of the dispatcher. */
export default async function ReshufflePage() {
  const view = await board(await getCtx());
  return (
    <main className="mx-auto w-full max-w-[88rem] flex-1 px-4 py-7 sm:px-6 lg:py-9">
      <Link href="/" className="link">
        &larr; Today
      </Link>
      {view.proposal ? (
        <>
          <h1 className="mt-4 max-w-3xl text-balance text-[2rem] leading-tight lg:text-[2.5rem]">A job is running long. Here is a way to catch up.</h1>
          <p className="mt-2 text-lg text-muted">As of {fmtTime(view.now)}. Nothing changes until you accept.</p>
          <div className="mt-7">
            <Proposal view={view} />
          </div>
        </>
      ) : (
        <div className="mt-4">
          <h1 className="text-[2rem] leading-tight lg:text-[2.5rem]">Nothing to decide</h1>
          <p className="mt-2 max-w-xl text-lg leading-snug text-muted">
            The day is back on plan, or the customers who are late have been told.{" "}
            <Link href="/messages" className="link">
              See the texts
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}
