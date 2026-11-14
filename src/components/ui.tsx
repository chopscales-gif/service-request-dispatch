import type { Job } from "@/db/schema";
import { TECH_BY_ID } from "@/lib/crew";
import type { JobStatus } from "@/lib/plan";

export const STATUS_LABEL: Record<JobStatus, string> = {
  new: "Waiting for the dispatcher",
  hold: "Safety hold",
  scheduled: "Booked",
  en_route: "On the way",
  on_site: "On site",
  done: "Done",
  tomorrow: "Offered tomorrow",
  referred: "Sent to the gas company",
  cancelled: "Cancelled",
};

export const surname = (name: string) => name.split(" ").at(-1)!;

/** A technician's name with their colour beside it. */
export function TechName({ id, full = false }: { id: string | null; full?: boolean }) {
  const tech = TECH_BY_ID[id ?? ""];
  if (!tech) return <span className="text-muted">Nobody yet</span>;
  return (
    <span data-tone={tech.tone} className="inline-flex items-center gap-1.5 font-semibold">
      <span className="dot" aria-hidden />
      {full ? tech.name : tech.first}
    </span>
  );
}

export function Tag({ tone, children }: { tone: "alert" | "warn" | "quiet" | "good"; children: React.ReactNode }) {
  const look = { alert: "bg-flag text-white", warn: "bg-hivis text-ink", quiet: "bg-idle text-ink", good: "bg-accent-tint text-accent-deep" }[tone];
  return <span className={`inline-block rounded-sm px-1.5 py-0.5 text-sm font-semibold leading-tight ${look}`}>{children}</span>;
}

export function UrgencyTag({ job }: { job: Pick<Job, "urgency" | "status"> }) {
  if (job.status === "hold") return <Tag tone="alert">Safety hold</Tag>;
  if (job.urgency === "emergency") return <Tag tone="alert">Emergency</Tag>;
  return <Tag tone="quiet">{job.urgency === "today" ? "Wants today" : "Can wait"}</Tag>;
}
