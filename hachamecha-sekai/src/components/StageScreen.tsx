import { useMemo, useState } from 'preact/hooks';
import { ELEMENT_META } from '../data/constants';
import { generateTowerStage, STAGE_DEFS } from '../data/stages';
import { UNIT_MAP } from '../data/units';
import { sound } from '../engine/sound';
import { calcPartyPower } from '../engine/stats';
import type { SaveData, StageCategory, StageDef } from '../types/game';

interface StageScreenProps {
  save: SaveData;
  onStartBattle: (stageId: string, options: { autoRepeat: boolean; towerFloor?: number }) => void;
}

const CATEGORIES: Array<{ id: StageCategory; label: string }> = [
  { id: 'story', label: '混沌の旅路' },
  { id: 'tower', label: '無限塔' },
  { id: 'boss', label: '異界ボス' },
  { id: 'farm', label: '素材収集' }
];

export function StageScreen({ save, onStartBattle }: StageScreenProps) {
  const [category, setCategory] = useState<StageCategory>('story');
  const [selectedId, setSelectedId] = useState<string>('st_01');
  const [towerFloor, setTowerFloor] = useState<number>(Math.max(1, save.towerMaxFloor + 1));

  const partyPower = useMemo(() => calcPartyPower(save), [save]);
  const isLeft = save.settings.handedness === 'left';

  const stages = useMemo<StageDef[]>(() => {
    if (category === 'tower') {
      const maxShown = Math.max(5, save.towerMaxFloor + 2);
      const list: StageDef[] = [];
      for (let f = Math.max(1, maxShown - 7); f <= maxShown; f++) {
        list.push(generateTowerStage(f));
      }
      return list.reverse();
    }
    return STAGE_DEFS.filter((s) => s.category === category);
  }, [category, save.towerMaxFloor]);

  const activeStage = useMemo<StageDef>(() => {
    if (category === 'tower') {
      return generateTowerStage(towerFloor);
    }
    return stages.find((s) => s.id === selectedId) ?? stages[0];
  }, [category, selectedId, stages, towerFloor]);

  const handleCategory = (cat: StageCategory) => {
    sound.tap();
    setCategory(cat);
    if (cat === 'tower') {
      const nextF = Math.max(1, save.towerMaxFloor + 1);
      setTowerFloor(nextF);
      setSelectedId(`tower_${nextF}`);
    } else {
      const first = STAGE_DEFS.find((s) => s.category === cat);
      if (first) setSelectedId(first.id);
    }
  };

  const firstClearUnit =
    activeStage.firstClearUnitId && !save.ownedUnits[activeStage.firstClearUnitId]
      ? UNIT_MAP[activeStage.firstClearUnitId]
      : null;

  return (
    <div class="screen-wrap">
      {/* 上部情報ヘッダ（視認専用） */}
      <div class="screen-head">
        <div>
          <div class="screen-title">出撃ステージ選択</div>
          <div class="screen-sub">編成戦力 {partyPower.toLocaleString()} ・ 無限塔最高 {save.towerMaxFloor}F</div>
        </div>
        <span
          class="tag-pill"
          style={{
            background: partyPower >= activeStage.recommendedPower ? 'rgba(56,242,155,0.2)' : 'rgba(255,82,104,0.22)',
            color: partyPower >= activeStage.recommendedPower ? '#38f29b' : '#ff7d93'
          }}
        >
          推奨 {activeStage.recommendedPower.toLocaleString()}
        </span>
      </div>

      {/* 中央スクロール可能ステージ一覧 */}
      <div class="screen-list scroll-area">
        {stages.map((st) => {
          const isSelected = activeStage.id === st.id;
          const clears = save.clearedStages[st.id] ?? 0;
          const leadEnemy = st.waves[st.waves.length - 1][0];
          const elMeta = ELEMENT_META[leadEnemy.element];
          const floorNum = st.category === 'tower' ? parseInt(st.id.replace('tower_', ''), 10) : undefined;
          const lockedTower = floorNum !== undefined && floorNum > save.towerMaxFloor + 1;

          return (
            <button
              key={st.id}
              type="button"
              disabled={lockedTower}
              class={`stage-card ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                sound.tap();
                setSelectedId(st.id);
                if (floorNum !== undefined) setTowerFloor(floorNum);
              }}
            >
              <div class="stage-card-info">
                <div class="stage-name-row">
                  <span class="tag-pill" style={{ background: elMeta.bg, color: elMeta.color }}>
                    {elMeta.short}
                  </span>
                  <span class="stage-name">{st.name}</span>
                  {clears > 0 && (
                    <span class="tag-pill" style={{ background: 'rgba(56,242,155,0.18)', color: '#38f29b' }}>
                      済
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--txt-sub)', marginTop: '2px' }}>{st.subtitle}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#ffd94a' }}>+{st.rewards.gold}G</div>
                <div style={{ fontSize: '10px', color: 'var(--txt-sub)' }}>W{st.waves.length} / 装備×{st.rewards.equipDropCount}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 下部親指ゾーン：選択中詳細＋カテゴリ切替＋出撃ボタン */}
      <div class="thumb-dock">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '11px'
          }}
        >
          <span style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeStage.name}
          </span>
          <span style={{ color: '#ffd94a', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {firstClearUnit
              ? `初回加入: ${firstClearUnit.name}`
              : `結晶+${activeStage.rewards.shard} / 核${Math.round(activeStage.rewards.sigCoreChance * 100)}%`}
          </span>
        </div>

        <div class="chip-bar">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              class={`chip-btn ${category === c.id ? 'active' : ''}`}
              onClick={() => handleCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div class={`thumb-row ${isLeft ? 'left-handed' : ''}`}>
          <button
            type="button"
            class="btn-cyan"
            style={{ flex: 1 }}
            onClick={() => {
              sound.tap();
              onStartBattle(activeStage.id, {
                autoRepeat: true,
                towerFloor: category === 'tower' ? towerFloor : undefined
              });
            }}
          >
            ∞ 自動周回開始
          </button>
          <button
            type="button"
            class="btn-primary"
            style={{ flex: 1.35 }}
            onClick={() => {
              sound.tap();
              onStartBattle(activeStage.id, {
                autoRepeat: false,
                towerFloor: category === 'tower' ? towerFloor : undefined
              });
            }}
          >
            ▶ 出撃する
          </button>
        </div>
      </div>
    </div>
  );
}
