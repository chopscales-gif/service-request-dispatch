import { beforeAll, describe, expect, it } from "vitest";
import { createEmbeddedDb, type Db } from "@/db/client";
import { ensureSandbox, resetSandbox } from "@/db/sandbox";
import { LAST_NOW, START_NOW } from "@/lib/clock";
import { board, jobDetail, outbox } from "./queries";
import { WorkflowError, acceptReshuffle, assign, cancel, offerTomorrow, referGas, requestService, setType, skipAhead, techArrive, techDepart, techDone, techNeedsMore, type Ctx } from "./workflow";

/** End-to-end tests of the dispatch day against a real (in-memory) Postgres. */

let db: Db;
let count = 0;

/** A fresh sandbox for each test, so tests cannot affect each other. */
async function fresh(): Promise<Ctx> {
  const sandboxId = `visitor-${++count}`;
  await ensureSandbox(db, sandboxId);
  return { db, sandboxId };
}

const at = (hour: number, minute = 0) => hour * 60 + minute;
const byKey = async (ctx: Ctx, key: string) => (await board(ctx)).jobs.find((job) => job.key === key || job.messageKey === key)!;
const skipTo = async (ctx: Ctx, time: number) => {
  while ((await board(ctx)).now < time) await skipAhead(ctx);
};
const textsTo = async (ctx: Ctx, id: string) => (await jobDetail(ctx, id))!.texts.map((text) => text.body);

beforeAll(async () => {
  db = await createEmbeddedDb();
});

describe("9:30, when a visitor arrives", () => {
  it("has twenty jobs on the board and three messages waiting, with nobody late", async () => {
    const ctx = await fresh();
    const view = await board(ctx);
    expect(view.now).toBe(START_NOW);
    expect(view.jobs.filter((job) => job.techId)).toHaveLength(20);
    expect(view.inbox.map((item) => item.job.messageKey)).toEqual(["gas", "sink", "spigot"]);
    expect(view.proposal).toBeNull();
    expect(Object.values(view.projection.slots).every((slot) => slot.late === 0)).toBe(true);
  });

  it("holds the smell of gas and suggests nobody for it", async () => {
    const ctx = await fresh();
    const [gas] = (await board(ctx)).inbox;
    expect(gas.job.status).toBe("hold");
    expect(gas.options).toEqual([]);
    await expect(assign(ctx, gas.job.id, "marcus")).rejects.toThrow("safety hold");
    await referGas(ctx, gas.job.id);
    expect((await byKey(ctx, "gas")).status).toBe("referred");
    expect((await textsTo(ctx, gas.job.id))[0]).toContain("leave the house now");
  });

  it("suggests only technicians with a drain machine for the blocked sink", async () => {
    const ctx = await fresh();
    const sink = (await board(ctx)).inbox.find((item) => item.job.messageKey === "sink")!;
    expect(sink.options.filter((option) => option.ok).map((option) => option.techId).sort()).toEqual(["dana", "priya", "tomas"]);
    await expect(assign(ctx, sink.job.id, "lee")).rejects.toThrow(WorkflowError);
  });
});

describe("booking from the inbox", () => {
  it("books with the chosen technician, promises a window and queues a text", async () => {
    const ctx = await fresh();
    const sink = await byKey(ctx, "sink");
    await assign(ctx, sink.id, "dana");
    const booked = await byKey(ctx, "sink");
    expect(booked).toMatchObject({ status: "scheduled", techId: "dana" });
    expect(booked.windowEnd - booked.windowStart).toBe(120);
    const slot = (await board(ctx)).projection.slots[sink.id];
    expect(slot.arrive).toBeGreaterThanOrEqual(booked.windowStart);
    expect(slot.late).toBe(0);
    expect((await textsTo(ctx, sink.id))[0]).toContain("Dana will arrive between");
    expect((await board(ctx)).inbox.map((item) => item.job.messageKey)).not.toContain("sink");
  });

  it("moves a booked job to another technician and tells the customer", async () => {
    const ctx = await fresh();
    const tap = await byKey(ctx, "l4");
    await assign(ctx, tap.id, "dana");
    expect((await byKey(ctx, "l4")).techId).toBe("dana");
    expect((await textsTo(ctx, tap.id)).at(-1)).toContain("Dana will come in place of Lee");
  });

  it("will not move a job that has started", async () => {
    const ctx = await fresh();
    await expect(assign(ctx, (await byKey(ctx, "m2")).id, "priya")).rejects.toThrow("already started");
  });

  it("offers tomorrow for a job that can wait", async () => {
    const ctx = await fresh();
    const spigot = await byKey(ctx, "spigot");
    await offerTomorrow(ctx, spigot.id);
    expect((await byKey(ctx, "spigot")).status).toBe("tomorrow");
    expect((await textsTo(ctx, spigot.id))[0]).toContain("tomorrow morning");
  });

  it("cancels a booked job and frees the technician", async () => {
    const ctx = await fresh();
    const job = await byKey(ctx, "d2");
    await cancel(ctx, job.id);
    expect((await board(ctx)).projection.slots[job.id]).toBeUndefined();
  });
});

