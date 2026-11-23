"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPANY } from "@/lib/crew";
import { viewOf } from "./demo-bar";

const WHOSE = { dispatcher: "The dispatcher's screen", customer: "What a customer sees", technician: "A technician's phone" };

/**
 * The fictional company's own header: a white bar with the name, whose screen
 * this is, and that person's tabs. Customers get the number to call.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const view = viewOf(pathname);
  const customer = view === "customer";
  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full px-4 font-semibold sm:min-h-10 ${active ? "bg-accent text-white" : "text-muted hover:bg-idle hover:text-ink"}`}
    >
      {label}
    </Link>
  );
  const [first, ...rest] = COMPANY.name.split(" ");
  return (
    <header className="relative z-10 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[88rem] flex-wrap items-center justify-between gap-x-8 px-4 sm:px-6">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-3 leading-tight">
          <span className="flex items-center gap-2.5">
            <svg aria-hidden viewBox="0 0 28 28" className="size-7 flex-none">
              <rect width="28" height="28" rx="9" fill="#1c2247" />
              <path d="M14 5.5c3.4 4.1 5.6 7.1 5.6 10.1a5.6 5.6 0 0 1-11.2 0c0-3 2.2-6 5.6-10.1Z" fill="#ffffff" />
              <circle cx="16.3" cy="16.4" r="1.7" fill="#ffc44d" />
            </svg>
            <span className="font-display text-[1.3125rem] font-semibold tracking-[-0.02em]">
              {first} <span className="font-normal text-muted">{rest.join(" ")}</span>
            </span>
          </span>
          <span className="rounded-full bg-idle px-2.5 py-0.5 text-sm font-medium text-muted">{WHOSE[view]}</span>
        </p>
        <nav aria-label="Main" className="flex items-center gap-1.5 pb-2 sm:pb-0">
          {view === "dispatcher" && (
            <>
              {tab("/", "Board", pathname === "/" || pathname.startsWith("/jobs"))}
              {tab("/messages", "Texts to customers", pathname.startsWith("/messages"))}
            </>
          )}
          {customer && tab("/customer", "Request service", pathname === "/customer")}
          {customer && <span className="ml-2 hidden rounded-full bg-ink px-4 py-2 font-display text-[1.0625rem] font-semibold tabular-nums text-white sm:inline">{COMPANY.phone}</span>}
          {view === "technician" && tab("/tech", "Crew", pathname === "/tech")}
        </nav>
      </div>
    </header>
  );
}

/** The company's footer. On the customer's pages it also says where the photographs come from. */
export function SiteFooter() {
  const customer = viewOf(usePathname()) === "customer";
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[88rem] flex-wrap gap-x-10 gap-y-2 px-4 py-6 text-sm leading-relaxed text-muted sm:px-6">
        <p className="max-w-xl">
          <span className="font-semibold text-ink">{COMPANY.name}</span> is a fictional company in an invented town, made for this demonstration build by ChopMedia. No text is ever sent.{" "}
          <Link href="/about" className="link">
            How this demo works
          </Link>
        </p>
        {customer && <p className="max-w-xl">Photographs are stock images under the Unsplash licence. They show no real job, and any people in them are not this company&apos;s staff or customers.</p>}
      </div>
    </footer>
  );
}
