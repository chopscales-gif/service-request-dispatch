import type { Metadata, Viewport } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import { DemoBar } from "@/components/demo-bar";
import { SiteFooter, SiteHeader } from "@/components/site";
import { getCtx, sandboxIdOrNull } from "@/server/session";
import { loadNow } from "@/server/workflow";
import "./globals.css";

// A round geometric face for headlines and a soft, even one for reading. Both are variable.
const head = Outfit({ variable: "--font-head", subsets: ["latin"] });
const body = DM_Sans({ variable: "--font-body", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: { default: "Service request and dispatch (demo)", template: "%s | Service request and dispatch (demo)" },
  description:
    "A demonstration build by ChopMedia: a plumbing company's day, from a customer's message to the dispatcher's board to the technician's phone. Fictional company, invented town and customers.",
  robots: { index: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // No cookie means the proxy is showing the page about cookies, and there is no clock to show.
  const now = (await sandboxIdOrNull()) === null ? null : await loadNow(await getCtx());
  return (
    <html lang="en" className={`${head.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <DemoBar now={now} />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
