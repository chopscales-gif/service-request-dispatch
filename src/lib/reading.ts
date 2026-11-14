import { z } from "zod";
import MESSAGES from "@/data/messages.json";
import ceiling from "@/data/readings/ceiling.json";
import bathroom from "@/data/readings/bathroom.json";
import gas from "@/data/readings/gas.json";
import hotwater from "@/data/readings/hotwater.json";
import sink from "@/data/readings/sink.json";
import spigot from "@/data/readings/spigot.json";

/**
 * The shape a recorded reading must have. The readings in src/data/readings
 * were written by an AI model following content/READING-INSTRUCTIONS.md and
 * are replayed as they were saved.
 */
export const readingSchema = z.object({
  summary: z.string().min(1),
  job_type: z.object({ value: z.enum(["leak", "fixture", "drain", "water_heater", "sewer", "unclear"]), quote: z.string().min(1) }),
  urgency: z.object({ value: z.enum(["emergency", "today", "flexible", "unstated"]), quote: z.string().min(1).nullable(), why: z.string().min(1) }),
  safety: z.object({ hazard: z.enum(["gas_smell", "other"]), what: z.string().min(1), quote: z.string().min(1) }).nullable(),
  access: z.array(z.object({ text: z.string().min(1), quote: z.string().min(1) })),
  ask_first: z.array(z.string().min(1)).max(4),
  notes: z.array(z.string().min(1)).max(3),
});

export type Reading = z.infer<typeof readingSchema>;

export type Message = { key: string; channel: string; text: string };

export const MESSAGE_BY_KEY: Record<string, Message> = Object.fromEntries(MESSAGES.map((message) => [message.key, message]));

/** Parsed once when the server starts, so a reading of the wrong shape fails loudly rather than half-showing. */
export const READING_BY_KEY: Record<string, Reading> = Object.fromEntries(
  Object.entries({ spigot, sink, gas, hotwater, ceiling, bathroom }).map(([key, raw]) => [key, readingSchema.parse(raw)]),
);

/**
 * A written rule, separate from the AI: any message that mentions a smell of
 * gas is held, whether or not the reading flagged it.
 */
export function mentionsGas(text: string): boolean {
  return /rotten eggs?|smell(s|ing|ed)?\s+(of\s+|like\s+)?gas|gas\s+(smell|leak|odou?r)|sulph?ur/i.test(text);
}
