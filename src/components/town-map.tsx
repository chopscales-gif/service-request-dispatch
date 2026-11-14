import type { Job } from "@/db/schema";
import { TECHS } from "@/lib/crew";
import { vanAt, type PlanJob, type Projection } from "@/lib/plan";
import { AREAS, GRID, SHOP, TOWN } from "@/lib/town";

type Props = { jobs: Job[]; plan: PlanJob[]; projection: Projection; now: number };

/**
 * A drawing of the invented town. It is not a map service: places are points
 * on a grid of blocks, and the drive times on the board come from counting
 * blocks on this drawing.
 */
export function TownMap({ jobs, plan, projection, now }: Props) {
  const waiting = jobs.filter((job) => job.status === "new" || job.status === "hold");
  const stops = jobs.filter((job) => job.techId && ["scheduled", "en_route", "on_site"].includes(job.status));
  return (
    <figure className="panel overflow-hidden">
      <svg viewBox={`-0.8 -0.8 ${GRID.width + 1.6} ${GRID.height + 1.6}`} role="img" aria-label={`Drawing of ${TOWN} with each van and today's remaining stops`} className="block w-full bg-[#eef3f0]">
        <path d="M 21 5.5 C 18.6 6.6 19.4 9.4 19.9 11 C 20.2 12 20.6 12.6 21 12.8 Z" fill="#cfe3ea" />
        <path d="M 1.6 -1 C 2.6 2 1.2 4.4 2 7 C 2.6 9 1.4 12 2.2 15" fill="none" stroke="#cfe3ea" strokeWidth="0.45" />
        {Array.from({ length: GRID.width + 1 }, (_, x) => (
          <line key={`x${x}`} x1={x} y1={-0.3} x2={x} y2={GRID.height + 0.3} stroke="#ffffff" strokeWidth={x === SHOP.x ? 0.22 : 0.1} />
        ))}
        {Array.from({ length: GRID.height + 1 }, (_, y) => (
          <line key={`y${y}`} x1={-0.3} y1={y} x2={GRID.width + 0.3} y2={y} stroke="#ffffff" strokeWidth={y === SHOP.y ? 0.22 : 0.1} />
        ))}
        <rect x={SHOP.x - 0.38} y={SHOP.y - 0.38} width="0.76" height="0.76" fill="#14231d" />
        <text x={SHOP.x} y={SHOP.y + 1.05} textAnchor="middle" fontSize="0.55" fontWeight="600" fill="#14231d">
          Shop
        </text>
        {stops.map((job) => {
          const tech = TECHS.find((candidate) => candidate.id === job.techId)!;
          return <circle key={job.id} data-tone={tech.tone} cx={job.x} cy={job.y} r="0.24" fill="#ffffff" stroke="var(--tone)" strokeWidth="0.13" />;
        })}
        {waiting.map((job) => (
          <g key={job.id} transform={`translate(${job.x} ${job.y}) rotate(45)`}>
            <rect x="-0.3" y="-0.3" width="0.6" height="0.6" fill={job.urgency === "emergency" || job.status === "hold" ? "#b3261e" : "#f4d40f"} stroke="#14231d" strokeWidth="0.08" />
            {(job.urgency === "emergency" || job.status === "hold") && (
              <text transform="rotate(-45)" y="0.19" textAnchor="middle" fontSize="0.5" fontWeight="700" fill="#ffffff">
                !
              </text>
            )}
          </g>
        ))}
        {AREAS.map((area) => (
          <text key={area.key} x={area.x} y={area.y - 1.2} textAnchor="middle" fontSize="0.62" fontWeight="600" fill="#4f6058" stroke="#eef3f0" strokeWidth="0.22" paintOrder="stroke" style={{ fontFamily: "var(--font-display)" }}>
            {area.name}
          </text>
        ))}
        {TECHS.map((tech, index) => {
          const at = vanAt(
            plan.filter((job) => job.techId === tech.id && projection.slots[job.id]).sort((a, b) => a.seq - b.seq),
            projection.slots,
            now,
          );
          // Vans at the same place are nudged apart so each can be seen.
          const nudge = (index - 2) * 0.12;
          return (
            <g key={tech.id} data-tone={tech.tone} transform={`translate(${at.x + nudge} ${at.y - 0.55 + nudge})`}>
              <rect x="-0.42" y="-0.42" width="0.84" height="0.84" rx="0.12" fill="var(--tone)" stroke="#ffffff" strokeWidth="0.08" />
              <text y="0.2" textAnchor="middle" fontSize="0.58" fontWeight="700" fill="#ffffff">
                {tech.first[0]}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="space-y-1.5 border-t border-line px-3 py-2 text-sm text-muted">
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          {TECHS.map((tech) => (
            <span key={tech.id} data-tone={tech.tone} className="inline-flex items-center gap-1.5 text-ink">
              <span className="dot" aria-hidden />
              {tech.first}
            </span>
          ))}
        </p>
        <p>Squares are vans, rings are stops still to come, diamonds are requests waiting for you. A red diamond with an exclamation mark is an emergency or a safety hold.</p>
        <p>
          {TOWN} is invented and this is a drawing, not a map service. Drive times are counted in blocks on this grid.
        </p>
      </figcaption>
    </figure>
  );
}
