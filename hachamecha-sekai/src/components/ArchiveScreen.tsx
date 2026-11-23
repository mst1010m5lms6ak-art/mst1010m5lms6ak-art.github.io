import { useMemo, useState } from 'preact/hooks';
import { ELEMENT_META, RACE_META, RACE_ORDER, ROLE_META, ROLE_ORDER } from '../data/constants';
import { UNIT_DEFS } from '../data/units';
import { sortUnits } from '../engine/sort';
import { sound } from '../engine/sound';
import { ACHIEVEMENTS } from '../engine/storage';
import type { SaveData } from '../types/game';
import { Emblem } from './Emblem';

interface ArchiveScreenProps {
  save: SaveData;
  onUnlockUnit: (unitId: string) => void;
  onClaimAchievement: (achId: string) => void;
}

type ArchiveTab = 'recruit' | 'achievements' | 'codex';

export function ArchiveScreen({ save, onUnlockUnit, onClaimAchievement }: ArchiveScreenProps) {
  const [subTab, setSubTab] = useState<ArchiveTab>('recruit');
  const sortedAll = useMemo(() => sortUnits(UNIT_DEFS), []);

  const claimableCount = useMemo(
    () =>
      ACHIEVEMENTS.filter((a) => {
        if (save.claimedAchievements[a.id]) return false;
        const { current, target } = a.check(save);
        return current >= target;
      }).length,
    [save]
  );

  return (
    <div class="screen-wrap">
      <div class="screen-head">
        <div>
          <div class="screen-title">
            {subTab === 'recruit' ? '仲間解放・名簿' : subTab === 'achievements' ? 'やり込み実績' : '世界戦術辞典'}
          </div>
          <div class="screen-sub">
            解放済み {Object.keys(save.ownedUnits).length}/{UNIT_DEFS.length} ・ カオス結晶 {save.shard}
          </div>
        </div>
        {claimableCount > 0 && (
          <span class="tag-pill" style={{ background: 'rgba(255,59,107,0.28)', color: '#ff96ae' }}>
            受取可 {claimableCount}
          </span>
        )}
      </div>

      <div class="screen-list scroll-area">
        {subTab === 'recruit' &&
          sortedAll.map((u) => {
            const owned = Boolean(save.ownedUnits[u.id]);
            const el = ELEMENT_META[u.element];
            const canShardUnlock =
              !owned && u.unlockMethod.kind === 'shard' && save.shard >= u.unlockMethod.cost;

            return (
              <div
                key={u.id}
                class="stage-card"
                style={{
                  borderColor: owned ? 'rgba(56,242,155,0.35)' : canShardUnlock ? '#ffd94a' : 'var(--line-soft)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <Emblem element={u.element} races={u.races} role={u.role} size={34} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div class="stage-name-row">
                      <span class="tag-pill" style={{ background: el.bg, color: el.color }}>
                        {el.short}
                      </span>
                      <span class="stage-name">
                        {u.title} {u.name}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: 'var(--txt-sub)',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {u.races.map((r) => RACE_META[r].name).join('・')} / {ROLE_META[u.role].name}
                    </div>
                    <div
                      style={{
                        fontSize: '9.5px',
                        color: '#ffd94a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      専用: {u.signatureWeapon.name}
                    </div>
                  </div>
                </div>

                {owned ? (
                  <span class="tag-pill" style={{ background: 'rgba(56,242,155,0.2)', color: '#38f29b' }}>
                    加入済
                  </span>
                ) : u.unlockMethod.kind === 'shard' ? (
                  <button
                    type="button"
                    class="btn-primary"
                    style={{ minHeight: '34px', padding: '0 10px', fontSize: '11px' }}
                    disabled={!canShardUnlock}
                    onClick={() => {
                      sound.chaos();
                      onUnlockUnit(u.id);
                    }}
                  >
                    結晶{u.unlockMethod.cost}
                  </button>
                ) : (
                  <span
                    class="tag-pill"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: 'var(--txt-sub)',
                      maxWidth: '122px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {u.unlockMethod.kind === 'initial' ? '初期加入' : u.unlockMethod.label}
                  </span>
                )}
              </div>
            );
          })}

        {subTab === 'achievements' &&
          ACHIEVEMENTS.map((ach) => {
            const claimed = Boolean(save.claimedAchievements[ach.id]);
            const { current, target } = ach.check(save);
            const done = current >= target;
            return (
              <div
                key={ach.id}
                class="stage-card"
                style={{ borderColor: done && !claimed ? '#ffd94a' : 'var(--line-soft)' }}
              >
                <div class="stage-card-info">
                  <div class="stage-name">{ach.title}</div>
                  <div style={{ fontSize: '10px', color: 'var(--txt-sub)', marginTop: '2px' }}>
                    {ach.desc} ({Math.min(current, target)}/{target})
                  </div>
                  <div style={{ fontSize: '10px', color: '#ffd94a', marginTop: '2px', fontWeight: 800 }}>
                    報酬: 結晶+{ach.rewardShard} / +{ach.rewardGold}G
                  </div>
                </div>
                {claimed ? (
                  <span class="tag-pill" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--txt-dim)' }}>
                    受取済
                  </span>
                ) : (
                  <button
                    type="button"
                    class="btn-primary"
                    style={{ minHeight: '34px', padding: '0 12px', fontSize: '11px' }}
                    disabled={!done}
                    onClick={() => {
                      sound.victory();
                      onClaimAchievement(ach.id);
                    }}
                  >
                    受取
                  </button>
                )}
              </div>
            );
          })}

        {subTab === 'codex' && (
          <>
            <div class="card-box">
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#ffd94a' }}>属性相性</div>
              <div style={{ fontSize: '11px', color: 'var(--txt-sub)', lineHeight: 1.55 }}>
                ・炎 → 風に有利(1.5倍) / 水に不利(0.75倍)
                <br />
                ・水 → 炎に有利(1.5倍) / 風に不利(0.75倍)
                <br />
                ・風 → 水に有利(1.5倍) / 炎に不利(0.75倍)
                <br />
                ・光 ⇔ 闇は相互弱点(1.5倍)
                <br />
                ・無は全属性等倍(1.0倍)＆カオスゲージ上昇+25%
              </div>
            </div>

            <div class="card-box">
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#29d2ff' }}>ロール固有アビリティ</div>
              {ROLE_ORDER.map((r) => (
                <div key={r} style={{ fontSize: '11px', color: 'var(--txt-sub)' }}>
                  <strong style={{ color: ROLE_META[r].color }}>
                    {ROLE_META[r].name}【{ROLE_META[r].abilityName}】
                  </strong>
                  ：{ROLE_META[r].abilityDesc}
                </div>
              ))}
            </div>

            <div class="card-box">
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#38f29b' }}>種族共鳴（2種族持ちは両方に加算）</div>
              {RACE_ORDER.map((r) => (
                <div key={r} style={{ fontSize: '11px', color: 'var(--txt-sub)' }}>
                  <strong style={{ color: '#fff' }}>{RACE_META[r].name}</strong>：2体({RACE_META[r].synergy2}) / 3体(
                  {RACE_META[r].synergy3})
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 下部親指ゾーン切替 */}
      <div class="thumb-dock">
        <div class="chip-bar">
          <button
            type="button"
            class={`chip-btn ${subTab === 'recruit' ? 'active' : ''}`}
            onClick={() => {
              sound.tap();
              setSubTab('recruit');
            }}
          >
            仲間解放
          </button>
          <button
            type="button"
            class={`chip-btn ${subTab === 'achievements' ? 'active' : ''}`}
            onClick={() => {
              sound.tap();
              setSubTab('achievements');
            }}
          >
            実績 {claimableCount > 0 ? `(${claimableCount})` : ''}
          </button>
          <button
            type="button"
            class={`chip-btn ${subTab === 'codex' ? 'active' : ''}`}
            onClick={() => {
              sound.tap();
              setSubTab('codex');
            }}
          >
            戦術辞典
          </button>
        </div>
      </div>
    </div>
  );
}
