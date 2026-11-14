import type { JobType } from "./crew";
import type { JobStatus } from "./plan";

/**
 * The scripted day. Everything here is invented: the customers, the streets,
 * the phone numbers. The booked jobs are what a visitor finds at 9:30, and the
 * inbound messages arrive as the demo clock moves on.
 */

const at = (hour: number, minute = 0) => hour * 60 + minute;

export type Booked = {
  key: string;
  customer: string;
  phone: string;
  street: string;
  x: number;
  y: number;
  type: JobType;
  problem: string;
  /** The two-hour arrival window, by the hour it starts. */
  window: number;
  tech: string;
  status: JobStatus;
  departAt?: number;
  arriveAt?: number;
  doneAt?: number;
  note?: string;
};

export const BOOKED: Booked[] = [
  // Dana Whitlock
  { key: "d1", customer: "Harlan Voss", phone: "(555) 010-0111", street: "18 Shale Road", x: 4, y: 11, type: "sewer", problem: "Slow drains through the whole house. Camera the main line.", window: 8, tech: "dana", status: "on_site", departAt: at(8), arriveAt: at(8, 14) },
  { key: "d2", customer: "Imogen Castellanos", phone: "(555) 010-0112", street: "7 Sluice Lane", x: 3, y: 5, type: "drain", problem: "Basement floor drain backs up when the washer empties.", window: 10, tech: "dana", status: "scheduled" },
  { key: "d3", customer: "Bao Nguyen", phone: "(555) 010-0113", street: "31 Assay Street", x: 10, y: 6, type: "drain", problem: "Tub drains slowly, getting worse.", window: 12, tech: "dana", status: "scheduled" },
  { key: "d4", customer: "Odalys Ferreira", phone: "(555) 010-0114", street: "64 Tollhouse Lane", x: 11, y: 2, type: "leak", problem: "Damp patch under the kitchen sink cabinet.", window: 14, tech: "dana", status: "scheduled" },
  // Marcus Oyelaran
  { key: "m1", customer: "Gwen Abernathy", phone: "(555) 010-0121", street: "9 Cinder Street", x: 11, y: 7, type: "fixture", problem: "Replace kitchen tap, customer has the new one.", window: 8, tech: "marcus", status: "done", departAt: at(8), arriveAt: at(8, 9), doneAt: at(8, 50) },
  { key: "m2", customer: "Rosalind Achterberg", phone: "(555) 010-0122", street: "5 Pippin Court", x: 16, y: 3, type: "water_heater_replace", problem: "Replace 50-gallon gas water heater. New unit is on the van.", window: 9, tech: "marcus", status: "on_site", departAt: at(8, 50), arriveAt: at(9, 12) },
  { key: "m3", customer: "Desmond Okafor", phone: "(555) 010-0123", street: "22 Heron Walk", x: 18, y: 8, type: "water_heater", problem: "Water heater relief valve dripping.", window: 11, tech: "marcus", status: "scheduled" },
  { key: "m4", customer: "Tilda Bergström", phone: "(555) 010-0124", street: "40 Midway Avenue", x: 14, y: 11, type: "water_heater", problem: "Lukewarm water only. Electric heater, about eight years old.", window: 13, tech: "marcus", status: "scheduled" },
  { key: "m5", customer: "Anselm Ruiz", phone: "(555) 010-0125", street: "3 Kiln Street", x: 9, y: 6, type: "fixture", problem: "Toilet runs constantly.", window: 15, tech: "marcus", status: "scheduled" },
  // Priya Raman
  { key: "p1", customer: "Leona Whitfield", phone: "(555) 010-0131", street: "77 North Gate Road", x: 9, y: 2, type: "water_heater", problem: "Pilot will not stay lit.", window: 8, tech: "priya", status: "on_site", departAt: at(8, 28), arriveAt: at(8, 43) },
  { key: "p2", customer: "Cormac Dunleavy", phone: "(555) 010-0132", street: "14 Foundry Row", x: 12, y: 5, type: "drain", problem: "Kitchen sink fully blocked.", window: 10, tech: "priya", status: "scheduled" },
  { key: "p3", customer: "Yuki Tanabe", phone: "(555) 010-0133", street: "29 Russet Way", x: 15, y: 4, type: "fixture", problem: "Install customer's new bathroom tap.", window: 13, tech: "priya", status: "scheduled" },
  // Tomás Echeverría
  { key: "t1", customer: "Winifred Lachance", phone: "(555) 010-0141", street: "6 Boathouse Road", x: 17, y: 9, type: "drain", problem: "Shower drain blocked.", window: 8, tech: "tomas", status: "done", departAt: at(8), arriveAt: at(8, 18), doneAt: at(9, 14) },
  { key: "t2", customer: "Ignatius Belmonte", phone: "(555) 010-0142", street: "51 Midway Avenue", x: 13, y: 11, type: "drain", problem: "Laundry sink will not drain.", window: 9, tech: "tomas", status: "en_route", departAt: at(9, 19) },
  { key: "t3", customer: "Marisol Etxeberria", phone: "(555) 010-0143", street: "8 Grandstand Road", x: 15, y: 12, type: "leak", problem: "Pipe under the bathroom sink drips when the tap runs.", window: 11, tech: "tomas", status: "scheduled" },
  { key: "t4", customer: "Fergus Albrecht", phone: "(555) 010-0144", street: "33 Gravel Pit Lane", x: 5, y: 10, type: "drain", problem: "Kitchen drain gurgles and smells.", window: 14, tech: "tomas", status: "scheduled" },
  // Lee Sandoval
  { key: "l1", customer: "Petra Novak", phone: "(555) 010-0151", street: "12 Tailrace Road", x: 5, y: 4, type: "fixture", problem: "Replace toilet fill valve.", window: 8, tech: "lee", status: "done", departAt: at(8), arriveAt: at(8, 15), doneAt: at(8, 58) },
  { key: "l2", customer: "Augustin Baptiste", phone: "(555) 010-0152", street: "25 Sluice Lane", x: 3, y: 6, type: "leak", problem: "Leak at the washing machine valve.", window: 9, tech: "lee", status: "on_site", departAt: at(8, 58), arriveAt: at(9, 7) },
  { key: "l3", customer: "Henrietta Okonkwo", phone: "(555) 010-0153", street: "48 North Gate Road", x: 8, y: 3, type: "fixture", problem: "Outdoor tap handle snapped off.", window: 11, tech: "lee", status: "scheduled" },
  { key: "l4", customer: "Silas Greenaway", phone: "(555) 010-0154", street: "17 Assay Street", x: 9, y: 5, type: "fixture", problem: "Bathroom tap drips.", window: 14, tech: "lee", status: "scheduled" },
];

