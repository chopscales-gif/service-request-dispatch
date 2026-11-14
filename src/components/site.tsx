"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPANY } from "@/lib/crew";
import { viewOf } from "./demo-bar";

const WHOSE = { dispatcher: "The dispatcher's screen", customer: "What a customer sees", technician: "A technician's phone" };

/** The fictional company's own header. What it links to depends on whose screen this is. */
export function SiteHeader() {
  const pathname = usePathname();
  const view = viewOf(pathname);
  const tab = (href: string, label: string, active: boolean) => (
    <Link href={href} aria-current={active ? "page" : undefined} className={`border-b-[3px] px-1 py-3 font-semibold ${active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}>
      {label}
    </Link>
  );
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[88rem] flex-wrap items-end justify-between gap-x-8 px-4 sm:px-6">
        <p className="py-3 font-display text-xl font-bold">
          {COMPANY.name} <span className="font-sans text-sm font-normal text-muted">{WHOSE[view]}</span>
        </p>
        <nav aria-label="Main" className="flex gap-5">
          {view === "dispatcher" && (
            <>
              {tab("/", "Board", pathname === "/" || pathname.startsWith("/jobs"))}
              {tab("/messages", "Texts to customers", pathname.startsWith("/messages"))}
            </>
          )}
          {view === "customer" && tab("/customer", "Request service", pathname === "/customer")}
          {view === "technician" && tab("/tech", "Crew", pathname === "/tech")}
        </nav>
      </div>
    </header>
  );
}
