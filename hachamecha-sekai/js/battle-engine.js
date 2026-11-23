(function (global) {
  "use strict";
  const HS = (global.HS = global.HS || {});

  let battle = null;
  let tickTimer = null;
  let loopCountdownTimer = null;
  let onUpdateCb = null;

  // Persistent loop session summary while auto-loop is running
  let loopSession = null;

  function resetLoopSession(stageId) {
    loopSession = {
      stageId,
      runs: 0,
      wins: 0,
      losses: 0,
      totalGold: 0,
      totalExp: 0,
      totalCrystal: 0,
      totalCore: 0,
      autoSoldCount: 0,
      autoSoldGold: 0,
      keptEquips: [],
      totalElapsed: 0,
      metricsByChar: {},
      paused: false,
      countdown: 0
    };
  }

  function makeAllyUnit(charId, slotIdx, save, synMods) {
    const def = HS.CHARS.get(charId);
    const st = HS.EQUIP.calcCharStats(charId, save);
    const maxHp = Math.round(st.hp * (1 + synMods.hpPct / 100));
    const atk = Math.round(st.atk * (1 + synMods.atkPct / 100));
    const defVal = Math.round(st.def * (1 + synMods.defPct / 100));
    const spd = Math.round(st.spd * (1 + synMods.spdPct / 100));
    const crit = Math.min(100, st.crit + synMods.critPct);

    let initShield = 0;
    if (def.role === "tank") initShield += Math.round(maxHp * 0.22);
    if (synMods.shieldPct > 0) initShield += Math.round(maxHp * (synMods.shieldPct / 100));
    if (st.exUnlocked && def.id === "w_mac_sup") initShield += Math.round(maxHp * 0.15);

    return {
      uid: "ally_" + slotIdx,
      charId,
      slotIdx,
      side: "ally",
      name: def.name,
      element: def.element,
      races: def.races,
      role: def.role,
      boss: false,
      maxHp,
      hp: maxHp,
      shield: initShield,
      atk,
      def: defVal,
      spd,
      crit,
      cdmg: st.cdmg,
      healPct: st.healPct + synMods.healPct,
      vampAdd: st.vampAdd + (st.exUnlocked && def.id === "d_hum_dem_dlr" ? 10 : 0),
      chaosPct: st.chaosPct + synMods.chaosPct,
      exUnlocked: st.exUnlocked,
      skills: def.skills,
      cds: [0, 0, 0],
      atb: Math.random() * 14,
      buffs: { atkUp: 0, defUp: 0, spdUp: 0, critUp: 0, taunt: 0 },
      debuffs: { atkDown: 0, defDown: 0, slow: 0, burn: 0 },
      metrics: { dealt: 0, taken: 0, healOut: 0, healIn: 0 }
    };
  }

  function makeEnemyWave(stage, waveIdx) {
    const ids = stage.waves[waveIdx] || stage.waves[0];
    return ids.map((tplId, idx) => {
      const tpl = HS.STAGES.ENEMY_TEMPLATES[tplId] || HS.STAGES.ENEMY_TEMPLATES.slime_f;
      const mult = stage.scale * (1 + waveIdx * 0.12);
      const maxHp = Math.round(tpl.hp * mult * (tpl.boss ? 1.55 : 1.0));
      const atk = Math.round(tpl.atk * mult * (tpl.boss ? 1.15 : 1.0));
      const defVal = Math.round(tpl.def * mult);
      const spd = Math.round(tpl.spd + Math.min(28, stage.scale * 3.5));

      const skills = [
        { name: tpl.boss ? "混沌強襲" : "体当たり", ct: 0, kind: "atk", target: "single", power: 1.0 },
        {
          name: tpl.role === "healer" ? "妖光修復" : tpl.boss ? "領域衝撃波" : "乱撃",
          ct: 3,
          kind: tpl.role === "healer" ? "heal" : "atk",
          target: tpl.boss || tpl.role === "healer" ? "all" : "single",
          power: tpl.role === "healer" ? 0.95 : tpl.boss ? 1.15 : 1.35,
          defDown: tpl.boss ? 2 : 0
        }
      ];

      return {
        uid: "enemy_" + waveIdx + "_" + idx,
        slotIdx: idx,
        side: "enemy",
        name: tpl.name,
        element: tpl.element,
        races: tpl.races,
        role: tpl.role,
        boss: !!tpl.boss,
        maxHp,
        hp: maxHp,
        shield: tpl.role === "tank" ? Math.round(maxHp * 0.15) : 0,
        atk,
        def: defVal,
        spd,
        crit: tpl.boss ? 18 : 10,
        cdmg: 145,
        healPct: 0,
        vampAdd: 0,
        chaosPct: 0,
        exUnlocked: false,
        skills,
        cds: [0, 1],
        atb: Math.random() * 16,
        buffs: { atkUp: 0, defUp: 0, spdUp: 0, critUp: 0, taunt: 0 },
        debuffs: { atkDown: 0, defDown: 0, slow: 0, burn: 0 },
        metrics: { dealt: 0, taken: 0, healOut: 0, healIn: 0 }
      };
    });
  }

  function addLog(entry) {
    if (!battle) return;
    battle.logs.push(entry);
    if (battle.logs.length > 40) battle.logs.shift();
  }

  function getAlive(list) {
    return list.filter((u) => u.hp > 0);
  }

  function effectiveSpeed(u) {
    let s = u.spd;
    if (u.buffs.spdUp > 0) s *= 1.28;
    if (u.debuffs.slow > 0) s *= 0.74;
    if (battle && battle.activeLaw && battle.activeLaw.id === "overdrive") s *= 1.45;
    return Math.max(25, s);
  }

  function getActionOrder(count) {
    if (!battle) return [];
    const alive = [...getAlive(battle.allies), ...getAlive(battle.enemies)];
    if (!alive.length) return [];
    const sim = alive.map((u) => ({ unit: u, atb: u.atb, spd: effectiveSpeed(u) }));
    const out = [];
    for (let k = 0; k < (count || 6); k++) {
      let best = null;
      let minT = Infinity;
      sim.forEach((s) => {
        const t = Math.max(0, 100 - s.atb) / s.spd;
        if (t < minT) {
          minT = t;
          best = s;
        }
      });
      if (!best) break;
      sim.forEach((s) => {
        s.atb += s.spd * minT;
      });
      best.atb -= 100;
      out.push(best.unit);
    }
    return out;
  }

  function addChaos(amount, actor) {
    if (!battle) return;
    let mult = 1 + (actor ? (actor.chaosPct || 0) / 100 : 0);
    if (actor && actor.exUnlocked && actor.charId === "n_dra_mac_dlr") mult *= 2;
    if (battle.activeLaw && battle.activeLaw.id === "overdrive") mult *= 1.25;
    battle.chaos = Math.min(100, battle.chaos + amount * mult);
    if (battle.chaos >= 100 && !battle.burstReady) {
      battle.burstReady = true;
      triggerRandomChaosLaw();
    }
  }

  function triggerRandomChaosLaw(forceLawId) {
    if (!battle) return;
    const list = HS.CONST.CHAOS_LAWS;
    const chosen = forceLawId
      ? list.find((l) => l.id === forceLawId) || list[0]
      : list[Math.floor(Math.random() * list.length)];
    const hasParadox = battle.allies.some((a) => a.hp > 0 && a.exUnlocked && a.charId === "n_fai_sup");
    battle.activeLaw = chosen;
    battle.lawTurns = 6 + (hasParadox ? 2 : 0);
    battle.saveRef.stats.chaosTriggered = (battle.saveRef.stats.chaosTriggered || 0) + 1;
    addLog({ kind: "sys", text: `【混沌法則】${chosen.name} 発動！` });
    if (HS.FX) HS.FX.spawnChaosFlash(chosen.color, "混沌法則：" + chosen.name);
    if (HS.AUDIO) HS.AUDIO.chaos();
  }

  function applyDamage(attacker, target, multPower, skill, isExtra) {
    if (!target || target.hp <= 0) return 0;
    const lawId = battle.activeLaw ? battle.activeLaw.id : null;

    let atkVal = attacker.atk;
    if (attacker.buffs.atkUp > 0) atkVal *= 1.3;
    if (attacker.debuffs.atkDown > 0) atkVal *= 0.75;

    let defVal = target.def;
    if (target.buffs.defUp > 0) defVal *= 1.3;
    if (target.debuffs.defDown > 0) defVal *= 0.72;
    if (skill && skill.ignoreDef) defVal *= 1 - skill.ignoreDef;

    const rawBase = atkVal * multPower * (100 / (100 + defVal * 0.92));
    const elem = HS.CONST.getElementMult(attacker.element, target.element, lawId);

    let dmg = rawBase * elem.mult;

    // Exclusive weapon & situational bonuses
    if (attacker.exUnlocked && attacker.charId === "f_hum_dra_dlr" && target.debuffs.burn > 0) dmg *= 1.35;
    if (attacker.exUnlocked && attacker.charId === "w_dem_dlr" && target.debuffs.defDown > 0) dmg *= 1.3;
    if (attacker.exUnlocked && attacker.charId === "l_dra_dlr" && attacker.hp >= attacker.maxHp * 0.7) dmg *= 1.25;
    if (attacker.exUnlocked && attacker.charId === "n_hum_dlr" && battle.activeLaw) dmg *= 1.3;
    if (skill && skill.execute && target.hp < target.maxHp * 0.45) dmg *= 1.5;

    const hasLokiAlly = attacker.side === "ally" && battle.allies.some((a) => a.hp > 0 && a.exUnlocked && a.charId === "d_dem_fai_sup");
    if (hasLokiAlly && (target.debuffs.defDown > 0 || target.debuffs.atkDown > 0 || target.debuffs.burn > 0 || target.debuffs.slow > 0)) {
      dmg *= 1.18;
    }

    if (lawId === "glass_war") dmg *= 1.35;
    if (target.exUnlocked && target.charId === "g_mac_tank" && target.shield > 0) dmg *= 0.8;

    // Crit roll
    let critChance = attacker.crit + (skill && skill.critBonus ? skill.critBonus : 0);
    if (attacker.buffs.critUp > 0) critChance += 25;
    if (lawId === "crit_storm") critChance += 45;
    const isCrit = Math.random() * 100 < critChance;
    if (isCrit) {
      let cd = attacker.cdmg;
      if (attacker.exUnlocked && attacker.charId === "d_hum_dem_dlr") cd += 40;
      if (lawId === "crit_storm") cd += 40;
      dmg *= cd / 100;
      if (attacker.exUnlocked && attacker.charId === "g_dra_fai_dlr") {
        attacker.atb = Math.min(100, attacker.atb + 15);
      }
    }

    dmg = Math.max(1, Math.round(dmg * (0.94 + Math.random() * 0.12)));

    // Shield absorption
    let remain = dmg;
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, remain);
      target.shield -= absorbed;
      remain -= absorbed;
    }
    target.hp = Math.max(0, target.hp - remain);

    // Metrics
    attacker.metrics.dealt += dmg;
    target.metrics.taken += dmg;
    if (attacker.side === "ally" && dmg > (battle.saveRef.stats.maxSingleDamage || 0)) {
      battle.saveRef.stats.maxSingleDamage = dmg;
    }

    // Tank role ability: gain chaos on hit
    if (target.role === "tank" && target.hp > 0) {
      addChaos(target.exUnlocked && target.charId === "d_dem_mac_tank" ? 11 : 5, target);
      if (target.exUnlocked && target.charId === "f_hum_tank") attacker.debuffs.burn = Math.max(attacker.debuffs.burn, 2);
      if (target.exUnlocked && target.charId === "w_dra_tank") attacker.debuffs.slow = Math.max(attacker.debuffs.slow, 2);
      if (target.exUnlocked && target.charId === "d_dem_mac_tank") applyHeal(target, target, Math.round(target.maxHp * 0.05), "冥鋼再生");
    }

    // Dragon synergy burn on hit
    if (attacker.side === "ally" && battle.synMods.burnOnHit && Math.random() < 0.28) {
      target.debuffs.burn = Math.max(target.debuffs.burn, 2);
    }

    // Reverse HP Chaos law
    if (lawId === "reverse_hp" && target.hp > 0) {
      applyHeal(target, target, Math.round(target.maxHp * 0.06), "反転祝福");
    }

    // Vamp heal
    let vamp = (attacker.vampAdd || 0) / 100 + (skill && skill.vamp ? skill.vamp : 0);
    if (lawId === "vamp_feast") vamp += 0.22;
    if (vamp > 0 && attacker.hp > 0) {
      applyHeal(attacker, attacker, Math.round(dmg * vamp), "吸収");
    }

    // FX + Log
    const elColor = (HS.CONST.ELEMENT_MAP[attacker.element] || HS.CONST.ELEMENT_MAP.none).color;
    const tag = isCrit ? "CRIT!" : elem.label === "weak" ? "WEAK!" : elem.label === "resist" ? "RESIST" : "";
    if (HS.FX) HS.FX.spawnHit("bu_" + attacker.uid, "bu_" + target.uid, elColor, HS.CONST.fmtNum(dmg), isCrit, tag);
    if (HS.AUDIO) HS.AUDIO.hit(isCrit);

    const uel = document.getElementById("bu_" + target.uid);
    if (uel) {
      uel.classList.remove("hit-flash");
      void uel.offsetWidth;
      uel.classList.add("hit-flash");
    }
    if (isCrit && battle.shakeCb) battle.shakeCb();

    addLog({
      kind: isCrit ? "crit" : "dmg",
      actorSide: attacker.side,
      actor: attacker.name,
      target: target.name,
      action: isExtra ? "追撃" : (skill ? skill.name : "攻撃"),
      val: HS.CONST.fmtNum(dmg) + (isCrit ? "!" : "")
    });

    // Dealer kill acceleration
    if (target.hp <= 0 && attacker.role === "dealer") {
      attacker.atb = Math.min(100, attacker.atb + 35);
    }

    return dmg;
  }

  function applyHeal(healer, target, rawAmt, label) {
    if (!target || target.hp <= 0) return 0;
    const mult = 1 + (healer ? (healer.healPct || 0) / 100 : 0);
    const amount = Math.max(1, Math.round(rawAmt * mult));
    const missing = target.maxHp - target.hp;
    const actual = Math.min(missing, amount);
    const over = Math.max(0, amount - actual);
    target.hp += actual;

    // Healer role ability: convert overheal to shield & cleanse 1 debuff
    if (healer && healer.role === "healer") {
      if (over > 0) {
        const ratio = healer.exUnlocked && healer.charId === "n_mac_hlr" ? 1.5 : 1.0;
        target.shield = Math.min(target.maxHp, target.shield + Math.round(over * ratio));
      }
      cleanseOne(target);
      if (healer.exUnlocked && healer.charId === "w_hum_fai_hlr") target.atb = Math.min(100, target.atb + 10);
      if (healer.exUnlocked && healer.charId === "g_fai_mac_hlr") target.buffs.defUp = Math.max(target.buffs.defUp, 1);
    }

    if (healer) healer.metrics.healOut += amount;
    target.metrics.healIn += amount;

    if (HS.FX) HS.FX.spawnHeal("bu_" + target.uid, HS.CONST.fmtNum(amount));
    if (HS.AUDIO) HS.AUDIO.heal();

    addLog({
      kind: "heal",
      actorSide: healer ? healer.side : target.side,
      actor: healer ? healer.name : target.name,
      target: target.name,
      action: label || "回復",
      val: "+" + HS.CONST.fmtNum(amount)
    });
    return amount;
  }

  function cleanseOne(u) {
    for (const k of ["burn", "defDown", "atkDown", "slow"]) {
      if (u.debuffs[k] > 0) {
        u.debuffs[k] = 0;
        return;
      }
    }
  }

  function pickEnemyTarget(enemies) {
    const alive = getAlive(enemies);
    if (!alive.length) return null;
    if (battle && battle.selectedTargetUid) {
      const sel = alive.find((e) => e.uid === battle.selectedTargetUid);
      if (sel) return sel;
    }
    const taunts = alive.filter((e) => e.buffs.taunt > 0);
    if (taunts.length) return taunts[0];
    return alive[0];
  }

  function pickAllyTargetForEnemy(allies) {
    const alive = getAlive(allies);
    if (!alive.length) return null;
    const taunts = alive.filter((a) => a.buffs.taunt > 0);
    if (taunts.length) return taunts[Math.floor(Math.random() * taunts.length)];
    // Tank passive higher aggro weight
    const weights = alive.map((a) => (a.role === "tank" ? 3.2 : 1.0));
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < alive.length; i++) {
      r -= weights[i];
      if (r <= 0) return alive[i];
    }
    return alive[0];
  }

  function tickStatusStart(u) {
    if (u.debuffs.burn > 0 && u.hp > 0) {
      const burnDmg = Math.max(1, Math.round(u.maxHp * 0.055));
      u.hp = Math.max(1, u.hp - burnDmg);
      u.metrics.taken += burnDmg;
      addLog({ kind: "dmg", actorSide: u.side === "ally" ? "enemy" : "ally", actor: "火傷", target: u.name, action: "継続焼損", val: HS.CONST.fmtNum(burnDmg) });
    }
    for (const k of Object.keys(u.buffs)) if (u.buffs[k] > 0) u.buffs[k]--;
    for (const k of Object.keys(u.debuffs)) if (u.debuffs[k] > 0) u.debuffs[k]--;
    for (let i = 0; i < u.cds.length; i++) if (u.cds[i] > 0) u.cds[i]--;
  }

  function executeSkill(actor, skillIdx, forcedTarget) {
    if (!battle || actor.hp <= 0) return;
    const skill = actor.skills[skillIdx] || actor.skills[0];
    actor.cds[skillIdx] = skill.ct || 0;

    const myTeam = actor.side === "ally" ? battle.allies : battle.enemies;
    const oppTeam = actor.side === "ally" ? battle.enemies : battle.allies;
    const aliveAllies = getAlive(myTeam);
    const aliveOpps = getAlive(oppTeam);
    const buffBonus = actor.role === "supporter" ? 1 : 0;

    if (skill.chaos) addChaos(skill.chaos, actor);

    // Attack skills
    if (skill.kind === "atk" && aliveOpps.length) {
      if (skill.target === "all") {
        aliveOpps.forEach((t) => {
          applyDamage(actor, t, skill.power, skill, false);
          applyDebuffsFromSkill(t, skill);
        });
      } else if (skill.target === "multi") {
        const hits = skill.hits || 3;
        for (let h = 0; h < hits; h++) {
          const pool = getAlive(oppTeam);
          if (!pool.length) break;
          const t = pool[Math.floor(Math.random() * pool.length)];
          applyDamage(actor, t, skill.power, skill, false);
          applyDebuffsFromSkill(t, skill);
        }
      } else {
        const t = forcedTarget && forcedTarget.hp > 0
          ? forcedTarget
          : actor.side === "ally"
          ? pickEnemyTarget(oppTeam)
          : pickAllyTargetForEnemy(oppTeam);
        if (t) {
          applyDamage(actor, t, skill.power, skill, false);
          applyDebuffsFromSkill(t, skill);
          // Exclusive weapon extra shockwave for Magma Tyrant
          if (actor.exUnlocked && actor.charId === "f_dra_dem_dlr" && skillIdx === 2) {
            getAlive(oppTeam).forEach((ot) => applyDamage(actor, ot, 0.8, { name: "火山余波" }, true));
          }
        }
      }

      // Dealer passive 25% follow-up attack
      if (actor.role === "dealer" && Math.random() < 0.25) {
        const rem = getAlive(oppTeam);
        if (rem.length) {
          applyDamage(actor, rem[Math.floor(Math.random() * rem.length)], 0.55, skill, true);
        }
      }
    }

    // Heal skills
    if (skill.kind === "heal") {
      if (skill.revive) {
        const dead = myTeam.find((a) => a.hp <= 0);
        if (dead) {
          dead.hp = Math.round(dead.maxHp * 0.45);
          addLog({ kind: "heal", actorSide: actor.side, actor: actor.name, target: dead.name, action: "蘇生", val: HS.CONST.fmtNum(dead.hp) });
        }
      }
      const targets = skill.target === "lowest"
        ? [aliveAllies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]].filter(Boolean)
        : getAlive(myTeam);
      targets.forEach((t) => {
        applyHeal(actor, t, actor.atk * skill.power * 1.45, skill.name);
        if (skill.cleanse) {
          for (let c = 0; c < skill.cleanse; c++) cleanseOne(t);
        }
        if (actor.exUnlocked && actor.charId === "l_fai_hlr") {
          t.buffs.critUp = Math.max(t.buffs.critUp, 2);
        }
      });
    }

    // Secondary heal effects on attack skills
    if (skill.healLowest) {
      const low = aliveAllies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (low) applyHeal(actor, low, actor.atk * skill.healLowest * 1.35, skill.name);
    }
    if (skill.healAll) {
      const bonus = actor.exUnlocked && actor.charId === "d_dem_hlr" ? 1.4 : 1.0;
      aliveAllies.forEach((a) => applyHeal(actor, a, actor.atk * skill.healAll * 1.15 * bonus, skill.name));
    }

    // Shields & Buffs
    const shieldMult = actor.exUnlocked && actor.charId === "f_hum_tank" ? 1.35 : 1.0;
    if (skill.selfShield) actor.shield = Math.min(actor.maxHp, actor.shield + Math.round(actor.maxHp * skill.selfShield * shieldMult));
    if (skill.shieldPct) {
      actor.shield = Math.min(actor.maxHp, actor.shield + Math.round(actor.maxHp * skill.shieldPct * shieldMult));
      addLog({ kind: "sys", text: `${actor.name} ▶ ${skill.name}（障壁展開）` });
    }
    if (skill.teamShield) {
      aliveAllies.forEach((a) => {
        a.shield = Math.min(a.maxHp, a.shield + Math.round(a.maxHp * skill.teamShield * shieldMult));
        if (actor.exUnlocked && actor.charId === "l_hum_mac_tank") {
          cleanseOne(a);
          cleanseOne(a);
        }
      });
      if (skill.kind === "buff") addLog({ kind: "sys", text: `${actor.name} ▶ 味方全体へ障壁展開` });
    }
    if (skill.taunt) actor.buffs.taunt = Math.max(actor.buffs.taunt, skill.taunt + buffBonus);
    if (skill.defUp) actor.buffs.defUp = Math.max(actor.buffs.defUp, skill.defUp + buffBonus);
    if (skill.spdUpSelf) actor.buffs.spdUp = Math.max(actor.buffs.spdUp, skill.spdUpSelf + buffBonus);
    if (skill.selfAtb) actor.atb = Math.min(100, actor.atb + skill.selfAtb);

    if (skill.atkUp || skill.atkUpAll || skill.defUpAll || skill.spdUp || skill.critUpAll || skill.atbBoost) {
      const boostBonus = (actor.exUnlocked && (actor.charId === "g_hum_sup" || actor.charId === "l_hum_sup")) ? 12 : 0;
      aliveAllies.forEach((a) => {
        if (skill.atkUp || skill.atkUpAll) a.buffs.atkUp = Math.max(a.buffs.atkUp, (skill.atkUp || skill.atkUpAll) + buffBonus);
        if (skill.defUpAll) a.buffs.defUp = Math.max(a.buffs.defUp, skill.defUpAll + buffBonus);
        if (skill.spdUp) a.buffs.spdUp = Math.max(a.buffs.spdUp, skill.spdUp + buffBonus);
        if (skill.critUpAll) a.buffs.critUp = Math.max(a.buffs.critUp, skill.critUpAll + buffBonus);
        if (skill.atbBoost) a.atb = Math.min(100, a.atb + skill.atbBoost + boostBonus);
      });
      if (skill.kind === "buff") {
        addLog({ kind: "sys", text: `${actor.name} ▶ 味方全体へ ${skill.name}` });
        if (actor.exUnlocked && actor.charId === "f_fai_sup") addChaos(12, actor);
      }
    }

    if (skill.triggerLaw) triggerRandomChaosLaw();

    // Supporter role ability: reduce 1 random ally CT by 1
    if (actor.role === "supporter" && aliveAllies.length) {
      const pick = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
      for (let i = 1; i < pick.cds.length; i++) if (pick.cds[i] > 0) pick.cds[i]--;
    }

    // Meteor chaos law extra strike
    if (battle.activeLaw && battle.activeLaw.id === "meteor" && actor.side === "ally") {
      const rem = getAlive(battle.enemies);
      if (rem.length) {
        const mt = rem[Math.floor(Math.random() * rem.length)];
        applyDamage(actor, mt, 0.45, { name: "カオス隕石" }, true);
      }
    }

    // Decrement chaos law turns
    if (battle.activeLaw) {
      battle.lawTurns--;
      if (battle.lawTurns <= 0) {
        battle.activeLaw = null;
      }
    }

    checkWaveOrEnd();
  }

  function applyDebuffsFromSkill(target, skill) {
    if (!target || target.hp <= 0) return;
    if (skill.burn) target.debuffs.burn = Math.max(target.debuffs.burn, skill.burn);
    if (skill.defDown) target.debuffs.defDown = Math.max(target.debuffs.defDown, skill.defDown);
    if (skill.atkDown) target.debuffs.atkDown = Math.max(target.debuffs.atkDown, skill.atkDown);
    if (skill.slow) target.debuffs.slow = Math.max(target.debuffs.slow, skill.slow);
  }

  function triggerChaosBurst() {
    if (!battle || !battle.burstReady || battle.state !== "fighting") return;
    battle.burstReady = false;
    battle.chaos = 0;

    const aliveAllies = getAlive(battle.allies);
    const aliveEnemies = getAlive(battle.enemies);
    if (!aliveAllies.length || !aliveEnemies.length) return;

    addLog({ kind: "sys", text: "★ はちゃめちゃバースト炸裂！！ ★" });
    if (HS.FX) HS.FX.spawnChaosFlash("#ff3d9a", "はちゃめちゃバースト!!");
    if (HS.AUDIO) HS.AUDIO.chaos();
    if (battle.shakeCb) battle.shakeCb();

    aliveAllies.forEach((a) => {
      const targets = getAlive(battle.enemies);
      if (!targets.length) return;
      const t = targets[Math.floor(Math.random() * targets.length)];
      applyDamage(a, t, 1.65, { name: "混沌連鎖", critBonus: 30, ignoreDef: 0.25 }, false);
      applyHeal(a, a, Math.round(a.maxHp * 0.14), "混沌覚醒");
      a.buffs.atkUp = Math.max(a.buffs.atkUp, 2);
      a.atb = Math.min(100, a.atb + 20);
    });

    checkWaveOrEnd();
    if (onUpdateCb) onUpdateCb(battle);
  }

  function chooseAiSkill(actor) {
    if (actor.side === "enemy") {
      if (actor.skills.length > 1 && actor.cds[1] === 0) return 1;
      return 0;
    }
    // Ally AI: prioritize heal when team HP < 72%, else skill 2 (ult) -> skill 1 -> skill 0
    const allies = getAlive(battle.allies);
    const hurt = allies.some((a) => a.hp / a.maxHp < 0.72);
    if (actor.role === "healer" && hurt) {
      if (actor.cds[2] === 0 && actor.skills[2].kind === "heal") return 2;
      if (actor.cds[1] === 0 && actor.skills[1].kind === "heal") return 1;
    }
    if (actor.cds[2] === 0) return 2;
    if (actor.cds[1] === 0) return 1;
    return 0;
  }

  function checkWaveOrEnd() {
    if (!battle || battle.state !== "fighting") return;
    const aliveAllies = getAlive(battle.allies);
    const aliveEnemies = getAlive(battle.enemies);

    if (!aliveAllies.length) {
      finishBattle(false);
      return;
    }

    if (!aliveEnemies.length) {
      if (battle.waveIdx + 1 < battle.stage.waves.length) {
        battle.waveIdx += 1;
        battle.enemies = makeEnemyWave(battle.stage, battle.waveIdx);
        battle.selectedTargetUid = battle.enemies[0] ? battle.enemies[0].uid : null;
        addLog({ kind: "sys", text: `── WAVE ${battle.waveIdx + 1}/${battle.stage.waves.length} 突入 ──` });
        aliveAllies.forEach((a) => {
          a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * 0.12));
        });
      } else {
        finishBattle(true);
      }
    }
  }

  function finishBattle(isWin) {
    stopTimers();
    battle.state = battle.isLoopMode ? "result_loop" : "result_normal";
    battle.won = isWin;
    battle.waitingActor = null;

    const save = battle.saveRef;
    save.stats.totalBattles = (save.stats.totalBattles || 0) + 1;

    const result = {
      won: isWin,
      elapsed: Math.max(0.5, battle.elapsed),
      gold: 0,
      exp: 0,
      crystal: 0,
      core: 0,
      firstClear: false,
      drops: [],
      autoSoldCount: 0,
      autoSoldGold: 0,
      levelUps: []
    };

    if (isWin) {
      save.stats.totalWins = (save.stats.totalWins || 0) + 1;
      const rw = battle.stage.rewards;
      const firstClear = !save.clearedStages[battle.stage.id];
      if (firstClear) {
        save.clearedStages[battle.stage.id] = true;
        result.firstClear = true;
      }
      if (battle.stage.mode === "abyss") {
        if (battle.stage.floor >= save.abyssMaxFloor) {
          save.abyssMaxFloor = battle.stage.floor + 1;
        }
        save.abyssCurrentFloor = battle.stage.floor + 1;
      }

      result.gold = rw.gold + (firstClear ? Math.round(rw.gold * 0.8) : 0);
      result.exp = rw.exp;
      result.crystal = rw.crystal + (firstClear ? 15 : 0);
      result.core = rw.core + (firstClear ? 2 : 0);

      save.gold += result.gold;
      save.crystal += result.crystal;
      save.core += result.core;

      // Grant EXP to party members
      battle.allies.forEach((a) => {
        const prog = save.chars[a.charId];
        if (!prog) return;
        prog.exp = (prog.exp || 0) + result.exp;
        let need = prog.level * 120;
        let gained = 0;
        while (prog.exp >= need && prog.level < 99) {
          prog.exp -= need;
          prog.level += 1;
          gained += 1;
          need = prog.level * 120;
        }
        if (gained > 0) result.levelUps.push({ name: a.name, level: prog.level });
      });

      // Generate equipment drops & apply auto-sell rule
      for (let i = 0; i < rw.equipCount; i++) {
        const eq = HS.EQUIP.generateEquip(rw.minTier, battle.stage.scale);
        if (HS.EQUIP.shouldAutoSell(eq, save)) {
          const val = HS.EQUIP.getSellValue(eq);
          save.gold += val;
          save.shards = (save.shards || 0) + 1;
          save.stats.totalAutoSold = (save.stats.totalAutoSold || 0) + 1;
          result.autoSoldCount += 1;
          result.autoSoldGold += val;
          result.drops.push({ eq, autoSold: true, sellVal: val });
        } else {
          save.inventory.unshift(eq);
          result.drops.push({ eq, autoSold: false, sellVal: 0 });
        }
      }
      // Keep inventory capped reasonably (auto-trim unlocked lowest if > 160)
      if (save.inventory.length > 160) {
        save.inventory = save.inventory.slice(0, 160);
      }

      if (HS.AUDIO) HS.AUDIO.win();
    } else {
      if (HS.AUDIO) HS.AUDIO.lose();
    }

    battle.result = result;

    // Update loop session if in auto-loop mode
    if (battle.isLoopMode) {
      if (!loopSession || loopSession.stageId !== battle.stage.id) {
        resetLoopSession(battle.stage.id);
      }
      loopSession.runs += 1;
      if (isWin) loopSession.wins += 1;
      else loopSession.losses += 1;
      loopSession.totalGold += result.gold;
      loopSession.totalExp += result.exp;
      loopSession.totalCrystal += result.crystal;
      loopSession.totalCore += result.core;
      loopSession.autoSoldCount += result.autoSoldCount;
      loopSession.autoSoldGold += result.autoSoldGold;
      loopSession.totalElapsed += result.elapsed;

      result.drops.forEach((d) => {
        if (!d.autoSold) {
          loopSession.keptEquips.unshift(d.eq);
          if (loopSession.keptEquips.length > 12) loopSession.keptEquips.pop();
        }
      });

      battle.allies.forEach((a) => {
        if (!loopSession.metricsByChar[a.charId]) {
          loopSession.metricsByChar[a.charId] = { name: a.name, element: a.element, dealt: 0, taken: 0, healOut: 0, healIn: 0 };
        }
        const m = loopSession.metricsByChar[a.charId];
        m.dealt += a.metrics.dealt;
        m.taken += a.metrics.taken;
        m.healOut += a.metrics.healOut;
        m.healIn += a.metrics.healIn;
      });

      if (!isWin) {
        loopSession.paused = true;
        loopSession.countdown = 0;
      } else {
        loopSession.paused = false;
        loopSession.countdown = 2.0;
        startLoopCountdown();
      }
    }

    HS.STORAGE.save(save);
    if (onUpdateCb) onUpdateCb(battle);
  }

  function startLoopCountdown() {
    if (loopCountdownTimer) clearInterval(loopCountdownTimer);
    loopCountdownTimer = setInterval(() => {
      if (!battle || battle.state !== "result_loop" || !loopSession) {
        clearInterval(loopCountdownTimer);
        loopCountdownTimer = null;
        return;
      }
      if (loopSession.paused) return;
      loopSession.countdown = Math.max(0, +(loopSession.countdown - 0.1).toFixed(1));
      if (onUpdateCb) onUpdateCb(battle);
      if (loopSession.countdown <= 0) {
        clearInterval(loopCountdownTimer);
        loopCountdownTimer = null;
        const nextStageId =
          battle.stage.mode === "abyss" && battle.won
            ? "abyss_" + (battle.stage.floor + 1)
            : battle.stage.id;
        start(nextStageId, battle.saveRef, true, onUpdateCb, battle.shakeCb);
      }
    }, 100);
  }

  function stepTick() {
    if (!battle || battle.state !== "fighting") return;
    if (battle.waitingActor) return; // Waiting for manual skill input

    const speed = Math.min(3, Math.max(1, battle.saveRef.settings.speed || 1));
    const dt = 0.08 * speed;
    battle.elapsed += dt;

    // Auto burst if autoBattle is enabled
    if (battle.burstReady && battle.saveRef.settings.autoBattle) {
      triggerChaosBurst();
      if (battle.state !== "fighting") return;
    }

    const allAlive = [...getAlive(battle.allies), ...getAlive(battle.enemies)];
    let readyUnit = null;

    for (let i = 0; i < allAlive.length; i++) {
      const u = allAlive[i];
      u.atb += effectiveSpeed(u) * dt * 0.42;
      if (u.atb >= 100 && (!readyUnit || u.atb > readyUnit.atb)) {
        readyUnit = u;
      }
    }

    if (readyUnit) {
      readyUnit.atb -= 100;
      battle.actingUid = readyUnit.uid;
      tickStatusStart(readyUnit);

      if (readyUnit.side === "ally" && !battle.saveRef.settings.autoBattle) {
        battle.waitingActor = readyUnit;
        if (onUpdateCb) onUpdateCb(battle);
        return;
      }

      const skIdx = chooseAiSkill(readyUnit);
      executeSkill(readyUnit, skIdx, null);
    }

    if (onUpdateCb) onUpdateCb(battle);
  }

  function manualUseSkill(skillIdx, targetUid) {
    if (!battle || battle.state !== "fighting" || !battle.waitingActor) return;
    const actor = battle.waitingActor;
    if (actor.cds[skillIdx] > 0) return;
    const forced = targetUid ? battle.enemies.find((e) => e.uid === targetUid && e.hp > 0) : null;
    battle.waitingActor = null;
    executeSkill(actor, skillIdx, forced);
    if (onUpdateCb) onUpdateCb(battle);
  }

  function stopTimers() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    if (loopCountdownTimer) {
      clearInterval(loopCountdownTimer);
      loopCountdownTimer = null;
    }
  }

  function start(stageId, save, isLoop, updateCb, shakeCb) {
    stopTimers();
    onUpdateCb = updateCb;
    const stage = HS.STAGES.getStageById(stageId);
    const partyDefs = save.party.map((cid) => (cid ? HS.CHARS.get(cid) : null)).filter(Boolean);
    if (!partyDefs.length) return null;

    const syn = HS.CONST.calcPartySynergies(partyDefs);
    const allies = [];
    save.party.forEach((cid, idx) => {
      if (cid) allies.push(makeAllyUnit(cid, idx, save, syn.mods));
    });

    if (isLoop && (!loopSession || loopSession.stageId !== stage.id && stage.mode !== "abyss")) {
      resetLoopSession(stage.id);
    } else if (!isLoop) {
      loopSession = null;
    }

    const enemies = makeEnemyWave(stage, 0);
    const initLaw = stage.fixedLaw
      ? HS.CONST.CHAOS_LAWS.find((l) => l.id === stage.fixedLaw) || null
      : null;

    battle = {
      state: "fighting",
      stage,
      waveIdx: 0,
      allies,
      enemies,
      synMods: syn.mods,
      chaos: 15,
      burstReady: false,
      activeLaw: initLaw,
      lawTurns: initLaw ? 99 : 0,
      actingUid: null,
      waitingActor: null,
      selectedTargetUid: enemies[0] ? enemies[0].uid : null,
      logs: [{ kind: "sys", text: `戦闘開始：${stage.name}（WAVE 1/${stage.waves.length}）` }],
      elapsed: 0,
      isLoopMode: !!isLoop,
      won: false,
      result: null,
      saveRef: save,
      shakeCb: shakeCb || null
    };

    if (initLaw) {
      addLog({ kind: "sys", text: `【領域法則】${initLaw.name} が支配中` });
    }

    tickTimer = setInterval(stepTick, 80);
    if (onUpdateCb) onUpdateCb(battle);
    return battle;
  }

  function retreat() {
    stopTimers();
    battle = null;
    loopSession = null;
    if (HS.FX) HS.FX.detach();
  }

  function toggleLoopPause() {
    if (!loopSession) return;
    loopSession.paused = !loopSession.paused;
    if (!loopSession.paused && loopSession.countdown <= 0 && battle && battle.won) {
      loopSession.countdown = 1.2;
      startLoopCountdown();
    }
    if (onUpdateCb) onUpdateCb(battle);
  }

  function setTarget(uid) {
    if (!battle) return;
    battle.selectedTargetUid = uid;
    if (onUpdateCb) onUpdateCb(battle);
  }

  function setAutoMode(flag) {
    if (!battle) return;
    battle.saveRef.settings.autoBattle = !!flag;
    HS.STORAGE.save(battle.saveRef);
    if (flag && battle.waitingActor) {
      const actor = battle.waitingActor;
      battle.waitingActor = null;
      executeSkill(actor, chooseAiSkill(actor), null);
    }
    if (onUpdateCb) onUpdateCb(battle);
  }

  function cycleSpeed() {
    if (!battle) return;
    const cur = battle.saveRef.settings.speed || 1;
    battle.saveRef.settings.speed = cur >= 3 ? 1 : cur + 1;
    HS.STORAGE.save(battle.saveRef);
    if (onUpdateCb) onUpdateCb(battle);
  }

  function toggleLoopDuringBattle() {
    if (!battle) return;
    battle.isLoopMode = !battle.isLoopMode;
    battle.saveRef.settings.autoLoop = battle.isLoopMode;
    if (battle.isLoopMode && !loopSession) resetLoopSession(battle.stage.id);
    HS.STORAGE.save(battle.saveRef);
    if (onUpdateCb) onUpdateCb(battle);
  }

  HS.BATTLE = {
    start,
    retreat,
    manualUseSkill,
    triggerChaosBurst,
    setTarget,
    setAutoMode,
    cycleSpeed,
    toggleLoopDuringBattle,
    toggleLoopPause,
    getActionOrder,
    getCurrent: () => battle,
    getLoopSession: () => loopSession
  };
})(window);
