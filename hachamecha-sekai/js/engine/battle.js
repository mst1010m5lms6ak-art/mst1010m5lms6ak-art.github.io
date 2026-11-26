'use strict';

(function (global) {
  const Kairo = global.Kairo || (global.Kairo = {});
  const Data = Kairo.data;

  // Full-Auto 2D Battle Engine (ATB, Asymptotic DEF, Tactics, Statuses, Loop Stats)
  class BattleEngine {
    constructor(store, vfx) {
      this.store = store;
      this.vfx = vfx;
      this.stage = null;
      this.waveIndex = 0;
      this.allies = [];
      this.enemies = [];
      this.state = 'idle'; // fighting | wavePause | victoryPause | defeatPause
      this.pauseTimer = 0;
      this.battleElapsedMs = 0;
      this.maxHitInBattle = 0;
      this.killedNames = [];
      this.synergy = null;

      // Farming session telemetry
      this.session = {
        startedAt: Date.now(),
        loopsCompleted: 0,
        totalClearMs: 0,
        lastClearMs: 0,
        goldEarned: 0,
        gemsEarned: 0,
        dustEarned: 0,
        relicsByRarity: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        lastLootText: '出撃準備完了',
        recentLogs: []
      };

      this.onUpdateUI = null;
    }

    pushLog(msg) {
      this.session.lastLootText = msg;
      this.session.recentLogs.unshift({ ts: Date.now(), msg });
      if (this.session.recentLogs.length > 20) this.session.recentLogs.pop();
    }

    startStage(stageId) {
      const st = this.store.getState();
      const targetId = stageId || st.progress.currentStageId || 'st_1_1';
      this.stage = Data.getStageById(targetId);
      this.waveIndex = 0;
      this.battleElapsedMs = 0;
      this.maxHitInBattle = 0;
      this.killedNames = [];
      this.vfx.clearAll();

      this.synergy = this.store.computePartySynergy();
      const syn = this.synergy.bonuses;

      // Aggregate team-wide passive auras
      let teamAtk = 0, teamDef = 0, teamHp = 0, teamSpd = 0, teamDmgRed = 0, teamSpGain = 0;
      st.party.forEach((uid) => {
        const p = Data.UNIT_MAP[uid]?.passive || {};
        if (p.teamAtk) teamAtk += p.teamAtk;
        if (p.teamDef) teamDef += p.teamDef;
        if (p.teamHp) teamHp += p.teamHp;
        if (p.teamSpd) teamSpd += p.teamSpd;
        if (p.teamDmgRed) teamDmgRed += p.teamDmgRed;
        if (p.teamSpGain) teamSpGain += p.teamSpGain;
      });

      this.allies = st.party.map((uid) => {
        const def = Data.UNIT_MAP[uid];
        const inst = st.units[uid];
        const calc = this.store.computeUnitStats(uid);
        const maxHp = Math.round(calc.hp * (1 + (syn.hpPct + teamHp) / 100));
        return {
          id: uid,
          name: def.name,
          sigil: def.sigil,
          realm: def.realm,
          role: def.role,
          level: inst.level,
          isEnemy: false,
          def,
          inst,
          maxHp,
          hp: maxHp,
          ghostHpRatio: 1,
          atk: Math.round(calc.atk * (1 + (syn.atkPct + teamAtk) / 100)),
          defStat: Math.round(calc.def * (1 + (syn.defPct + teamDef) / 100)),
          spd: Math.round(calc.spd * (1 + (syn.spdPct + teamSpd) / 100)),
          crit: Math.min(100, calc.crit + syn.critPct),
          cdmg: calc.cdmg + syn.cdmgPct,
          mods: {
            ...calc.mods,
            spGainPct: calc.mods.spGainPct + syn.spGainPct + teamSpGain,
            ultPct: calc.mods.ultPct + syn.ultDmgPct,
            dmgRed: Math.min(60, calc.mods.dmgRed + syn.dmgRedPct + teamDmgRed),
            penPct: Math.min(75, calc.mods.penPct + syn.penPct),
            regenSelf: calc.mods.regenSelf + syn.regenPct,
            rampSelf: calc.mods.rampSelf + syn.rampAtkPct
          },
          sp: Math.min(100, (calc.mods.startSp || 0) + syn.startSp),
          atb: Math.random() * 25,
          skillCd: 0,
          shield: 0,
          rampStacks: 0,
          statuses: [],
          animOffsetX: 0,
          animOffsetY: 0,
          hitFlash: 0
        };
      });

      this.spawnWave(0);
      this.state = 'fighting';
      this.vfx.computeUnitPositions(this.allies, this.enemies);
      if (this.onUpdateUI) this.onUpdateUI('battleStart');
    }

    spawnWave(idx) {
      this.waveIndex = idx;
      const waveDef = this.stage.waves[idx] || this.stage.waves[0];
      this.enemies = waveDef.map((e, i) => ({
        id: `en_${idx}_${i}`,
        name: e.name,
        sigil: e.sigil,
        realm: e.realm,
        isEnemy: true,
        isBoss: Boolean(e.isBoss),
        skillName: e.skillName || '強撃',
        aoe: Boolean(e.aoe),
        maxHp: e.hp,
        hp: e.hp,
        ghostHpRatio: 1,
        atk: e.atk,
        defStat: e.def,
        spd: e.spd,
        crit: e.isBoss ? 14 : 6,
        cdmg: 145,
        mods: { spGainPct: 0, ultPct: 0, dmgPct: 0, penPct: 0, dmgRed: 0, lifesteal: 0, regenSelf: 0, rampSelf: e.isBoss && this.stage.id === 'boss_stm' ? 5 : 0 },
        sp: 0,
        atb: Math.random() * 20,
        skillCd: 1,
        shield: 0,
        rampStacks: 0,
        statuses: [],
        animOffsetX: 0,
        animOffsetY: 0,
        hitFlash: 0
      }));
      this.vfx.computeUnitPositions(this.allies, this.enemies);
    }

    hasStatus(u, type) {
      return u.statuses.some((s) => s.type === type);
    }

    addStatus(u, type, turns) {
      const existing = u.statuses.find((s) => s.type === type);
      if (existing) {
        existing.turns = Math.max(existing.turns, turns);
      } else {
        u.statuses.push({ type, turns });
      }
    }

    tickStatusesStartOfTurn(u) {
      let frozen = false;
      for (let i = u.statuses.length - 1; i >= 0; i--) {
        const s = u.statuses[i];
        if (s.type === 'burn') {
          const dot = Math.max(10, Math.round(u.maxHp * 0.055));
          this.applyDamageDirect(u, dot, { color: '#fb7185', tag: '燃焼' });
        } else if (s.type === 'shock') {
          const dot = Math.max(8, Math.round(u.maxHp * 0.04));
          this.applyDamageDirect(u, dot, { color: '#38bdf8', tag: '感電' });
        } else if (s.type === 'regen') {
          const heal = Math.round(u.maxHp * 0.08);
          this.applyHeal(u, heal);
        } else if (s.type === 'freeze') {
          frozen = true;
        }
        s.turns--;
        if (s.turns <= 0) u.statuses.splice(i, 1);
      }

      if (u.hp > 0 && u.mods.regenSelf > 0) {
        this.applyHeal(u, Math.round(u.maxHp * (u.mods.regenSelf / 100)));
      }
      if (u.hp > 0 && u.mods.rampSelf > 0 && u.rampStacks < 10) {
        u.rampStacks++;
      }
      return frozen;
    }

    applyDamageDirect(target, amount, opts) {
      if (target.hp <= 0) return 0;
      let rem = Math.max(1, Math.round(amount));
      if (target.shield > 0) {
        const absorbed = Math.min(target.shield, rem);
        target.shield -= absorbed;
        rem -= absorbed;
      }
      target.hp = Math.max(0, target.hp - rem);
      target.hitFlash = 1.0;
      target.animOffsetY += target.isEnemy ? -10 : 10;
      this.vfx.spawnDamageNumber({ x: target.baseX, y: target.baseY }, amount, { ...(opts || {}), isEnemy: target.isEnemy });
      if (target.isEnemy && target.hp <= 0) {
        this.killedNames.push(target.name);
        this.vfx.spawnDefeatVFX({ x: target.baseX, y: target.baseY }, target.realm);
      }
      return amount;
    }

    applyHeal(target, amount) {
      if (target.hp <= 0 || amount <= 0) return;
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + Math.round(amount));
      const actual = target.hp - before;
      if (actual > 0) {
        this.vfx.spawnHealVFX({ x: target.baseX, y: target.baseY });
        this.vfx.spawnDamageNumber({ x: target.baseX, y: target.baseY }, actual, { isHeal: true, isEnemy: target.isEnemy });
      }
    }

    pickTargets(actor, targetType, livingAllies, livingEnemies) {
      const tactic = this.store.getState().settings.tactic;
      if (targetType === 'allyAll') {
        return actor.isEnemy ? livingEnemies : livingAllies;
      }
      const foes = actor.isEnemy ? livingAllies : livingEnemies;
      if (foes.length === 0) return [];
      if (targetType === 'all') return foes;

      // Respect taunt
      const taunters = foes.filter((f) => this.hasStatus(f, 'taunt'));
      const pool = taunters.length > 0 ? taunters : foes;

      if (!actor.isEnemy) {
        if (tactic === 'bossFocus') {
          return [pool.slice().sort((a, b) => (b.isBoss ? 1 : 0) - (a.isBoss ? 1 : 0) || b.maxHp - a.maxHp)[0]];
        }
        if (tactic === 'assault') {
          return [pool.slice().sort((a, b) => a.hp - b.hp)[0]];
        }
      }
      return [pool[Math.floor(Math.random() * pool.length)]];
    }

    executeTurn(actor) {
      const livingAllies = this.allies.filter((u) => u.hp > 0);
      const livingEnemies = this.enemies.filter((u) => u.hp > 0);
      if (livingAllies.length === 0 || livingEnemies.length === 0) return;

      const frozen = this.tickStatusesStartOfTurn(actor);
      if (actor.hp <= 0) return;
      if (frozen) {
        this.vfx.spawnDamageNumber({ x: actor.baseX, y: actor.baseY }, 0, { text: '凍結', color: '#67e8f9' });
        return;
      }

      const tactic = this.store.getState().settings.tactic;
      const partyLowHp = livingAllies.some((a) => a.hp / a.maxHp < (tactic === 'fortress' ? 0.72 : 0.55));
      const hasBoss = livingEnemies.some((e) => e.isBoss);

      // Dash anticipation
      actor.animOffsetY += actor.isEnemy ? 16 : -16;

      if (actor.isEnemy) {
        this.executeEnemyAction(actor, livingAllies, livingEnemies);
      } else {
        this.executeAllyAction(actor, livingAllies, livingEnemies, tactic, partyLowHp, hasBoss);
      }
    }

    executeEnemyAction(actor, livingAllies, livingEnemies) {
      const useBossUlt = actor.isBoss && actor.sp >= 100;
      const targetType = (useBossUlt && actor.aoe) ? 'all' : 'single';
      const targets = this.pickTargets(actor, targetType, livingAllies, livingEnemies);
      if (targets.length === 0) return;

      if (useBossUlt) {
        actor.sp = 0;
        this.vfx.spawnCutin(actor.name, actor.skillName, actor.realm, true);
        Kairo.audio.play('ult');
      } else {
        actor.sp = Math.min(100, actor.sp + 26);
        Kairo.audio.play(Data.REALMS[actor.realm]?.sfx || 'slash');
      }

      const mult = useBossUlt ? 1.55 : 1.0;
      targets.forEach((t) => {
        this.resolveHit(actor, t, mult, 1, 0, useBossUlt);
        if (useBossUlt && actor.realm === 'yokai' && Math.random() < 0.65) this.addStatus(t, 'burn', 2);
        if (useBossUlt && actor.realm === 'cyber' && Math.random() < 0.65) this.addStatus(t, 'shock', 2);
      });
    }

    executeAllyAction(actor, livingAllies, livingEnemies, tactic, partyLowHp, hasBoss) {
      const def = actor.def;
      const skLevels = actor.inst.skills;

      // Determine move: Ult > Skill > Basic (affected by tactics)
      const holdUlt = tactic === 'bossFocus' && !hasBoss && this.waveIndex < this.stage.waves.length - 1;
      const canUlt = actor.sp >= 100 && !holdUlt;
      const canSkill = actor.skillCd <= 0;

      let moveType = 'basic';
      let move = def.basic;

      if (canUlt) {
        if (def.ult.target === 'allyAll' && !partyLowHp && tactic === 'assault' && !def.ult.mult) {
          moveType = canSkill ? 'skill' : 'basic';
          move = moveType === 'skill' ? def.skill : def.basic;
        } else {
          moveType = 'ult';
          move = def.ult;
        }
      } else if (canSkill) {
        if (def.skill.target === 'allyAll' && !partyLowHp && tactic === 'assault' && !def.skill.effect?.atkUp && !def.skill.effect?.haste) {
          moveType = 'basic';
          move = def.basic;
        } else {
          moveType = 'skill';
          move = def.skill;
        }
      }

      const spMult = 1 + (actor.mods.spGainPct || 0) / 100;
      if (moveType === 'ult') {
        actor.sp = 0;
        this.vfx.spawnCutin(actor.name, move.name, actor.realm, false);
        Kairo.audio.play('ult');
      } else if (moveType === 'skill') {
        actor.skillCd = move.cd || 3;
        actor.sp = Math.min(100, actor.sp + Math.round(28 * spMult));
        Kairo.audio.play(move.healMult ? 'heal' : (Data.REALMS[actor.realm]?.sfx || 'slash'));
      } else {
        actor.skillCd = Math.max(0, actor.skillCd - 1);
        actor.sp = Math.min(100, actor.sp + Math.round(20 * spMult));
        Kairo.audio.play(Data.REALMS[actor.realm]?.sfx || 'slash');
      }

      // Passive team SP on turn (e.g. Kronos)
      if (def.passive?.teamSpTurn) {
        livingAllies.forEach((a) => { a.sp = Math.min(100, a.sp + def.passive.teamSpTurn); });
      }

      const skillLv = skLevels[moveType] || 1;
      const lvBoost = 1 + (skillLv - 1) * 0.08;

      // Support / Heal portion
      if (move.healMult) {
        const healBoost = 1 + (actor.mods.healBonus || 0) / 100;
        const healAmt = Math.round(actor.atk * move.healMult * lvBoost * healBoost);
        livingAllies.forEach((a) => {
          this.applyHeal(a, healAmt);
          if (move.effect?.cleanse) {
            a.statuses = a.statuses.filter((s) => !['burn', 'shock', 'freeze', 'break'].includes(s.type));
          }
        });
      }

      // Ally buffs
      if (move.effect) {
        const ef = move.effect;
        if (ef.shield) {
          livingAllies.forEach((a) => { a.shield = Math.max(a.shield, Math.round(actor.maxHp * ef.shield)); });
        }
        if (ef.taunt) this.addStatus(actor, 'taunt', 2);
        if (ef.type === 'atkUp' || ef.atkUp) livingAllies.forEach((a) => this.addStatus(a, 'atkUp', ef.turns || 2));
        if (ef.type === 'defUp') livingAllies.forEach((a) => this.addStatus(a, 'defUp', ef.turns || 2));
        if (ef.type === 'haste') {
          if (ef.self) this.addStatus(actor, 'haste', ef.turns || 2);
          else livingAllies.forEach((a) => this.addStatus(a, 'haste', ef.turns || 2));
        }
        if (ef.type === 'regen') livingAllies.forEach((a) => this.addStatus(a, 'regen', ef.turns || 2));
        if (ef.spAll) livingAllies.forEach((a) => { a.sp = Math.min(100, a.sp + ef.spAll); });
      }

      // Offensive portion
      if (move.mult && move.mult > 0) {
        const targets = this.pickTargets(actor, move.target === 'allyAll' ? 'all' : move.target, livingAllies, livingEnemies);
        const hits = move.hits || 1;
        const pen = (move.pen || 0) + (actor.mods.penPct || 0) / 100;
        let totalDealt = 0;

        targets.forEach((t) => {
          if (t.hp <= 0) return;
          const dealt = this.resolveHit(actor, t, move.mult * lvBoost, hits, pen, moveType === 'ult');
          totalDealt += dealt;
          if (t.hp > 0 && move.effect && ['burn', 'shock', 'freeze', 'break'].includes(move.effect.type)) {
            if (Math.random() <= (move.effect.chance || 1.0)) {
              this.addStatus(t, move.effect.type, move.effect.turns || 2);
            }
          }
          if (t.hp <= 0 && def.passive?.killSp) {
            actor.sp = Math.min(100, actor.sp + def.passive.killSp);
          }
        });

        // Lifesteal
        const ls = (move.lifesteal || 0) + (actor.mods.lifesteal || 0);
        if (ls > 0 && totalDealt > 0) {
          this.applyHeal(actor, Math.round(totalDealt * ls));
        }
      }
    }

    resolveHit(attacker, target, mult, hits, extraPen, isUlt) {
      let atk = attacker.atk;
      if (this.hasStatus(attacker, 'atkUp')) atk *= 1.28;
      if (attacker.rampStacks > 0) atk *= (1 + (attacker.rampStacks * (attacker.mods.rampSelf || 0)) / 100);
      if (attacker.def?.passive?.lowHpAtk) {
        const missing = 1 - attacker.hp / attacker.maxHp;
        atk *= (1 + (missing * attacker.def.passive.lowHpAtk) / 100);
      }

      let def = target.defStat;
      if (this.hasStatus(target, 'defUp')) def *= 1.3;
      if (this.hasStatus(target, 'break')) def *= 0.62;
      const effDef = Math.max(0, def * (1 - Math.min(0.8, extraPen || 0)));

      // Asymptotic mitigation formula (stable at all power levels)
      const mitigation = 150 / (150 + effDef);
      const elemMult = Data.getElementMultiplier(attacker.realm, target.realm);

      let dmgBonus = 1 + (attacker.mods.dmgPct || 0) / 100;
      if (isUlt) dmgBonus += (attacker.mods.ultPct || 0) / 100;
      if (attacker.def?.passive?.burnBonus && this.hasStatus(target, 'burn')) {
        dmgBonus += attacker.def.passive.burnBonus / 100;
      }
      if (attacker.def?.passive?.breakBonus && this.hasStatus(target, 'break')) {
        dmgBonus += attacker.def.passive.breakBonus / 100;
      }

      let critRate = attacker.crit;
      if (attacker.def?.passive?.condCrit && attacker.hp / attacker.maxHp >= 0.5) {
        critRate += attacker.def.passive.condCrit;
      }
      const isCrit = Math.random() * 100 < critRate;
      const critMult = isCrit ? (attacker.cdmg / 100) : 1.0;

      const dmgRed = 1 - Math.min(0.65, (target.mods.dmgRed || 0) / 100);
      const variance = 0.94 + Math.random() * 0.12;
      const totalDmg = Math.max(1, Math.round(atk * mult * mitigation * elemMult * dmgBonus * critMult * dmgRed * variance));

      if (!attacker.isEnemy && totalDmg > this.maxHitInBattle) {
        this.maxHitInBattle = totalDmg;
      }

      // Passive hit SP gain (vanguards)
      if (!target.isEnemy && target.def?.passive?.hitSp) {
        target.sp = Math.min(100, target.sp + target.def.passive.hitSp);
      }

      this.vfx.spawnAttackVFX(
        attacker.realm,
        { x: attacker.baseX, y: attacker.baseY },
        { x: target.baseX, y: target.baseY },
        isCrit,
        isUlt
      );
      if (isCrit && !attacker.isEnemy) Kairo.audio.play('crit');

      const perHit = Math.max(1, Math.round(totalDmg / Math.max(1, hits)));
      this.applyDamageDirect(target, totalDmg, {
        isCrit,
        isUlt,
        isWeak: elemMult > 1.15,
        text: hits > 1 ? `${totalDmg.toLocaleString()} (${hits}連)` : totalDmg.toLocaleString()
      });

      return perHit * hits;
    }

    update(dtSec) {
      if (!this.stage) return;
      const st = this.store.getState();
      const speed = st.settings.speed || 2;
      this.vfx.setReducedMotion(st.settings.motionMode === 'reduced');

      const frozen = this.vfx.update(dtSec, this);
      if (frozen) return;

      const simDt = dtSec * speed;

      if (this.state === 'wavePause') {
        this.pauseTimer -= dtSec;
        if (this.pauseTimer <= 0) {
          this.spawnWave(this.waveIndex + 1);
          this.state = 'fighting';
          if (this.onUpdateUI) this.onUpdateUI('waveNext');
        }
        return;
      }

      if (this.state === 'victoryPause') {
        this.pauseTimer -= dtSec;
        if (this.pauseTimer <= 0) {
          if (st.settings.autoLoop) {
            // In corridor mode, automatically advance to the next floor if won
            if (this.stage.isCorridor) {
              const nextId = `corridor_${this.stage.floor + 1}`;
              this.store.setStage(nextId);
              this.startStage(nextId);
            } else {
              this.startStage(this.stage.id);
            }
          } else {
            this.state = 'idle';
            if (this.onUpdateUI) this.onUpdateUI('idle');
          }
        }
        return;
      }

      if (this.state === 'defeatPause') {
        this.pauseTimer -= dtSec;
        if (this.pauseTimer <= 0) {
          if (st.settings.retryOnDefeat && st.settings.autoLoop) {
            this.startStage(this.stage.id);
          } else {
            this.state = 'idle';
            if (this.onUpdateUI) this.onUpdateUI('idle');
          }
        }
        return;
      }

      if (this.state !== 'fighting') return;

      this.battleElapsedMs += simDt * 1000;

      // Advance ATB gauges
      const actors = [...this.allies, ...this.enemies].filter((u) => u.hp > 0);
      let readyActor = null;
      for (const u of actors) {
        const hasteMult = this.hasStatus(u, 'haste') ? 1.3 : 1.0;
        u.atb += u.spd * hasteMult * simDt * 0.72;
        if (u.atb >= 100 && (!readyActor || u.atb > readyActor.atb)) {
          readyActor = u;
        }
      }

      if (readyActor) {
        readyActor.atb -= 100;
        this.executeTurn(readyActor);

        // Check wave / battle resolution
        const alliesAlive = this.allies.filter((u) => u.hp > 0).length;
        const enemiesAlive = this.enemies.filter((u) => u.hp > 0).length;

        if (enemiesAlive === 0) {
          if (this.waveIndex + 1 < this.stage.waves.length) {
            this.state = 'wavePause';
            this.pauseTimer = 0.45 / Math.sqrt(speed);
            // Small inter-wave recovery
            this.allies.forEach((a) => {
              if (a.hp > 0) a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * 0.12));
            });
          } else {
            const deadCount = this.allies.length - alliesAlive;
            const stars = deadCount === 0 ? 3 : deadCount === 1 ? 2 : 1;
            const res = this.store.recordBattleWin(this.stage, stars, this.battleElapsedMs, this.killedNames, this.maxHitInBattle);
            this.session.loopsCompleted++;
            this.session.lastClearMs = Math.round(this.battleElapsedMs);
            this.session.totalClearMs += this.session.lastClearMs;
            this.session.goldEarned += res.gold;
            this.session.gemsEarned += res.gems;
            this.session.dustEarned += res.dust + res.autoSalvagedDust;
            res.droppedRelics.forEach((rel) => {
              this.session.relicsByRarity[rel.rarity] = (this.session.relicsByRarity[rel.rarity] || 0) + 1;
            });

            const parts = [`${this.stage.code}勝利`, `貨+${res.gold}`, `晶+${res.gems}`];
            if (res.cores > 0) parts.push(`核+${res.cores}`);
            if (res.droppedRelics.length > 0) {
              const best = res.droppedRelics.reduce((a, b) => (b.rarity > a.rarity ? b : a));
              parts.push(`遺物[${Data.RELIC_RARITIES[best.rarity].name}]`);
              if (best.rarity >= 4) Kairo.audio.play('dropRare');
            } else if (res.autoSalvagedCount > 0) {
              parts.push(`分解:塵+${res.autoSalvagedDust}`);
            }
            this.pushLog(parts.join(' / '));
            Kairo.audio.play('win');

            this.state = 'victoryPause';
            this.pauseTimer = 0.85 / Math.sqrt(speed);
            if (this.onUpdateUI) this.onUpdateUI('victory');
          }
        } else if (alliesAlive === 0) {
          this.store.recordBattleDefeat(this.maxHitInBattle);
          this.pushLog(`敗北[${this.stage.code}] 編成強化または作戦変更を推奨`);
          Kairo.audio.play('lose');
          this.state = 'defeatPause';
          this.pauseTimer = 1.2;
          if (this.onUpdateUI) this.onUpdateUI('defeat');
        }
      }
    }

    render() {
      this.vfx.render(this);
    }
  }

  Kairo.BattleEngine = BattleEngine;
})(window);
