import { describe, expect, it } from "vitest";
import { fmtDuration, fmtTime, fmtWindow } from "./clock";
import { TECHS } from "./crew";
import { carryOn, place, project, projectTech, type PlanJob } from "./plan";
import { reshuffle, suggest } from "./suggest";
import { SHOP, along, areaOf, drive } from "./town";
import { windowsFor } from "./windows";

const IDS = TECHS.map((tech) => tech.id);
const at = (hour: number, minute = 0) => hour * 60 + minute;

function job(id: string, over: Partial<PlanJob> = {}): PlanJob {
  return { id, x: SHOP.x + 4, y: SHOP.y, type: "fixture", urgency: "today", windowStart: at(10), windowEnd: at(12), est: 60, extra: 0, status: "scheduled", techId: "lee", seq: 0, departAt: null, arriveAt: null, doneAt: null, ...over };
}

describe("the clock", () => {
  it("writes times the way a person says them", () => {
    expect(fmtTime(at(14, 40))).toBe("2:40 PM");
    expect(fmtTime(at(12))).toBe("12:00 PM");
    expect(fmtWindow(at(13), at(15))).toBe("1 to 3 PM");
    expect(fmtWindow(at(11), at(13))).toBe("11 AM to 1 PM");
    expect(fmtDuration(75)).toBe("1 hour 15 minutes");
  });
});

describe("the town", () => {
  it("drives along the grid, with a few minutes to park", () => {
    expect(drive({ x: 0, y: 0 }, { x: 4, y: 2 })).toBe(12);
    expect(drive(SHOP, SHOP)).toBe(0);
  });

  it("puts a van part of the way along its route", () => {
    expect(along({ x: 0, y: 0 }, { x: 4, y: 2 }, 0.5)).toEqual({ x: 3, y: 0 });
    expect(along({ x: 0, y: 0 }, { x: 4, y: 2 }, 1)).toEqual({ x: 4, y: 2 });
  });

  it("names the area a point is in", () => {
    expect(areaOf({ x: 17, y: 9 }).name).toBe("Lakeside");
  });
});

describe("working out the day", () => {
  it("does not arrive before the customer's window", () => {
    const [slot] = projectTech([job("a")], at(8));
    expect(slot.arrive).toBe(at(10));
    expect(slot.depart).toBe(at(10) - 9);
    expect(slot.late).toBe(0);
  });

  it("pushes every later arrival back when a job runs long", () => {
    const day = [job("a", { status: "on_site", arriveAt: at(10), seq: 0 }), job("b", { x: SHOP.x - 4, windowStart: at(11), windowEnd: at(13), seq: 1 })];
    expect(projectTech(day, at(10, 30))[1].arrive).toBe(at(11, 15));
    day[0].extra = 120;
    const [, later] = projectTech(day, at(10, 30));
    expect(later.arrive).toBe(at(13, 15));
    expect(later.late).toBe(15);
  });

  it("uses what actually happened in place of the estimate", () => {
    const [slot] = projectTech([job("a", { status: "done", departAt: at(9), arriveAt: at(9, 30), doneAt: at(9, 50) })], at(11));
    expect([slot.arrive, slot.end]).toEqual([at(9, 30), at(9, 50)]);
  });

  it("takes a job past its estimate to be finishing now", () => {
    const [slot] = projectTech([job("a", { status: "on_site", arriveAt: at(9) })], at(11));
    expect(slot.end).toBe(at(11));
  });
});

describe("the crew carrying on", () => {
  it("sets off, arrives and finishes as the clock passes each moment", () => {
    const jobs = [job("a")];
    expect(carryOn(jobs, IDS, at(9, 30), at(10))).toMatchObject([{ id: "a", status: "on_site", departAt: at(9, 51), arriveAt: at(10), happened: ["left", "arrived"] }]);
    expect(carryOn(jobs, IDS, at(9), at(9, 30))).toEqual([]);
    expect(carryOn(jobs, IDS, at(9, 30), at(11))[0]).toMatchObject({ status: "done", doneAt: at(11) });
  });
});

