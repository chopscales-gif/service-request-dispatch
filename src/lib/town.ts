/**
 * Cinder Hollow, an invented town. Places are points on a grid, and driving
 * follows the grid: so many minutes a block, plus a few to park and unload.
 * A real build would ask a maps service for drive times instead.
 */

export type Point = { x: number; y: number };

export const TOWN = "Cinder Hollow";
export const GRID = { width: 20, height: 14 };

/** The shop, where every van starts the day. */
export const SHOP: Point & { street: string } = { x: 9, y: 8, street: "40 Depot Street" };

export const AREAS = [
  { key: "old_town", name: "Old Town", x: 10, y: 6 },
  { key: "millrace", name: "Millrace", x: 4, y: 5 },
  { key: "northgate", name: "Northgate", x: 10, y: 2 },
  { key: "orchard", name: "Orchard Heights", x: 16, y: 3 },
  { key: "lakeside", name: "Lakeside", x: 18, y: 8 },
  { key: "fairgrounds", name: "Fairgrounds", x: 14, y: 12 },
  { key: "quarry", name: "Quarry Road", x: 4, y: 11 },
] as const;

export type AreaKey = (typeof AREAS)[number]["key"];
export const AREA_KEYS = AREAS.map((area) => area.key) as [AreaKey, ...AreaKey[]];

/** The area a point is in: simply the nearest centre. */
export function areaOf(point: Point): (typeof AREAS)[number] {
  return AREAS.reduce((best, area) => (blocks(area, point) < blocks(best, point) ? area : best));
}

const MINUTES_PER_BLOCK = 1.5;
const PARK_AND_UNLOAD = 3;

export const blocks = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Minutes to drive from one place to another. */
export function drive(a: Point, b: Point): number {
  const distance = blocks(a, b);
  return distance === 0 ? 0 : Math.round(distance * MINUTES_PER_BLOCK) + PARK_AND_UNLOAD;
}

/** Where a van is, a fraction of the way from a to b: along the avenue first, then up the street. */
export function along(a: Point, b: Point, fraction: number): Point {
  const total = blocks(a, b);
  if (total === 0) return { ...b };
  const gone = Math.min(Math.max(fraction, 0), 1) * total;
  const dx = Math.abs(b.x - a.x);
  if (gone <= dx) return { x: a.x + Math.sign(b.x - a.x) * gone, y: a.y };
  return { x: b.x, y: a.y + Math.sign(b.y - a.y) * (gone - dx) };
}
