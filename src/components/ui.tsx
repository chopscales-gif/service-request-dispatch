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

// The short name on the board. A visitor can type anything as a name, so fall
// back to the whole of it when the last word is not a word ("Sam 2", an emoji).
export const surname = (name: string) => {
  const last = name.trim().split(/\s+/).at(-1) ?? name;
  return /\p{L}{2,}/u.test(last) ? last : name.trim();
};

/** A technician's name with their colour beside it. */
export function TechName({ id, full = false }: { id: string | null; full?: boolean }) {
  const tech = TECH_BY_ID[id ?? ""];
  if (!tech) return <span className="text-muted">Nobody yet</span>;
  return (
    <span data-tone={tech.tone} className="inline-flex items-center gap-2 font-semibold">
      <span className="dot" aria-hidden />
      {full ? tech.name : tech.first}
    </span>
  );
}

/** A technician's initial in a circle of their colour. Decoration: the name is always beside it. */
export function Avatar({ initial, className = "size-10 text-lg" }: { initial: string; className?: string }) {
  return (
    <span aria-hidden className={`avatar ${className}`}>
      {initial}
    </span>
  );
}

/** One colour per meaning: red needs you now, gold is waiting, green is in hand, grey is quiet. */
export function Tag({ tone, children }: { tone: "alert" | "warn" | "quiet" | "good"; children: React.ReactNode }) {
  const look = { alert: "bg-flag text-white", warn: "bg-sun-tint text-sun-deep", quiet: "bg-idle text-muted", good: "bg-good-tint text-good" }[tone];
  return <span className={`tag ${look}`}>{children}</span>;
}

export function UrgencyTag({ job }: { job: Pick<Job, "urgency" | "status"> }) {
  if (job.status === "hold") return <Tag tone="alert">Safety hold</Tag>;
  if (job.urgency === "emergency") return <Tag tone="alert">Emergency</Tag>;
  return <Tag tone={job.urgency === "today" ? "warn" : "quiet"}>{job.urgency === "today" ? "Wants today" : "Can wait"}</Tag>;
}
