import { useState } from 'preact/hooks';
import { RARITY_META } from '../data/constants';
import { getSlotLabel } from '../data/equipment';
import { UNIT_MAP } from '../data/units';
import type { BattleRewardSummary, DpsMetric, RepeatSessionSummary } from '../types/game';
import { DpsMeter } from './DpsMeter';

interface ResultModalProps {
  mode: 'single' | 'repeat';
  reward: BattleRewardSummary | null;
  repeatSession: RepeatSessionSummary | null;
  onRetry: () => void;
  onNextTower?: () => void;
  onClose: () => void;
}

export function ResultModal({ mode, reward, repeatSession, onRetry, onNextTower, onClose }: ResultModalProps) {
  const [dpsMetric, setDpsMetric] = useState<DpsMetric>('damageDealt');

  if (mode === 'repeat' && repeatSession) {
    const winRate = repeatSession.runs > 0 ? Math.round((repeatSession.wins / repeatSession.runs) * 100) : 0;
    const avgSec = repeatSession.runs > 0 ? (repeatSession.totalDurationSec / repeatSession.runs).toFixed(1) : '0.0';
    const dpsEntries = Object.values(repeatSession.dpsTotals);

    return (
      <div class="modal-backdrop">
        <div class="modal-sheet">
          <div class="modal-header">
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#ffd94a' }}>周回リザルト</div>
              <div style={{ fontSize: '11px', color: 'var(--txt-sub)' }}>{repeatSession.stageName}</div>
            </div>
            <span class="tag-pill" style={{ background: 'rgba(255,217,74,0.2)', color: '#ffd94a' }}>
              全{repeatSession.runs}周
            </span>
          </div>

          <div class="modal-body scroll-area">
            <div class="stat-grid">
              <div class="stat-cell">
                <span>勝利</span>
                <span style={{ color: '#38f29b' }}>
                  {repeatSession.wins}/{repeatSession.runs} ({winRate}%)
                </span>
              </div>
              <div class="stat-cell">
                <span>平均時間</span>
                <span>{avgSec}秒</span>
              </div>
              <div class="stat-cell">
                <span>自動売却</span>
                <span style={{ color: '#ffd94a' }}>{repeatSession.autoSoldCount}個</span>
              </div>
            </div>

            <div class="card-box">
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--txt-sub)' }}>累計獲得報酬</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '12px', fontWeight: 800 }}>
                <span class="res-pill gold">G +{repeatSession.totalGold.toLocaleString()}</span>
                <span class="res-pill">EXP +{repeatSession.totalExp.toLocaleString()}</span>
                <span class="res-pill shard">結晶 +{repeatSession.totalShard}</span>
                <span class="res-pill">強化粉 +{repeatSession.totalPowder}</span>
                {repeatSession.totalSigCore > 0 && <span class="res-pill core">専用核 +{repeatSession.totalSigCore}</span>}
              </div>
              {repeatSession.autoSoldCount > 0 && (
                <div style={{ fontSize: '10px', color: 'var(--txt-sub)' }}>
                  自動売却換金: +{repeatSession.autoSoldGold.toLocaleString()}G / 強化粉+{repeatSession.autoSoldPowder}
                </div>
              )}
            </div>

            <div class="card-box">
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--txt-sub)' }}>
                確保した装備 ({repeatSession.keptEquips.length}件)
              </div>
              {repeatSession.keptEquips.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--txt-dim)' }}>確保された装備はありません</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {repeatSession.keptEquips.slice(-14).map((eq) => (
                    <span
                      key={eq.uid}
                      class="tag-pill"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        color: RARITY_META[eq.rarity].color,
                        border: `1px solid ${RARITY_META[eq.rarity].border}`
                      }}
                    >
                      [{eq.rarity}] {getSlotLabel(eq.slot)} {eq.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {dpsEntries.length > 0 && (
              <DpsMeter
                entries={dpsEntries}
                metric={dpsMetric}
                onChangeMetric={setDpsMetric}
                elapsedSec={repeatSession.totalDurationSec}
              />
            )}
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-ghost" style={{ flex: 1 }} onClick={onClose}>
              拠点へ戻る
            </button>
            <button type="button" class="btn-primary" style={{ flex: 1.3 }} onClick={onRetry}>
              もう一度周回
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!reward) return null;
  const unlockedUnit = reward.firstClearUnitId ? UNIT_MAP[reward.firstClearUnitId] : null;

  return (
    <div class="modal-backdrop">
      <div class="modal-sheet">
        <div class="modal-header">
          <div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: reward.won ? '#ffd94a' : '#ff5268' }}>
              {reward.won ? 'VICTORY!!' : 'DEFEAT...'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--txt-sub)' }}>
              {reward.stageName} ・ {reward.turns}行動 / {reward.durationSec.toFixed(1)}秒
            </div>
          </div>
        </div>

        <div class="modal-body scroll-area">
          {unlockedUnit && (
            <div
              class="card-box"
              style={{ borderColor: '#ffd94a', background: 'linear-gradient(135deg, rgba(255,217,74,0.2), rgba(180,76,255,0.2))' }}
            >
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#ffd94a' }}>★ 新たな仲間が加入！</div>
              <div style={{ fontSize: '14px', fontWeight: 900 }}>
                {unlockedUnit.title} {unlockedUnit.name}
              </div>
            </div>
          )}

          {reward.won ? (
            <>
              <div class="card-box">
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--txt-sub)' }}>獲得報酬</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '12px', fontWeight: 800 }}>
                  <span class="res-pill gold">G +{reward.gold.toLocaleString()}</span>
                  <span class="res-pill">EXP +{reward.exp.toLocaleString()}</span>
                  <span class="res-pill shard">結晶 +{reward.shard}</span>
                  <span class="res-pill">強化粉 +{reward.powder}</span>
                  {reward.sigCore > 0 && <span class="res-pill core">専用核 +{reward.sigCore}</span>}
                </div>
                {reward.levelUps.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#38f29b', fontWeight: 800 }}>
                    LV UP: {reward.levelUps.map((u) => `${u.name}(${u.from}→${u.to})`).join(' / ')}
                  </div>
                )}
              </div>

              <div class="card-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--txt-sub)' }}>
                    ドロップ装備 ({reward.keptEquips.length})
                  </span>
                  {reward.autoSoldCount > 0 && (
                    <span style={{ fontSize: '10px', color: '#ffd94a', fontWeight: 800 }}>
                      自動売却 {reward.autoSoldCount}個 (+{reward.autoSoldGold}G)
                    </span>
                  )}
                </div>
                {reward.keptEquips.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--txt-dim)' }}>
                    {reward.autoSoldCount > 0 ? 'ドロップ品はすべて自動売却されました' : '装備ドロップなし'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {reward.keptEquips.map((eq) => (
                      <span
                        key={eq.uid}
                        class="tag-pill"
                        style={{
                          background: 'rgba(255,255,255,0.07)',
                          color: RARITY_META[eq.rarity].color,
                          border: `1px solid ${RARITY_META[eq.rarity].border}`
                        }}
                      >
                        [{eq.rarity}] {eq.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div class="card-box" style={{ fontSize: '12px', color: 'var(--txt-sub)' }}>
              パーティの強化・装備見直し・属性相性の調整で再挑戦しよう！
            </div>
          )}

          {reward.dps.length > 0 && (
            <DpsMeter
              entries={reward.dps}
              metric={dpsMetric}
              onChangeMetric={setDpsMetric}
              elapsedSec={reward.durationSec}
            />
          )}
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-ghost" style={{ flex: 1 }} onClick={onClose}>
            戻る
          </button>
          {reward.won && onNextTower ? (
            <button type="button" class="btn-primary" style={{ flex: 1.3 }} onClick={onNextTower}>
              次の階層へ
            </button>
          ) : (
            <button type="button" class="btn-primary" style={{ flex: 1.3 }} onClick={onRetry}>
              再戦する
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
