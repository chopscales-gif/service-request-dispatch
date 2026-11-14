CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"job_id" text NOT NULL,
	"at" integer NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"source" text NOT NULL,
	"key" text,
	"message_key" text,
	"received_at" integer NOT NULL,
	"customer" text NOT NULL,
	"phone" text NOT NULL,
	"street" text NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"type" text,
	"urgency" text NOT NULL,
	"problem" text NOT NULL,
	"window_start" integer NOT NULL,
	"window_end" integer NOT NULL,
	"est" integer NOT NULL,
	"extra" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"tech_id" text,
	"seq" integer DEFAULT 0 NOT NULL,
	"depart_at" integer,
	"arrive_at" integer,
	"done_at" integer,
	"told_eta" integer,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandboxes" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"now" integer DEFAULT 570 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "texts" (
	"id" serial PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"job_id" text NOT NULL,
	"at" integer NOT NULL,
	"body" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "texts" ADD CONSTRAINT "texts_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "texts" ADD CONSTRAINT "texts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_sandbox" ON "events" USING btree ("sandbox_id");--> statement-breakpoint
CREATE INDEX "events_job" ON "events" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "jobs_sandbox" ON "jobs" USING btree ("sandbox_id");--> statement-breakpoint
CREATE INDEX "texts_sandbox" ON "texts" USING btree ("sandbox_id");--> statement-breakpoint
CREATE INDEX "texts_job" ON "texts" USING btree ("job_id");