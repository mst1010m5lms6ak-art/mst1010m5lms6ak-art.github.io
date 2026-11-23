import { ELEMENT_META, ROLE_META } from '../data/constants';
import type { ElementType, RaceType, RoleType } from '../types/game';

interface EmblemProps {
  element: ElementType;
  races: [RaceType] | [RaceType, RaceType];
  role: RoleType;
  size?: number;
  sigActive?: boolean;
}

function renderRaceShape(race: RaceType, r: number, color: string, opacity: number, strokeWidth: number) {
  switch (race) {
    case 'human':
      return (
        <polygon
          points={`32,${32 - r} ${32 + r * 0.86},${32 - r * 0.5} ${32 + r * 0.86},${32 + r * 0.5} 32,${32 + r} ${32 - r * 0.86},${32 + r * 0.5} ${32 - r * 0.86},${32 - r * 0.5}`}
          fill="none"
          stroke={color}
          stroke-opacity={opacity}
          stroke-width={strokeWidth}
        />
      );
    case 'dragon':
      return (
        <polygon
          points={`32,${32 - r} ${32 + r * 0.88},32 32,${32 + r} ${32 - r * 0.88},32`}
          fill="none"
          stroke={color}
          stroke-opacity={opacity}
          stroke-width={strokeWidth}
        />
      );
    case 'monster':
      return (
        <polygon
          points={`32,${32 - r} ${32 + r * 0.35},${32 - r * 0.35} ${32 + r},32 ${32 + r * 0.35},${32 + r * 0.35} 32,${32 + r} ${32 - r * 0.35},${32 + r * 0.35} ${32 - r},32 ${32 - r * 0.35},${32 - r * 0.35}`}
          fill="none"
          stroke={color}
          stroke-opacity={opacity}
          stroke-width={strokeWidth}
        />
      );
    case 'fairy':
      return (
        <circle
          cx="32"
          cy="32"
          r={r * 0.86}
          fill="none"
          stroke={color}
          stroke-opacity={opacity}
          stroke-width={strokeWidth}
          stroke-dasharray="5 3"
        />
      );
    case 'machine':
      return (
        <rect
          x={32 - r * 0.72}
          y={32 - r * 0.72}
          width={r * 1.44}
          height={r * 1.44}
          rx="3"
          fill="none"
          stroke={color}
          stroke-opacity={opacity}
          stroke-width={strokeWidth}
        />
      );
  }
}

export function Emblem({ element, races, role, size = 34, sigActive }: EmblemProps) {
  const el = ELEMENT_META[element];
  const rl = ROLE_META[role];

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0, display: 'block' }} aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill={el.bg} stroke={sigActive ? '#ffd94a' : el.color} stroke-width={sigActive ? '2.8' : '2'} />
      {renderRaceShape(races[0], 23, el.color, 0.9, 2.4)}
      {races[1] && renderRaceShape(races[1], 16, '#ffd94a', 0.85, 2)}
      <circle cx="32" cy="32" r="11" fill="#0e0a1c" stroke={rl.color} stroke-width="2" />
      <text
        x="32"
        y="36.5"
        text-anchor="middle"
        fill={rl.color}
        font-size="13"
        font-weight="900"
      >
        {rl.short}
      </text>
    </svg>
  );
}
