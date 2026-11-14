import { fmtBetween, fmtTime, fmtWindow } from "./clock";
import { COMPANY } from "./crew";

/**
 * The texts customers get. They are fixed wording with the times and names
 * filled in, not AI. In the demo they go to an outbox and are never sent.
 */

const US = COMPANY.name;

export const TEXTS = {
  booked: (tech: string, start: number, end: number) => `${US}: you are booked for today. ${tech} will arrive ${fmtBetween(start, end)}. We will text when they are on the way.`,
  emergency: (tech: string, arrive: number, next: boolean) => `${US}: ${tech} is coming to you ${next ? "next" : "as soon as possible"} and should arrive about ${fmtTime(arrive)}. If you can reach the main water valve, turn it off now.`,
  onTheWay: (tech: string, arrive: number) => `${US}: ${tech} is on the way and should arrive about ${fmtTime(arrive)}.`,
  done: (tech: string) => `${US}: ${tech} has finished. Thank you for calling us. Reply to this text if anything is not right.`,
  newTech: (tech: string, was: string, start: number, end: number) => `${US}: a change to today's visit. ${tech} will come in place of ${was}, still ${fmtBetween(start, end)}.`,
  newTechSooner: (tech: string, was: string, arrive: number) => `${US}: a change to today's visit. ${tech} will come in place of ${was}, and should arrive about ${fmtTime(arrive)}.`,
  late: (tech: string, arrive: number, start: number, end: number) =>
    `${US}: we are running behind and we are sorry. ${tech} now expects to arrive about ${fmtTime(arrive)}, later than the ${fmtWindow(start, end)} we gave you. Reply if that no longer works and we will rebook.`,
  lateEmergency: (tech: string, arrive: number) => `${US}: we are running behind and we are sorry. ${tech} now expects to reach you about ${fmtTime(arrive)}. Keep the main water valve off if you can.`,
  /** `full` is when nobody could come today. Otherwise the dispatcher chose tomorrow, and the text does not pretend the day was full. */
  tomorrow: (full: boolean) => `${US}: thank you for your message. ${full ? "We cannot fit this in today without keeping another customer waiting. " : ""}We can come tomorrow morning between 8 and 10 AM. Reply to this text to book it.`,
  cancelled: () => `${US}: your visit today has been cancelled. Reply to this text if that is a mistake.`,
  gas: () =>
    `${US}: if you smell gas or rotten eggs, leave the house now and take everyone with you. Do not use light switches, phones or anything with a flame indoors. From outside, call your gas company's emergency line or 911. We can come once they say it is safe.`,
};

/** What the dispatcher is told to do with a request held for a smell of gas. Company policy, not AI. */
export const GAS_RULE = "Do not book this. A smell of gas is for the gas company or 911, not for a plumber. Tell the customer to leave the house and call from outside.";

/** What the dispatcher tells an emergency caller while someone is on the way. Company policy, not AI. */
export const EMERGENCY_RULE = "While they wait: ask them to turn off the main water valve, usually where the pipe comes into the house or beside the meter, and to keep clear of any ceiling that is sagging.";
