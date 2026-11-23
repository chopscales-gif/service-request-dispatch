import type { Job } from "@/db/schema";
import { TECHS } from "@/lib/crew";
import { vanAt, type PlanJob, type Projection } from "@/lib/plan";
import { AREAS, GRID, SHOP, TOWN, labelAt } from "@/lib/town";

type Props = { jobs: Job[]; plan: PlanJob[]; projection: Projection; now: number };

/**
 * A drawing of the invented town. It is not a map service: places are points
 * on a grid of blocks, and the drive times on the board come from counting
 * blocks on this drawing.
 */
export function TownMap({ jobs, plan, projection, now }: Props) {
  const waiting = jobs.filter((job) => job.status === "new" || job.status === "hold");
  const stops = jobs.filter((job) => job.techId && ["scheduled", "en_route", "on_site"].includes(job.status));
  // Vans at the same place are nudged apart so each can be seen.
  const vans = TECHS.map((tech, index) => {
    const at = vanAt(
      plan.filter((job) => job.techId === tech.id && projection.slots[job.id]).sort((a, b) => a.seq - b.seq),
      projection.slots,
      now,
    );
    const nudge = (index - 2) * 0.12;
    return { tech, x: at.x + nudge, y: at.y - 0.55 + nudge };
  });
  // Everything a name must not be drawn across.
  const markers = [...vans, ...stops, ...waiting, SHOP];
  return (
    <figure className="sheet overflow-hidden">
      <svg viewBox={`-0.8 -0.8 ${GRID.width + 1.6} ${GRID.height + 1.6}`} role="img" aria-label={`Drawing of ${TOWN} with each van and today's remaining stops`} className="block w-full bg-[#edf1f7]">
        <path d="M 21 5.5 C 18.6 6.6 19.4 9.4 19.9 11 C 20.2 12 20.6 12.6 21 12.8 Z" fill="#cddffa" />
        <path d="M 1.6 -1 C 2.6 2 1.2 4.4 2 7 C 2.6 9 1.4 12 2.2 15" fill="none" stroke="#cddffa" strokeWidth="0.45" />
        {Array.from({ length: GRID.width + 1 }, (_, x) => (
          <line key={`x${x}`} x1={x} y1={-0.3} x2={x} y2={GRID.height + 0.3} stroke="#ffffff" strokeWidth={x === SHOP.x ? 0.22 : 0.1} />
        ))}
        {Array.from({ length: GRID.height + 1 }, (_, y) => (
          <line key={`y${y}`} x1={-0.3} y1={y} x2={GRID.width + 0.3} y2={y} stroke="#ffffff" strokeWidth={y === SHOP.y ? 0.22 : 0.1} />
        ))}
        <rect x={SHOP.x - 0.38} y={SHOP.y - 0.38} width="0.76" height="0.76" rx="0.16" fill="#1c2247" />
        <text x={SHOP.x} y={SHOP.y + 1.05} textAnchor="middle" fontSize="0.55" fontWeight="600" fill="#1c2247">
          Shop
        </text>
        {stops.map((job) => {
          const tech = TECHS.find((candidate) => candidate.id === job.techId)!;
          return <circle key={job.id} data-tone={tech.tone} cx={job.x} cy={job.y} r="0.24" fill="#ffffff" stroke="var(--tone)" strokeWidth="0.13" />;
        })}
        {waiting.map((job) => (
          <g key={job.id} transform={`translate(${job.x} ${job.y}) rotate(45)`}>
            <rect x="-0.3" y="-0.3" width="0.6" height="0.6" fill={job.urgency === "emergency" || job.status === "hold" ? "#cb2c48" : "#ffc44d"} stroke="#ffffff" strokeWidth="0.09" rx="0.08" />
            {(job.urgency === "emergency" || job.status === "hold") && (
              <text transform="rotate(-45)" y="0.19" textAnchor="middle" fontSize="0.5" fontWeight="700" fill="#ffffff">
                !
              </text>
            )}
          </g>
        ))}
        {AREAS.map((area) => (
          <text key={area.key} {...labelAt(area, markers)} textAnchor="middle" fontSize="0.56" fontWeight="600" fill="#596085" stroke="#edf1f7" strokeWidth="0.22" paintOrder="stroke">
            {area.name}
          </text>
        ))}
        {vans.map(({ tech, x, y }) => (
          <g key={tech.id} data-tone={tech.tone} transform={`translate(${x} ${y})`}>
            <rect x="-0.42" y="-0.42" width="0.84" height="0.84" rx="0.24" fill="var(--tone)" stroke="#ffffff" strokeWidth="0.08" />
            <text y="0.2" textAnchor="middle" fontSize="0.58" fontWeight="700" fill="#ffffff">
              {tech.first[0]}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="space-y-2 border-t border-line px-5 py-4 text-sm leading-snug text-muted">
        <p className="flex flex-wrap gap-x-4 gap-y-1 font-medium">
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