describe("the clock moving on", () => {
  it("has the crew carry on, and texts customers as vans set off", async () => {
    const ctx = await fresh();
    await skipAhead(ctx);
    expect((await byKey(ctx, "d1")).status).toBe("done");
    expect(await byKey(ctx, "d2")).toMatchObject({ status: "on_site", arriveAt: at(10) });
    expect((await textsTo(ctx, (await byKey(ctx, "d2")).id))[0]).toContain("Dana is on the way");
    expect((await board(ctx)).inbox.map((item) => item.job.messageKey)).toContain("hotwater");
  });

  it("at 10:30 a job runs long, an emergency arrives, and a reshuffle is proposed", async () => {
    const ctx = await fresh();
    await skipTo(ctx, at(10, 30));
    const view = await board(ctx);
    expect((await byKey(ctx, "m2")).extra).toBe(105);
    const ceiling = view.inbox.find((item) => item.job.messageKey === "ceiling")!;
    expect(ceiling.job.urgency).toBe("emergency");
    expect(ceiling.options[0]).toMatchObject({ ok: true, techId: "tomas" });

    const proposal = view.proposal!;
    expect(proposal.lateBefore).toBe(2);
    expect(proposal.stillLate).toEqual([]);
    const moved = proposal.changes.find((change) => change.fromTech !== change.toTech)!;
    expect(view.jobs.find((job) => job.id === moved.id)!.key).toBe("m3");
    expect(moved).toMatchObject({ fromTech: "marcus", toTech: "priya", lateAfter: 0 });

    await acceptReshuffle(ctx, proposal.signature);
    const after = await board(ctx);
    expect(after.proposal).toBeNull();
    expect(Object.values(after.projection.slots).filter((slot) => slot.late > 0)).toEqual([]);
    expect((await textsTo(ctx, moved.id)).at(-1)).toContain("Priya will come in place of Marcus");
  });

  it("refuses a reshuffle that is not the one on the screen", async () => {
    const ctx = await fresh();
    await skipTo(ctx, at(10, 30));
    await expect(acceptReshuffle(ctx, "something else")).rejects.toThrow("board has changed");
    const ontime = await fresh();
    await expect(acceptReshuffle(ontime, "")).rejects.toThrow("Nobody is running late");
  });

  it("tells a customer the new time when no reshuffle can help", async () => {
    const ctx = await fresh();
    await skipTo(ctx, at(10, 30));
    // The only other technician certified for water heaters is held up too.
    const busy = (await board(ctx)).jobs.find((job) => job.techId === "priya" && job.status === "on_site")!;
    await techNeedsMore(ctx, busy.id, 240);
    const view = await board(ctx);
    const late = view.proposal!.stillLate;
    expect(late.length).toBeGreaterThan(0);
    await acceptReshuffle(ctx, view.proposal!.signature);
    const after = await board(ctx);
    expect(after.proposal).toBeNull();
    expect(after.lateAndTold).toBe(late.length);
    expect((await textsTo(ctx, late[0].id)).at(-1)).toContain("running behind");
  });

  it("sends the emergency to whoever the dispatcher picks and gives the arrival time", async () => {
    const ctx = await fresh();
    await skipTo(ctx, at(10, 30));
    const ceiling = await byKey(ctx, "ceiling");
    await assign(ctx, ceiling.id, "tomas");
    const slot = (await board(ctx)).projection.slots[ceiling.id];
    expect(slot.arrive).toBeLessThan(at(11));
    expect((await textsTo(ctx, ceiling.id))[0]).toContain("turn it off now");
  });

  it("makes the dispatcher name a job the message left unclear", async () => {
    const ctx = await fresh();
    await skipTo(ctx, at(12));
    const bathroom = await byKey(ctx, "bathroom");
    expect(bathroom.type).toBeNull();
    await expect(assign(ctx, bathroom.id, "lee")).rejects.toThrow("what kind of job");
    await setType(ctx, bathroom.id, "fixture");
    expect((await board(ctx)).inbox.find((item) => item.job.id === bathroom.id)!.options[0].ok).toBe(true);
  });

  it("will not change the type of a job the message made plain", async () => {
    const ctx = await fresh();
    const sink = await byKey(ctx, "sink");
    await expect(setType(ctx, sink.id, "fixture")).rejects.toThrow("already says");
  });

  it("tells an emergency customer one time, once, and never quotes them a window", async () => {
    const ctx = await fresh();
    await skipTo(ctx, at(10, 30));
    const ceiling = await byKey(ctx, "ceiling");
    await assign(ctx, ceiling.id, "tomas");
    const told = (await byKey(ctx, "ceiling")).toldEta;
    expect(told).toBe((await board(ctx)).projection.slots[ceiling.id].arrive);
    const proposal = (await board(ctx)).proposal;
    if (proposal) await acceptReshuffle(ctx, proposal.signature);
    const sent = await textsTo(ctx, ceiling.id);
    expect(sent.filter((body) => body.includes("running behind"))).toEqual([]);
    expect(sent.join(" ")).not.toContain("we gave you");
  });

  it("says why a cancelled job cannot be booked", async () => {
    const ctx = await fresh();
    const sink = await byKey(ctx, "sink");
    await cancel(ctx, sink.id);
    await expect(assign(ctx, sink.id, "dana")).rejects.toThrow("was cancelled");
  });

  it("runs to the end of the day and stops", async () => {
    const ctx = await fresh();
    await skipTo(ctx, LAST_NOW);
    await expect(skipAhead(ctx)).rejects.toThrow("demo day ends");
    const view = await board(ctx);
    expect(view.jobs.filter((job) => job.techId && job.status !== "done")).toEqual([]);
  });
});

