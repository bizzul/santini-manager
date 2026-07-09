"use client";

import { useRouter } from "next/navigation";
import { usePmContext } from "@/components/personal-manager/pm-context";
import { LIFE_AREAS, type AreaSlug } from "@/lib/personal-manager/types";

export interface WheelAreaData {
  slug: AreaSlug;
  score?: number;
  openCount?: number;
}

interface LifeWheelProps {
  data: Record<string, { score?: number; openCount?: number }>;
  size?: number;
}

const SIZE = 300;
const CENTER = SIZE / 2;
const OUTER = 140;

function pointAt(angleDeg: number, radius: number) {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(a),
    y: CENTER - radius * Math.cos(a),
  };
}

function sectorPath(startAngle: number, endAngle: number, radius: number) {
  const start = pointAt(startAngle, radius);
  const end = pointAt(endAngle, radius);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

/**
 * Ruota Wheel of Life a 8 spicchi. Le aree non visibili all'utente sono
 * disattivate (grigie, non cliccabili). Tap su uno spicchio abilitato -> hub area.
 */
export function LifeWheel({ data, size = SIZE }: LifeWheelProps) {
  const router = useRouter();
  const { domain, areasVisible } = usePmContext();
  const base = `/sites/${domain}/personal-manager`;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={size}
      height={size}
      className="mx-auto block max-w-full"
      role="img"
      aria-label="Wheel of Life"
    >
      {LIFE_AREAS.map((area, index) => {
        const startAngle = index * 45;
        const endAngle = (index + 1) * 45;
        const midAngle = startAngle + 22.5;
        const visible = areasVisible.includes(area.slug);
        const areaData = data[area.slug] ?? {};
        const score = areaData.score;
        const openCount = areaData.openCount ?? 0;

        // Opacita' proporzionale al punteggio (0-10). Aree senza punteggio: base.
        const scoreOpacity =
          score !== undefined ? 0.25 + (score / 10) * 0.75 : 0.3;

        const labelPos = pointAt(midAngle, OUTER * 0.62);
        const scorePos = pointAt(midAngle, OUTER * 0.62 + 22);
        const badgePos = pointAt(midAngle, OUTER * 0.88);

        return (
          <g
            key={area.slug}
            onClick={() => {
              if (visible) router.push(`${base}/area/${area.slug}`);
            }}
            style={{ cursor: visible ? "pointer" : "not-allowed" }}
          >
            <path
              d={sectorPath(startAngle, endAngle, OUTER)}
              fill={visible ? area.accent : "#9ca3af"}
              fillOpacity={visible ? scoreOpacity : 0.18}
              stroke="#ffffff"
              strokeWidth={2}
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none select-none"
              fontSize={9}
              fontWeight={600}
              fill={visible ? "#ffffff" : "#e5e7eb"}
            >
              {area.label.length > 12
                ? `${area.label.slice(0, 11)}…`
                : area.label}
            </text>
            {visible ? (
              <text
                x={scorePos.x}
                y={scorePos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none"
                fontSize={13}
                fontWeight={800}
                fill="#ffffff"
              >
                {score !== undefined ? score : "–"}
              </text>
            ) : null}
            {visible && openCount > 0 ? (
              <g className="pointer-events-none">
                <circle
                  cx={badgePos.x}
                  cy={badgePos.y}
                  r={9}
                  fill="#ffffff"
                  stroke={area.accent}
                  strokeWidth={1.5}
                />
                <text
                  x={badgePos.x}
                  y={badgePos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={9}
                  fontWeight={700}
                  fill={area.accent}
                >
                  {openCount > 9 ? "9+" : openCount}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
      <circle cx={CENTER} cy={CENTER} r={20} fill="#ffffff" stroke="#e5e7eb" strokeWidth={2} />
      <text
        x={CENTER}
        y={CENTER}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9}
        fontWeight={700}
        fill="#6b7280"
      >
        LIFE
      </text>
    </svg>
  );
}
