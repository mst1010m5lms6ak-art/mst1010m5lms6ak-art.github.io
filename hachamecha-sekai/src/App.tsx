import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ArchiveScreen } from './components/ArchiveScreen';
import { BattleScreen } from './components/BattleScreen';
import { EquipScreen } from './components/EquipScreen';
import { PartyScreen } from './components/PartyScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { StageScreen } from './components/StageScreen';
import {
  advanceTimelineStep,
  chooseAutoSkillAndTarget,
  createBattleState,
  executeActorSkill,
  triggerChaosOrb
} from './engine/battle';
import { sound } from './engine/sound';
import { ACHIEVEMENTS } from './engine/storage';
import {
  applyBattleOutcome,
  assignUnitToPartySlot,
  claimAchievement,
  createInitialSave,
  equipItemToUnit,
  forgeOrUpgradeSignatureWeapon,
  levelUpUnitWithGold,
  loadSaveData,
  mergeRepeatSession,
  persistSaveData,
  removeUnitFromPartySlot,
  resolveStage,
  sellEquipmentItem,
  toggleEquipmentLock,
  unlockUnitByShard,
  upgradeEquipmentItem
} from './state/store';
import type { AutoSellSettings, BattleSpeed, BattleState, EquipSlot, MainTab, SaveData, UserSettings } from './types/game';

const NAV_ITEMS: Array<{ id: MainTab; label: string; icon: string }> = [
  { id: 'stage', label: '出撃', icon: '⚔' },
  { id: 'party', label: '編成', icon: '◈' },
  { id: 'equip', label: '装備', icon: '❖' },
  { id: 'archive', label: '仲間', icon: '★' },
  { id: 'settings', label: '設定', icon: '⚙' }
];

