import type { Metadata } from "next";
import Link from "next/link";
import { fmtTime } from "@/lib/clock";
import { outbox } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Texts to customers" };

export default async function MessagesPage() {
  const { texts } = await outbox(await getCtx());
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <h1 className="text-3xl font-bold">Texts to customers</h1>
      <p className="mt-2 leading-relaxed text-muted">
        Every text the day has produced, newest first. The wording is fixed, with names and times filled in from the board. This is an outbox: in the demo nothing is sent to anyone. A real build hands these to a texting
        service.
      </p>
      <ul className="mt-5 space-y-3">
        {texts.map((text) => (
          <li key={text.id} className="panel p-4">
            <p className="flex flex-wrap items-baseline gap-x-3 text-sm text-muted">
              <span className="font-display text-base font-semibold text-ink">{fmtTime(text.at)}</span>
              <span>
                To{" "}
                <Link href={`/jobs/${text.job.id}`} className="font-semibold text-ink underline underline-offset-4">
                  {text.job.customer}
                </Link>
                , {text.job.phone}
              </span>
              <span>Not sent</span>
            </p>
            <p className="mt-1.5 leading-snug">{text.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
