import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ELEMENT_META, ELEMENT_ORDER, RACE_META, ROLE_META } from '../data/constants';
import { UNIT_DEFS, UNIT_MAP } from '../data/units';
import { sortUnits } from '../engine/sort';
import { sound } from '../engine/sound';
import { calcPartyPower, calcUnitPower, computeUnitStats, getLevelUpGoldCost, getPartySynergies } from '../engine/stats';
import type { ElementType, SaveData, UnitDef } from '../types/game';
import { Emblem } from './Emblem';

interface PartyScreenProps {
  save: SaveData;
  onAssignSlot: (unitId: string, slotIndex: number) => void;
  onRemoveSlot: (slotIndex: number) => void;
  onLevelUp: (unitId: string, times: number) => void;
  onForgeSig: (unitId: string) => void;
}

interface UnitDragState {
  unitId: string;
  label: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

export function PartyScreen({ save, onAssignSlot, onRemoveSlot, onLevelUp, onForgeSig }: PartyScreenProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(save.party.find(Boolean) ?? 'u_fire_tank');
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [elFilter, setElFilter] = useState<ElementType | 'all'>('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [drag, setDrag] = useState<UnitDragState | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const dragRef = useRef<UnitDragState | null>(null);

  const invMap = useMemo(() => Object.fromEntries(save.inventory.map((i) => [i.uid, i])), [save.inventory]);
  const synergies = useMemo(() => getPartySynergies(save.party), [save.party]);
  const partyPower = useMemo(() => calcPartyPower(save), [save]);
  const isLeft = save.settings.handedness === 'left';

  // 要件通りの厳密ソート（属性 -> 種族1 -> 種族2 -> ロール）
  const ownedSorted = useMemo<UnitDef[]>(() => {
    const ownedDefs = UNIT_DEFS.filter((u) => Boolean(save.ownedUnits[u.id]));
    const sorted = sortUnits(ownedDefs);
    if (elFilter === 'all') return sorted;
    return sorted.filter((u) => u.element === elFilter);
  }, [save.ownedUnits, elFilter]);

  const selectedDef = UNIT_MAP[selectedUnitId] ?? UNIT_MAP.u_fire_tank;
  const selectedOwned = save.ownedUnits[selectedDef.id];
  const selectedStats = selectedOwned ? computeUnitStats(selectedDef.id, selectedOwned, invMap, synergies) : null;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      const dist = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY);
      const moved = cur.moved || dist > 12;
      const updated = { ...cur, x: e.clientX, y: e.clientY, moved };
      dragRef.current = updated;
      setDrag(updated);
      if (moved) {
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const slotEl = el?.closest('[data-party-slot]') as HTMLElement | null;
        setHoverSlot(slotEl ? Number(slotEl.dataset.partySlot) : null);
      }
    };
    const onUp = (e: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      dragRef.current = null;
      setDrag(null);
      setHoverSlot(null);

      if (cur.moved) {
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const slotEl = el?.closest('[data-party-slot]') as HTMLElement | null;
        if (slotEl) {
          const idx = Number(slotEl.dataset.partySlot);
          sound.tap();
          onAssignSlot(cur.unitId, idx);
          setActiveSlot(idx);
          setSelectedUnitId(cur.unitId);
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
  }, [onAssignSlot]);

  const startDragUnit = (e: PointerEvent, unitId: string, name: string) => {
    const payload: UnitDragState = {
      unitId,
      label: name,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false
    };
    dragRef.current = payload;
    setDrag(payload);
  };

  const raceText = (u: UnitDef) => u.races.map((r) => RACE_META[r].name).join('・');
  const lvCost = selectedOwned ? getLevelUpGoldCost(selectedOwned.level) : 0;

  return (
    <div class="screen-wrap">
      {/* 上部：パーティ4枠（D&Dドロップ先＆タップ選択） */}
      <div class="screen-head">
        <div>
          <div class="screen-title">パーティ編成・育成</div>
          <div class="screen-sub">総戦力 {partyPower.toLocaleString()} ・ ドラッグ＆ドロップで入替可</div>
        </div>
        <span class="tag-pill" style={{ background: 'rgba(180,76,255,0.22)', color: '#e2b5ff' }}>
          仲間 {Object.keys(save.ownedUnits).length}/{UNIT_DEFS.length}
        </span>
      </div>

      <div class="party-slots-grid">
        {save.party.map((uid, idx) => {
          const def = uid ? UNIT_MAP[uid] : null;
          const own = uid ? save.ownedUnits[uid] : null;
          return (
            <button
              key={idx}
              type="button"
              data-party-slot={idx}
              class={`party-slot ${def ? 'filled' : ''} ${activeSlot === idx ? 'selected' : ''} ${
                hoverSlot === idx ? 'drop-hover' : ''
              }`}
              onPointerDown={(e) => {
                if (def) startDragUnit(e, def.id, def.name);
              }}
              onClick={() => {
                sound.tap();
                setActiveSlot(idx);
                if (def) setSelectedUnitId(def.id);
              }}
            >
              {def && own ? (
                <>
                  <Emblem element={def.element} races={def.races} role={def.role} size={32} sigActive={own.sigUnlocked} />
                  <div class="unit-name-sm">{def.name}</div>
                  <div class="unit-meta-sm">
                    Lv.{own.level} {ROLE_META[def.role].short}
                  </div>
                </>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--txt-dim)', fontWeight: 800 }}>枠{idx + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 種族シナジー表示 */}
      <div class="synergy-bar">
        <span style={{ fontSize: '10px', color: 'var(--txt-dim)', fontWeight: 800, flexShrink: 0 }}>種族共鳴</span>
        {synergies.map((s) => (
          <span key={s.race} class={`synergy-pill ${s.tier >= 2 ? 'active' : ''}`}>
            {RACE_META[s.race].name}×{s.count}
            {s.tier === 3 ? ' ★極' : s.tier === 2 ? ' ★発動' : ''}
          </span>
        ))}
      </div>

      {/* 中央スクロール可能ユニット一覧（厳密ソート順） */}
      <div class="screen-list scroll-area">
        <div class="unit-grid">
          {ownedSorted.map((u) => {
            const own = save.ownedUnits[u.id];
            const inPartyIdx = save.party.indexOf(u.id);
            const isSel = selectedUnitId === u.id;
            const el = ELEMENT_META[u.element];
            return (
              <button
                key={u.id}
                type="button"
                class={`unit-tile ${inPartyIdx >= 0 ? 'in-party' : ''} ${isSel ? 'selected' : ''}`}
                onPointerDown={(e) => startDragUnit(e, u.id, u.name)}
                onClick={() => {
                  sound.tap();
                  setSelectedUnitId(u.id);
                }}
              >
                {inPartyIdx >= 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      right: '4px',
                      fontSize: '9px',
                      fontWeight: 900,
                      color: '#ffd94a'
                    }}
                  >
                    P{inPartyIdx + 1}
                  </span>
                )}
                <Emblem element={u.element} races={u.races} role={u.role} size={34} sigActive={own.sigUnlocked} />
                <div class="unit-name-sm">{u.name}</div>
                <div class="unit-meta-sm" style={{ color: el.color }}>
                  {el.short}・{raceText(u)}
                </div>
                <div class="unit-meta-sm">
                  {ROLE_META[u.role].name} Lv.{own.level}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 下部親指ゾーン：属性絞込＋選択キャラ操作 */}
      <div class="thumb-dock">
        <div class="chip-bar">
          <button
            type="button"
            class={`chip-btn ${elFilter === 'all' ? 'active' : ''}`}
            onClick={() => {
              sound.tap();
              setElFilter('all');
            }}
          >
            全属性
          </button>
          {ELEMENT_ORDER.map((el) => (
            <button
              key={el}
              type="button"
              class={`chip-btn ${elFilter === el ? 'active' : ''}`}
              style={{ color: elFilter === el ? '#fff' : ELEMENT_META[el].color }}
              onClick={() => {
                sound.tap();
                setElFilter(el);
              }}
            >
              {ELEMENT_META[el].short}
            </button>
          ))}
        </div>

        {selectedOwned && selectedStats && (
          <div class={`thumb-row ${isLeft ? 'left-handed' : ''}`}>
            <button
              type="button"
              class="btn-ghost"
              style={{ flex: 0.9 }}
              onClick={() => {
                sound.tap();
                setShowDetailModal(true);
              }}
            >
              技・専用武器
            </button>
            <button
              type="button"
              class="btn-cyan"
              style={{ flex: 1 }}
              disabled={save.gold < lvCost || selectedOwned.level >= 99}
              onClick={() => {
                sound.tap();
                onLevelUp(selectedDef.id, 1);
              }}
            >
              LvUP ({lvCost}G)
            </button>
            <button
              type="button"
              class="btn-primary"
              style={{ flex: 1.15 }}
              onClick={() => {
                sound.tap();
                onAssignSlot(selectedDef.id, activeSlot);
              }}
            >
              枠{activeSlot + 1}に編成
            </button>
          </div>
        )}
      </div>

      {/* ドラッグゴースト */}
      {drag?.moved && (
        <div class="drag-ghost" style={{ left: `${drag.x}px`, top: `${drag.y - 24}px` }}>
          {drag.label} → 編成枠へ
        </div>
      )}

      {/* キャラ詳細・3技・ロールアビリティ・専用武器モーダル */}
      {showDetailModal && selectedOwned && selectedStats && (
        <div class="modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div class="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Emblem
                  element={selectedDef.element}
                  races={selectedDef.races}
                  role={selectedDef.role}
                  size={38}
                  sigActive={selectedOwned.sigUnlocked}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 900 }}>
                    {selectedDef.title} {selectedDef.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--txt-sub)' }}>
                    {ELEMENT_META[selectedDef.element].name} / {raceText(selectedDef)} / {ROLE_META[selectedDef.role].name} ・ 戦力{' '}
                    {calcUnitPower(selectedStats).toLocaleString()}
                  </div>
                </div>
              </div>
              <button type="button" class="btn-ghost" style={{ minHeight: '32px', padding: '0 10px' }} onClick={() => setShowDetailModal(false)}>
                ✕
              </button>
            </div>

            <div class="modal-body scroll-area">
              <div class="stat-grid">
                <div class="stat-cell"><span>LV</span><span>{selectedOwned.level}</span></div>
                <div class="stat-cell"><span>HP</span><span>{selectedStats.maxHp}</span></div>
                <div class="stat-cell"><span>ATK</span><span>{selectedStats.atk}</span></div>
                <div class="stat-cell"><span>DEF</span><span>{selectedStats.def}</span></div>
                <div class="stat-cell"><span>SPD</span><span>{selectedStats.spd}</span></div>
                <div class="stat-cell"><span>会心</span><span>{selectedStats.crit}%</span></div>
              </div>

              <div class="card-box">
                <div style={{ fontSize: '11px', fontWeight: 900, color: ROLE_META[selectedDef.role].color }}>
                  ロールアビリティ：{ROLE_META[selectedDef.role].abilityName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--txt-sub)' }}>{ROLE_META[selectedDef.role].abilityDesc}</div>
              </div>

              <div class="card-box">
                <div style={{ fontSize: '11px', fontWeight: 900, color: '#29d2ff' }}>固有技 (3種)</div>
                {selectedDef.skills.map((sk, idx) => (
                  <div
                    key={sk.id}
                    style={{
                      paddingTop: idx > 0 ? '5px' : '0',
                      borderTop: idx > 0 ? '1px solid var(--line-soft)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800 }}>
                      <span>
                        {idx === 2 ? '★' : ''}
                        {sk.name}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--txt-sub)' }}>
                        {sk.cooldown === 0 ? 'CTなし' : `CT ${sk.cooldown}T`} / 混沌+{sk.chaosGain}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--txt-sub)' }}>{sk.desc}</div>
                  </div>
                ))}
              </div>

              {/* 専用武器セクション */}
              <div
                class="card-box"
                style={{
                  borderColor: selectedOwned.sigUnlocked ? '#ffd94a' : 'var(--line-soft)',
                  background: selectedOwned.sigUnlocked
                    ? 'linear-gradient(135deg, rgba(255,217,74,0.12), rgba(180,76,255,0.16))'
                    : undefined
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#ffd94a' }}>
                    専用武器：{selectedDef.signatureWeapon.name}
                  </span>
                  <span class="tag-pill" style={{ background: 'rgba(255,217,74,0.2)', color: '#ffd94a' }}>
                    {selectedOwned.sigUnlocked ? `覚醒 Lv.${selectedOwned.sigLevel}` : '未鍛造'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--txt-sub)' }}>{selectedDef.signatureWeapon.lore}</div>
                <div style={{ fontSize: '11px', color: '#38f29b', fontWeight: 800 }}>
                  覚醒効果【{selectedDef.signatureWeapon.passiveTitle}】{selectedDef.signatureWeapon.passiveDesc}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--txt-sub)' }}>
                  基礎補正: HP+{selectedDef.signatureWeapon.hpBonus} ATK+{selectedDef.signatureWeapon.atkBonus} DEF+
                  {selectedDef.signatureWeapon.defBonus} SPD+{selectedDef.signatureWeapon.spdBonus} 会心+
                  {selectedDef.signatureWeapon.critBonus}%
                </div>
                {(() => {
                  const sig = selectedDef.signatureWeapon;
                  if (!selectedOwned.sigUnlocked) {
                    const canForge =
                      save.gold >= sig.forgeCostGold &&
                      save.shard >= sig.forgeCostShard &&
                      save.sigCore >= sig.forgeCostSigCore;
                    return (
                      <button
                        type="button"
                        class="btn-primary"
                        disabled={!canForge}
                        onClick={() => {
                          sound.chaos();
                          onForgeSig(selectedDef.id);
                        }}
                      >
                        専用武器を鍛造 ({sig.forgeCostGold}G / 結晶{sig.forgeCostShard} / 核{sig.forgeCostSigCore})
                      </button>
                    );
                  }
                  if (selectedOwned.sigLevel >= 10) {
                    return <div style={{ fontSize: '11px', color: '#ffd94a', fontWeight: 900 }}>★ 最大覚醒到達！</div>;
                  }
                  const gCost = Math.round(sig.forgeCostGold * 0.65 * selectedOwned.sigLevel);
                  const pCost = Math.round(35 * selectedOwned.sigLevel);
                  const cCost = selectedOwned.sigLevel >= 5 ? 2 : 1;
                  const canUp = save.gold >= gCost && save.powder >= pCost && save.sigCore >= cCost;
                  return (
                    <button
                      type="button"
                      class="btn-cyan"
                      disabled={!canUp}
                      onClick={() => {
                        sound.tap();
                        onForgeSig(selectedDef.id);
                      }}
                    >
                      専用武器を強化 ({gCost}G / 粉{pCost} / 核{cCost})
                    </button>
                  );
                })()}
              </div>
            </div>

            <div class="modal-footer">
              {save.party.includes(selectedDef.id) && save.party.filter(Boolean).length > 1 && (
                <button
                  type="button"
                  class="btn-danger"
                  onClick={() => {
                    const idx = save.party.indexOf(selectedDef.id);
                    if (idx >= 0) onRemoveSlot(idx);
                    setShowDetailModal(false);
                  }}
                >
                  編成から外す
                </button>
              )}
              <button
                type="button"
                class="btn-cyan"
                style={{ flex: 1 }}
                disabled={save.gold < lvCost || selectedOwned.level >= 99}
                onClick={() => {
                  sound.tap();
                  onLevelUp(selectedDef.id, 5);
                }}
              >
                最大+5強化
              </button>
              <button type="button" class="btn-primary" style={{ flex: 1 }} onClick={() => setShowDetailModal(false)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
