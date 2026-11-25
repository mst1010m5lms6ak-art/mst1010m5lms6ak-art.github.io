(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  /*
   * はちゃめちゃ世界 フルオート戦闘エンジン
   * ・行動順参照の排他攻撃キュー（同時攻撃なし、攻撃演出中も他ユニットの行動ゲージは常時ぬるぬる進行）
   * ・3倍速対応 / 自動周回（停止押下時は現在戦闘完了後に終了）/ 異界塔自動連続登頂
   * ・DPSメーター（与ダメ・被ダメ・与回復・被回復、自動周回時は累積）
   * ・複数部隊リレー（異界総力戦）/ AIパーティ4vs4（異界闘技場）/ 通常エリア超低確率乱入敵
   */
  const MAX_LOGS = 80;

  const Battle = {
    active: false,
    rafId: null,
    lastTs: 0,
    config: null,
    speed: 3,

    // 周回制御
    autoLoop: false,
    stopAfterCurrent: false,
    loopCount: 0,
    loopWins: 0,
    loopLosses: 0,
    loopSummary: null,

    // バトル進行状態
    wave: 1,
    maxWaves: 5,
    isIntruderWave: false,
    raidTeamIdx: 0,
    raidTotalDamage: 0,

    allies: [],
    enemies: [],
    actionQueue: [],
    currentAction: null,
    actionTimer: 0,
    waveTransitionTimer: 0,
    bannerText: '',
    bannerCls: '',

    logs: [],
    dps: {}, // charId -> { name, element, dmg, taken, healOut, healIn }
    result: null,

    onUpdate: null,
    onFinish: null,

    start: function (config, callbacks) {
      this.stopLoopOnly();
      this.config = config;
      this.speed = HW.State.data.settings.battleSpeed || 3;
      this.autoLoop = Boolean(config.autoLoop);
      this.stopAfterCurrent = false;
      this.loopCount = 0;
      this.loopWins = 0;
      this.loopLosses = 0;
      this.loopSummary = this.createEmptySummary();
      this.logs = [];
      this.dps = {};
      this.result = null;
      this.onUpdate = callbacks && callbacks.onUpdate;
      this.onFinish = callbacks && callbacks.onFinish;
      this.active = true;

      this.beginSingleRun(true);
      this.lastTs = performance.now();
      this.tick(this.lastTs);
    },

    createEmptySummary: function () {
      return {
        gold: 0,
        omniShards: 0,
        arenaMedals: 0,
        autoSoldCount: 0,
        autoSoldGold: 0,
        shards: {},
        materials: {},
        equips: [],
        maxQualityCount: 0,
        intruderCount: 0,
        sparks: [],
        unlockedFormations: [],
        towerMaxFloor: 0,
        arenaNewRank: null,
        raidDamage: 0
      };
    },

    stopLoopOnly: function () {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.active = false;
      HW.VFX.clear();
    },

    requestStopLoop: function () {
      if (!this.autoLoop) return;
      this.stopAfterCurrent = true;
      this.addLog('現在の戦闘が完了した後に周回を終了します', 'system');
      if (this.onUpdate) this.onUpdate(true);
    },

    toggleLoop: function () {
      if (this.config && (this.config.mode === 'raid')) return;
      if (this.autoLoop && !this.stopAfterCurrent) {
        this.requestStopLoop();
      } else if (this.autoLoop && this.stopAfterCurrent) {
        this.stopAfterCurrent = false;
        this.addLog('停止予約を取り消し、自動周回を継続します', 'system');
        if (this.onUpdate) this.onUpdate(true);
      } else {
        this.autoLoop = true;
        this.stopAfterCurrent = false;
        this.addLog('自動周回をONにしました', 'system');
        if (this.onUpdate) this.onUpdate(true);
      }
    },

    cycleSpeed: function () {
      const next = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
      this.speed = next;
      HW.State.data.settings.battleSpeed = next;
      HW.State.save();
      HW.Audio.tap();
      if (this.onUpdate) this.onUpdate(true);
    },

    addLog: function (text, kind) {
      this.logs.push({ id: HW.uid('lg'), text: text, kind: kind || 'system' });
      if (this.logs.length > MAX_LOGS) {
        this.logs.splice(0, this.logs.length - MAX_LOGS);
      }
    },

    initDpsForAllies: function (units) {
      units.forEach((u) => {
        if (!this.dps[u.charId]) {
          this.dps[u.charId] = {
            charId: u.charId,
            name: u.name,
            element: u.element,
            dmg: 0,
            taken: 0,
            healOut: 0,
            healIn: 0
          };
        }
      });
    },

    makeAllyUnit: function (built, idx) {
      const st = built.stats;
      const skills = built.def.skills.map((s) => Object.assign({}, s, { cd: 0 }));
      return {
        uid: 'ally_' + idx,
        domId: 'unit-ally-' + idx,
        side: 'ally',
        slotIndex: idx,
        charId: built.charId,
        name: built.def.name,
        element: built.def.element,
        races: built.def.races,
        role: built.def.role,
        maxHp: st.hp,
        hp: st.hp,
        shield: 0,
        atk: st.atk,
        def: st.def,
        spd: st.spd,
        crit: st.crit,
        critDmg: st.critDmg,
        eva: st.eva,
        res: st.res,
        effHit: st.effHit,
        aggro: built.aggro,
        mod: st.mod,
        skills: skills,
        gauge: Math.min(0.85, st.mod.startGauge || 0),
        effects: [],
        alive: true,
        gutsLeft: st.mod.guts > 0 ? 1 : 0,
        reviveLeft: st.mod.autoRevive > 0 ? (st.mod.autoRevive >= 0.55 ? 2 : 1) : 0,
        firstWaveHit: true,
        rampStacks: 0,
        isBoss: false,
        isIntruder: false
      };
    },

    makeEnemyUnit: function (enemyId, scale, idx, isBoss, isIntruder) {
      const def = HW.getEnemyDef(enemyId);
      HW.State.data.codex.enemiesSeen[def.id] = true;
      const hp = Math.round(def.base.hp * scale * (isBoss ? 1.15 : 1));
      const atk = Math.round(def.base.atk * scale);
      const defVal = Math.round(def.base.def * scale);
      const spd = Math.round(def.base.spd + Math.min(28, scale * 3));
      const skills = def.skills.map((s) => Object.assign({}, s, { cd: 0 }));
      return {
        uid: 'enemy_' + idx + '_' + Math.random().toString(36).slice(2, 5),
        domId: 'unit-enemy-' + idx,
        side: 'enemy',
        slotIndex: idx,
        enemyId: def.id,
        name: def.name,
        element: def.element,
        races: def.races,
        role: def.role,
        maxHp: hp,
        hp: hp,
        shield: 0,
        atk: atk,
        def: defVal,
        spd: spd,
        crit: isBoss ? 0.14 : 0.07,
        critDmg: 1.45,
        eva: isIntruder ? 0.14 : 0.03,
        res: isBoss ? 0.18 : 0.06,
        effHit: 0.12,
        aggro: def.role === 'tank' ? 1.8 : 1.0,
        mod: {},
        skills: skills,
        gauge: Math.random() * 0.22,
        effects: [],
        alive: true,
        gutsLeft: 0,
        reviveLeft: 0,
        firstWaveHit: true,
        rampStacks: 0,
        isBoss: Boolean(isBoss),
        isIntruder: Boolean(isIntruder)
      };
    },

    makeArenaEnemyUnit: function (built, idx) {
      const u = this.makeAllyUnit(built, idx);
      u.uid = 'arena_e_' + idx;
      u.domId = 'unit-enemy-' + idx;
      u.side = 'enemy';
      u.isBoss = idx === 0;
      return u;
    },

    beginSingleRun: function (isFirstRun) {
      this.loopCount += 1;
      this.wave = 1;
      this.actionQueue = [];
      this.currentAction = null;
      this.actionTimer = 0;
      this.waveTransitionTimer = 0;
      this.isIntruderWave = false;
      this.raidTeamIdx = 0;
      this.raidTotalDamage = 0;

      // 味方チーム構築
      let memberIds = HW.State.data.party.main.filter(Boolean);
      let linkIds = HW.State.data.party.links;
      if (this.config.mode === 'raid') {
        const t0 = (HW.State.data.raidTeams[0] || []).filter(Boolean);
        memberIds = t0.length ? t0 : memberIds;
      } else if (this.config.mode === 'restriction' && this.config.customParty) {
        memberIds = this.config.customParty;
      }

      const built = HW.buildTeamCombatants(memberIds, linkIds, HW.State.data.party.formationId);
      this.allies = built.units.map((b, i) => this.makeAllyUnit(b, i));
      this.initDpsForAllies(this.allies);

      if (this.config.mode === 'normal') {
        const st = HW.getStageDef(this.config.stageId);
        this.maxWaves = st.waves;
        if (isFirstRun) this.addLog(st.name + ' へ出撃！', 'system');
        else this.addLog('--- 自動周回 ' + this.loopCount + '周目 開始 ---', 'system');
      } else if (this.config.mode === 'tower') {
        const tf = HW.getTowerFloorDef(this.config.towerId, this.config.floor);
        this.maxWaves = tf.waves;
        this.addLog(tf.name + ' へ挑戦！', 'system');
      } else if (this.config.mode === 'raid') {
        const rd = HW.RAIDS.find((r) => r.id === this.config.raidId) || HW.RAIDS[0];
        this.maxWaves = 1;
        this.addLog('異界総力戦 ' + rd.name + ' へ第1部隊出撃！', 'system');
      } else if (this.config.mode === 'restriction') {
        const rs = HW.RESTRICTIONS.find((r) => r.id === this.config.restrictionId) || HW.RESTRICTIONS[0];
        this.maxWaves = 3;
        this.addLog('制約異界 ' + rs.name + ' へ挑戦！', 'system');
      } else if (this.config.mode === 'arena') {
        const opp = HW.getArenaOpponent(this.config.targetRank);
        this.maxWaves = 1;
        this.addLog('異界闘技場 ' + opp.rank + '位「' + opp.teamName + '」へ挑戦！', 'system');
      }

      // 開戦パッシブ適用
      this.applyBattleStartEffects(this.allies);
      this.spawnWave(1);
      if (this.onUpdate) this.onUpdate(true);
    },

    applyBattleStartEffects: function (units) {
      units.forEach((u) => {
        if (!u.alive) return;
        if (u.mod.startTaunt) this.addEffect(u, 'taunt', u.mod.startTaunt);
        if (u.mod.startDefUp) this.addEffect(u, 'defUp', u.mod.startDefUp);
      });
    },

    spawnWave: function (waveNum) {
      this.wave = waveNum;
      this.actionQueue = [];
      this.currentAction = null;
      this.isIntruderWave = false;
      this.enemies = [];

      // 味方のWAVE開始効果
      this.allies.forEach((u) => {
        if (!u.alive) return;
        u.firstWaveHit = true;
        if (u.mod.waveShieldPct) {
          u.shield = Math.max(u.shield, Math.round(u.maxHp * u.mod.waveShieldPct));
        }
        if (u.mod.waveTeamRegen) {
          this.allies.forEach((a) => {
            if (a.alive) this.addEffect(a, 'regen', u.mod.waveTeamRegen);
          });
        }
        if (u.mod.waveCleanse) {
          this.allies.forEach((a) => {
            if (a.alive) this.cleanseUnit(a, 9);
          });
        }
      });

      if (this.config.mode === 'normal') {
        const st = HW.getStageDef(this.config.stageId);
        if (waveNum === this.maxWaves) {
          // ボスWAVE（ボス1体＋取り巻き0〜2体）
          this.enemies.push(this.makeEnemyUnit(st.bossId, st.scale * (st.isAreaBoss ? 1.12 : 0.86), 0, true, false));
          if (st.stageNum >= 4) {
            const mob1 = st.mobs[Math.floor(Math.random() * st.mobs.length)];
            this.enemies.push(this.makeEnemyUnit(mob1, st.scale * 0.85, 1, false, false));
          }
          this.bannerText = 'BOSS WAVE 到達！';
          this.bannerCls = 'enemy-act';
        } else {
          // 通常エリア限定：超低確率乱入敵チェック！
          if (Math.random() < st.intruderChance) {
            this.isIntruderWave = true;
            const intruders = ['i_gold_mimic', 'i_stray_hero', 'i_rainbow_drake'];
            const pick = intruders[Math.floor(Math.random() * intruders.length)];
            this.enemies.push(this.makeEnemyUnit(pick, st.scale * 1.05, 0, false, true));
            this.bannerText = '乱入警報！希少エネミー出現！';
            this.bannerCls = 'spark-act';
            this.addLog('【乱入発生！】' + this.enemies[0].name + ' が割り込んできた！', 'drop');
            HW.Audio.spark();
          } else {
            // 通常敵 1〜4体ランダム出現
            const count = 1 + Math.floor(Math.random() * 4);
            for (let i = 0; i < count; i++) {
              const mid = st.mobs[Math.floor(Math.random() * st.mobs.length)];
              this.enemies.push(this.makeEnemyUnit(mid, st.scale, i, false, false));
            }
            this.bannerText = 'WAVE ' + waveNum + ' / ' + this.maxWaves;
            this.bannerCls = '';
          }
        }
      } else if (this.config.mode === 'tower') {
        const tf = HW.getTowerFloorDef(this.config.towerId, this.config.floor);
        if (waveNum === this.maxWaves) {
          this.enemies.push(this.makeEnemyUnit(tf.bossId, tf.scale * (tf.isMilestone ? 1.05 : 0.72), 0, true, false));
          const mob = tf.mobs[tf.floor % tf.mobs.length];
          this.enemies.push(this.makeEnemyUnit(mob, tf.scale * 0.8, 1, false, false));
          this.bannerText = tf.name + ' 決戦WAVE';
          this.bannerCls = 'enemy-act';
        } else {
          const count = 2 + (tf.floor % 3);
          for (let i = 0; i < count; i++) {
            const mid = tf.mobs[(tf.floor + i) % tf.mobs.length];
            this.enemies.push(this.makeEnemyUnit(mid, tf.scale, i, false, false));
          }
          this.bannerText = tf.name + ' WAVE ' + waveNum;
          this.bannerCls = '';
        }
      } else if (this.config.mode === 'raid') {
        const rd = HW.RAIDS.find((r) => r.id === this.config.raidId) || HW.RAIDS[0];
        this.enemies.push(this.makeEnemyUnit(rd.enemyId, rd.scale, 0, true, false));
        this.bannerText = '総力戦 ' + this.enemies[0].name + ' (第1部隊)';
        this.bannerCls = 'enemy-act';
      } else if (this.config.mode === 'restriction') {
        const rs = HW.RESTRICTIONS.find((r) => r.id === this.config.restrictionId) || HW.RESTRICTIONS[0];
        const area = HW.AREAS[rs.areaIdx] || HW.AREAS[0];
        if (waveNum === this.maxWaves) {
          this.enemies.push(this.makeEnemyUnit(area.boss, rs.scale, 0, true, false));
          this.enemies.push(this.makeEnemyUnit(area.mobs[0], rs.scale * 0.82, 1, false, false));
          this.bannerText = rs.name + ' BOSS';
          this.bannerCls = 'enemy-act';
        } else {
          const count = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < count; i++) {
            this.enemies.push(this.makeEnemyUnit(area.mobs[i % area.mobs.length], rs.scale, i, false, false));
          }
          this.bannerText = rs.name + ' WAVE ' + waveNum;
          this.bannerCls = '';
        }
      } else if (this.config.mode === 'arena') {
        const opp = HW.getArenaOpponent(this.config.targetRank);
        const builtOpp = HW.buildTeamCombatants(null, null, opp.formationId, opp.members);
        this.enemies = builtOpp.units.map((b, i) => this.makeArenaEnemyUnit(b, i));
        this.applyBattleStartEffects(this.enemies);
        this.bannerText = '異界闘技場 ' + opp.rank + '位 ' + opp.teamName;
        this.bannerCls = 'enemy-act';
      }

      // 開戦敵デバフパッシブ
      this.allies.forEach((a) => {
        if (a.alive && a.mod.startEnemyBreak) {
          this.enemies.forEach((e) => {
            if (e.alive) {
              this.addEffect(e, 'atkDown', a.mod.startEnemyBreak);
              this.addEffect(e, 'defDown', a.mod.startEnemyBreak);
            }
          });
        }
      });
    },

    hasEffect: function (unit, id) {
      return unit.effects.some((e) => e.id === id && e.dur > 0);
    },

    addEffect: function (unit, id, dur, casterMod) {
      if (!unit || !unit.alive) return false;
      const meta = HW.STATUS_META[id];
      if (!meta) return false;
      let finalDur = dur || 2;
      if (casterMod) {
        if (meta.kind === 'buff' && casterMod.buffExt) finalDur += casterMod.buffExt;
        if (meta.kind !== 'buff' && casterMod.debuffExt) finalDur += casterMod.debuffExt;
      }
      const existing = unit.effects.find((e) => e.id === id);
      if (existing) {
        existing.dur = Math.max(existing.dur, finalDur);
      } else {
        unit.effects.push({ id: id, dur: finalDur, kind: meta.kind, name: meta.name });
      }
      return true;
    },

    cleanseUnit: function (unit, count) {
      let removed = 0;
      for (let i = unit.effects.length - 1; i >= 0 && removed < count; i--) {
        if (unit.effects[i].kind !== 'buff') {
          unit.effects.splice(i, 1);
          removed++;
        }
      }
      return removed;
    },

    getAlive: function (side) {
      return (side === 'ally' ? this.allies : this.enemies).filter((u) => u.alive);
    },

    getTurnOrderPreview: function () {
      const all = this.allies.concat(this.enemies).filter((u) => u.alive);
      const list = [];
      if (this.currentAction && this.currentAction.unit.alive) {
        list.push({ unit: this.currentAction.unit, acting: true });
      }
      this.actionQueue.forEach((u) => {
        if (u.alive && (!this.currentAction || this.currentAction.unit !== u)) {
          list.push({ unit: u, acting: false });
        }
      });
      const rest = all
        .filter((u) => !list.some((x) => x.unit === u))
        .map((u) => {
          const effSpd = u.spd * (this.hasEffect(u, 'spdUp') ? 1.25 : 1) * (this.hasEffect(u, 'spdDown') ? 0.75 : 1);
          const eta = Math.max(0, 1 - u.gauge) / Math.max(10, effSpd);
          return { unit: u, eta: eta };
        })
        .sort((a, b) => a.eta - b.eta);
      rest.forEach((r) => list.push({ unit: r.unit, acting: false }));
      return list.slice(0, 6);
    },

    tick: function (ts) {
      if (!this.active) return;
      const rawDt = Math.min(0.05, Math.max(0.001, (ts - this.lastTs) / 1000));
      this.lastTs = ts;
      const dt = rawDt * this.speed;

      HW.VFX.updateAndDraw(rawDt);

      // WAVE遷移待ち
      if (this.waveTransitionTimer > 0) {
        this.waveTransitionTimer -= rawDt;
        if (this.waveTransitionTimer <= 0) {
          this.spawnWave(this.wave + 1);
          if (this.onUpdate) this.onUpdate(true);
        } else {
          if (this.onUpdate) this.onUpdate(false);
        }
        this.rafId = requestAnimationFrame((t) => this.tick(t));
        return;
      }

      // ★重要仕様：攻撃演出中も他ユニットの行動ゲージは常時ぬるぬる進み続ける！
      // 満タンになったユニットは行動順キューに順次並び、排他的に1体ずつ行動する（同時攻撃ゼロ）
      const allAlive = this.allies.concat(this.enemies).filter((u) => u.alive);
      allAlive.forEach((u) => {
        if (this.currentAction && this.currentAction.unit === u) return;
        if (this.actionQueue.includes(u)) return;
        const spdMult = (this.hasEffect(u, 'spdUp') ? 1.25 : 1) * (this.hasEffect(u, 'spdDown') ? 0.75 : 1);
        const rate = (u.spd * spdMult) / 195; // 1倍速で約1.6秒周期
        u.gauge += dt * rate;
        if (u.gauge >= 1) {
          u.gauge = 1;
          this.actionQueue.push(u);
        }
      });

      // 現在の行動演出カウントダウン
      if (this.currentAction) {
        this.actionTimer -= rawDt;
        if (this.actionTimer <= 0) {
          this.currentAction = null;
          this.checkWaveOrBattleEnd();
          if (this.onUpdate) this.onUpdate(true);
        }
      }

      // 排他制御：現在行動中でなければ行動順キューの先頭を1体だけ実行
      if (!this.currentAction && this.waveTransitionTimer <= 0 && this.active && this.actionQueue.length > 0) {
        let nextUnit = null;
        while (this.actionQueue.length > 0 && !nextUnit) {
          const cand = this.actionQueue.shift();
          if (cand && cand.alive) nextUnit = cand;
        }
        if (nextUnit) {
          this.executeUnitTurn(nextUnit);
          if (this.onUpdate) this.onUpdate(true);
        }
      } else {
        if (this.onUpdate) this.onUpdate(false);
      }

      if (this.active) {
        this.rafId = requestAnimationFrame((t) => this.tick(t));
      }
    },

    executeUnitTurn: function (unit) {
      unit.gauge = 0;

      // 行動開始時：自己浄化・継続ダメ/再生・行動不能判定
      if (unit.mod.selfCleanse) this.cleanseUnit(unit, unit.mod.selfCleanse);
      const skipReason = this.processTurnStartEffects(unit);
      if (!unit.alive) {
        this.checkWaveOrBattleEnd();
        return;
      }

      if (skipReason) {
        this.currentAction = { unit: unit, targets: [] };
        this.actionTimer = 0.34 / Math.min(2.2, this.speed * 0.75);
        this.bannerText = unit.name + ' は' + skipReason + 'で動けない！';
        this.bannerCls = unit.side === 'ally' ? 'ally-act' : 'enemy-act';
        this.addLog(unit.name + ' は' + skipReason + 'により行動不能', unit.side);
        this.tickEffectsDuration(unit);
        return;
      }

      // 行動ごと強化（オーバードライブ）
      if (unit.mod.rampAtk && unit.rampStacks < 8) unit.rampStacks++;

      // 行動時最弱味方シールド
      if (unit.mod.actShieldLowest) {
        const lowest = this.getAlive(unit.side).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (lowest) lowest.shield += Math.round(lowest.maxHp * unit.mod.actShieldLowest);
      }

      // 技選択（3 > 2 > 1 優先、沈黙時は1のみ）
      const skill = this.chooseSkill(unit);
      const targets = this.selectTargets(unit, skill);

      // CT更新
      unit.skills.forEach((s) => {
        if (s.cd > 0) s.cd--;
      });
      if (skill.ct > 0) skill.cd = skill.ct;
      if (unit.mod.extraCtChance && Math.random() < unit.mod.extraCtChance) {
        unit.skills.forEach((s) => {
          if (s.cd > 0) s.cd--;
        });
      }

      this.currentAction = { unit: unit, targets: targets, skill: skill };
      this.actionTimer = (skill.slot === 3 ? 0.56 : 0.42) / Math.min(2.3, 0.7 + this.speed * 0.55);

      const tLabel = (HW.TARGET_LABELS[skill.target] || HW.TARGET_LABELS.single).text;
      this.bannerText = unit.name + ' の「' + skill.name + '」[' + tLabel + ']';
      this.bannerCls = unit.side === 'ally' ? 'ally-act' : 'enemy-act';

      this.resolveSkill(unit, skill, targets, false);

      // サガ式「戦闘中の閃き（極意開花）」判定（味方のみ、低確率で永続強化！）
      if (unit.side === 'ally' && Math.random() < 0.012) {
        const cs = HW.State.data.chars[unit.charId];
        if (cs && cs.masteryCount < 40) {
          cs.masteryCount += 1;
          this.loopSummary.sparks.push(unit.name + '（極意+' + cs.masteryCount + '）');
          this.bannerText = '閃き！' + unit.name + ' が新たな極意を開花！';
          this.bannerCls = 'spark-act';
          HW.VFX.spawnPopup(unit.domId, '極意閃き!', '#ffd24c', true);
          HW.Audio.spark();
          this.addLog('【閃き】' + unit.name + ' が戦闘中に極意を開花した！(極意' + cs.masteryCount + ')', 'drop');
          HW.State.save();
        }
      }

      // 追撃（連撃）判定
      if (skill.mult && unit.mod.extraHitChance && Math.random() < unit.mod.extraHitChance) {
        const oppAlive = this.getAlive(unit.side === 'ally' ? 'enemy' : 'ally');
        if (oppAlive.length > 0) {
          const s1 = unit.skills[0];
          const extraTargets = this.selectTargets(unit, s1);
          this.addLog(unit.name + ' の追撃発動！', unit.side);
          this.resolveSkill(unit, s1, extraTargets, true);
        }
      }

      // 協同追撃（サポーター連携）
      if (unit.mod.assistChance && Math.random() < unit.mod.assistChance) {
        const partner = this.getAlive(unit.side)
          .filter((a) => a !== unit)
          .sort((a, b) => b.atk - a.atk)[0];
        const oppAlive = this.getAlive(unit.side === 'ally' ? 'enemy' : 'ally');
        if (partner && oppAlive.length > 0) {
          const pSkill = partner.skills[0];
          const pTargets = this.selectTargets(partner, pSkill);
          this.addLog(partner.name + ' が連携追撃！', partner.side);
          this.resolveSkill(partner, pSkill, pTargets, true);
        }
      }

      // 行動終了時の自己再生・全体癒し波紋
      if (unit.alive && unit.mod.turnRegenPct) {
        this.applyHeal(unit, unit, Math.round(unit.maxHp * unit.mod.turnRegenPct));
      }
      if (unit.alive && unit.mod.turnTeamHeal) {
        this.getAlive(unit.side).forEach((a) => {
          this.applyHeal(unit, a, Math.round(a.maxHp * unit.mod.turnTeamHeal));
        });
      }

      // 技2・技3使用時の味方加速 / 技3時CT短縮
      if (skill.slot >= 2 && unit.mod.skillTeamGauge) {
        this.getAlive(unit.side).forEach((a) => {
          a.gauge = Math.min(1, a.gauge + unit.mod.skillTeamGauge);
        });
      }
      if (skill.slot === 3 && unit.mod.s3TeamCtCut) {
        const friends = this.getAlive(unit.side).filter((a) => a !== unit);
        friends.slice(0, 2).forEach((f) => {
          f.skills.forEach((s) => {
            if (s.cd > 0) s.cd--;
          });
        });
      }

      unit.firstWaveHit = false;
      this.tickEffectsDuration(unit);
    },

    processTurnStartEffects: function (unit) {
      let skip = null;
      const dotBonus = unit.side === 'enemy'
        ? this.allies.reduce((acc, a) => acc + (a.alive ? a.mod.teamDotBonus || 0 : 0), 0)
        : 0;

      unit.effects.forEach((ef) => {
        if (!unit.alive) return;
        if (ef.id === 'regen') {
          this.applyHeal(unit, unit, Math.round(unit.maxHp * 0.08));
        } else if (ef.id === 'burn' || ef.id === 'poison' || ef.id === 'bleed') {
          const pct = ef.id === 'poison' ? 0.065 : 0.055;
          const cap = unit.isBoss ? Math.round(unit.maxHp * 0.025) : Math.round(unit.maxHp * pct);
          const dmg = Math.max(25, Math.round(cap * (1 + dotBonus)));
          this.applyDirectDamage(null, unit, dmg, ef.name);
        } else if (ef.id === 'freeze') {
          skip = '凍結';
        } else if (ef.id === 'paralyze' && Math.random() < 0.55) {
          skip = '麻痺';
        }
      });
      return skip;
    },

    tickEffectsDuration: function (unit) {
      for (let i = unit.effects.length - 1; i >= 0; i--) {
        unit.effects[i].dur -= 1;
        if (unit.effects[i].dur <= 0) unit.effects.splice(i, 1);
      }
    },

    chooseSkill: function (unit) {
      const silenced = this.hasEffect(unit, 'silence');
      if (silenced) return unit.skills[0];

      // 上位技(3→2→1)から発動可能なものを選択。回復専用技は味方が減っているか蘇生対象がいるとき優先
      const actives = unit.skills.filter((s) => s.target !== 'passive' && s.cd <= 0).sort((a, b) => b.slot - a.slot);
      for (let i = 0; i < actives.length; i++) {
        const s = actives[i];
        if (s.healMult && !s.mult) {
          const friends = this.getAlive(unit.side);
          const anyHurt = friends.some((f) => f.hp / f.maxHp < 0.88);
          const anyDead = s.reviveOne && (unit.side === 'ally' ? this.allies : this.enemies).some((f) => !f.alive);
          if (!anyHurt && !anyDead && !s.shieldPct && !s.buffAlly) continue;
        }
        return s;
      }
      return unit.skills[0];
    },

    pickWeightedTarget: function (list) {
      const taunters = list.filter((u) => this.hasEffect(u, 'taunt'));
      const pool = taunters.length > 0 ? taunters : list;
      const total = pool.reduce((s, u) => s + (u.aggro || 1), 0);
      let r = Math.random() * total;
      for (let i = 0; i < pool.length; i++) {
        r -= pool[i].aggro || 1;
        if (r <= 0) return pool[i];
      }
      return pool[0];
    },

    selectTargets: function (unit, skill) {
      const opps = this.getAlive(unit.side === 'ally' ? 'enemy' : 'ally');
      const friends = this.getAlive(unit.side);
      if (skill.target === 'self') return [unit];
      if (skill.target === 'allyAll') return friends;
      if (skill.target === 'allySingle') {
        return [friends.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]].filter(Boolean);
      }
      if (skill.target === 'allySplash') {
        return friends.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 2);
      }
      if (skill.target === 'all') return opps;
      if (skill.target === 'splash') {
        if (opps.length <= 2) return opps;
        const primary = this.pickWeightedTarget(opps);
        const others = opps.filter((o) => o !== primary);
        return [primary, others[0]].filter(Boolean);
      }
      return opps.length ? [this.pickWeightedTarget(opps)] : [];
    },

    resolveSkill: function (caster, skill, targets, isFollowUp) {
      const elColor = HW.getElement(caster.element).color;
      const isHeavy = skill.slot === 3;
      const isOffensive = Boolean(skill.mult);
      let critHappened = false;

      if (isOffensive) {
        const oppSide = caster.side === 'ally' ? 'enemy' : 'ally';
        const vulnBonus = this.getAlive(caster.side).reduce((s, a) => s + (a.mod.debuffVuln || 0), 0);

        targets.forEach((tgt) => {
          if (!tgt || !tgt.alive) return;

          // 回避判定
          const evaRate = Math.min(0.65, tgt.eva + (this.hasEffect(tgt, 'evade') ? 0.35 : 0));
          if (Math.random() < evaRate) {
            HW.VFX.spawnPopup(tgt.domId, 'MISS', '#94a3b8', false);
            this.addLog(caster.name + ' の' + skill.name + ' → ' + tgt.name + ' は回避！', caster.side);
            if (tgt.mod.evaHeal) this.applyHeal(tgt, tgt, Math.round(tgt.maxHp * tgt.mod.evaHeal));
            if (!isFollowUp && tgt.mod.counterChance && Math.random() < tgt.mod.counterChance && caster.alive) {
              this.triggerCounter(tgt, caster);
            }
            return;
          }

          // ダメージ計算
          let atk = caster.atk * (1 + caster.rampStacks * (caster.mod.rampAtk || 0));
          if (this.hasEffect(caster, 'atkUp')) atk *= 1.28;
          if (this.hasEffect(caster, 'atkDown')) atk *= 0.76;
          if (caster.mod.fullHpAtk && caster.hp / caster.maxHp >= 0.8) atk *= 1 + caster.mod.fullHpAtk;

          let def = tgt.def;
          if (this.hasEffect(tgt, 'defUp')) def *= 1.32;
          if (this.hasEffect(tgt, 'defDown')) def *= 0.70;
          if (tgt.mod.lowHpDef && tgt.hp / tgt.maxHp <= 0.5) def *= 1 + tgt.mod.lowHpDef;

          const pen = Math.min(0.75, (caster.mod.defPen || 0) + (skill.defPen || 0));
          const effDef = def * (1 - pen);
          const defFactor = 320 / (320 + effDef);

          let dmg = atk * skill.mult * defFactor * (0.94 + Math.random() * 0.12);

          // 属性相性
          let elMult = HW.getElementMultiplier(caster.element, tgt.element);
          if (elMult > 1 && caster.mod.elemAdvBonus) elMult += caster.mod.elemAdvBonus;
          dmg *= elMult;

          // 各種特効・補正
          let dmgBonus = caster.mod.dmgUp || 0;
          if (caster.firstWaveHit && caster.mod.firstHitDmg) dmgBonus += caster.mod.firstHitDmg;
          if (tgt.isBoss && caster.mod.bossDmg) dmgBonus += caster.mod.bossDmg;
          if ((skill.target === 'all' || skill.target === 'splash') && caster.mod.aoeDmg) dmgBonus += caster.mod.aoeDmg;
          if (skill.target === 'single' && caster.mod.singleDmg) dmgBonus += caster.mod.singleDmg;
          if (skill.slot === 3 && caster.mod.s3Dmg) dmgBonus += caster.mod.s3Dmg;
          if (caster.mod.berserkDmg) dmgBonus += caster.mod.berserkDmg * (1 - caster.hp / caster.maxHp);

          const hasAilment = tgt.effects.some((e) => e.kind === 'ailment');
          if (hasAilment) {
            dmgBonus += (caster.mod.ailmentBonus || 0) + (skill.bonusIfAilment || 0);
          }
          const debuffCnt = tgt.effects.filter((e) => e.kind !== 'buff').length;
          if (debuffCnt > 0 && vulnBonus > 0) dmgBonus += debuffCnt * vulnBonus;

          // 挑発中味方火力オーラ
          const tauntBoost = this.getAlive(caster.side).reduce(
            (s, a) => s + (this.hasEffect(a, 'taunt') ? a.mod.tauntTeamDmg || 0 : 0),
            0
          );
          dmgBonus += tauntBoost;
          dmg *= 1 + dmgBonus;

          // 会心判定
          let critRate = caster.crit + (skill.critBonus || 0);
          if (this.hasEffect(caster, 'critUp')) critRate += 0.22;
          if (caster.mod.fullHpCrit && caster.hp / caster.maxHp >= 0.8) critRate += caster.mod.fullHpCrit;
          const isCrit = Math.random() < Math.min(0.95, critRate);
          if (isCrit) {
            dmg *= caster.critDmg;
            critHappened = true;
          }

          // 被ダメ軽減
          let red = tgt.mod.dmgRed || 0;
          if (tgt.mod.lowHpRed && tgt.hp / tgt.maxHp <= 0.5) red += tgt.mod.lowHpRed;
          if (this.hasEffect(tgt, 'curse')) red -= 0.14;
          dmg *= Math.max(0.25, 1 - red);

          const finalDmg = Math.max(1, Math.round(dmg));
          HW.VFX.spawnAttack(caster.domId, tgt.domId, elColor, isHeavy || isCrit);
          HW.Audio.hit(isCrit);

          this.applyDamage(caster, tgt, finalDmg, isCrit, elMult, skill.name);

          // 吸血
          const ls = (caster.mod.lifesteal || 0) + (skill.lifestealBonus || 0);
          if (ls > 0 && caster.alive) {
            this.applyHeal(caster, caster, Math.max(1, Math.round(finalDmg * ls)));
          }

          // 状態異常・デバフ付与
          this.tryInflict(caster, tgt, skill.ailment);
          this.tryInflict(caster, tgt, skill.debuff);
          this.tryInflict(caster, tgt, skill.debuff2);
          if (caster.mod.onAtkDefDown) this.tryInflict(caster, tgt, { id: 'defDown', chance: caster.mod.onAtkDefDown, dur: 2 });
          if (caster.mod.onAtkBleed) this.tryInflict(caster, tgt, { id: 'bleed', chance: caster.mod.onAtkBleed, dur: 2 });
          if (caster.mod.onAtkCurse) this.tryInflict(caster, tgt, { id: 'curse', chance: caster.mod.onAtkCurse, dur: 2 });
          if (caster.mod.onAtkSilence) this.tryInflict(caster, tgt, { id: 'silence', chance: caster.mod.onAtkSilence, dur: 1 });
          if (caster.mod.onAtkBreak) {
            this.tryInflict(caster, tgt, { id: 'defDown', chance: caster.mod.onAtkBreak, dur: 2 });
            this.tryInflict(caster, tgt, { id: 'spdDown', chance: caster.mod.onAtkBreak, dur: 2 });
          }

          // 被弾側リアクション（反撃・ゲージUP・威圧）
          if (tgt.alive) {
            if (tgt.mod.onHitGauge) tgt.gauge = Math.min(1, tgt.gauge + tgt.mod.onHitGauge);
            if (tgt.mod.onHitAtkDown && Math.random() < tgt.mod.onHitAtkDown) {
              this.addEffect(caster, 'atkDown', 2, tgt.mod);
            }
            if (tgt.mod.counterDef && caster.alive) {
              const cDmg = Math.max(1, Math.round(tgt.def * tgt.mod.counterDef));
              this.applyDirectDamage(tgt, caster, cDmg, '荊棘反撃');
            }
            if (!isFollowUp && tgt.mod.counterChance && Math.random() < tgt.mod.counterChance && caster.alive) {
              this.triggerCounter(tgt, caster);
            }
          } else {
            // 撃破時ゲージ加速
            if (caster.mod.killGauge) caster.gauge = Math.min(1, caster.gauge + caster.mod.killGauge);
          }

          // 味方HP35%以下でヒーラー緊急割込
          if (oppSide === 'ally' && tgt.alive && tgt.hp / tgt.maxHp <= 0.35) {
            this.allies.forEach((a) => {
              if (a.alive && a.mod.rescueGauge) a.gauge = Math.min(1, a.gauge + a.mod.rescueGauge);
            });
          }
        });

        if (critHappened && caster.mod.critCtCut) {
          caster.skills.forEach((s) => {
            if (s.cd > 0) s.cd--;
          });
        }
      }

      // 回復・蘇生・シールド・バフ・浄化・ゲージ操作
      const friendTargets =
        skill.target === 'allyAll' || skill.target === 'allySplash' || skill.target === 'allySingle' || skill.target === 'self'
          ? targets
          : this.getAlive(caster.side);

      if (skill.reviveOne) {
        const deadOne = (caster.side === 'ally' ? this.allies : this.enemies).find((f) => !f.alive);
        if (deadOne) {
          deadOne.alive = true;
          deadOne.hp = Math.round(deadOne.maxHp * skill.reviveOne);
          deadOne.gauge = 0.25;
          HW.VFX.spawnHeal(deadOne.domId);
          HW.VFX.spawnPopup(deadOne.domId, '蘇生!', '#47f59a', true);
          this.addLog(caster.name + ' が ' + deadOne.name + ' を蘇生！', 'heal');
        }
      }

      if (skill.healMult) {
        let totalHeal = 0;
        friendTargets.forEach((f) => {
          if (!f || !f.alive) return;
          const baseH = Math.round(caster.atk * skill.healMult * 1.15);
          totalHeal += this.applyHeal(caster, f, baseH);
        });
        if (totalHeal > 0) {
          HW.Audio.heal();
          this.addLog(caster.name + ' の' + skill.name + ' → 味方を計' + HW.formatNum(totalHeal) + '回復', 'heal');
        }
      }

      if (skill.healLowest) {
        const low = this.getAlive(caster.side).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (low) {
          const h = this.applyHeal(caster, low, Math.round(caster.atk * skill.healLowest * 1.15));
          this.addLog(caster.name + ' → ' + low.name + ' を' + HW.formatNum(h) + '回復', 'heal');
        }
      }

      if (skill.cleanse) {
        friendTargets.forEach((f) => {
          if (f && f.alive) this.cleanseUnit(f, skill.cleanse);
        });
      }

      if (skill.shieldPct) {
        friendTargets.forEach((f) => {
          if (f && f.alive) {
            f.shield += Math.round(f.maxHp * skill.shieldPct);
            HW.VFX.spawnPopup(f.domId, 'SHIELD', '#7dd3fc', false);
          }
        });
        if (!isOffensive && !skill.healMult) {
          this.addLog(caster.name + ' の' + skill.name + ' → 味方へシールド展開！', caster.side);
        }
      }

      if (skill.shieldSelfPct) {
        caster.shield += Math.round(caster.maxHp * skill.shieldSelfPct);
      }

      if (skill.buffSelf) this.addEffect(caster, skill.buffSelf.id, skill.buffSelf.dur, caster.mod);
      if (skill.buffSelf2) this.addEffect(caster, skill.buffSelf2.id, skill.buffSelf2.dur, caster.mod);
      if (skill.buffAlly) {
        friendTargets.forEach((f) => this.addEffect(f, skill.buffAlly.id, skill.buffAlly.dur, caster.mod));
      }
      if (skill.buffAlly2) {
        friendTargets.forEach((f) => this.addEffect(f, skill.buffAlly2.id, skill.buffAlly2.dur, caster.mod));
      }
      if (skill.buffAllyLowest) {
        const low = this.getAlive(caster.side).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (low) this.addEffect(low, skill.buffAllyLowest.id, skill.buffAllyLowest.dur, caster.mod);
      }
      if (skill.gaugeAlly) {
        friendTargets.forEach((f) => {
          if (f && f.alive) f.gauge = Math.min(1, f.gauge + skill.gaugeAlly);
        });
        if (!isOffensive && !skill.healMult) {
          this.addLog(caster.name + ' の' + skill.name + ' → 味方を加速＆強化！', caster.side);
        }
      }
      if (skill.gaugeAllyLowest) {
        const low = this.getAlive(caster.side).sort((a, b) => a.gauge - b.gauge)[0];
        if (low) low.gauge = Math.min(1, low.gauge + skill.gaugeAllyLowest);
      }
    },

    tryInflict: function (caster, target, spec) {
      if (!spec || !target || !target.alive) return;
      const rate = Math.max(0.05, Math.min(0.95, spec.chance + (caster.effHit || 0) - (target.res || 0)));
      if (Math.random() < rate) {
        this.addEffect(target, spec.id, spec.dur, caster.mod);
      }
    },

    triggerCounter: function (defender, attacker) {
      const s1 = defender.skills[0];
      if (!s1 || !s1.mult) return;
      this.addLog(defender.name + ' のカウンター反撃！', defender.side);
      this.resolveSkill(defender, s1, [attacker], true);
    },

    applyDamage: function (caster, target, amount, isCrit, elMult, skillName) {
      let rem = amount;
      if (target.shield > 0) {
        const absorbed = Math.min(target.shield, rem);
        target.shield -= absorbed;
        rem -= absorbed;
      }
      target.hp = Math.max(0, target.hp - rem);

      // DPSメーター集計（与ダメ・被ダメ）
      if (caster && caster.side === 'ally' && this.dps[caster.charId]) {
        this.dps[caster.charId].dmg += amount;
      }
      if (target.side === 'ally' && this.dps[target.charId]) {
        this.dps[target.charId].taken += amount;
      }
      if (this.config.mode === 'raid' && target.side === 'enemy') {
        this.raidTotalDamage += amount;
      }

      const popColor = isCrit ? '#ffd24c' : elMult > 1 ? '#ff7ab6' : elMult < 1 ? '#94a3b8' : '#ffffff';
      const popText = (isCrit ? 'CRIT ' : '') + HW.formatNum(amount);
      HW.VFX.spawnPopup(target.domId, popText, popColor, isCrit);

      const domEl = document.getElementById(target.domId);
      if (domEl) {
        domEl.classList.remove('hit-shake');
        void domEl.offsetWidth;
        domEl.classList.add('hit-shake');
      }

      const tag = isCrit ? '【会心】' : elMult > 1 ? '【弱点】' : '';
      this.addLog(
        (caster ? caster.name + ' の' + skillName + ' → ' : '') + target.name + ' に ' + HW.formatNum(amount) + 'ダメ' + tag,
        caster ? caster.side : 'system'
      );

      this.handleDeathCheck(target);
    },

    applyDirectDamage: function (caster, target, amount, label) {
      target.hp = Math.max(0, target.hp - amount);
      if (caster && caster.side === 'ally' && this.dps[caster.charId]) this.dps[caster.charId].dmg += amount;
      if (target.side === 'ally' && this.dps[target.charId]) this.dps[target.charId].taken += amount;
      if (this.config.mode === 'raid' && target.side === 'enemy') this.raidTotalDamage += amount;
      HW.VFX.spawnPopup(target.domId, label + ' ' + HW.formatNum(amount), '#c084fc', false);
      this.addLog(target.name + ' は' + label + 'で ' + HW.formatNum(amount) + 'ダメ', 'system');
      this.handleDeathCheck(target);
    },

    handleDeathCheck: function (unit) {
      if (unit.hp > 0 || !unit.alive) return;
      // 不屈判定
      if (unit.gutsLeft > 0) {
        unit.gutsLeft--;
        unit.hp = Math.max(1, Math.round(unit.maxHp * (unit.mod.guts || 0.25)));
        HW.VFX.spawnPopup(unit.domId, '不屈!', '#ffd24c', true);
        this.addLog(unit.name + ' は不屈の闘志で踏みとどまった！', unit.side);
        return;
      }
      unit.alive = false;
      unit.effects = [];
      unit.shield = 0;
      this.addLog(unit.name + ' が戦闘不能になった！', unit.side === 'ally' ? 'enemy' : 'ally');

      // 味方ヒーラーの自動蘇生チェック
      if (unit.side === 'ally') {
        const reviver = this.allies.find((a) => a.alive && a.reviveLeft > 0);
        if (reviver) {
          reviver.reviveLeft--;
          unit.alive = true;
          unit.hp = Math.round(unit.maxHp * (reviver.mod.autoRevive || 0.45));
          unit.gauge = 0.25;
          HW.VFX.spawnHeal(unit.domId);
          HW.VFX.spawnPopup(unit.domId, '自動蘇生!', '#47f59a', true);
          this.addLog(reviver.name + ' の奇跡で ' + unit.name + ' が自動蘇生！', 'heal');
        }
      }
    },

    applyHeal: function (caster, target, rawAmount) {
      if (!target || !target.alive) return 0;
      let amt = rawAmount * (1 + ((caster && caster.mod && caster.mod.healOutPct) || 0) + ((target.mod && target.mod.healInPct) || 0));
      if (caster && caster.mod && caster.mod.emergencyHeal && target.hp / target.maxHp <= 0.4) {
        amt *= 1 + caster.mod.emergencyHeal;
      }
      if (this.hasEffect(target, 'healDown')) amt *= 0.6;
      const finalHeal = Math.max(1, Math.round(amt));
      const missing = target.maxHp - target.hp;
      const actual = Math.min(missing, finalHeal);
      const overflow = Math.max(0, finalHeal - actual);

      target.hp += actual;
      if (overflow > 0 && caster && caster.mod && caster.mod.overhealShield) {
        target.shield += Math.round(overflow * caster.mod.overhealShield);
      }

      if (caster && caster.side === 'ally' && this.dps[caster.charId]) {
        this.dps[caster.charId].healOut += finalHeal;
      }
      if (target.side === 'ally' && this.dps[target.charId]) {
        this.dps[target.charId].healIn += finalHeal;
      }

      if (caster && caster !== target && caster.mod) {
        if (caster.mod.healCleanse) this.cleanseUnit(target, caster.mod.healCleanse);
        if (caster.mod.healRegen) this.addEffect(target, 'regen', caster.mod.healRegen, caster.mod);
        if (caster.mod.healAtkUp) this.addEffect(target, 'atkUp', caster.mod.healAtkUp, caster.mod);
        if (caster.mod.healDefUp) this.addEffect(target, 'defUp', caster.mod.healDefUp, caster.mod);
        if (caster.mod.healSpdUp) this.addEffect(target, 'spdUp', caster.mod.healSpdUp, caster.mod);
        if (caster.mod.healGauge) target.gauge = Math.min(1, target.gauge + caster.mod.healGauge);
        if (caster.mod.healReflectDmg) {
          const opps = this.getAlive(caster.side === 'ally' ? 'enemy' : 'ally');
          if (opps.length) {
            const rnd = opps[Math.floor(Math.random() * opps.length)];
            this.applyDirectDamage(caster, rnd, Math.round(finalHeal * caster.mod.healReflectDmg), '反響聖光');
          }
        }
      }

      HW.VFX.spawnHeal(target.domId);
      HW.VFX.spawnPopup(target.domId, '+' + HW.formatNum(finalHeal), '#47f59a', false);
      return finalHeal;
    },

    checkWaveOrBattleEnd: function () {
      const aliveAllies = this.getAlive('ally');
      const aliveEnemies = this.getAlive('enemy');

      if (aliveEnemies.length === 0) {
        // 乱入敵撃破ボーナス
        if (this.isIntruderWave) {
          this.grantIntruderBonus();
        }
        if (this.wave < this.maxWaves) {
          this.waveTransitionTimer = 0.45 / Math.min(2, this.speed * 0.7);
          this.bannerText = 'WAVE ' + this.wave + ' クリア！次へ進行…';
          this.bannerCls = 'ally-act';
          return;
        }
        this.handleRunEnd(true);
        return;
      }

      if (aliveAllies.length === 0) {
        // 異界総力戦：次のリレー部隊がいれば自動バトンタッチ（敵残HP＆デバフ引継ぎ！）
        if (this.config.mode === 'raid') {
          for (let nextIdx = this.raidTeamIdx + 1; nextIdx < 3; nextIdx++) {
            const members = (HW.State.data.raidTeams[nextIdx] || []).filter(Boolean);
            if (members.length > 0) {
              this.raidTeamIdx = nextIdx;
              const built = HW.buildTeamCombatants(members, HW.State.data.party.links, HW.State.data.party.formationId);
              this.allies = built.units.map((b, i) => this.makeAllyUnit(b, i));
              this.initDpsForAllies(this.allies);
              this.applyBattleStartEffects(this.allies);
              this.actionQueue = [];
              this.bannerText = '第' + (nextIdx + 1) + '部隊 バトンタッチ突入！';
              this.bannerCls = 'spark-act';
              this.addLog('【部隊交代】第' + (nextIdx + 1) + '部隊が戦線へ突入！', 'system');
              HW.Audio.spark();
              return;
            }
          }
        }
        this.handleRunEnd(false);
      }
    },

    grantIntruderBonus: function () {
      const st = HW.getStageDef(this.config.stageId);
      const omni = 6 + st.area * 2;
      HW.State.data.omniShards += omni;
      this.loopSummary.omniShards += omni;
      this.loopSummary.intruderCount += 1;
      const setId = st.equipSets[Math.floor(Math.random() * st.equipSets.length)];
      const drop = HW.State.grantEquipmentDrop(setId, Math.min(92, st.minQuality + 28));
      this.recordEquipDrop(drop);
      this.addLog('【乱入撃破ボーナス】万能欠片×' + omni + '＋高品質装備獲得！', 'drop');
    },

    recordEquipDrop: function (drop) {
      const tpl = HW.getEquipTemplate(drop.item.tplId);
      if (drop.autoSold) {
        this.loopSummary.autoSoldCount += 1;
        this.loopSummary.autoSoldGold += drop.gold;
        this.addLog('自動売却: ' + tpl.name + ' (品質' + drop.item.quality + '%) → +' + drop.gold + 'G', 'system');
      } else {
        this.loopSummary.equips.push(drop.item);
        if (drop.item.quality >= 100) {
          this.loopSummary.maxQualityCount += 1;
          this.addLog('【極品質ドロップ！】' + tpl.name + ' (品質100%・極) を獲得！', 'drop');
        } else {
          this.addLog('ドロップ: ' + tpl.name + ' (品質' + drop.item.quality + '%)', 'drop');
        }
      }
    },

    handleRunEnd: function (win) {
      if (win) {
        this.loopWins += 1;
        HW.Audio.win();
        HW.Dispatch.onBattleVictory();
        this.grantVictoryRewards();
      } else {
        this.loopLosses += 1;
        if (this.config.mode === 'raid') {
          this.grantRaidParticipationRewards(false);
        }
      }
      HW.State.save();

      // 自動周回継続判定（停止予約OFFかつ周回ON）
      if (this.autoLoop && !this.stopAfterCurrent) {
        if (this.config.mode === 'tower') {
          const tower = HW.TOWERS.find((t) => t.id === this.config.towerId);
          if (win && tower && this.config.floor < tower.maxFloor) {
            this.config.floor += 1;
            this.beginSingleRun(false);
            return;
          }
        } else if (this.config.mode === 'arena') {
          // 闘技場自動周回：勝敗関わらず同ランク帯を周回してメダル収集
          this.beginSingleRun(false);
          return;
        } else if (this.config.mode !== 'raid') {
          this.beginSingleRun(false);
          return;
        }
      }

      // 戦闘完全終了 → リザルト構築
      this.stopLoopOnly();
      this.result = {
        win: win,
        mode: this.config.mode,
        runs: this.loopCount,
        wins: this.loopWins,
        losses: this.loopLosses,
        summary: this.loopSummary,
        dpsList: Object.values(this.dps)
      };
      if (this.onFinish) this.onFinish(this.result);
    },

    grantVictoryRewards: function () {
      const sum = this.loopSummary;
      const sd = HW.State.data;

      if (this.config.mode === 'normal') {
        const st = HW.getStageDef(this.config.stageId);
        const firstClear = !sd.progress.clearedStages[st.id];
        sd.progress.clearedStages[st.id] = true;

        const gold = st.goldBase + (firstClear ? st.goldBase : 0);
        sd.gold += gold;
        sum.gold += gold;

        // キャラ欠片ドロップ
        const shardAmt = firstClear ? 8 : 2 + (Math.random() < 0.35 ? 1 : 0);
        sd.chars[st.shardCharId].shards += shardAmt;
        sum.shards[st.shardCharId] = (sum.shards[st.shardCharId] || 0) + shardAmt;

        // 階位素材ドロップ
        const matId = st.matIds[Math.floor(Math.random() * st.matIds.length)];
        const matAmt = 1 + (Math.random() < 0.45 ? 1 : 0) + (firstClear ? 2 : 0);
        sd.materials[matId] = (sd.materials[matId] || 0) + matAmt;
        sum.materials[matId] = (sum.materials[matId] || 0) + matAmt;

        // 装備ドロップ（1〜2個）
        const eqCount = st.isAreaBoss ? 2 : 1;
        for (let i = 0; i < eqCount; i++) {
          const setId = st.equipSets[Math.floor(Math.random() * st.equipSets.length)];
          this.recordEquipDrop(HW.State.grantEquipmentDrop(setId, st.minQuality));
        }

        // エリア制覇陣形解放
        if (st.isAreaBoss) {
          const area = HW.AREAS[st.area - 1];
          if (area && area.unlockForm && HW.State.unlockFormation(area.unlockForm)) {
            sum.unlockedFormations.push(HW.getFormation(area.unlockForm).name);
          }
        }
        if (firstClear) {
          sd.omniShards += 3;
          sum.omniShards += 3;
        }
      } else if (this.config.mode === 'tower') {
        const tf = HW.getTowerFloorDef(this.config.towerId, this.config.floor);
        const prevBest = sd.progress.towerCleared[tf.towerId] || 0;
        const isFirstFloorClear = tf.floor > prevBest;
        if (isFirstFloorClear) {
          sd.progress.towerCleared[tf.towerId] = tf.floor;
          sum.towerMaxFloor = Math.max(sum.towerMaxFloor, tf.floor);
          // 各F1度きり報酬
          sd.gold += tf.rewardGold;
          sum.gold += tf.rewardGold;
          sd.omniShards += tf.rewardOmni;
          sum.omniShards += tf.rewardOmni;
          sd.materials[tf.rewardMat] = (sd.materials[tf.rewardMat] || 0) + (tf.isMilestone ? 4 : 2);
          sum.materials[tf.rewardMat] = (sum.materials[tf.rewardMat] || 0) + (tf.isMilestone ? 4 : 2);
          if (tf.isMilestone) {
            const setId = tf.equipSets[Math.floor(Math.random() * tf.equipSets.length)];
            this.recordEquipDrop(HW.State.grantEquipmentDrop(setId, tf.minQuality));
          }
          if (tf.unlockForm && HW.State.unlockFormation(tf.unlockForm)) {
            sum.unlockedFormations.push(HW.getFormation(tf.unlockForm).name);
          }
        }
      } else if (this.config.mode === 'raid') {
        this.grantRaidParticipationRewards(true);
      } else if (this.config.mode === 'restriction') {
        const rs = HW.RESTRICTIONS.find((r) => r.id === this.config.restrictionId) || HW.RESTRICTIONS[0];
        const first = !sd.progress.restrictionCleared[rs.id];
        sd.progress.restrictionCleared[rs.id] = true;
        const gold = first ? 1200 : 480;
        sd.gold += gold;
        sum.gold += gold;
        const pickChar = rs.shardPool[Math.floor(Math.random() * rs.shardPool.length)];
        const sAmt = first ? 10 : 4;
        sd.chars[pickChar].shards += sAmt;
        sum.shards[pickChar] = (sum.shards[pickChar] || 0) + sAmt;
        sd.materials[rs.matId] = (sd.materials[rs.matId] || 0) + 3;
        sum.materials[rs.matId] = (sum.materials[rs.matId] || 0) + 3;
        const setId = rs.equipSets[Math.floor(Math.random() * rs.equipSets.length)];
        this.recordEquipDrop(HW.State.grantEquipmentDrop(setId, 58));
      } else if (this.config.mode === 'arena') {
        const opp = HW.getArenaOpponent(this.config.targetRank);
        sd.progress.arenaWins = (sd.progress.arenaWins || 0) + 1;
        let bonusMedals = 0;
        if (opp.rank < sd.progress.arenaRank) {
          const climbed = sd.progress.arenaRank - opp.rank;
          sd.progress.arenaRank = opp.rank;
          if (opp.rank < sd.progress.arenaBestRank) {
            bonusMedals = climbed * 12;
            sd.progress.arenaBestRank = opp.rank;
          }
          sum.arenaNewRank = opp.rank;
        }
        const totalMedals = opp.medalReward + bonusMedals;
        sd.arenaMedals += totalMedals;
        sum.arenaMedals += totalMedals;
        sd.gold += opp.goldReward;
        sum.gold += opp.goldReward;
      }
    },

    grantRaidParticipationRewards: function (defeated) {
      const rd = HW.RAIDS.find((r) => r.id === this.config.raidId) || HW.RAIDS[0];
      const sd = HW.State.data;
      const sum = this.loopSummary;
      sum.raidDamage = this.raidTotalDamage;
      const prev = sd.progress.raidBestDamage[rd.id] || 0;
      if (this.raidTotalDamage > prev) sd.progress.raidBestDamage[rd.id] = this.raidTotalDamage;
      if (defeated) sd.progress.raidCleared[rd.id] = true;

      const bossMax = this.enemies[0] ? this.enemies[0].maxHp : 85000;
      const ratio = defeated ? 1 : Math.min(0.85, this.raidTotalDamage / Math.max(1, bossMax));
      const gold = Math.max(150, Math.round(rd.gold * ratio));
      const omni = Math.max(1, Math.round(rd.omni * ratio));
      const matAmt = Math.max(1, Math.round(4 * ratio));
      sd.gold += gold;
      sd.omniShards += omni;
      sd.materials[rd.matId] = (sd.materials[rd.matId] || 0) + matAmt;
      sum.gold += gold;
      sum.omniShards += omni;
      sum.materials[rd.matId] = (sum.materials[rd.matId] || 0) + matAmt;
      if (defeated || ratio >= 0.45) {
        this.recordEquipDrop(HW.State.grantEquipmentDrop(rd.equipSet, defeated ? 74 : 52));
      }
    }
  };

  HW.Battle = Battle;
})();
