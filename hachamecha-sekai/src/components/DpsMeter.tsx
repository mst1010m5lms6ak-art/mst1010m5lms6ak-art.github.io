import { ELEMENT_META, ROLE_META } from '../data/constants';
import type { DpsEntry, DpsMetric } from '../types/game';

interface DpsMeterProps {
  entries: DpsEntry[];
  metric: DpsMetric;
  onChangeMetric: (m: DpsMetric) => void;
  elapsedSec?: number;
  compact?: boolean;
  onClose?: () => void;
}

const METRICS: Array<{ key: DpsMetric; label: string; color: string }> = [
  { key: 'damageDealt', label: '与ダメ', color: '#ff5268' },
  { key: 'damageTaken', label: '被ダメ', color: '#4ea8ff' },
  { key: 'healingDone', label: '与回復', color: '#38f29b' },
  { key: 'healingReceived', label: '被回復', color: '#ffd94a' }
];

export function DpsMeter({ entries, metric, onChangeMetric, elapsedSec = 1, compact = false, onClose }: DpsMeterProps) {
  const sorted = [...entries].sort((a, b) => b[metric] - a[metric]);
  const maxVal = Math.max(1, sorted[0]?.[metric] ?? 1);
  const totalVal = Math.max(1, sorted.reduce((s, e) => s + e[metric], 0));
  const activeMeta = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const sec = Math.max(1, elapsedSec);

  const inner = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              class={`chip-btn ${metric === m.key ? 'active' : ''}`}
              style={{ minHeight: '28px', fontSize: '10px', padding: '0 4px' }}
              onClick={() => onChangeMetric(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
        {onClose && (
          <button type="button" class="btn-ghost" style={{ minHeight: '28px', padding: '0 8px', fontSize: '11px' }} onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {sorted.map((row) => {
          const val = row[metric];
          const pct = Math.round((val / totalVal) * 100);
          const width = Math.max(val > 0 ? 4 : 0, Math.round((val / maxVal) * 100));
          const perSec = Math.round(val / sec);
          return (
            <div key={row.actorId} class="dps-row">
              <div class="dps-row-head">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                  <span style={{ color: ELEMENT_META[row.element].color }}>{ELEMENT_META[row.element].short}</span>
                  <span style={{ color: ROLE_META[row.role].color }}>{ROLE_META[row.role].short}</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</span>
                </span>
                <span style={{ color: activeMeta.color, whiteSpace: 'nowrap' }}>
                  {val.toLocaleString()} ({pct}% / {perSec}/s)
                </span>
              </div>
              <div class="dps-bar-track">
                <div class="dps-bar-fill" style={{ width: `${width}%`, background: activeMeta.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  if (compact) {
    return <div class="dps-overlay">{inner}</div>;
  }
  return <div class="card-box">{inner}</div>;
}
