import { describe, expect, it } from "vitest";
import MESSAGES from "@/data/messages.json";
import { INBOUND } from "./day";
import { READING_BY_KEY, mentionsGas } from "./reading";

describe("the recorded readings", () => {
  it("has one for every sample message, and every message has a customer record", () => {
    expect(Object.keys(READING_BY_KEY).sort()).toEqual(MESSAGES.map((message) => message.key).sort());
    expect(INBOUND.map((inbound) => inbound.key).sort()).toEqual(MESSAGES.map((message) => message.key).sort());
  });

  it.each(MESSAGES)("quotes only words that are in the message: $key", ({ key, text }) => {
    const reading = READING_BY_KEY[key];
    const quotes = [reading.job_type.quote, reading.urgency.quote, reading.safety?.quote, ...reading.access.map((item) => item.quote)].filter((quote) => quote != null);
    expect(quotes.length).toBeGreaterThan(0);
    for (const quote of quotes) expect(text).toContain(quote);
  });
});

describe("the written rule for a smell of gas", () => {
  it("catches the sample message whatever the reading said", () => {
    expect(mentionsGas(MESSAGES.find((message) => message.key === "gas")!.text)).toBe(true);
  });

  it("catches the common ways of saying it and leaves ordinary messages alone", () => {
    expect(mentionsGas("I can smell gas in the kitchen")).toBe(true);
    expect(mentionsGas("there is a gas smell by the meter")).toBe(true);
    expect(mentionsGas("The heater's a gas one, no smell or anything")).toBe(false);
    for (const message of MESSAGES.filter((candidate) => candidate.key !== "gas")) expect(mentionsGas(message.text)).toBe(false);
  });
});