/** The customer record that came with each inbound message: who it is from and where they live. */
export type Inbound = { key: string; receivedAt: number; customer: string; phone: string; street: string; x: number; y: number };

export const INBOUND: Inbound[] = [
  { key: "spigot", receivedAt: at(8, 40), customer: "Lucinda Farrow", phone: "(555) 010-0161", street: "58 Tailrace Road", x: 6, y: 5 },
  { key: "sink", receivedAt: at(9, 5), customer: "Renee Kowalczyk", phone: "(555) 010-0162", street: "11 Foundry Row", x: 11, y: 5 },
  { key: "gas", receivedAt: at(9, 21), customer: "Dmitri Halloran", phone: "(555) 010-0163", street: "70 Shale Road", x: 3, y: 12 },
  { key: "hotwater", receivedAt: at(9, 52), customer: "Walt Brennan", phone: "(555) 010-0164", street: "16 Pippin Court", x: 17, y: 3 },
  { key: "ceiling", receivedAt: at(10, 24), customer: "Corinne Yazzie", phone: "(555) 010-0165", street: "212 Grandstand Road", x: 14, y: 13 },
  { key: "bathroom", receivedAt: at(11, 48), customer: "Folasade Adeyemi", phone: "(555) 010-0166", street: "36 Heron Walk", x: 18, y: 9 },
];

/** At 10:30 the water heater replacement on Pippin Court runs long. */
export const OVERRUN = { key: "m2", at: at(10, 30), minutes: 105, note: "Marcus: the gas shutoff is seized and the flue does not meet code. Both have to be replaced before the new heater can be lit. About an hour and three quarters more." };

/** Streets a visitor's own request can land on, by area. */
export const STREETS: Record<string, string[]> = {
  old_town: ["Assay Street", "Cinder Street", "Kiln Street"],
  millrace: ["Sluice Lane", "Tailrace Road"],
  northgate: ["North Gate Road", "Tollhouse Lane"],
  orchard: ["Pippin Court", "Russet Way"],
  lakeside: ["Heron Walk", "Boathouse Road"],
  fairgrounds: ["Midway Avenue", "Grandstand Road"],
  quarry: ["Shale Road", "Gravel Pit Lane"],
};
