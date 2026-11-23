import { ELEMENT_META, ROLE_META } from '../data/constants';
import type { TimelineSlot } from '../engine/battle';

interface BattleTimelineProps {
  slots: TimelineSlot[];
}

export function BattleTimeline({ slots }: BattleTimelineProps) {
  return (
    <div class="timeline-bar">
      <span class="timeline-label">行動順</span>
      <div class="timeline-list">
        {slots.slice(0, 6).map((s, idx) => (
          <div
            key={`${s.actorId}_${idx}`}
            class={`tl-chip ${s.side} ${s.isActive ? 'active' : ''}`}
            style={{ borderColor: s.isActive ? '#ffd94a' : ELEMENT_META[s.element].color }}
          >
            <span style={{ color: ROLE_META[s.role].color, flexShrink: 0 }}>{ROLE_META[s.role].short}</span>
            <span class="tl-name">{s.name.slice(0, 3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