describe("the technician's phone", () => {
  it("takes the steps in order, and not faster than the day allows", async () => {
    const ctx = await fresh();
    const next = await byKey(ctx, "l3");
    await expect(techDepart(ctx, next.id)).rejects.toThrow("earlier job");
    const current = await byKey(ctx, "l2");
    await techDone(ctx, current.id, "Replaced the valve.");
    expect(await byKey(ctx, "l2")).toMatchObject({ status: "done", doneAt: START_NOW, note: "Replaced the valve." });
    // Nobody sets off for a customer who is not expecting them for hours.
    await expect(techDepart(ctx, next.id)).rejects.toThrow("not expecting anyone");
    for (let tries = 0; tries < 6; tries++) {
      const left = await techDepart(ctx, next.id).then(
        () => true,
        () => false,
      );
      if (left) break;
      await skipAhead(ctx);
    }
    const { now } = await board(ctx);
    expect(await byKey(ctx, "l3")).toMatchObject({ status: "en_route", departAt: now });
    await expect(techDone(ctx, next.id, "")).rejects.toThrow("not been started");
    // Arriving is recorded after the drive, not the instant the button is tapped.
    await techArrive(ctx, next.id);
    const there = await byKey(ctx, "l3");
    expect(there.status).toBe("on_site");
    expect(there.arriveAt).toBeGreaterThan(now);
    await expect(techDone(ctx, next.id, "")).rejects.toThrow("only just arrived");
  });

  it("pushes later arrivals back when a technician needs more time", async () => {
    const ctx = await fresh();
    const before = (await board(ctx)).projection.slots[(await byKey(ctx, "p2")).id].arrive;
    await techNeedsMore(ctx, (await byKey(ctx, "p1")).id, 30);
    expect((await board(ctx)).projection.slots[(await byKey(ctx, "p2")).id].arrive).toBe(before + 30);
  });
});

describe("a customer booking for themselves", () => {
  const request = { problem: "drain", urgency: "today", area: "old_town", name: "Sam Visitor", windowStart: at(13) } as const;

  it("books the window with a technician who can do the job", async () => {
    const ctx = await fresh();
    const id = await requestService(ctx, request);
    const detail = (await jobDetail(ctx, id))!;
    expect(detail.job).toMatchObject({ status: "scheduled", windowStart: at(13), windowEnd: at(15), source: "web" });
    expect(["dana", "priya", "tomas"]).toContain(detail.job.techId);
    expect(detail.slot!.late).toBe(0);
    expect(detail.texts[0].body).toContain("between 1 and 3 PM");
  });

  it("refuses a window that was not offered", async () => {
    const ctx = await fresh();
    await expect(requestService(ctx, { ...request, windowStart: at(9) })).rejects.toThrow("just gone");
  });

  it("sends someone straight away to an emergency", async () => {
    const ctx = await fresh();
    const id = await requestService(ctx, { ...request, problem: "leak", urgency: "emergency", windowStart: null });
    const detail = (await jobDetail(ctx, id))!;
    expect(detail.job.status).toBe("scheduled");
    expect(detail.slot!.arrive).toBeLessThan(START_NOW + 90);
  });

  it("stops after a handful, so a sandbox cannot grow without limit", async () => {
    const ctx = await fresh();
    for (let i = 0; i < 6; i++) await requestService(ctx, { ...request, problem: "toilet", urgency: "emergency", windowStart: null });
    await expect(requestService(ctx, request)).rejects.toThrow("requests of your own");
  });
});

describe("the outbox and reset", () => {
  it("lists every text, newest first, and reset puts the day back", async () => {
    const ctx = await fresh();
    const start = (await outbox(ctx)).texts.length;
    await skipAhead(ctx);
    const later = await outbox(ctx);
    expect(later.texts.length).toBeGreaterThan(start);
    expect(later.texts[0].at).toBeGreaterThanOrEqual(later.texts.at(-1)!.at);
    await resetSandbox(db, ctx.sandboxId);
    expect((await board(ctx)).now).toBe(START_NOW);
    expect((await outbox(ctx)).texts).toHaveLength(start);
  });
});
