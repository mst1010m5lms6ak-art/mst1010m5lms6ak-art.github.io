import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ELEMENT_META, ROLE_META } from '../data/constants';
import { predictTimeline } from '../engine/battle';
import { sound } from '../engine/sound';
import type { BattleActor, BattleSpeed, BattleState, DpsMetric } from '../types/game';
import { BattleCanvas } from './BattleCanvas';
import { BattleLog } from './BattleLog';
import { BattleTimeline } from './BattleTimeline';
import { DpsMeter } from './DpsMeter';
import { Emblem } from './Emblem';
import { ResultModal } from './ResultModal';

interface BattleScreenProps {
  battle: BattleState;
  handedness: 'right' | 'left';
  onUseSkill: (skillIndex: number, targetId: string | null) => void;
  onSelectTarget: (targetId: string) => void;
  onTriggerOrb: (mode: 'enemy' | 'ally') => void;
  onChangeSpeed: (speed: BattleSpeed) => void;
  onToggleAuto: () => void;
  onToggleRepeat: () => void;
  onStopRepeatToResult: () => void;
  onProceedRepeatNow: () => void;
  onRetry: () => void;
  onNextTower?: () => void;
  onExitBattle: () => void;
}

interface DragPayload {
  kind: 'skill' | 'orb';
  skillIndex?: number;
  label: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

function statusLabel(id: BattleActor['statuses'][number]['id']): { text: string; cls: string } {
  switch (id) {
    case 'atk_up':
      return { text: '攻↑', cls: 'up' };
    case 'def_up':
      return { text: '防↑', cls: 'up' };
    case 'spd_up':
      return { text: '速↑', cls: 'up' };
    case 'atk_down':
      return { text: '攻↓', cls: 'down' };
    case 'def_down':
      return { text: '防↓', cls: 'down' };
    case 'taunt':
      return { text: '挑発', cls: 'taunt' };
    case 'stun':
      return { text: '気絶', cls: 'stun' };
  }
}

export function BattleScreen({
  battle,
  handedness,
  onUseSkill,
  onSelectTarget,
  onTriggerOrb,
  onChangeSpeed,
  onToggleAuto,
  onToggleRepeat,
  onStopRepeatToResult,
  onProceedRepeatNow,
  onRetry,
  onNextTower,
  onExitBattle
}: BattleScreenProps) {
  const [showDps, setShowDps] = useState(false);
  const [dpsMetric, setDpsMetric] = useState<DpsMetric>('damageDealt');
  const [confirmRetreat, setConfirmRetreat] = useState(false);
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const [hoverSide, setHoverSide] = useState<'ally' | 'enemy' | null>(null);
  const dragRef = useRef<DragPayload | null>(null);

  const allies = useMemo(() => battle.actors.filter((a) => a.side === 'ally'), [battle.actors]);
  const enemies = useMemo(() => battle.actors.filter((a) => a.side === 'enemy'), [battle.actors]);
  const timeline = useMemo(() => predictTimeline(battle, 7), [battle]);
  const activeAlly = useMemo(
    () => battle.actors.find((a) => a.instanceId === battle.activeActorId && a.side === 'ally') ?? null,
    [battle.actors, battle.activeActorId]
  );

  const displayUnit = activeAlly ?? allies.find((a) => a.alive) ?? allies[0];
  const canManualAct = battle.phase === 'running' && battle.waitingManual && !!activeAlly;
  const isLeft = handedness === 'left';

  // Pointer-based D&D for iOS Safari & Desktop
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      const dist = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY);
      const moved = cur.moved || dist > 10;
      const updated: DragPayload = { ...cur, x: e.clientX, y: e.clientY, moved };
      dragRef.current = updated;
      setDrag(updated);

