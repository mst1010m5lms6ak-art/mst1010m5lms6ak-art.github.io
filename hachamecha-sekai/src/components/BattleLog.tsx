import type { BattleLogEntry } from '../types/game';

interface BattleLogProps {
  logs: BattleLogEntry[];
}

export function BattleLog({ logs }: BattleLogProps) {
  const visible = logs.slice(-4);
  return (
    <div class="battle-log-box" aria-live="polite">
      {visible.map((entry) => (
        <div key={entry.id} class={`battle-log-row tone-${entry.tone}`}>
          {entry.text}
        </div>
      ))}
    </div>
  );
}
