/** The fictional company, its technicians, and the kinds of job it takes. */

export const COMPANY = { name: "Tamarack Plumbing & Drain", town: "Cinder Hollow", phone: "(555) 010-0140" };

export type Skill = "general" | "drain" | "water_heater" | "sewer";

export const SKILL_HAS: Record<Skill, string> = {
  general: "Does general plumbing",
  drain: "Carries the drain machine",
  water_heater: "Certified on water heaters",
  sewer: "Carries the sewer camera",
};

export const SKILL_LACKS: Record<Skill, string> = {
  general: "Does not do general plumbing",
  drain: "No drain machine on the van",
  water_heater: "Not certified on water heaters",
  sewer: "No sewer camera on the van",
};

export const JOB_TYPES = {
  leak: { label: "Leak repair", skill: "general", minutes: 60 },
  fixture: { label: "Toilet, tap or fixture", skill: "general", minutes: 45 },
  drain: { label: "Clogged drain", skill: "drain", minutes: 60 },
  water_heater: { label: "Water heater repair", skill: "water_heater", minutes: 75 },
  water_heater_replace: { label: "Water heater replacement", skill: "water_heater", minutes: 150 },
  sewer: { label: "Sewer line", skill: "sewer", minutes: 90 },
} as const satisfies Record<string, { label: string; skill: Skill; minutes: number }>;

export type JobType = keyof typeof JOB_TYPES;
export const JOB_TYPE_KEYS = Object.keys(JOB_TYPES) as [JobType, ...JobType[]];

export type Urgency = "emergency" | "today" | "flexible";
export const URGENCY_LABEL: Record<Urgency, string> = { emergency: "Emergency", today: "Today", flexible: "Can wait" };

export type Tech = { id: string; name: string; first: string; role: string; skills: Skill[]; tone: string };

/** `tone` names the colour of the technician's magnets on the board (see globals.css). */
export const TECHS: Tech[] = [
  { id: "dana", name: "Dana Whitlock", first: "Dana", role: "Lead, drains and sewer", skills: ["general", "drain", "sewer"], tone: "a" },
  { id: "marcus", name: "Marcus Oyelaran", first: "Marcus", role: "Water heaters", skills: ["general", "water_heater"], tone: "b" },
  { id: "priya", name: "Priya Raman", first: "Priya", role: "Water heaters and drains", skills: ["general", "water_heater", "drain"], tone: "c" },
  { id: "tomas", name: "Tomás Echeverría", first: "Tomás", role: "Drains", skills: ["general", "drain"], tone: "d" },
  { id: "lee", name: "Lee Sandoval", first: "Lee", role: "Second-year apprentice", skills: ["general"], tone: "e" },
];

export const TECH_BY_ID: Record<string, Tech> = Object.fromEntries(TECHS.map((tech) => [tech.id, tech]));
export const TECH_IDS = TECHS.map((tech) => tech.id) as [string, ...string[]];

export const canDo = (tech: Tech, type: JobType) => tech.skills.includes(JOB_TYPES[type].skill);
