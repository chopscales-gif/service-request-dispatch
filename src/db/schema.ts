import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { START_NOW } from "@/lib/clock";
import type { JobType, Urgency } from "@/lib/crew";
import type { JobStatus } from "@/lib/plan";

/**
 * Every row belongs to a sandbox: one visitor's private copy of the demo day.
 * Deleting the sandbox row removes everything that visitor changed. Every
 * foreign key has an index so that the cascade stays quick.
 */
export const sandboxes = pgTable("sandboxes", {
  id: text("id").primaryKey(),
  /** Used only to purge old sandboxes. */
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** The time on this visitor's demo clock, in minutes since midnight. */
  now: integer("now").notNull().default(START_NOW),
});

const sandboxId = () =>
  text("sandbox_id")
    .notNull()
    .references(() => sandboxes.id, { onDelete: "cascade" });

/** Where a request came from. */
export type Source = "office" | "message" | "web";

/** One service request, from the moment it arrives to the moment the work is done. */
export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    sandboxId: sandboxId(),
    source: text("source").$type<Source>().notNull(),
    /** Names a job the script refers to later. */
    key: text("key"),
    /** For a request that arrived as a message: which sample message, and so which recorded reading. */
    messageKey: text("message_key"),
    receivedAt: integer("received_at").notNull(),
    customer: text("customer").notNull(),
    phone: text("phone").notNull(),
    street: text("street").notNull(),
    /** Where the address is on the drawn map. */
    x: integer("x").notNull(),
    y: integer("y").notNull(),
    /** Null until someone has decided what kind of job it is. */
    type: text("type").$type<JobType>(),
    urgency: text("urgency").$type<Urgency>().notNull(),
    problem: text("problem").notNull(),
    /** The arrival window, in minutes since midnight. Until a request is booked it is simply "the rest of today". */
    windowStart: integer("window_start").notNull(),
    windowEnd: integer("window_end").notNull(),
    /** Minutes the job should take, and minutes added because it ran long. */
    est: integer("est").notNull(),
    extra: integer("extra").notNull().default(0),
    status: text("status").$type<JobStatus>().notNull(),
    techId: text("tech_id"),
    /** Position in the technician's day. Times are worked out from the order, never stored. */
    seq: integer("seq").notNull().default(0),
    /** What actually happened. */
    departAt: integer("depart_at"),
    arriveAt: integer("arrive_at"),
    doneAt: integer("done_at"),
    /** The latest arrival time the customer has been told, once it is past their window. */
    toldEta: integer("told_eta"),
    /** A note from the technician on site. */
    note: text("note").notNull().default(""),
  },
  (t) => [index("jobs_sandbox").on(t.sandboxId)],
);

/** Texts to customers. In the demo they are written to this outbox and never sent. */
export const texts = pgTable(
  "texts",
  {
    id: serial("id").primaryKey(),
    sandboxId: sandboxId(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    at: integer("at").notNull(),
    body: text("body").notNull(),
  },
  (t) => [index("texts_sandbox").on(t.sandboxId), index("texts_job").on(t.jobId)],
);

/** What happened to a job, oldest first. */
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    sandboxId: sandboxId(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    at: integer("at").notNull(),
    text: text("text").notNull(),
  },
  (t) => [index("events_sandbox").on(t.sandboxId), index("events_job").on(t.jobId)],
);

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