describe("who to send", () => {
  const drain = job("new", { type: "drain", status: "new", techId: null, windowStart: at(9), windowEnd: at(17) });

  it("rules out technicians without the equipment, and says why", () => {
    const options = suggest([drain], TECHS, "new", at(9));
    expect(options.filter((option) => !option.ok).map((option) => option.techId).sort()).toEqual(["lee", "marcus"]);
    expect(options.find((option) => option.techId === "lee")).toMatchObject({ ok: false, reason: "No drain machine on the van" });
  });

  it("prefers the technician who keeps everyone else on time", () => {
    const busy = ["dana", "priya"].map((techId) => job(`${techId}-1`, { techId, type: "drain", windowStart: at(9), windowEnd: at(9, 30), x: 1, y: 1 }));
    const [best] = suggest([drain, ...busy], TECHS, "new", at(9));
    expect(best).toMatchObject({ techId: "tomas", ok: true, knocks: [] });
  });

  it("sends the nearest free technician to an emergency", () => {
    const emergency = job("flood", { type: "leak", urgency: "emergency", status: "new", techId: null, windowStart: at(10), windowEnd: at(11, 30), x: 14, y: 13 });
    const near = job("near", { techId: "tomas", status: "on_site", arriveAt: at(9), x: 13, y: 11 });
    const [best] = suggest([emergency, near], TECHS, "flood", at(10));
    expect(best).toMatchObject({ techId: "tomas", index: 0 });
  });

  it("puts a job into the day and renumbers the order", () => {
    const jobs = [job("a", { seq: 0 }), job("b", { seq: 1 }), job("c", { techId: "dana" })];
    const plan = place(jobs, "c", "lee", 1);
    expect(plan.filter((candidate) => candidate.techId === "lee").sort((x, y) => x.seq - y.seq).map((candidate) => candidate.id)).toEqual(["a", "c", "b"]);
  });
});

describe("repairing a day that has slipped", () => {
  const stuck = job("stuck", { techId: "marcus", type: "water_heater", status: "on_site", arriveAt: at(9), est: 60, extra: 240, x: 16, y: 3 });
  const waiting = job("waiting", { techId: "marcus", type: "water_heater", seq: 1, windowStart: at(11), windowEnd: at(13), x: 18, y: 8 });

  it("says nothing when nobody is late", () => {
    expect(reshuffle([job("a")], TECHS, at(9))).toBeNull();
  });

  it("moves a late job to someone qualified who is free", () => {
    const repair = reshuffle([stuck, waiting], TECHS, at(10))!;
    expect(repair.lateBefore).toBe(1);
    expect(repair.changes).toMatchObject([{ id: "waiting", fromTech: "marcus", toTech: "priya", lateAfter: 0 }]);
    expect(repair.stillLate).toEqual([]);
    expect(project(repair.plan, IDS, at(10)).slots.waiting.late).toBe(0);
  });

  it("never moves a job to someone who cannot do it, and says who is still late", () => {
    const priyaStuck = job("p", { techId: "priya", type: "water_heater", status: "on_site", arriveAt: at(9), est: 60, extra: 400 });
    const repair = reshuffle([stuck, waiting, priyaStuck], TECHS, at(10))!;
    expect(repair.changes).toEqual([]);
    expect(repair.stillLate.map((knock) => knock.id)).toEqual(["waiting"]);
  });

  it("proposes the same thing every time it is asked", () => {
    expect(reshuffle([stuck, waiting], TECHS, at(10))!.signature).toBe(reshuffle([stuck, waiting], TECHS, at(10))!.signature);
  });
});

describe("windows offered to a customer", () => {
  const draft = job("mine", { type: "sewer", status: "new", techId: null });

  it("offers only windows someone qualified can keep", () => {
    expect(windowsFor([], TECHS, draft, at(9, 30)).map((offer) => [offer.start / 60, offer.techId])).toEqual([10, 11, 12, 13, 14, 15].map((hour) => [hour, "dana"]));
    const full = job("long", { techId: "dana", type: "sewer", status: "on_site", arriveAt: at(9), est: 300, x: 1, y: 1 });
    expect(windowsFor([full], TECHS, draft, at(9, 30)).map((offer) => offer.start / 60)).toEqual([13, 14, 15]);
  });
});
