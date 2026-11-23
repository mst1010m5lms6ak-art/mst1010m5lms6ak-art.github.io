import { useMemo, useState } from 'preact/hooks';
import { RARITY_META } from '../data/constants';
import { getEquipEffectiveMainValue, getEquipUpgradeCost, getSlotLabel, getStatLabel } from '../data/equipment';
import { UNIT_DEFS, UNIT_MAP } from '../data/units';
import { sortEquipment, sortUnits } from '../engine/sort';
import { sound } from '../engine/sound';
import type { AutoSellSettings, EquipSlot, SaveData } from '../types/game';
import { Emblem } from './Emblem';

interface EquipScreenProps {
  save: SaveData;
  onEquip: (unitId: string, itemUid: string | null, slot: EquipSlot) => void;
  onUpgrade: (itemUid: string) => void;
  onSell: (itemUid: string) => void;
  onToggleLock: (itemUid: string) => void;
  onUpdateAutoSell: (next: AutoSellSettings) => void;
}

const SLOTS: Array<{ id: EquipSlot | 'all'; label: string }> = [
  { id: 'all', label: '全装備' },
  { id: 'weapon', label: '武器' },
  { id: 'armor', label: '防具' },
  { id: 'accessory', label: '装飾' }
];

export function EquipScreen({ save, onEquip, onUpgrade, onSell, onToggleLock, onUpdateAutoSell }: EquipScreenProps) {
  const ownedUnits = useMemo(
    () => sortUnits(UNIT_DEFS.filter((u) => Boolean(save.ownedUnits[u.id]))),
    [save.ownedUnits]
  );

  const [unitId, setUnitId] = useState<string>(save.party.find(Boolean) ?? ownedUnits[0]?.id ?? 'u_fire_tank');
  const [slotFilter, setSlotFilter] = useState<EquipSlot | 'all'>('all');
  const [selectedUid, setSelectedUid] = useState<string | null>(save.inventory[0]?.uid ?? null);

  const isLeft = save.settings.handedness === 'left';
  const targetUnit = UNIT_MAP[unitId] ?? ownedUnits[0];
  const targetOwned = save.ownedUnits[targetUnit.id];

  const equippedByMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [uid, st] of Object.entries(save.ownedUnits)) {
      if (st.equip.weapon) m[st.equip.weapon] = uid;
      if (st.equip.armor) m[st.equip.armor] = uid;
      if (st.equip.accessory) m[st.equip.accessory] = uid;
    }
    return m;
  }, [save.ownedUnits]);

  const invMap = useMemo(() => Object.fromEntries(save.inventory.map((i) => [i.uid, i])), [save.inventory]);

  const filteredItems = useMemo(() => {
    const sorted = sortEquipment(save.inventory);
    if (slotFilter === 'all') return sorted;
    return sorted.filter((i) => i.slot === slotFilter);
  }, [save.inventory, slotFilter]);

  const selectedItem = filteredItems.find((i) => i.uid === selectedUid) ?? filteredItems[0] ?? null;
  const isEquippedByCurrent = selectedItem ? equippedByMap[selectedItem.uid] === targetUnit.id : false;
  const upgradeCost = selectedItem ? getEquipUpgradeCost(selectedItem) : null;

  return (
    <div class="screen-wrap">
      {/* 上部：装備対象キャラと現在スロット */}
      <div class="screen-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <Emblem
            element={targetUnit.element}
            races={targetUnit.races}
            role={targetUnit.role}
            size={30}
            sigActive={targetOwned?.sigUnlocked}
          />
          <div style={{ minWidth: 0 }}>
            <div class="screen-title">{targetUnit.name} の装備</div>
            <div class="screen-sub">強化粉 {save.powder.toLocaleString()} ・ 所持 {save.inventory.length}/180</div>
          </div>
        </div>
        <button
          type="button"
          class="tag-pill"
          style={{
            background: save.settings.autoSell.enabled ? 'rgba(255,217,74,0.22)' : 'rgba(255,255,255,0.08)',
            color: save.settings.autoSell.enabled ? '#ffd94a' : 'var(--txt-sub)',
            padding: '4px 8px'
          }}
          onClick={() => {
            sound.tap();
            const order: AutoSellSettings['maxRarity'][] = ['none', 'N', 'R', 'SR'];
            const cur = save.settings.autoSell.enabled ? save.settings.autoSell.maxRarity : 'none';
            const next = order[(order.indexOf(cur) + 1) % order.length];
            onUpdateAutoSell({ enabled: next !== 'none', maxRarity: next });
          }}
        >
          自動売却: {save.settings.autoSell.enabled && save.settings.autoSell.maxRarity !== 'none' ? `${save.settings.autoSell.maxRarity}以下` : 'OFF'}
        </button>
      </div>

      {/* 現在装備中3枠 */}
      {targetOwned && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            padding: '6px 10px',
            borderBottom: '1px solid var(--line-soft)',
            background: 'rgba(18,14,34,0.75)',
            flexShrink: 0
          }}
        >
          {(['weapon', 'armor', 'accessory'] as EquipSlot[]).map((slot) => {
            const eqId = targetOwned.equip[slot];
            const item = eqId ? invMap[eqId] : null;
            return (
              <button
                key={slot}
                type="button"
                class="card-box"
                style={{
                  padding: '6px 7px',
                  gap: '2px',
                  borderColor: item ? RARITY_META[item.rarity].border : 'var(--line-soft)',
                  textAlign: 'left'
                }}
                onClick={() => {
                  sound.tap();
                  setSlotFilter(slot);
                  if (item) setSelectedUid(item.uid);
                }}
              >
                <div style={{ fontSize: '9px', color: 'var(--txt-dim)', fontWeight: 800 }}>{getSlotLabel(slot)}</div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: item ? RARITY_META[item.rarity].color : 'var(--txt-dim)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {item ? `${item.name} +${item.level}` : '未装備'}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 中央スクロール可能インベントリ */}
      <div class="screen-list scroll-area">
        {filteredItems.length === 0 ? (
          <div class="card-box" style={{ fontSize: '12px', color: 'var(--txt-sub)', textAlign: 'center', padding: '18px' }}>
            該当する装備がありません。ステージ周回で獲得しよう！
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSel = selectedItem?.uid === item.uid;
            const holderId = equippedByMap[item.uid];
            const holderName = holderId ? UNIT_MAP[holderId]?.name : null;
            const rMeta = RARITY_META[item.rarity];
            return (
              <button
                key={item.uid}
                type="button"
                class={`stage-card ${isSel ? 'selected' : ''}`}
                style={{ borderColor: isSel ? '#ffd94a' : rMeta.border }}
                onClick={() => {
                  sound.tap();
                  setSelectedUid(item.uid);
                }}
              >
                <div class="stage-card-info">
                  <div class="stage-name-row">
                    <span class="tag-pill" style={{ background: 'rgba(255,255,255,0.08)', color: rMeta.color }}>
                      {item.rarity}
                    </span>
                    <span class="stage-name">
                      {item.locked ? '🔒' : ''}
                      {item.name} +{item.level}
                    </span>
                    {holderName && (
                      <span class="tag-pill" style={{ background: 'rgba(41,210,255,0.2)', color: '#7ce5ff' }}>
                        {holderName}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--txt-sub)', marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ color: '#fff', fontWeight: 800 }}>
                      {getStatLabel(item.mainStat)}+{getEquipEffectiveMainValue(item)}
                    </span>
                    {item.subStats.map((sub, i) => (
                      <span key={i}>
                        {getStatLabel(sub.stat)}+{sub.value}
                      </span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--txt-dim)', fontWeight: 800, flexShrink: 0 }}>
                  {getSlotLabel(item.slot)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* 下部親指ゾーン：キャラ切替・スロット絞込・操作ボタン */}
      <div class="thumb-dock">
        <div class="chip-bar">
          {ownedUnits.map((u) => (
            <button
              key={u.id}
              type="button"
              class={`chip-btn ${unitId === u.id ? 'active' : ''}`}
              style={{ flex: '0 0 auto', minWidth: '58px' }}
              onClick={() => {
                sound.tap();
                setUnitId(u.id);
              }}
            >
              {u.name}
            </button>
          ))}
        </div>

        <div class="chip-bar">
          {SLOTS.map((s) => (
            <button
              key={s.id}
              type="button"
              class={`chip-btn ${slotFilter === s.id ? 'active' : ''}`}
              onClick={() => {
                sound.tap();
                setSlotFilter(s.id);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {selectedItem && upgradeCost && (
          <div class={`thumb-row ${isLeft ? 'left-handed' : ''}`}>
            <button
              type="button"
              class="btn-ghost"
              style={{ width: '44px', padding: 0, flexShrink: 0 }}
              aria-label="ロック切替"
              onClick={() => {
                sound.tap();
                onToggleLock(selectedItem.uid);
              }}
            >
              {selectedItem.locked ? '🔓' : '🔒'}
            </button>
            <button
              type="button"
              class="btn-danger btn-stack"
              disabled={selectedItem.locked}
              style={{ flex: 0.9, padding: '2px 6px' }}
              onClick={() => {
                sound.tap();
                onSell(selectedItem.uid);
              }}
            >
              <span>売却</span>
              <span class="btn-stack-sub">+{selectedItem.sellValue.toLocaleString()}G</span>
            </button>
            <button
              type="button"
              class="btn-cyan btn-stack"
              style={{ flex: 1.1, padding: '2px 6px' }}
              disabled={selectedItem.level >= 20 || save.gold < upgradeCost.gold || save.powder < upgradeCost.powder}
              onClick={() => {
                sound.tap();
                onUpgrade(selectedItem.uid);
              }}
            >
              <span>{selectedItem.level >= 20 ? '最大強化' : '強化'}</span>
              <span class="btn-stack-sub">
                {selectedItem.level >= 20 ? 'LV.20' : `${upgradeCost.gold.toLocaleString()}G・粉${upgradeCost.powder}`}
              </span>
            </button>
            <button
              type="button"
              class="btn-primary"
              style={{ flex: 1, padding: '0 8px' }}
              onClick={() => {
                sound.tap();
                onEquip(targetUnit.id, isEquippedByCurrent ? null : selectedItem.uid, selectedItem.slot);
              }}
            >
              {isEquippedByCurrent ? '外す' : '装備する'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
