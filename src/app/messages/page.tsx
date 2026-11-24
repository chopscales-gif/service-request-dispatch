import type { Metadata } from "next";
import Link from "next/link";
import { fmtTime } from "@/lib/clock";
import { outbox } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Texts to customers" };

export default async function MessagesPage() {
  const { texts } = await outbox(await getCtx());
  return (
    <main className="mx-auto w-full max-w-[88rem] flex-1 px-4 py-7 sm:px-6 lg:py-9">
      <h1 className="text-[2rem] leading-tight lg:text-[2.5rem]">Texts to customers</h1>
      <p className="mt-1 text-lg text-muted">Newest first. This is an outbox: in the demo nothing is sent.</p>
      <ul className="mt-6 space-y-2.5">
        {texts.map((text) => (
          <li key={text.id} className="panel gap-x-6 px-5 py-4 lg:grid lg:grid-cols-[5.5rem_27rem_minmax(0,1fr)] lg:items-baseline">
            <p className="contents text-muted">
              <span className="mr-3 text-base font-bold tabular-nums text-ink">{fmtTime(text.at)}</span>
              <span>
                To{" "}
                <Link href={`/jobs/${text.job.id}`} className="link">
                  {text.job.customer}
                </Link>
                , {text.job.phone}
                 <span className="tag ml-1 bg-idle text-muted">Not sent</span>
              </span>
            </p>
            <p className="mt-1.5 max-w-4xl leading-snug lg:mt-0">{text.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
