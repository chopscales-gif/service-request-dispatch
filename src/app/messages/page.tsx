import type { Metadata } from "next";
import Link from "next/link";
import { fmtTime } from "@/lib/clock";
import { outbox } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Texts to customers" };

export default async function MessagesPage() {
  const { texts } = await outbox(await getCtx());
  return (
    <main className="mx-auto w-full max-w-[88rem] flex-1 px-4 py-6 sm:px-6">
      <div className="grid gap-x-12 gap-y-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
      <h1 className="text-3xl lg:text-4xl">Texts to customers</h1>
      <p className="max-w-2xl leading-relaxed text-muted">
        Every text the day has produced, newest first. The wording is fixed, with names and times filled in from the board. This is an outbox: in the demo nothing is sent to anyone. A real build hands these to a texting
        service.
      </p>
      </div>
      <ul className="mt-5 divide-y divide-line overflow-hidden rounded-[3px] border-2 border-ink bg-surface">
        {texts.map((text) => (
          <li key={text.id} className="gap-x-6 px-4 py-3 lg:grid lg:grid-cols-[5.5rem_22rem_minmax(0,1fr)] lg:items-baseline">
            <p className="contents text-sm text-muted">
              <span className="mr-3 text-base font-bold tabular-nums text-ink">{fmtTime(text.at)}</span>
              <span>
                To{" "}
                <Link href={`/jobs/${text.job.id}`} className="font-semibold text-ink underline underline-offset-4">
                  {text.job.customer}
                </Link>
                , {text.job.phone}
                . <span className="font-semibold">Not sent</span>
              </span>
            </p>
            <p className="mt-1.5 max-w-4xl leading-snug lg:mt-0">{text.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
