"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPANY } from "@/lib/crew";
import { viewOf } from "./demo-bar";

const WHOSE = { dispatcher: "The dispatcher's screen", customer: "What a customer sees", technician: "A technician's phone" };

/**
 * The fictional company's own header. Customers get the side of the van:
 * yellow, with the name and the number to call. The office and the crew get
 * the same name on black, with their tabs.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const view = viewOf(pathname);
  const customer = view === "customer";
  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center border-b-4 px-1 font-semibold ${customer ? (active ? "border-ink" : "border-transparent hover:border-ink/40") : active ? "border-hivis text-white" : "border-transparent text-white/75 hover:text-white"}`}
    >
      {label}
    </Link>
  );
  const [first, ...rest] = COMPANY.name.split(" ");
  return (
    <header className={customer ? "bg-hivis text-ink" : "on-dark bg-ink text-white"}>
      <div className="mx-auto flex max-w-[88rem] flex-wrap items-center justify-between gap-x-8 px-4 sm:px-6">
        <p className="flex flex-wrap items-baseline gap-x-3 py-2.5 leading-tight">
          <span className="font-stretch-[125%] text-[1.375rem] font-extrabold tracking-tight">
            <span className={customer ? "" : "text-hivis"}>{first}</span> <span className="font-stretch-[100%] font-semibold">{rest.join(" ")}</span>
          </span>
          <span className={`text-sm ${customer ? "text-ink/80" : "text-white/75"}`}>{WHOSE[view]}</span>
        </p>
        <nav aria-label="Main" className="flex items-center gap-5">
          {view === "dispatcher" && (
            <>
              {tab("/", "Board", pathname === "/" || pathname.startsWith("/jobs"))}
              {tab("/messages", "Texts to customers", pathname.startsWith("/messages"))}
            </>
          )}
          {customer && tab("/customer", "Request service", pathname === "/customer")}
          {customer && <span className="hidden font-stretch-[112%] text-lg font-extrabold tabular-nums sm:inline">{COMPANY.phone}</span>}
          {view === "technician" && tab("/tech", "Crew", pathname === "/tech")}
        </nav>
      </div>
    </header>
  );
}