      if (moved) {
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const actorEl = el?.closest('[data-actor-id]') as HTMLElement | null;
        const sideEl = el?.closest('[data-drop-side]') as HTMLElement | null;
        setHoverTargetId(actorEl?.dataset.actorId ?? null);
        setHoverSide((sideEl?.dataset.dropSide as 'ally' | 'enemy' | undefined) ?? null);
      }
    };

    const onUp = (e: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      dragRef.current = null;
      setDrag(null);
      setHoverTargetId(null);
      setHoverSide(null);

      if (!cur.moved) {
        // タップ操作として実行
        if (cur.kind === 'skill' && cur.skillIndex !== undefined) {
          onUseSkill(cur.skillIndex, battle.selectedTargetId);
        } else if (cur.kind === 'orb') {
          onTriggerOrb('enemy');
        }
        return;
      }

      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const actorEl = el?.closest('[data-actor-id]') as HTMLElement | null;
      const sideEl = el?.closest('[data-drop-side]') as HTMLElement | null;
      const droppedActorId = actorEl?.dataset.actorId ?? null;
      const droppedSide = (sideEl?.dataset.dropSide as 'ally' | 'enemy' | undefined) ?? null;

      if (cur.kind === 'orb') {
        if (droppedSide === 'ally') {
          onTriggerOrb('ally');
        } else if (droppedSide === 'enemy') {
          onTriggerOrb('enemy');
        }
      } else if (cur.kind === 'skill' && cur.skillIndex !== undefined) {
        if (droppedActorId) {
          onSelectTarget(droppedActorId);
          onUseSkill(cur.skillIndex, droppedActorId);
        } else if (droppedSide) {
          onUseSkill(cur.skillIndex, battle.selectedTargetId);
        }
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [battle.selectedTargetId, onSelectTarget, onTriggerOrb, onUseSkill]);

  const startSkillDrag = (e: PointerEvent, idx: number, name: string) => {
    if (!canManualAct || !activeAlly || activeAlly.cooldowns[idx] > 0) return;
    sound.unlock();
    const payload: DragPayload = {
      kind: 'skill',
      skillIndex: idx,
      label: `▶ ${name}`,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false
    };
    dragRef.current = payload;
    setDrag(payload);
  };

  const startOrbDrag = (e: PointerEvent) => {
    if (!battle.chaosOrbReady || battle.phase !== 'running') return;
    sound.unlock();
    const payload: DragPayload = {
      kind: 'orb',
      label: '★ カオスオーブ (敵へ砲撃 / 味方へ覚醒)',
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false
    };
    dragRef.current = payload;
    setDrag(payload);
  };

  const nextSpeed = (): BattleSpeed => (battle.speed === 1 ? 2 : battle.speed === 2 ? 3 : 1);

  const renderActorCard = (actor: BattleActor) => {
    const hpPct = Math.max(0, Math.min(100, Math.round((actor.hp / actor.maxHp) * 100)));
    const shPct = Math.max(0, Math.min(100, Math.round((actor.shield / actor.maxHp) * 100)));
    const gaugePct = Math.max(0, Math.min(100, Math.round(actor.gauge)));
    const isActive = battle.activeActorId === actor.instanceId;
    const isTargeted = battle.selectedTargetId === actor.instanceId && actor.alive;
    const isDropHighlight =
      drag?.moved &&
      ((drag.kind === 'skill' && hoverTargetId === actor.instanceId && actor.alive) ||
        (drag.kind === 'orb' && hoverSide === actor.side && actor.alive));

    let animCls = '';
    if (actor.animState === 'attack') {
      animCls = actor.side === 'ally' ? 'anim-attack-ally' : 'anim-attack-enemy';
    } else if (actor.animState === 'hit') {
      animCls = 'anim-hit';
    } else if (actor.animState === 'heal') {
      animCls = 'anim-heal';
    } else if (actor.animState === 'burst') {
      animCls = 'anim-burst';
    }

    const floats = battle.floatingNumbers.filter((f) => f.targetId === actor.instanceId).slice(-2);

    return (
      <div
        key={`${actor.instanceId}_${actor.animNonce}`}
        data-actor-id={actor.instanceId}
        data-drop-side={actor.side}
        class={`actor-card ${actor.side} ${actor.isBoss ? 'boss' : ''} ${!actor.alive ? 'dead' : ''} ${
          isActive ? 'active-turn' : ''
        } ${isTargeted ? 'targeted' : ''} ${isDropHighlight ? 'drop-valid' : ''} ${animCls}`}
        onClick={() => {
          if (actor.alive) {
            sound.tap();
            onSelectTarget(actor.instanceId);
          }
        }}
      >
        <div class="actor-head">
          <Emblem element={actor.element} races={actor.races} role={actor.role} size={26} sigActive={actor.sigActive} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div class="actor-name" style={{ color: actor.isBoss ? '#ffd94a' : '#fff' }}>
              {actor.name}
            </div>
            <div style={{ fontSize: '8px', color: ELEMENT_META[actor.element].color, fontWeight: 800 }}>
              {ELEMENT_META[actor.element].short}・{ROLE_META[actor.role].short}
            </div>
          </div>
        </div>

        <div class="hp-track">
          <div class={`hp-fill ${actor.side}`} style={{ width: `${hpPct}%` }} />
          {shPct > 0 && <div class="shield-overlay" style={{ width: `${shPct}%` }} />}
        </div>

        <div class="actor-hp-num">
          <span>{actor.hp.toLocaleString()}</span>
          {actor.shield > 0 && <span style={{ color: '#47dcff' }}>+{actor.shield}</span>}
        </div>

        <div class="gauge-track">
          <div class="gauge-fill" style={{ width: `${gaugePct}%` }} />
        </div>

        <div class="status-mini-row">
          {actor.statuses.slice(0, 3).map((st) => {
            const meta = statusLabel(st.id);
            return (
              <span key={st.id} class={`st-tag ${meta.cls}`}>
                {meta.text}
                {st.turns}
              </span>
            );
          })}
        </div>

        {floats.map((f) => (
          <div key={f.id} class={`float-pop ${f.kind}`}>
            {f.text}
          </div>
        ))}
      </div>
    );
  };

  const showSingleResult =
    (battle.phase === 'victory' || battle.phase === 'defeat') &&
    !battle.autoRepeat &&
    !battle.showRepeatFinal &&
    battle.lastReward !== null;

  const showRepeatInterim =
    battle.phase === 'victory' && battle.autoRepeat && !battle.showRepeatFinal && battle.repeatSession !== null;

  const showRepeatFinalModal = battle.showRepeatFinal && battle.repeatSession !== null;

  return (
    <div class={`battle-root ${battle.activeLaw ? 'has-law' : ''}`}>
      {/* 上部視認ゾーン：ステージ・Wave・周回数 */}
      <div class="battle-top-info">
        <div class="battle-stage-label">
          {battle.stageName} ・ W{battle.waveIndex + 1}/{battle.totalWaves}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {battle.autoRepeat && (
            <span class="tag-pill" style={{ background: 'rgba(255,217,74,0.22)', color: '#ffd94a' }}>
              周回 {(battle.repeatSession?.runs ?? 0) + (battle.phase === 'running' ? 1 : 0)}戦目
            </span>
          )}
          <span style={{ fontSize: '10px', color: 'var(--txt-sub)', fontWeight: 800 }}>
            T{battle.turnCount}
          </span>
        </div>
      </div>

      {/* 行動順タイムライン */}
      <BattleTimeline slots={timeline} />

      {/* カオスゲージ＆発動中法則 */}
      <div class="chaos-strip">
        <div class="chaos-gauge-wrap">
          <div class="chaos-gauge-head">
            <span style={{ color: '#ffd94a' }}>CHAOS {Math.min(100, battle.chaosGauge)}%</span>
            <span style={{ color: battle.chaosOrbReady ? '#29d2ff' : 'var(--txt-dim)' }}>
              {battle.chaosOrbReady ? '★オーブ装填中' : '100%で法則暴走'}
            </span>
          </div>
          <div class="chaos-bar-track">
            <div class="chaos-bar-fill" style={{ width: `${Math.min(100, battle.chaosGauge)}%` }} />
          </div>
        </div>
        {battle.activeLaw && (
          <div
            class="law-badge"
            style={{
              color: battle.activeLaw.color,
              borderColor: battle.activeLaw.color,
              background: 'rgba(0,0,0,0.45)'
            }}
            title={battle.activeLaw.shortDesc}
          >
            ★{battle.activeLaw.name}({battle.activeLaw.remainingActions})
          </div>
        )}
      </div>

      {/* 1行固定戦闘ログ */}
      <BattleLog logs={battle.logs} />

      {/* 戦場エリア（敵・Canvas演出・味方） */}
      <div class="battle-stage">
        <BattleCanvas fxEvents={battle.fxEvents} />

        <div class="actor-row" data-drop-side="enemy">
          {enemies.map(renderActorCard)}
        </div>

        <div class="battle-center-arena">
          <svg class="arena-ring-bg" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" stroke={battle.activeLaw ? battle.activeLaw.color : '#b44cff'} stroke-width="2" stroke-dasharray="12 8" />
            <polygon points="60,12 108,60 60,108 12,60" fill="none" stroke="#29d2ff" stroke-width="1.5" />
            <circle cx="60" cy="60" r="24" fill="none" stroke="#ffd94a" stroke-width="1.5" stroke-dasharray="6 4" />
          </svg>
          <div
            class="arena-status-pill"
            style={{
              color: battle.activeLaw ? battle.activeLaw.color : 'var(--txt-sub)',
              borderColor: battle.activeLaw ? battle.activeLaw.color : 'rgba(190,178,255,0.24)'
            }}
          >
            {battle.activeLaw
              ? `【${battle.activeLaw.name}】${battle.activeLaw.shortDesc}`
              : canManualAct
                ? `${activeAlly.name}のターン：技をタップ／相手へドラッグ`
                : battle.autoBattle
                  ? 'オート戦闘進行中…'
                  : '行動ゲージ充填中…'}
          </div>
        </div>

        <div class="actor-row" data-drop-side="ally">
          {allies.map(renderActorCard)}
        </div>
      </div>

      {/* DPSメーター展開オーバーレイ */}
      {showDps && (
        <DpsMeter
          entries={Object.values(battle.dps)}
          metric={dpsMetric}
          onChangeMetric={setDpsMetric}
          elapsedSec={battle.elapsedSec}
          compact
          onClose={() => setShowDps(false)}
        />
      )}

      {/* 親指操作ドック（画面下部集中・戦闘中は他画面遷移ロック） */}
      <div class="battle-dock">
        <div class={`skill-dock-row ${isLeft ? 'left-handed' : ''}`}>
          {displayUnit &&
            displayUnit.skills.map((sk, idx) => {
              const cd = activeAlly ? activeAlly.cooldowns[idx] : 0;
              const disabled = !canManualAct || cd > 0;
              return (
                <button
                  key={sk.id}
                  type="button"
                  disabled={disabled}
                  class={`skill-btn ${idx === 2 ? 'ult' : ''} ${!disabled ? 'ready' : ''}`}
                  onPointerDown={(e) => startSkillDrag(e, idx, sk.name)}
                >
                  <div class="skill-btn-name">
                    {idx === 2 ? '★' : ''}
                    {sk.name}
                  </div>
                  <div class="skill-btn-sub">
                    <span>{idx === 0 ? '基本' : idx === 1 ? '戦術' : '奥義'}</span>
                    <span style={{ color: cd > 0 ? '#ff6b8b' : '#38f29b' }}>{cd > 0 ? `CT ${cd}` : 'READY'}</span>
                  </div>
                </button>
              );
            })}

          <button
            type="button"
            disabled={!battle.chaosOrbReady || battle.phase !== 'running'}
            class={`chaos-orb-btn ${battle.chaosOrbReady ? 'ready' : ''}`}
            onPointerDown={startOrbDrag}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>✦</span>
            <span>{battle.chaosOrbReady ? 'オーブ' : '充電中'}</span>
          </button>
        </div>

        <div class={`battle-controls-row ${isLeft ? 'left-handed' : ''}`}>
          <button
            type="button"
            class={`ctrl-btn ${battle.speed > 1 ? 'on' : ''}`}
            onClick={() => {
              sound.tap();
              onChangeSpeed(nextSpeed());
            }}
          >
            {battle.speed}x速
          </button>
          <button
            type="button"
            class={`ctrl-btn ${battle.autoBattle ? 'on' : ''}`}
            onClick={() => {
              sound.tap();
              onToggleAuto();
            }}
          >
            AUTO {battle.autoBattle ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            class={`ctrl-btn ${battle.autoRepeat ? 'repeat-on' : ''}`}
            onClick={() => {
              sound.tap();
              onToggleRepeat();
            }}
          >
            周回 {battle.autoRepeat ? '∞' : 'OFF'}
          </button>
          <button
            type="button"
            class={`ctrl-btn ${showDps ? 'on' : ''}`}
            onClick={() => {
              sound.tap();
              setShowDps((v) => !v);
            }}
          >
            DPS
          </button>
          <button
            type="button"
            class="ctrl-btn retreat"
            onClick={() => {
              sound.tap();
              if (battle.autoRepeat && battle.repeatSession && battle.repeatSession.runs > 0) {
                onStopRepeatToResult();
              } else {
                setConfirmRetreat(true);
              }
            }}
          >
            {battle.autoRepeat && (battle.repeatSession?.runs ?? 0) > 0 ? '周回終了' : '撤退'}
          </button>
        </div>
      </div>

      {/* ドラッグゴースト */}
      {drag?.moved && (
        <div class="drag-ghost" style={{ left: `${drag.x}px`, top: `${drag.y - 26}px` }}>
          {drag.label}
        </div>
      )}

      {/* 周回インターバル速報 */}
      {showRepeatInterim && battle.repeatSession && (
        <div class="repeat-backdrop">
          <div class="repeat-banner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#ffd94a' }}>
                ★ 周回 {battle.repeatSession.runs}戦 勝利！
              </span>
              <span style={{ fontSize: '11px', color: '#29d2ff', fontWeight: 800 }}>
                次戦まで {Math.max(0, battle.repeatCountdown ?? 1).toFixed(1)}秒
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', fontSize: '11px', fontWeight: 800 }}>
              <span class="res-pill gold">累計G +{battle.repeatSession.totalGold.toLocaleString()}</span>
              <span class="res-pill shard">結晶 +{battle.repeatSession.totalShard}</span>
              <span class="res-pill">確保 {battle.repeatSession.keptEquips.length}</span>
              <span class="res-pill">自動売却 {battle.repeatSession.autoSoldCount}</span>
            </div>
            <div class="thumb-row">
              <button type="button" class="btn-ghost" style={{ flex: 1 }} onClick={onStopRepeatToResult}>
                停止して集計を見る
              </button>
              <button type="button" class="btn-primary" style={{ flex: 1 }} onClick={onProceedRepeatNow}>
                即座に次戦へ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 通常リザルト */}
      {showSingleResult && (
        <ResultModal
          mode="single"
          reward={battle.lastReward}
          repeatSession={null}
          onRetry={onRetry}
          onNextTower={onNextTower}
          onClose={onExitBattle}
        />
      )}

      {/* 周回累計リザルト */}
      {showRepeatFinalModal && (
        <ResultModal
          mode="repeat"
          reward={battle.lastReward}
          repeatSession={battle.repeatSession}
          onRetry={onRetry}
          onClose={onExitBattle}
        />
      )}

      {/* 撤退確認モーダル */}
      {confirmRetreat && (
        <div class="modal-backdrop">
          <div class="modal-sheet" style={{ maxHeight: '42%' }}>
            <div class="modal-header">
              <span style={{ fontSize: '14px', fontWeight: 900 }}>戦闘から撤退しますか？</span>
            </div>
            <div class="modal-body" style={{ fontSize: '12px', color: 'var(--txt-sub)' }}>
              撤退すると現在の戦闘進行は破棄され、拠点へ戻ります。
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmRetreat(false)}>
                続ける
              </button>
              <button
                type="button"
                class="btn-danger"
                style={{ flex: 1 }}
                onClick={() => {
                  setConfirmRetreat(false);
                  onExitBattle();
                }}
              >
                撤退する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
