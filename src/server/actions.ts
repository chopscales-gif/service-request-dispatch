"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { resetSandbox } from "@/db/sandbox";
import { JOB_TYPE_KEYS, TECH_IDS } from "@/lib/crew";
import { AREA_KEYS } from "@/lib/town";
import { PROBLEM_KEYS } from "@/lib/windows";
import { getCtx, sandboxIdFromCookie } from "./session";
import { WorkflowError, acceptReshuffle, assign, cancel, offerTomorrow, referGas, requestService, setType, skipAhead, techArrive, techDepart, techDone, techNeedsMore, type Ctx } from "./workflow";

/**
 * Server actions: the thin layer between the screens and the workflow. Each one
 * validates its input, runs a workflow function in the visitor's sandbox, and
 * returns a plain result the screen can show.
 */

/** `goto` is where the screen should go next, when the action decides that. */
export type ActionResult = { ok: true; goto?: string } | { ok: false; error: string };

async function run(work: (ctx: Ctx) => Promise<string | void>): Promise<ActionResult> {
  let goto: string | void;
  try {
    goto = await work(await getCtx());
  } catch (error) {
    if (error instanceof WorkflowError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong on our side. Try again, or reset the demo from the bar at the top." };
  }
  revalidatePath("/", "layout");
  return goto ? { ok: true, goto } : { ok: true };
}

const id = z.uuid();
const BAD_INPUT: ActionResult = { ok: false, error: "That did not look right. Reload the page and try again." };

const simple = (work: (ctx: Ctx, id: string) => Promise<void>) => async (jobId: string) => {
  if (!id.safeParse(jobId).success) return BAD_INPUT;
  return run((ctx) => work(ctx, jobId));
};

export const offerTomorrowAction = async (jobId: string) => simple(offerTomorrow)(jobId);
export const referGasAction = async (jobId: string) => simple(referGas)(jobId);
export const cancelAction = async (jobId: string) => simple(cancel)(jobId);
export const techDepartAction = async (jobId: string) => simple(techDepart)(jobId);
export const techArriveAction = async (jobId: string) => simple(techArrive)(jobId);
export const techNeedsMoreAction = async (jobId: string) => simple((ctx, job) => techNeedsMore(ctx, job, 30))(jobId);

const assigning = z.object({ id, techId: z.enum(TECH_IDS) });

export async function assignAction(input: z.input<typeof assigning>): Promise<ActionResult> {
  const parsed = assigning.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  return run((ctx) => assign(ctx, parsed.data.id, parsed.data.techId));
}

const typing = z.object({ id, type: z.enum(JOB_TYPE_KEYS) });

export async function setTypeAction(input: z.input<typeof typing>): Promise<ActionResult> {
  const parsed = typing.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  return run((ctx) => setType(ctx, parsed.data.id, parsed.data.type));
}

const finishing = z.object({ id, note: z.string().max(300) });

export async function techDoneAction(input: z.input<typeof finishing>): Promise<ActionResult> {
  const parsed = finishing.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  return run((ctx) => techDone(ctx, parsed.data.id, parsed.data.note));
}

export async function acceptReshuffleAction(signature: string): Promise<ActionResult> {
  if (!z.string().max(4000).safeParse(signature).success) return BAD_INPUT;
  return run((ctx) => acceptReshuffle(ctx, signature));
}

const requesting = z.object({
  problem: z.enum(PROBLEM_KEYS),
  urgency: z.enum(["emergency", "today", "flexible"]),
  area: z.enum(AREA_KEYS),
  name: z.string().trim().min(1).max(40),
  windowStart: z.number().int().min(0).max(1440).nullable(),
});

/** A customer's own request. Goes to the page where they can follow it. */
export async function requestServiceAction(input: z.input<typeof requesting>): Promise<ActionResult> {
  const parsed = requesting.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Fill in your name and each choice above, then try again." };
  return run(async (ctx) => `/track/${await requestService(ctx, parsed.data)}`);
}

/** Moves the demo clock on half an hour. */
export async function skipAheadAction(): Promise<ActionResult> {
  return run(async (ctx) => {
    await skipAhead(ctx);
  });
}

/** Throws away this visitor's changes and starts the day again at 9:30. */
export async function resetDemoAction(): Promise<void> {
  await resetSandbox(await getDb(), await sandboxIdFromCookie());
  revalidatePath("/", "layout");
  redirect("/");
}
