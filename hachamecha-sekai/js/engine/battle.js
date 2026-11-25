(function () {
  'use strict';

  const HS = window.HS;

  // Headless Real-Time Full-Auto Battle Engine
  // Guarantees:
  // 1) Strictly 1 unit attacks at a time (queue-serialized, zero simultaneous attacks).
  // 2) ATB gauges continue advancing smoothly even while an attack animation is playing.
  // 3) Cumulative DPS meter across infinite auto-loop runs.
  // 4) Auto-loop stop completes the current ongoing battle before showing the dedicated Loop Result screen.
  class BattleSession {
    constructor(config, isAutoLoop, callbacks) {
      this.config = config;
      this.isAutoLoop = Boolean(isAutoLoop);
      this.callbacks = callbacks || {};
      this.stopLoopRequested = false;
      this.aborted = false;
      this.finished = false;

      this.plan = null;
      this.waveIdx = 0;
      this.allies = [];
      this.enemies = [];
      this.enemyAura = {};
      this.synergies = [];

      this.readyQueue = [];
      this.actingUnit = null;
      this.actionLockTimer = 0;
      this.waveTransitionTimer = 0;
      this.betweenLoopTimer = 0;
      this.pendingCounterQueue = [];

      this.battleElapsedMs = 0;
      this.defeatedIntruders = 0;
      this.logs = [];
      this.logSeq = 0;

      // Single battle DPS
      this.singleDps = {};

      // Cumulative loop stats (never reset between auto-loop runs)
      this.loopStats = {
        runs: 0,
        wins: 0,
        losses: 0,
        totalElapsedMs: 0,
        intruders: 0,
        gold: 0,
        crystal: 0,
        shard: 0,
        autoSoldCount: 0,
        autoSoldGold: 0,
        keptDrops: [],
        dps: {}
      };

      this.startRun(true);
    }

    getSpeedMult() {
      const s = HS.Engine.State.getState();
      return s?.settings?.battleSpeed || 1;
    }

    pushLog(text, kind) {
      this.logSeq++;
      this.logs.push({ id: this.logSeq, text, kind: kind || 'normal' });
      if (this.logs.length > 140) this.logs.shift();
      if (this.callbacks.onLog) this.callbacks.onLog(this.logs[this.logs.length - 1]);
    }

    emitVisual(evt) {
      if (this.callbacks.onVisual) this.callbacks.onVisual(evt);
    }

    startRun(isFirst) {
      const state = HS.Engine.State.getState();
      this.plan = HS.Data.buildBattlePlan(this.config);
      if (!this.plan.allowAutoLoop) this.isAutoLoop = false;

      this.waveIdx = 0;
      this.readyQueue = [];
      this.pendingCounterQueue = [];
      this.actingUnit = null;
      this.actionLockTimer = 0;
      this.waveTransitionTimer = 0.42;
      this.betweenLoopTimer = 0;
      this.battleElapsedMs = 0;
      this.defeatedIntruders = 0;
      this.finished = false;

      const snap = HS.Engine.Stats.buildPartyCombatSnapshots(state);
      this.synergies = snap.synergies;
      this.enemyAura = snap.enemyAura;

      this.allies = snap.units.map((u, idx) => {
        const masteryRanks = [0, 1, 2].map((si) => HS.Engine.State.getMasteryRank(u.prog.masteryXp[si] || 0));
        const unit = {
          uid: 'ally_' + idx,
          side: 'ally',
          charId: u.charId,
          name: u.def.name,
          element: u.def.element,
          races: u.def.races,
          role: u.def.role,
          maxHp: u.stats.maxHp,
          hp: u.stats.maxHp,
          shield: 0,
          atk: u.stats.atk,
          def: u.stats.def,
          spd: u.stats.spd,
          critRate: u.stats.critRate,
          critDmg: u.stats.critDmg,
          mods: u.stats.mods,
          skills: u.def.skills,
          masteryRanks,
          cts: [0, 0, 0],
          atb: Math.min(850, Math.round(1000 * (u.stats.mods.startAtbPct || 0))),
          statuses: {},
          turnCount: 0,
          revived: false,
          alive: true
        };
        if (!this.singleDps[unit.charId]) {
          this.singleDps[unit.charId] = { charId: unit.charId, name: unit.name, element: unit.element, dealt: 0, taken: 0, healOut: 0, healIn: 0 };
        } else if (!this.isAutoLoop) {
          this.singleDps[unit.charId] = { charId: unit.charId, name: unit.name, element: unit.element, dealt: 0, taken: 0, healOut: 0, healIn: 0 };
        }
        if (isFirst || !this.loopStats.dps[unit.charId]) {
          this.loopStats.dps[unit.charId] = { charId: unit.charId, name: unit.name, element: unit.element, dealt: 0, taken: 0, healOut: 0, healIn: 0 };
        }
        return unit;
      });

      if (!this.isAutoLoop) {
        this.logs = [];
      } else if (!isFirst) {
        this.pushLog(`── 自動周回 ${this.loopStats.runs + 1}周目 開始 ──`, 'drop');
      }

      this.pushLog(`【${this.plan.title}】出撃！`, 'normal');
      this.spawnWave(0);
      if (this.callbacks.onWaveChange) this.callbacks.onWaveChange();
    }

    spawnWave(idx) {
      this.waveIdx = idx;
      const waveDef = this.plan.waves[idx];
      this.readyQueue = [];
      this.pendingCounterQueue = [];
      this.actingUnit = null;

      const discoveredIds = [];
      this.enemies = waveDef.enemies.map((we, i) => {
        const def = HS.Data.ENEMY_MAP[we.enemyId];
        discoveredIds.push(we.enemyId);
        const maxHp = Math.max(80, Math.round(def.base.hp * we.scale));
        const atk = Math.max(18, Math.round(def.base.atk * Math.pow(we.scale, 0.72) * (1 + (this.enemyAura.atkPct || 0))));
        const defStat = Math.max(10, Math.round(def.base.def * Math.pow(we.scale, 0.68) * (1 + (this.enemyAura.defPct || 0))));
        const spd = Math.max(52, Math.round(def.base.spd * (1 + (this.enemyAura.spdPct || 0))));

        return {
          uid: `enemy_${idx}_${i}`,
          side: 'enemy',
          enemyId: we.enemyId,
          name: we.name,
          element: def.element,
          races: def.races,
          role: def.role,
          isBoss: we.isBoss,
          isIntruder: we.isIntruder,
          maxHp,
          hp: maxHp,
          shield: 0,
          atk,
          def: defStat,
          spd,
          critRate: we.isBoss ? 0.14 : 0.08,
          critDmg: 1.45,
          mods: {},
          skills: def.skills,
          masteryRanks: [1, 1, 1],
          cts: def.skills.map(() => 0),
          atb: Math.round(Math.random() * 160),
          statuses: {},
          turnCount: 0,
          revived: false,
          alive: true
        };
      });

      HS.Engine.State.markEnemiesDiscovered(discoveredIds);

      // Apply per-WAVE start abilities for living allies
      for (const a of this.allies) {
        if (!a.alive) continue;
        if (idx > 0) {
          a.atb = Math.min(850, Math.max(a.atb, Math.round(1000 * (a.mods.startAtbPct || 0))));
        }
        if (a.mods.waveShieldPct) {
          a.shield = Math.max(a.shield, Math.round(a.maxHp * a.mods.waveShieldPct));
        }
        if (a.mods.allyWaveShieldPct) {
          for (const ally of this.allies) {
            if (ally.alive) ally.shield = Math.max(ally.shield, Math.round(ally.maxHp * a.mods.allyWaveShieldPct));
          }
        }
        if (a.mods.waveTaunt) this.applyStatus(a, 'taunt', a.mods.waveTaunt, a);
        if (a.mods.wavePartyRegen) {
          for (const ally of this.allies) {
            if (ally.alive) this.applyStatus(ally, 'regen', a.mods.wavePartyRegen, a);
          }
        }
        if (a.mods.waveFreezeCount) {
          const targets = this.enemies.slice(0, a.mods.waveFreezeCount);
          for (const t of targets) this.applyStatus(t, 'freeze', 2, a);
        }
      }

      if (waveDef.hasIntruder) {
        this.pushLog(`⚠ 異界乱入敵が出現！（WAVE ${waveDef.waveNum}/${this.plan.waves.length}）`, 'alert');
        this.emitVisual({ type: 'banner', text: '⚠ 異界乱入敵 出現！', alert: true });
      } else if (waveDef.isBossWave) {
        this.pushLog(`★ BOSS WAVE ${waveDef.waveNum}/${this.plan.waves.length} 突入！`, 'alert');
        this.emitVisual({ type: 'banner', text: '★ BOSS WAVE 突入！', alert: true });
      } else {
        this.emitVisual({ type: 'banner', text: `WAVE ${waveDef.waveNum} / ${this.plan.waves.length}`, alert: false });
      }
    }

    getEffectiveSpd(u) {
      let mult = 1;
      if (u.statuses.spdUp) mult += 0.25;
      if (u.statuses.spdDown) mult -= 0.22;
      if (u.statuses.freeze) mult *= 0.55;
      return Math.max(28, u.spd * mult);
    }

    getEffectiveAtk(u) {
      let mult = 1;
      if (u.statuses.atkUp) mult += 0.28;
      if (u.statuses.atkDown) mult -= 0.22;
      if (u.mods.rampAtkPerTurn) {
        mult += Math.min(u.turnCount, u.mods.rampMax || 5) * u.mods.rampAtkPerTurn;
      }
      return Math.max(10, u.atk * mult);
    }

    getEffectiveDef(u) {
      let mult = 1;
      if (u.statuses.defUp) mult += 0.30;
      if (u.statuses.defDown) mult -= 0.25;
      if (u.statuses.taunt && u.mods.tauntDefPct) mult += u.mods.tauntDefPct;
      return Math.max(5, u.def * mult);
    }

    countNegativeStatuses(u) {
      let c = 0;
      for (const k of Object.keys(u.statuses)) {
        const meta = HS.CONST.STATUS_META[k];
        if (meta && (meta.kind === 'debuff' || meta.kind === 'ailment')) c++;
      }
      return c;
    }

    applyStatus(target, statId, dur, source) {
      if (!target.alive) return false;
      const meta = HS.CONST.STATUS_META[statId];
      if (!meta) return false;

      let finalDur = dur;
      if (meta.kind === 'debuff' || meta.kind === 'ailment') {
        const resist = target.mods.resistPct || 0;
        const effHit = source?.mods?.effHitPct || 0;
        if (Math.random() < Math.max(0, resist - effHit) * 0.8) {
          return false;
        }
        if (source?.mods?.debuffExtend) finalDur += source.mods.debuffExtend;
        if (target.isBoss && statId === 'stun') {
          if (Math.random() < 0.65) return false;
        }
      }

      const prev = target.statuses[statId] || 0;
      target.statuses[statId] = Math.max(prev, finalDur);
      if (statId === 'burn' && source) {
        target.burnAtk = Math.round(this.getEffectiveAtk(source) * 0.32 * (1 + (source.mods.dotBoost || 0)));
      }
      return true;
    }

    cleanseUnit(target, count, healer) {
      let removed = 0;
      for (const k of Object.keys(target.statuses)) {
        if (removed >= count) break;
        const meta = HS.CONST.STATUS_META[k];
        if (meta && (meta.kind === 'debuff' || meta.kind === 'ailment')) {
          delete target.statuses[k];
          removed++;
        }
      }
      if (removed > 0 && healer?.mods?.cleanseAtb) {
        for (const a of this.allies) {
          if (a.alive) a.atb = Math.min(1000, a.atb + 1000 * healer.mods.cleanseAtb);
        }
      }
      return removed;
    }

    recordDps(charId, field, amount) {
      if (!charId || amount <= 0) return;
      if (this.singleDps[charId]) this.singleDps[charId][field] += amount;
      if (this.loopStats.dps[charId]) this.loopStats.dps[charId][field] += amount;
    }

    applyHeal(healer, target, rawAmt, allowExtras) {
      if (!target.alive || rawAmt <= 0) return 0;
      let mult = 1 + (healer?.mods?.healOutPct || 0) + (target.mods.healInPct || 0);
      if (target.hp / target.maxHp <= 0.5) {
        mult += (healer?.mods?.lowAllyHealPct || 0) + (target.mods.lowHpHealInPct || 0);
      }
      const amt = Math.max(1, Math.round(rawAmt * mult));
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + amt);
      const actual = target.hp - before;
      const overflow = Math.max(0, amt - actual);

      if (overflow > 0 && healer?.mods?.overhealShieldPct) {
        const sh = Math.round(overflow * Math.min(1, healer.mods.overhealShieldPct));
        target.shield = Math.min(Math.round(target.maxHp * 0.65), target.shield + sh);
      }
      if (allowExtras && healer) {
        if (healer.mods.healCleanse) this.cleanseUnit(target, healer.mods.healCleanse, healer);
        if (healer.mods.healDefUp) this.applyStatus(target, 'defUp', healer.mods.healDefUp, healer);
        if (healer.mods.healAtkUp) this.applyStatus(target, 'atkUp', healer.mods.healAtkUp, healer);
        if (healer.mods.healBonusShieldPct) {
          target.shield = Math.min(Math.round(target.maxHp * 0.65), target.shield + Math.round(target.maxHp * healer.mods.healBonusShieldPct));
        }
        if (healer.mods.healAtbGain) {
          target.atb = Math.min(1000, target.atb + 1000 * healer.mods.healAtbGain);
        }
      }

      if (healer && healer.side === 'ally') this.recordDps(healer.charId, 'healOut', amt);
      if (target.side === 'ally') this.recordDps(target.charId, 'healIn', amt);

      this.emitVisual({ type: 'heal', targetUid: target.uid, value: amt });
      return amt;
    }

    applyDamage(attacker, target, skill, opts) {
      if (!target.alive) return { dmg: 0, crit: false, tag: 'neutral', killed: false, missed: false };

      if (attacker.statuses.blind && !opts?.ignoreBlind && Math.random() < 0.28) {
        this.emitVisual({ type: 'statusPop', targetUid: target.uid, text: 'MISS' });
        return { dmg: 0, crit: false, tag: 'neutral', killed: false, missed: true };
      }

      const effAtk = this.getEffectiveAtk(attacker);
      const effDef = this.getEffectiveDef(target);
      const defScaleAdd = skill?.defScale ? this.getEffectiveDef(attacker) * skill.defScale : 0;

      const masteryRank = opts?.skillIdx !== undefined ? (attacker.masteryRanks?.[opts.skillIdx] || 1) : 1;
      const masteryMult = 1 + (masteryRank - 1) * 0.11;
      const power = (opts?.overridePower ?? skill?.power ?? 1.0) * masteryMult;

      let critRate = attacker.critRate + (attacker.statuses.critUp ? 0.22 : 0) + (skill?.bonusCrit || 0);
      const isCrit = Boolean(skill?.guaranteedCrit) || Math.random() < Math.min(0.98, critRate);

      let defPen = (attacker.mods.defPen || 0) + (skill?.defPen || 0) + (isCrit ? (attacker.mods.critDefPen || 0) : 0);
      defPen = Math.min(0.75, defPen);
      const mitigatedDef = effDef * (1 - defPen);
      const baseDmg = (effAtk + defScaleAdd) * power * (320 / (320 + mitigatedDef));

      const aff = HS.CONST.getElementAffinity(attacker.element, target.element);
      let dmgMult = aff.mult;
      if (aff.tag === 'weak' && attacker.mods.weakBonusPct) dmgMult *= (1 + attacker.mods.weakBonusPct);

      // Element-specific bonus
      const elKey = 'elDmg' + attacker.element.charAt(0).toUpperCase() + attacker.element.slice(1);
      if (attacker.mods[elKey]) dmgMult *= (1 + attacker.mods[elKey]);

      if (isCrit) dmgMult *= attacker.critDmg;
      if (opts?.skillIdx === 2 && attacker.mods.s3DmgPct) dmgMult *= (1 + attacker.mods.s3DmgPct);
      if (opts?.isCounter && attacker.mods.counterDmgPct) dmgMult *= (1 + attacker.mods.counterDmgPct);

      // Conditional damage boosts
      const negCount = this.countNegativeStatuses(target);
      if (negCount > 0 && attacker.mods.debuffBonusDmg) dmgMult *= (1 + attacker.mods.debuffBonusDmg);
      if (negCount > 0 && attacker.mods.perDebuffDmg) dmgMult *= (1 + negCount * attacker.mods.perDebuffDmg);
      if (skill?.perDebuffSkillMult && negCount > 0) dmgMult *= (1 + negCount * skill.perDebuffSkillMult);
      if (skill?.bonusOnAilment && target.statuses[skill.bonusOnAilment]) dmgMult *= (skill.bonusMult || 1.3);
      if (skill?.bonusOnAnyDebuff && negCount > 0) dmgMult *= (skill.bonusMult || 1.3);
      if (attacker.mods.highEnemyHpDmg && target.hp / target.maxHp >= 0.8) dmgMult *= (1 + attacker.mods.highEnemyHpDmg);
      if (attacker.mods.executeDmg && target.hp / target.maxHp <= 0.4) dmgMult *= (1 + attacker.mods.executeDmg);
      if (attacker.mods.missingHpDmgPct) {
        const missRatio = 1 - (attacker.hp / attacker.maxHp);
        dmgMult *= (1 + missRatio * attacker.mods.missingHpDmgPct);
      }

      // Target damage modifiers
      if (target.statuses.vuln) dmgMult *= 1.20;
      if (target.side === 'enemy' && this.enemyAura.vulnPct) dmgMult *= (1 + this.enemyAura.vulnPct);
      if (target.mods.dmgTakenMult) dmgMult *= Math.max(0.45, 1 + target.mods.dmgTakenMult);
      if (skill?.target === 'all' && target.mods.aoeReduce) dmgMult *= Math.max(0.5, 1 - target.mods.aoeReduce);
      if (target.shield > 0 && target.mods.shieldDr) dmgMult *= Math.max(0.5, 1 - target.mods.shieldDr);

      // Slight natural variance (±4%)
      const variance = 0.96 + Math.random() * 0.08;
      const finalDmg = Math.max(1, Math.round(baseDmg * dmgMult * variance));

      // Absorb via shield first
      let remain = finalDmg;
      if (target.shield > 0) {
        const absorbed = Math.min(target.shield, remain);
        target.shield -= absorbed;
        remain -= absorbed;
      }

      target.hp = Math.max(0, target.hp - remain);
      let killed = false;
      if (target.hp <= 0) {
        if (target.mods.revivePct && !target.revived) {
          target.revived = true;
          target.hp = Math.max(1, Math.round(target.maxHp * target.mods.revivePct));
          this.pushLog(`✦ ${target.name}が不屈の鼓動で踏みとどまった！`, 'heal');
          this.emitVisual({ type: 'statusPop', targetUid: target.uid, text: '不屈復帰!' });
        } else {
          target.alive = false;
          killed = true;
          if (target.side === 'enemy' && target.isIntruder) {
            this.defeatedIntruders++;
          }
        }
      }

      if (attacker.side === 'ally') this.recordDps(attacker.charId, 'dealt', finalDmg);
      if (target.side === 'ally') this.recordDps(target.charId, 'taken', finalDmg);

      this.emitVisual({
        type: 'hit',
        targetUid: target.uid,
        element: attacker.element,
        value: finalDmg,
        crit: isCrit,
        tag: aff.tag,
        isAll: skill?.target === 'all'
      });

      // Lifesteal
      const ls = (attacker.mods.lifestealPct || 0) + (skill?.lifesteal || 0);
      if (ls > 0 && attacker.alive) {
        this.applyHeal(attacker, attacker, Math.round(finalDmg * ls), false);
      }

      // Crit ATB gain
      if (isCrit && attacker.alive) {
        const gain = (attacker.mods.critAtbGain || 0) + (skill?.critAtb || 0);
        if (gain > 0) attacker.atb = Math.min(1000, attacker.atb + 1000 * gain);
      }

      // Target reactive traits (only when hit by an active non-counter attack)
      if (!opts?.isCounter && target.alive) {
        if (target.mods.onHitHealPct) {
          this.applyHeal(target, target, Math.round(target.maxHp * target.mods.onHitHealPct), false);
        }
        if (target.mods.thornsDefPct && attacker.alive) {
          const thorn = Math.max(1, Math.round(this.getEffectiveDef(target) * target.mods.thornsDefPct));
          attacker.hp = Math.max(1, attacker.hp - thorn);
          if (target.side === 'ally') this.recordDps(target.charId, 'dealt', thorn);
          this.emitVisual({ type: 'hit', targetUid: attacker.uid, element: target.element, value: thorn, crit: false, tag: 'neutral' });
        }
        if (target.mods.onHitAtkDown) this.applyStatus(attacker, 'atkDown', target.mods.onHitAtkDown, target);
        if (target.mods.onHitSpdDownSelf) this.applyStatus(attacker, 'spdDown', target.mods.onHitSpdDownSelf, target);

        // Emergency healer ATB boost when an ally drops below 35% HP
        if (target.side === 'ally' && target.hp / target.maxHp <= 0.35) {
          for (const ally of this.allies) {
            if (ally.alive && ally.mods.emergencyAtb) {
              ally.atb = Math.min(1000, ally.atb + 1000 * ally.mods.emergencyAtb);
            }
          }
        }

        // Queue counterattack (serialized cleanly right after current action!)
        const counterChance = (target.statuses.counter ? 0.85 : 0) + (target.mods.counterChance || 0);
        if (counterChance > 0 && Math.random() < Math.min(0.95, counterChance) && attacker.alive) {
          this.pendingCounterQueue.push({ actor: target, target: attacker });
        }
      }

      // Kill rewards for attacker
      if (killed && attacker.alive) {
        if (attacker.mods.killAtbGain) attacker.atb = Math.min(1000, attacker.atb + 1000 * attacker.mods.killAtbGain);
        if (attacker.mods.killCtReduce) {
          attacker.cts = attacker.cts.map((c) => Math.max(0, c - attacker.mods.killCtReduce));
        }
      }

      return { dmg: finalDmg, crit: isCrit, tag: aff.tag, killed, missed: false };
    }

    pickTargets(actor, targetType) {
      const foes = (actor.side === 'ally' ? this.enemies : this.allies).filter((u) => u.alive);
      const friends = (actor.side === 'ally' ? this.allies : this.enemies).filter((u) => u.alive);

      if (targetType === 'self') return [actor];
      if (targetType === 'allyAll') return friends;
      if (targetType === 'allySingle') {
        const sorted = friends.slice().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        return sorted.slice(0, 1);
      }
      if (targetType === 'allyRange') {
        const sorted = friends.slice().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        return sorted.slice(0, 2);
      }
      if (targetType === 'all') return foes;

      // Enemy-directed single or range (respects Taunt!)
      const taunters = foes.filter((u) => u.statuses.taunt);
      const primaryPool = taunters.length > 0 ? taunters : foes;
      const primary = primaryPool[Math.floor(Math.random() * primaryPool.length)];
      if (!primary) return [];
      if (targetType === 'single') return [primary];

      // range: primary + 1 other living foe
      const others = foes.filter((u) => u !== primary);
      return others.length > 0 ? [primary, others[Math.floor(Math.random() * others.length)]] : [primary];
    }

    chooseSkillIndex(actor) {
      const silenced = Boolean(actor.statuses.silence);
      const friends = (actor.side === 'ally' ? this.allies : this.enemies).filter((u) => u.alive);
      const minHpRatio = friends.reduce((m, u) => Math.min(m, u.hp / u.maxHp), 1);

      if (!silenced) {
        // Priority: Skill 3 > Skill 2 > Skill 1 (unless heal skill is completely unneeded at full HP without buffs/shields)
        for (let idx = actor.skills.length - 1; idx >= 1; idx--) {
          const sk = actor.skills[idx];
          if (!sk || sk.passive) continue;
          if ((actor.cts[idx] || 0) > 0) continue;
          if (sk.kind === 'heal' && minHpRatio > 0.92 && !sk.shieldPct && !(sk.effects && sk.effects.length)) {
            continue;
          }
          return idx;
        }
      }
      return 0;
    }

    processStartOfTurnStatuses(actor) {
      // Tick down buffs/debuffs AFTER start-of-turn DoT/HoT resolution
      if (actor.statuses.regen && actor.alive) {
        const regenBoost = 1 + (actor.mods.regenBoostPct || 0);
        this.applyHeal(actor, actor, Math.round(actor.maxHp * 0.09 * regenBoost), false);
      }
      if (actor.mods.turnRegenPct && actor.alive) {
        this.applyHeal(actor, actor, Math.round(actor.maxHp * actor.mods.turnRegenPct), false);
      }
      if (actor.statuses.burn && actor.alive) {
        const d = Math.max(1, actor.burnAtk || Math.round(actor.maxHp * 0.05));
        actor.hp = Math.max(1, actor.hp - d);
        this.emitVisual({ type: 'hit', targetUid: actor.uid, element: 'fire', value: d, crit: false, tag: 'neutral' });
        this.pushLog(`🔥 ${actor.name}は火傷で${HS.DOM.formatNum(d)}ダメージ`, 'normal');
      }
      if (actor.statuses.poison && actor.alive) {
        const d = Math.max(1, Math.round(actor.maxHp * 0.06));
        actor.hp = Math.max(1, actor.hp - d);
        this.emitVisual({ type: 'hit', targetUid: actor.uid, element: 'dark', value: d, crit: false, tag: 'neutral' });
        this.pushLog(`☠ ${actor.name}は毒で${HS.DOM.formatNum(d)}ダメージ`, 'normal');
      }

      let stunned = false;
      if (actor.statuses.stun) {
        stunned = true;
        delete actor.statuses.stun;
        this.pushLog(`⚡ ${actor.name}は気絶して動けない！`, 'normal');
        this.emitVisual({ type: 'statusPop', targetUid: actor.uid, text: '気絶!' });
      }
      return !stunned;
    }

    tickStatusesAndCts(actor, usedSkillIdx) {
      for (let i = 0; i < actor.cts.length; i++) {
        if (i !== usedSkillIdx && actor.cts[i] > 0) actor.cts[i]--;
      }
      for (const k of Object.keys(actor.statuses)) {
        actor.statuses[k]--;
        if (actor.statuses[k] <= 0) delete actor.statuses[k];
      }
    }

    executeTurn(actor) {
      if (!actor || !actor.alive) return;
      actor.turnCount++;
      this.actingUnit = actor;

      const canAct = this.processStartOfTurnStatuses(actor);
      if (!canAct || !actor.alive) {
        this.tickStatusesAndCts(actor, -1);
        this.actionLockTimer = 0.34 / this.getSpeedMult();
        return;
      }

      const skIdx = this.chooseSkillIndex(actor);
      const skill = actor.skills[skIdx];
      const targets = this.pickTargets(actor, skill.target);
      const targetLabel = HS.CONST.TARGET_META[skill.target]?.label || '単体';

      // Set skill cooldown (Rank 5 Mastery reduces CT by 1 for skills with CT >= 3)
      if (skill.ct > 0) {
        const rank = actor.masteryRanks?.[skIdx] || 1;
        actor.cts[skIdx] = rank >= 5 && skill.ct >= 3 ? skill.ct - 1 : skill.ct;
      }

      this.emitVisual({
        type: 'act',
        actorUid: actor.uid,
        side: actor.side,
        bannerText: `${actor.name} ▶【${skill.name}】(${targetLabel})`
      });

      let totalDmg = 0;
      let totalHeal = 0;
      const appliedTags = [];

      if (skill.kind === 'dmg') {
        for (const t of targets) {
          const res = this.applyDamage(actor, t, skill, { skillIdx: skIdx });
          totalDmg += res.dmg;

          // Skill status effects on foe
          if (!res.missed && t.alive && Array.isArray(skill.effects)) {
            for (const ef of skill.effects) {
              if (ef.onSelf) continue;
              const chance = ef.chance + (actor.mods.effHitPct || 0) * 0.5;
              if (Math.random() < chance && this.applyStatus(t, ef.stat, ef.dur, actor)) {
                appliedTags.push(HS.CONST.STATUS_META[ef.stat]?.name);
                if (actor.mods.debuffBurstPct) {
                  this.applyDamage(actor, t, { power: actor.mods.debuffBurstPct, target: 'single' }, { isCounter: true });
                }
              }
            }
          }

          // Ability on-hit status effects
          if (!res.missed && t.alive) {
            if (actor.mods.onAttackDefDown && Math.random() < actor.mods.onAttackDefDown) this.applyStatus(t, 'defDown', 2, actor);
            if (actor.mods.onHitPoison && Math.random() < actor.mods.onHitPoison) this.applyStatus(t, 'poison', 2, actor);
            if (actor.mods.onHitBurn && Math.random() < actor.mods.onHitBurn) this.applyStatus(t, 'burn', 2, actor);
            if (actor.mods.onHitSpdDown && Math.random() < actor.mods.onHitSpdDown) this.applyStatus(t, 'spdDown', 2, actor);
            if (actor.mods.onHitVuln && Math.random() < actor.mods.onHitVuln) this.applyStatus(t, 'vuln', 2, actor);
            if (skIdx >= 1 && actor.mods.skillSilence && Math.random() < actor.mods.skillSilence) this.applyStatus(t, 'silence', 1, actor);

            // Follow-up extra hit
            if (actor.mods.extraHitChance && Math.random() < actor.mods.extraHitChance) {
              const ex = this.applyDamage(actor, t, { power: actor.mods.extraHitMult || 0.55, target: 'single' }, { isCounter: true });
              totalDmg += ex.dmg;
            }
          }
        }

        // Self-effects attached to damage skills
        if (Array.isArray(skill.effects)) {
          for (const ef of skill.effects) {
            if (ef.onSelf && Math.random() < ef.chance) this.applyStatus(actor, ef.stat, ef.dur, actor);
          }
        }
        if (skill.selfShieldPct) {
          actor.shield = Math.min(Math.round(actor.maxHp * 0.65), actor.shield + Math.round(actor.maxHp * skill.selfShieldPct));
        }
        if (skill.selfHealPct) {
          totalHeal += this.applyHeal(actor, actor, Math.round(actor.maxHp * skill.selfHealPct), false);
        }
        if (skill.partyShieldPct || skill.partyBuff || skill.partyAtb || skill.partyDrainHeal || skill.partyBonusHealPct) {
          const friends = (actor.side === 'ally' ? this.allies : this.enemies).filter((u) => u.alive);
          for (const f of friends) {
            if (skill.partyShieldPct) f.shield = Math.min(Math.round(f.maxHp * 0.65), f.shield + Math.round(f.maxHp * skill.partyShieldPct));
            if (skill.partyBuff) this.applyStatus(f, skill.partyBuff.stat, skill.partyBuff.dur, actor);
            if (skill.partyAtb) f.atb = Math.min(1000, f.atb + 1000 * skill.partyAtb);
            if (skill.partyDrainHeal && totalDmg > 0) totalHeal += this.applyHeal(actor, f, Math.round((totalDmg * skill.partyDrainHeal) / friends.length), true);
            if (skill.partyBonusHealPct) totalHeal += this.applyHeal(actor, f, Math.round(f.maxHp * skill.partyBonusHealPct), true);
          }
        }
        if (skill.allyBonusHealPct || (skIdx === 0 && actor.mods.s1AllyHealPct)) {
          const friends = (actor.side === 'ally' ? this.allies : this.enemies).filter((u) => u.alive).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
          if (friends[0]) {
            const pct = (skill.allyBonusHealPct || 0) + (skIdx === 0 ? (actor.mods.s1AllyHealPct || 0) : 0);
            totalHeal += this.applyHeal(actor, friends[0], Math.round(friends[0].maxHp * pct), true);
          }
        }
        if (skill.allyBonusRegen) {
          const friends = (actor.side === 'ally' ? this.allies : this.enemies).filter((u) => u.alive).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
          if (friends[0]) this.applyStatus(friends[0], 'regen', skill.allyBonusRegen, actor);
        }

        const targetStr = targets.length === 1 ? targets[0].name : `敵${targets.length}体`;
        const tagNote = appliedTags.length ? ` [${Array.from(new Set(appliedTags)).slice(0, 2).join('・')}]` : '';
        this.pushLog(`${actor.name}の【${skill.name}】▶ ${targetStr}に計${HS.DOM.formatNum(totalDmg)}ダメ${tagNote}`, 'normal');
      } else if (skill.kind === 'heal') {
        const masteryRank = actor.masteryRanks?.[skIdx] || 1;
        const healBase = (actor.atk * 1.45 + actor.maxHp * 0.14) * skill.power * (1 + (masteryRank - 1) * 0.11);
        for (const t of targets) {
          const amt = this.applyHeal(actor, t, healBase, true);
          totalHeal += amt;
          if (skill.cleanse) this.cleanseUnit(t, skill.cleanse, actor);
          if (skIdx === 2 && actor.mods.s3FullCleanse) this.cleanseUnit(t, 6, actor);
          if (skill.shieldPct) t.shield = Math.min(Math.round(t.maxHp * 0.65), t.shield + Math.round(t.maxHp * skill.shieldPct));
          if (skill.atbBoost) t.atb = Math.min(1000, t.atb + 1000 * skill.atbBoost);
          if (Array.isArray(skill.effects)) {
            for (const ef of skill.effects) {
              if (!ef.onSelf && Math.random() < ef.chance) this.applyStatus(t, ef.stat, ef.dur, actor);
            }
          }
        }
        // Healer smite ability
        if (actor.mods.healSmitePct && totalHeal > 0) {
          const foes = (actor.side === 'ally' ? this.enemies : this.allies).filter((u) => u.alive);
          if (foes.length > 0) {
            const foe = foes[Math.floor(Math.random() * foes.length)];
            const smiteDmg = Math.max(1, Math.round(totalHeal * actor.mods.healSmitePct / targets.length));
            foe.hp = Math.max(0, foe.hp - smiteDmg);
            if (foe.hp <= 0) foe.alive = false;
            if (actor.side === 'ally') this.recordDps(actor.charId, 'dealt', smiteDmg);
            this.emitVisual({ type: 'hit', targetUid: foe.uid, element: actor.element, value: smiteDmg, crit: false, tag: 'neutral' });
          }
        }
        this.pushLog(`${actor.name}の【${skill.name}】▶ 味方を計${HS.DOM.formatNum(totalHeal)}回復`, 'heal');
      } else {
        // buff or shield skill
        for (const t of targets) {
          if (skill.shieldPct) {
            t.shield = Math.min(Math.round(t.maxHp * 0.70), t.shield + Math.round(t.maxHp * skill.shieldPct));
          }
          if (skill.atbBoost) t.atb = Math.min(1000, t.atb + 1000 * skill.atbBoost);
          if (Array.isArray(skill.effects)) {
            for (const ef of skill.effects) {
              if (!ef.onSelf && Math.random() < ef.chance) this.applyStatus(t, ef.stat, ef.dur, actor);
            }
          }
          if (skill.cleanse) this.cleanseUnit(t, skill.cleanse, actor);
          if (actor.mods.buffHealPct) this.applyHeal(actor, t, Math.round(t.maxHp * actor.mods.buffHealPct), false);
        }
        if (Array.isArray(skill.effects)) {
          for (const ef of skill.effects) {
            if (ef.onSelf && Math.random() < ef.chance) this.applyStatus(actor, ef.stat, ef.dur, actor);
          }
        }
        if (skill.selfHealPct) this.applyHeal(actor, actor, Math.round(actor.maxHp * skill.selfHealPct), false);
        if (skill.reduceAllyCt) {
          const friends = (actor.side === 'ally' ? this.allies : this.enemies).filter((u) => u.alive && u !== actor);
          friends.slice(0, skill.reduceAllyCt).forEach((f) => {
            f.cts = f.cts.map((c) => Math.max(0, c - 1));
          });
        }
        this.pushLog(`${actor.name}が【${skill.name}】を展開！`, 'heal');
      }

      // Post-action self/party abilities
      if (skill.selfAtb) actor.atb = Math.min(1000, actor.atb + 1000 * skill.selfAtb);
      if (skIdx === 0 && actor.mods.s1AtbGain) actor.atb = Math.min(1000, actor.atb + 1000 * actor.mods.s1AtbGain);
      if (skIdx >= 1 && actor.mods.skillPartyAtb) {
        for (const a of this.allies) if (a.alive) a.atb = Math.min(1000, a.atb + 1000 * actor.mods.skillPartyAtb);
      }
      if (skIdx === 2 && actor.mods.s3PartyShieldPct) {
        for (const a of this.allies) if (a.alive) a.shield = Math.min(Math.round(a.maxHp * 0.70), a.shield + Math.round(a.maxHp * actor.mods.s3PartyShieldPct));
      }
      if (actor.mods.turnShieldPct) {
        actor.shield = Math.min(Math.round(actor.maxHp * 0.70), actor.shield + Math.round(actor.maxHp * actor.mods.turnShieldPct));
      }
      if (actor.mods.turnLowestShieldPct) {
        const low = this.allies.filter((a) => a.alive).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
        if (low) low.shield = Math.min(Math.round(low.maxHp * 0.70), low.shield + Math.round(low.maxHp * actor.mods.turnLowestShieldPct));
      }
      if (actor.mods.turnPartyHealPct) {
        for (const a of this.allies) {
          if (a.alive) this.applyHeal(actor, a, Math.round(a.maxHp * actor.mods.turnPartyHealPct), false);
        }
      }
      if (actor.mods.turnPartyRegen) {
        for (const a of this.allies) if (a.alive) this.applyStatus(a, 'regen', actor.mods.turnPartyRegen, actor);
      }
      if (actor.mods.turnAllyCtReduce) {
        const candidates = this.allies.filter((a) => a.alive && a !== actor);
        if (candidates.length > 0) {
          const picked = candidates[Math.floor(Math.random() * candidates.length)];
          picked.cts = picked.cts.map((c) => Math.max(0, c - actor.mods.turnAllyCtReduce));
        }
      }
      if (actor.mods.turnEnemyRandomDebuff) {
        const pool = ['atkDown', 'defDown', 'spdDown', 'vuln'];
        for (const e of this.enemies) {
          if (e.alive) this.applyStatus(e, pool[Math.floor(Math.random() * pool.length)], actor.mods.turnEnemyRandomDebuff, actor);
        }
      }

      this.tickStatusesAndCts(actor, skIdx);
      this.actionLockTimer = 0.50 / this.getSpeedMult();
    }

    executeCounter(pair) {
      if (!pair || !pair.actor.alive || !pair.target.alive) return;
      this.actingUnit = pair.actor;
      this.emitVisual({
        type: 'act',
        actorUid: pair.actor.uid,
        side: pair.actor.side,
        bannerText: `${pair.actor.name} ▶ 反撃！`
      });
      const res = this.applyDamage(pair.actor, pair.target, pair.actor.skills[0], { isCounter: true, skillIdx: 0 });
      this.pushLog(`↩ ${pair.actor.name}の反撃 ▶ ${pair.target.name}に${HS.DOM.formatNum(res.dmg)}ダメ`, 'normal');
      this.actionLockTimer = 0.28 / this.getSpeedMult();
    }

    getPredictedTurnOrder(limit) {
      const n = limit || 7;
      const list = [];
      const seen = new Set();

      if (this.actingUnit && this.actingUnit.alive && this.actionLockTimer > 0) {
        list.push({ unit: this.actingUnit, acting: true });
        seen.add(this.actingUnit.uid);
      }
      for (const u of this.readyQueue) {
        if (u.alive && !seen.has(u.uid)) {
          list.push({ unit: u, acting: false });
          seen.add(u.uid);
        }
      }
      const remaining = [...this.allies, ...this.enemies]
        .filter((u) => u.alive && !seen.has(u.uid))
        .map((u) => ({ unit: u, eta: Math.max(0, 1000 - u.atb) / this.getEffectiveSpd(u) }))
        .sort((a, b) => a.eta - b.eta);

      for (const item of remaining) {
        if (list.length >= n) break;
        list.push({ unit: item.unit, acting: false });
      }
      return list.slice(0, n);
    }

    requestStopLoop() {
      this.stopLoopRequested = true;
      this.pushLog('⏳ 周回終了を予約（この戦闘の完了後に終了）', 'drop');
    }

    retreat() {
      this.aborted = true;
      this.finished = true;
      if (this.isAutoLoop && this.loopStats.runs > 0) {
        if (this.callbacks.onLoopComplete) this.callbacks.onLoopComplete(this.loopStats);
      } else if (this.callbacks.onSingleComplete) {
        this.callbacks.onSingleComplete({
          victory: false,
          retreated: true,
          plan: this.plan,
          elapsedMs: this.battleElapsedMs,
          rewards: null,
          dps: this.singleDps
        });
      }
    }

    finishBattle(victory) {
      this.finished = true;
      this.actingUnit = null;

      let rewards = null;
      if (victory) {
        const frontIds = this.allies.map((a) => a.charId);
        rewards = HS.Engine.State.commitBattleVictory(this.plan, this.defeatedIntruders, frontIds);
        this.pushLog(`★ 勝利！ 世界貨+${HS.DOM.formatNum(rewards.gold)} 結晶+${rewards.crystal} 欠片+${rewards.shard}`, 'drop');
        for (const dr of rewards.drops) {
          const itemDef = HS.Data.EQUIP_ITEM_MAP[dr.item.itemId];
          const qText = dr.item.quality === 100 ? '✦極100%' : `品質${dr.item.quality}%`;
          if (dr.kept) {
            this.pushLog(`🎁 入手：${itemDef.name}（${qText}）`, dr.item.quality === 100 ? 'perfect' : 'drop');
          } else {
            this.pushLog(`💰 自動売却：${itemDef.name}（${qText}）→ 世界貨+${dr.soldGold}`, 'drop');
          }
        }
        if (rewards.newChar) {
          this.pushLog(`✦ 新たな仲間【${rewards.newChar.name}】が加入！`, 'perfect');
        }
      } else {
        this.pushLog('✕ 部隊が全滅した…', 'alert');
      }

      if (this.isAutoLoop) {
        this.loopStats.runs++;
        this.loopStats.totalElapsedMs += this.battleElapsedMs;
        this.loopStats.intruders += this.defeatedIntruders;
        if (victory && rewards) {
          this.loopStats.wins++;
          this.loopStats.gold += rewards.gold;
          this.loopStats.crystal += rewards.crystal;
          this.loopStats.shard += rewards.shard;
          this.loopStats.autoSoldCount += rewards.autoSoldCount;
          this.loopStats.autoSoldGold += rewards.autoSoldGold;
          for (const dr of rewards.drops) {
            if (dr.kept) this.loopStats.keptDrops.push(dr.item);
          }
        } else {
          this.loopStats.losses++;
        }

        if (this.stopLoopRequested) {
          if (this.callbacks.onLoopComplete) this.callbacks.onLoopComplete(this.loopStats);
        } else {
          this.betweenLoopTimer = 0.85;
          this.emitVisual({
            type: 'banner',
            text: victory ? `周回 ${this.loopStats.runs}周目 勝利！ 次戦へ…` : `周回 ${this.loopStats.runs}周目 敗北… 再挑戦`,
            alert: !victory
          });
        }
      } else {
        if (this.callbacks.onSingleComplete) {
          this.callbacks.onSingleComplete({
            victory,
            retreated: false,
            plan: this.plan,
            elapsedMs: this.battleElapsedMs,
            defeatedIntruders: this.defeatedIntruders,
            rewards,
            dps: this.singleDps
          });
        }
      }
    }

    tick(dtMs) {
      if (this.aborted) return;
      const dtSec = Math.min(0.08, Math.max(0.001, dtMs / 1000));
      const speedMult = this.getSpeedMult();

      // Waiting between auto-loop runs
      if (this.finished) {
        if (this.isAutoLoop && this.betweenLoopTimer > 0) {
          this.betweenLoopTimer -= dtSec;
          if (this.betweenLoopTimer <= 0) {
            this.startRun(false);
          }
        }
        return;
      }

      this.battleElapsedMs += dtMs * speedMult;

      if (this.waveTransitionTimer > 0) {
        this.waveTransitionTimer -= dtSec;
        return;
      }

      // Check win / wave advance / defeat first
      const alliesAlive = this.allies.some((a) => a.alive);
      const enemiesAlive = this.enemies.some((e) => e.alive);
      if (!alliesAlive) {
        this.finishBattle(false);
        return;
      }
      if (!enemiesAlive) {
        if (this.waveIdx + 1 < this.plan.waves.length) {
          this.spawnWave(this.waveIdx + 1);
          this.waveTransitionTimer = 0.45 / speedMult;
          if (this.callbacks.onWaveChange) this.callbacks.onWaveChange();
        } else {
          this.finishBattle(true);
        }
        return;
      }

      // CONTINUOUS ATB PROGRESSION (gauges advance smoothly even during active attack animation!)
      const allLiving = [...this.allies, ...this.enemies].filter((u) => u.alive);
      const newlyReady = [];
      for (const u of allLiving) {
        if (u === this.actingUnit && this.actionLockTimer > 0) continue;
        const rate = this.getEffectiveSpd(u) * 3.1 * speedMult;
        u.atb = Math.min(1120, u.atb + rate * dtSec);
        if (u.atb >= 1000 && !this.readyQueue.includes(u)) {
          newlyReady.push(u);
        }
      }
      if (newlyReady.length > 0) {
        newlyReady.sort((a, b) => b.atb - a.atb || this.getEffectiveSpd(b) - this.getEffectiveSpd(a));
        for (const u of newlyReady) this.readyQueue.push(u);
      }

      // Enforce strict sequential execution (ZERO simultaneous attacks!)
      if (this.actionLockTimer > 0) {
        this.actionLockTimer -= dtSec;
        if (this.actionLockTimer <= 0) {
          this.actingUnit = null;
        }
        return;
      }

      // Counters run immediately in sequence before next normal queued turn
      while (this.pendingCounterQueue.length > 0) {
        const pair = this.pendingCounterQueue.shift();
        if (pair.actor.alive && pair.target.alive) {
          this.executeCounter(pair);
          return;
        }
      }

      // Pop exactly ONE unit from readyQueue
      while (this.readyQueue.length > 0) {
        const next = this.readyQueue.shift();
        if (next && next.alive) {
          next.atb = Math.min(80, Math.max(0, next.atb - 1000));
          this.executeTurn(next);
          return;
        }
      }
    }
  }

  HS.Engine.BattleSession = BattleSession;
})();