export function App() {
  const [save, setSave] = useState<SaveData>(() => createInitialSave());
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<MainTab>('stage');
  const [battle, setBattle] = useState<BattleState | null>(null);

  const saveRef = useRef(save);
  saveRef.current = save;
  const battleRef = useRef(battle);
  battleRef.current = battle;
  const actionCooldownRef = useRef(0);

  // 起動時セーブ読み込み
  useEffect(() => {
    let alive = true;
    loadSaveData().then((data) => {
      if (!alive) return;
      setSave(data);
      sound.enabled = data.settings.seEnabled;
      sound.volume = data.settings.seVolume;
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 自動永続保存
  useEffect(() => {
    if (!loaded) return;
    sound.enabled = save.settings.seEnabled;
    sound.volume = save.settings.seVolume;
    persistSaveData(save);
  }, [save, loaded]);

  const claimableAchCount = useMemo(
    () =>
      ACHIEVEMENTS.filter((a) => {
        if (save.claimedAchievements[a.id]) return false;
        const { current, target } = a.check(save);
        return current >= target;
      }).length,
    [save]
  );

  // 戦闘開始
  const startBattle = useCallback(
    (
      stageId: string,
      options?: {
        autoRepeat?: boolean;
        repeatSession?: BattleState['repeatSession'];
        towerFloor?: number;
        speed?: BattleSpeed;
        autoBattle?: boolean;
      }
    ) => {
      sound.unlock();
      const curSave = saveRef.current;
      const stage = resolveStage(stageId, options?.towerFloor);
      const nextBattle = createBattleState(stage, curSave, {
        autoRepeat: options?.autoRepeat ?? false,
        repeatSession: options?.repeatSession ?? null,
        towerFloor: options?.towerFloor,
        speed: options?.speed ?? curSave.settings.defaultSpeed,
        autoBattle: options?.autoRepeat ? true : (options?.autoBattle ?? curSave.settings.defaultAuto)
      });
      actionCooldownRef.current = 0.25;
      setBattle(nextBattle);
    },
    []
  );

  // 勝敗確定時の報酬精算処理
  const finalizeBattleIfNeeded = useCallback((nextBattle: BattleState, stageId: string, towerFloor?: number): BattleState => {
    if ((nextBattle.phase !== 'victory' && nextBattle.phase !== 'defeat') || nextBattle.lastReward) {
      return nextBattle;
    }
    const stage = resolveStage(stageId, towerFloor);
    const { nextSave, reward } = applyBattleOutcome(saveRef.current, nextBattle, stage);
    setSave(nextSave);
    saveRef.current = nextSave;

    if (nextBattle.phase === 'victory') sound.victory();
    else sound.defeat();

    if (nextBattle.autoRepeat) {
      const merged = mergeRepeatSession(nextBattle.repeatSession, reward);
      if (nextBattle.phase === 'victory') {
        return {
          ...nextBattle,
          lastReward: reward,
          repeatSession: merged,
          repeatCountdown: 1.6,
          showRepeatFinal: false
        };
      }
      // 敗北時は周回停止して累計リザルトを表示
      return {
        ...nextBattle,
        lastReward: reward,
        repeatSession: merged,
        repeatCountdown: null,
        showRepeatFinal: true
      };
    }

    return {
      ...nextBattle,
      lastReward: reward
    };
  }, []);

  // 手動スキル発動
  const handleUseSkill = useCallback(
    (skillIndex: number, targetId: string | null) => {
      const cur = battleRef.current;
      if (!cur || cur.phase !== 'running' || !cur.waitingManual) return;
      const stage = resolveStage(cur.stageId, cur.towerFloor);
      const { state: after, chaosTriggered, hitCrit, didHeal } = executeActorSkill(cur, skillIndex, targetId, stage);
      if (chaosTriggered) {
        sound.chaos();
        setSave((s) => ({ ...s, totalChaosTriggered: s.totalChaosTriggered + 1 }));
      } else if (didHeal) {
        sound.heal();
      } else {
        sound.hit(hitCrit);
      }
      actionCooldownRef.current = 0.42;
      setBattle(finalizeBattleIfNeeded(after, cur.stageId, cur.towerFloor));
    },
    [finalizeBattleIfNeeded]
  );

  // カオスオーブ発動
  const handleTriggerOrb = useCallback(
    (mode: 'enemy' | 'ally') => {
      const cur = battleRef.current;
      if (!cur || !cur.chaosOrbReady || cur.phase !== 'running') return;
      const stage = resolveStage(cur.stageId, cur.towerFloor);
      const { state: after, activated } = triggerChaosOrb(cur, mode, stage);
      if (!activated) return;
      sound.chaos();
      actionCooldownRef.current = 0.45;
      setBattle(finalizeBattleIfNeeded(after, cur.stageId, cur.towerFloor));
    },
    [finalizeBattleIfNeeded]
  );

  // 戦闘リアルタイム進行ループ
  useEffect(() => {
    if (!battle) return;
    const TICK_MS = 80;
    const timer = window.setInterval(() => {
      const cur = battleRef.current;
      if (!cur) return;

      // 周回インターバルのカウントダウン
      if (cur.phase === 'victory' && cur.autoRepeat && !cur.showRepeatFinal && cur.repeatCountdown !== null) {
        const nextCd = cur.repeatCountdown - TICK_MS / 1000;
        if (nextCd <= 0) {
          startBattle(cur.stageId, {
            autoRepeat: true,
            repeatSession: cur.repeatSession,
            towerFloor: cur.towerFloor,
            speed: cur.speed,
            autoBattle: cur.autoBattle
          });
        } else {
          setBattle({ ...cur, repeatCountdown: nextCd });
        }
        return;
      }

      if (cur.phase !== 'running') return;

      const dt = (TICK_MS / 1000) * cur.speed;

      // オート時カオスオーブ自動発動
      if (cur.autoBattle && cur.chaosOrbReady && saveRef.current.settings.autoChaosOrb && !cur.activeActorId) {
        const stage = resolveStage(cur.stageId, cur.towerFloor);
        const allies = cur.actors.filter((a) => a.alive && a.side === 'ally');
        const lowHp = allies.some((a) => a.hp / a.maxHp < 0.45);
        const { state: after, activated } = triggerChaosOrb(cur, lowHp ? 'ally' : 'enemy', stage);
        if (activated) {
          sound.chaos();
          actionCooldownRef.current = 0.45;
          setBattle(finalizeBattleIfNeeded(after, cur.stageId, cur.towerFloor));
          return;
        }
      }

      if (actionCooldownRef.current > 0) {
        actionCooldownRef.current = Math.max(0, actionCooldownRef.current - dt);
        return;
      }

      // アクティブアクターが待機中（敵、またはオートONの味方）
      if (cur.activeActorId) {
        const actor = cur.actors.find((a) => a.instanceId === cur.activeActorId && a.alive);
        if (!actor) {
          setBattle({ ...cur, activeActorId: null, waitingManual: false });
          return;
        }
        if (actor.side === 'enemy' || cur.autoBattle) {
          const stage = resolveStage(cur.stageId, cur.towerFloor);
          const pick = chooseAutoSkillAndTarget(cur, actor);
          const { state: after, chaosTriggered, hitCrit, didHeal } = executeActorSkill(
            cur,
            pick.skillIndex,
            pick.targetId,
            stage
          );
          if (chaosTriggered) {
            sound.chaos();
            setSave((s) => ({ ...s, totalChaosTriggered: s.totalChaosTriggered + 1 }));
          } else if (didHeal) {
            sound.heal();
          } else {
            sound.hit(hitCrit);
          }
          actionCooldownRef.current = 0.52;
          setBattle(finalizeBattleIfNeeded(after, cur.stageId, cur.towerFloor));
        }
        return;
      }

      // タイムラインゲージ進行
      const { state: stepped, skippedStun } = advanceTimelineStep(cur, dt);
      if (skippedStun) {
        actionCooldownRef.current = 0.35;
      }
      setBattle(stepped);
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [Boolean(battle), finalizeBattleIfNeeded, startBattle]);

  // 戦闘中は他画面への移動を完全にロック
  const handleSelectTab = (next: MainTab) => {
    if (battle) return;
    sound.unlock();
    sound.tap();
    setTab(next);
  };

  return (
    <div class="app-shell">
      {/* 上部リソースバー（視認専用） */}
      <header class="top-bar">
        <div class="brand-chip">
          <svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="28" fill="#181034" stroke="#ffd94a" stroke-width="3" stroke-dasharray="12 6" />
            <polygon points="32,10 52,32 32,54 12,32" fill="rgba(255,59,107,0.35)" stroke="#29d2ff" stroke-width="3" />
            <circle cx="32" cy="32" r="8" fill="#ffd94a" />
          </svg>
          <span class="brand-title">はちゃめちゃ世界</span>
        </div>
        <div class="resource-row">
          <span class="res-pill gold">{save.gold.toLocaleString()}G</span>
          <span class="res-pill shard">結晶 {save.shard}</span>
          <span class="res-pill core">核 {save.sigCore}</span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main class="main-body">
        {battle ? (
          <BattleScreen
            battle={battle}
            handedness={save.settings.handedness}
            onUseSkill={handleUseSkill}
            onSelectTarget={(tid) => setBattle((b) => (b ? { ...b, selectedTargetId: tid } : b))}
            onTriggerOrb={handleTriggerOrb}
            onChangeSpeed={(sp) => setBattle((b) => (b ? { ...b, speed: sp } : b))}
            onToggleAuto={() =>
              setBattle((b) => {
                if (!b) return b;
                const nextAuto = !b.autoBattle;
                return {
                  ...b,
                  autoBattle: nextAuto,
                  waitingManual: !nextAuto && !!b.activeActorId && b.actors.some((a) => a.instanceId === b.activeActorId && a.side === 'ally')
                };
              })
            }
            onToggleRepeat={() =>
              setBattle((b) => (b ? { ...b, autoRepeat: !b.autoRepeat, autoBattle: !b.autoRepeat ? true : b.autoBattle } : b))
            }
            onStopRepeatToResult={() =>
              setBattle((b) => (b ? { ...b, autoRepeat: false, repeatCountdown: null, showRepeatFinal: true } : b))
            }
            onProceedRepeatNow={() => {
              const cur = battleRef.current;
              if (!cur) return;
              startBattle(cur.stageId, {
                autoRepeat: true,
                repeatSession: cur.repeatSession,
                towerFloor: cur.towerFloor,
                speed: cur.speed,
                autoBattle: cur.autoBattle
              });
            }}
            onRetry={() => {
              const cur = battleRef.current;
              if (!cur) return;
              const isRepeatRetry = cur.showRepeatFinal;
              startBattle(cur.stageId, {
                autoRepeat: isRepeatRetry,
                repeatSession: null,
                towerFloor: cur.towerFloor,
                speed: cur.speed,
                autoBattle: isRepeatRetry ? true : cur.autoBattle
              });
            }}
            onNextTower={
              battle.stageCategory === 'tower' && battle.towerFloor
                ? () => {
                    const nextF = (battle.towerFloor ?? 1) + 1;
                    startBattle(`tower_${nextF}`, {
                      autoRepeat: false,
                      towerFloor: nextF,
                      speed: battle.speed,
                      autoBattle: battle.autoBattle
                    });
                  }
                : undefined
            }
            onExitBattle={() => {
              sound.tap();
              setBattle(null);
            }}
          />
        ) : (
          <>
            {tab === 'stage' && (
              <StageScreen
                save={save}
                onStartBattle={(stageId, opts) =>
                  startBattle(stageId, { autoRepeat: opts.autoRepeat, towerFloor: opts.towerFloor })
                }
              />
            )}
            {tab === 'party' && (
              <PartyScreen
                save={save}
                onAssignSlot={(uid, idx) => setSave((s) => assignUnitToPartySlot(s, uid, idx))}
                onRemoveSlot={(idx) => setSave((s) => removeUnitFromPartySlot(s, idx))}
                onLevelUp={(uid, times) => setSave((s) => levelUpUnitWithGold(s, uid, times))}
                onForgeSig={(uid) => setSave((s) => forgeOrUpgradeSignatureWeapon(s, uid))}
              />
            )}
            {tab === 'equip' && (
              <EquipScreen
                save={save}
                onEquip={(uid, itemUid, slot: EquipSlot) => setSave((s) => equipItemToUnit(s, uid, itemUid, slot))}
                onUpgrade={(itemUid) => setSave((s) => upgradeEquipmentItem(s, itemUid))}
                onSell={(itemUid) => setSave((s) => sellEquipmentItem(s, itemUid))}
                onToggleLock={(itemUid) => setSave((s) => toggleEquipmentLock(s, itemUid))}
                onUpdateAutoSell={(autoSell: AutoSellSettings) =>
                  setSave((s) => ({ ...s, settings: { ...s.settings, autoSell } }))
                }
              />
            )}
            {tab === 'archive' && (
              <ArchiveScreen
                save={save}
                onUnlockUnit={(uid) => setSave((s) => unlockUnitByShard(s, uid))}
                onClaimAchievement={(achId) => setSave((s) => claimAchievement(s, achId))}
              />
            )}
            {tab === 'settings' && (
              <SettingsScreen
                save={save}
                onUpdateSettings={(settings: UserSettings) => setSave((s) => ({ ...s, settings }))}
                onImportSave={(imported) => setSave(imported)}
                onResetSave={() => setSave(createInitialSave())}
              />
            )}
          </>
        )}
      </main>

      {/* 下部メインナビ（戦闘中は非表示＆画面遷移完全ロック） */}
      {!battle && (
        <nav class="bottom-nav" aria-label="メインメニュー">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              class={`nav-btn ${tab === item.id ? 'active' : ''}`}
              onClick={() => handleSelectTab(item.id)}
            >
              <span class="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.id === 'archive' && claimableAchCount > 0 && <span class="nav-badge" />}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
