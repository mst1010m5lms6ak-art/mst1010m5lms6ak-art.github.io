import { CHAOS_LAWS, getElementMultiplier } from '../data/constants';
import { UNIT_MAP } from '../data/units';
import type {
  BattleActor,
  BattleFxEvent,
  BattleLogEntry,
  BattleState,
  DpsEntry,
  EnemyTemplate,
  FloatingNumber,
  RepeatSessionSummary,
  SaveData,
  SkillDef,
  StageDef
} from '../types/game';
import { computeUnitStats, getPartySynergies } from './stats';

let floatSeq = 1;
let fxSeq = 1;

function createAllyActors(save: SaveData): BattleActor[] {
  const invMap = Object.fromEntries(save.inventory.map((i) => [i.uid, i]));
  const syns = getPartySynergies(save.party);
  const machineTier = syns.find((s) => s.race === 'machine')?.tier ?? 0;

  const list: BattleActor[] = [];
  save.party.forEach((uid, slotIndex) => {
    if (!uid) return;
    const def = UNIT_MAP[uid];
    const owned = save.ownedUnits[uid];
    if (!def || !owned) return;
    const stats = computeUnitStats(uid, owned, invMap, syns);
    const startShield =
      (machineTier === 3 ? Math.round(stats.maxHp * 0.16) : 0) +
      (owned.sigUnlocked && def.signatureWeapon.passiveKey === 'iron_fortress' ? Math.round(stats.maxHp * 0.15) : 0);

    list.push({
      instanceId: `ally_${slotIndex}_${uid}`,
      sourceId: uid,
      side: 'ally',
      slotIndex,
      name: def.name,
      title: def.title,
      element: def.element,
      races: def.races,
      role: def.role,
      maxHp: stats.maxHp,
      hp: stats.maxHp,
      shield: startShield,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      crit: stats.crit,
      chaosRate: stats.chaosRate,
      sigActive: stats.sigActive,
      sigPassiveKey: owned.sigUnlocked ? def.signatureWeapon.passiveKey : undefined,
      sigLevel: owned.sigLevel,
      gauge: 15 + Math.round(stats.spd * 0.12),
      cooldowns: [0, 0, 0],
      skills: def.skills,
      statuses: [],
      dealerStacks: 0,
      alive: true,
      animState: 'idle',
      animNonce: 0
    });
  });

  // 全味方へ開幕シールド（iron_fortress専用武器が味方にいる場合）
  const hasFortress = list.some((a) => a.sigPassiveKey === 'iron_fortress');
  if (hasFortress) {
    for (const ally of list) {
      ally.shield += Math.round(ally.maxHp * 0.1);
    }
  }
  return list;
}

function createEnemyActors(templates: EnemyTemplate[], waveIndex: number): BattleActor[] {
  return templates.map((tpl, idx) => ({
    instanceId: `enemy_w${waveIndex}_${idx}_${tpl.id}`,
    sourceId: tpl.id,
    side: 'enemy',
    slotIndex: idx,
    name: tpl.name,
    title: tpl.isBoss ? 'BOSS' : '',
    element: tpl.element,
    races: tpl.races,
    role: tpl.role,
    isBoss: tpl.isBoss,
    maxHp: tpl.hp,
    hp: tpl.hp,
    shield: 0,
    atk: tpl.atk,
    def: tpl.def,
    spd: tpl.spd,
    crit: tpl.isBoss ? 14 : 8,
    chaosRate: 100,
    sigActive: false,
    sigLevel: 0,
    gauge: 10 + idx * 7,
    cooldowns: [0, 0, 0],
    skills: tpl.skills,
    statuses: [],
    dealerStacks: 0,
    alive: true,
    animState: 'idle',
    animNonce: 0
  }));
}

export function createBattleState(
  stage: StageDef,
  save: SaveData,
  options?: {
    autoRepeat?: boolean;
    repeatSession?: RepeatSessionSummary | null;
    towerFloor?: number;
    speed?: BattleState['speed'];
    autoBattle?: boolean;
  }
): BattleState {
  const allies = createAllyActors(save);
  const enemies = createEnemyActors(stage.waves[0], 0);
  const dps: Record<string, DpsEntry> = {};
  for (const a of allies) {
    dps[a.instanceId] = {
      actorId: a.instanceId,
      name: a.name,
      element: a.element,
      role: a.role,
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      healingReceived: 0
    };
  }

  return {
    stageId: stage.id,
    stageName: stage.name,
    stageCategory: stage.category,
    towerFloor: options?.towerFloor,
    waveIndex: 0,
    totalWaves: stage.waves.length,
    actors: [...allies, ...enemies],
    activeActorId: null,
    waitingManual: false,
    selectedSkillIndex: 0,
    selectedTargetId: enemies[0]?.instanceId ?? null,
    chaosGauge: 15,
    chaosOrbReady: false,
    activeLaw: null,
    turnCount: 0,
    elapsedSec: 0,
    speed: options?.speed ?? save.settings.defaultSpeed,
    autoBattle: options?.autoBattle ?? save.settings.defaultAuto,
    autoRepeat: options?.autoRepeat ?? false,
    logs: [
      {
        id: 1,
        text: `【${stage.name}】W1/${stage.waves.length} 戦闘開始！`,
        tone: 'system'
      }
    ],
    nextLogId: 2,
    dps,
    floatingNumbers: [],
    fxEvents: [],
    phase: 'running',
    lastReward: null,
    repeatSession: options?.repeatSession ?? null,
    repeatCountdown: null,
    showRepeatFinal: false
  };
}

export function getEffectiveSpeed(actor: BattleActor, activeLawId?: string): number {
  let mult = 1;
  for (const st of actor.statuses) {
    if (st.id === 'spd_up') mult += st.power;
  }
  if (activeLawId === 'gravity_bug') {
    mult *= actor.side === 'ally' ? 1.32 : 1.15;
  }
  return Math.max(40, Math.round(actor.spd * mult));
}

export interface TimelineSlot {
  actorId: string;
  name: string;
  side: 'ally' | 'enemy';
  element: BattleActor['element'];
  role: BattleActor['role'];
  isActive: boolean;
  isBoss?: boolean;
}

export function predictTimeline(state: BattleState, count = 8): TimelineSlot[] {
  const living = state.actors.filter((a) => a.alive);
  if (living.length === 0) return [];

  const sim = living.map((a) => ({
    actor: a,
    gauge: a.gauge,
    spd: getEffectiveSpeed(a, state.activeLaw?.id)
  }));

  const out: TimelineSlot[] = [];

  if (state.activeActorId) {
    const cur = living.find((a) => a.instanceId === state.activeActorId);
    if (cur) {
      out.push({
        actorId: cur.instanceId,
        name: cur.name,
        side: cur.side,
        element: cur.element,
        role: cur.role,
        isActive: true,
        isBoss: cur.isBoss
      });
    }
  }

  while (out.length < count) {
    let bestIdx = 0;
    let bestTime = Infinity;
    for (let i = 0; i < sim.length; i++) {
      const rem = Math.max(0, 100 - sim[i].gauge);
      const t = rem / sim[i].spd;
      if (t < bestTime) {
        bestTime = t;
        bestIdx = i;
      }
    }
    for (let i = 0; i < sim.length; i++) {
      sim[i].gauge += sim[i].spd * bestTime;
    }
    const chosen = sim[bestIdx];
    chosen.gauge = Math.max(0, chosen.gauge - 100);
    out.push({
      actorId: chosen.actor.instanceId,
      name: chosen.actor.name,
      side: chosen.actor.side,
      element: chosen.actor.element,
      role: chosen.actor.role,
      isActive: false,
      isBoss: chosen.actor.isBoss
    });
  }
  return out;
}

function pushLog(state: BattleState, text: string, tone: BattleLogEntry['tone']): void {
  const entry: BattleLogEntry = {
    id: state.nextLogId++,
    text,
    tone
  };
  state.logs = [...state.logs.slice(-4), entry];
}

function pushFloat(state: BattleState, targetId: string, text: string, kind: FloatingNumber['kind']): void {
  state.floatingNumbers = [...state.floatingNumbers.slice(-14), { id: floatSeq++, targetId, text, kind }];
}

function pushFx(state: BattleState, fx: Omit<BattleFxEvent, 'id'>): void {
  state.fxEvents = [...state.fxEvents.slice(-8), { id: fxSeq++, ...fx }];
}

function addStatus(actor: BattleActor, id: BattleActor['statuses'][number]['id'], turns: number, power: number): void {
  const existing = actor.statuses.find((s) => s.id === id);
  if (existing) {
    existing.turns = Math.max(existing.turns, turns);
    existing.power = Math.max(existing.power, power);
  } else {
    actor.statuses.push({ id, turns, power });
  }
}

function getEffectiveAtk(actor: BattleActor): number {
  let mult = 1;
  for (const s of actor.statuses) {
    if (s.id === 'atk_up') mult += s.power;
    if (s.id === 'atk_down') mult -= s.power;
  }
  if (actor.role === 'dealer') {
    mult += Math.min(0.3, actor.dealerStacks * 0.06);
  }
  return Math.max(20, Math.round(actor.atk * Math.max(0.45, mult)));
}

function getEffectiveDef(actor: BattleActor): number {
  let mult = 1;
  for (const s of actor.statuses) {
    if (s.id === 'def_up') mult += s.power;
    if (s.id === 'def_down') mult -= s.power;
  }
  return Math.max(10, Math.round(actor.def * Math.max(0.35, mult)));
}

function triggerChaosIfFull(state: BattleState): boolean {
  if (state.chaosGauge < 100) return false;
  state.chaosGauge = Math.max(0, state.chaosGauge - 100);
  state.chaosOrbReady = true;

  const picked = CHAOS_LAWS[Math.floor(Math.random() * CHAOS_LAWS.length)];
  state.activeLaw = {
    ...picked,
    remainingActions: 7
  };

  pushLog(state, `★混沌法則【${picked.name}】発動！オーブ装填`, 'chaos');
  pushFx(state, { kind: 'chaos', element: 'none', targetSide: 'all' });

  if (picked.id === 'timeline_jam') {
    for (const a of state.actors) {
      if (a.alive && a.side === 'ally') {
        a.gauge = Math.min(100, a.gauge + 40);
      }
    }
  }
  return true;
}

function addChaosGauge(state: BattleState, actor: BattleActor, amount: number): boolean {
  const scaled = Math.round(amount * (actor.chaosRate / 100));
  state.chaosGauge = Math.min(140, state.chaosGauge + scaled);
  return triggerChaosIfFull(state);
}

function applyDamage(
  state: BattleState,
  attacker: BattleActor,
  target: BattleActor,
  ratio: number,
  options?: { isSkill3?: boolean; allowExtra?: boolean; labelOverride?: string }
): { dealt: number; crit: boolean; weak: boolean } {
  if (!target.alive) return { dealt: 0, crit: false, weak: false };
  const atkVal = getEffectiveAtk(attacker);
  const defVal = getEffectiveDef(target);
  const mitigation = 140 / (140 + defVal);
  const { mult: rawElMult, relation } = getElementMultiplier(attacker.element, target.element);
  let elMult = rawElMult;
  if (relation === 'weak' && state.activeLaw?.id === 'element_scramble') {
    elMult = 2.1;
  }

  let skillMult = ratio;
  if (options?.isSkill3 && attacker.sigPassiveKey === 'skill3_amp') {
    skillMult *= 1.4;
    if (state.activeLaw) skillMult *= 1.15;
  }

  const lawCritForce = state.activeLaw?.id === 'crit_inflation';
  const isCrit = lawCritForce || Math.random() * 100 < attacker.crit;
  const critMult = isCrit ? (lawCritForce ? 1.75 : 1.5) : 1.0;

  let dmg = atkVal * 1.45 * skillMult * mitigation * elMult * critMult * (0.94 + Math.random() * 0.12);

  // タンク被ダメ軽減アビリティ
  if (target.role === 'tank') {
    dmg *= 0.8;
  }

  const finalDmg = Math.max(1, Math.round(dmg));
  let remain = finalDmg;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remain);
    target.shield -= absorbed;
    remain -= absorbed;
  }
  target.hp = Math.max(0, target.hp - remain);
  target.animState = 'hit';
  target.animNonce++;

  if (target.hp <= 0) {
    target.alive = false;
    target.gauge = 0;
  }

  // DPS計測
  if (attacker.side === 'ally' && state.dps[attacker.instanceId]) {
    state.dps[attacker.instanceId].damageDealt += finalDmg;
  }
  if (target.side === 'ally' && state.dps[target.instanceId]) {
    state.dps[target.instanceId].damageTaken += finalDmg;
  }

  const floatKind = isCrit ? 'crit' : relation === 'weak' ? 'weak' : relation === 'resist' ? 'resist' : 'damage';
  pushFloat(
    state,
    target.instanceId,
    `${isCrit ? '!' : ''}${finalDmg}${relation === 'weak' ? '↑' : ''}`,
    floatKind
  );

  // 専用武器: break_armor
  if (attacker.sigPassiveKey === 'break_armor' && target.alive) {
    addStatus(target, 'def_down', 2, 0.18);
  }

  // 専用武器: crit_chain
  if (isCrit && attacker.sigPassiveKey === 'crit_chain' && attacker.alive) {
    attacker.gauge = Math.min(100, attacker.gauge + 20);
  }

  // タンクロールアビリティ: 被弾時に味方全体へ小シールド
  if (target.side === 'ally' && target.role === 'tank' && target.alive) {
    const teamShield = Math.round(target.maxHp * 0.045);
    for (const ally of state.actors) {
      if (ally.alive && ally.side === 'ally') {
        ally.shield = Math.min(ally.maxHp, ally.shield + teamShield);
      }
    }
  }

  // カオス法則「回復爆発」シールド反射 & 反撃系
  if (target.side === 'ally' && target.alive && attacker.alive && options?.allowExtra !== false) {
    const shouldCounter =
      target.sigPassiveKey === 'counter_burst' ||
      state.activeLaw?.id === 'mad_counter' ||
      (state.activeLaw?.id === 'overheal_boom' && target.shield > 0);
    if (shouldCounter) {
      const counterRatio = target.sigPassiveKey === 'counter_burst' ? 0.85 : 0.65;
      applyDamage(state, target, attacker, counterRatio, { allowExtra: false });
      pushLog(state, `${target.name}▶反撃！ ${attacker.name}にカウンター`, 'chaos');
      if (target.sigPassiveKey === 'counter_burst') {
        addChaosGauge(state, target, 6);
      }
    }
  }

  // ディーラーロールアビリティ: 弱点または会心時に35%追撃
  if (
    options?.allowExtra !== false &&
    attacker.role === 'dealer' &&
    attacker.alive &&
    target.alive &&
    (isCrit || relation === 'weak')
  ) {
    const extra = applyDamage(state, attacker, target, Math.max(0.35, ratio * 0.35), { allowExtra: false });
    if (extra.dealt > 0) {
      pushFloat(state, target.instanceId, `追撃${extra.dealt}`, 'chaos');
    }
  }

  return { dealt: finalDmg, crit: isCrit, weak: relation === 'weak' };
}

function applyHeal(state: BattleState, healer: BattleActor, target: BattleActor, ratio: number): number {
  if (!target.alive) return 0;
  let healMult = 1;
  if (healer.role === 'healer') healMult *= 1.25;
  if (healer.sigPassiveKey === 'overheal_wall') healMult *= 1.2;
  if (state.activeLaw?.id === 'overheal_boom') healMult *= 1.5;

  const base = getEffectiveAtk(healer) * 1.45 * ratio * healMult * (0.95 + Math.random() * 0.1);
  const amount = Math.max(1, Math.round(base));

  const missing = target.maxHp - target.hp;
  const actualHp = Math.min(missing, amount);
  const overheal = Math.max(0, amount - actualHp);
  target.hp += actualHp;
  target.animState = 'heal';
  target.animNonce++;

  // ヒーラーロールアビリティ: 超過回復をシールド変換＆弱体1つ解除
  let shieldAdded = 0;
  if (healer.role === 'healer') {
    if (overheal > 0) {
      const conv = healer.sigPassiveKey === 'overheal_wall' ? 1.6 : 1.0;
      shieldAdded = Math.round(overheal * conv);
      target.shield = Math.min(target.maxHp, target.shield + shieldAdded);
    }
    const debuffIdx = target.statuses.findIndex((s) => s.id === 'atk_down' || s.id === 'def_down' || s.id === 'stun');
    if (debuffIdx >= 0) target.statuses.splice(debuffIdx, 1);
  }

  const totalEffective = actualHp + shieldAdded;
  if (healer.side === 'ally' && state.dps[healer.instanceId]) {
    state.dps[healer.instanceId].healingDone += Math.max(amount, totalEffective);
  }
  if (target.side === 'ally' && state.dps[target.instanceId]) {
    state.dps[target.instanceId].healingReceived += Math.max(amount, totalEffective);
  }

  pushFloat(state, target.instanceId, `+${amount}`, 'heal');
  if (shieldAdded > 0) {
    pushFloat(state, target.instanceId, `盾+${shieldAdded}`, 'shield');
  }
  return amount;
}

function chooseEnemyTarget(allies: BattleActor[]): BattleActor {
  const taunters = allies.filter((a) => a.statuses.some((s) => s.id === 'taunt'));
  if (taunters.length > 0) return taunters[Math.floor(Math.random() * taunters.length)];
  const weighted: BattleActor[] = [];
  for (const a of allies) {
    const w = a.role === 'tank' ? 4 : 1;
    for (let i = 0; i < w; i++) weighted.push(a);
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

export function chooseAutoSkillAndTarget(state: BattleState, actor: BattleActor): { skillIndex: number; targetId: string | null } {
  const allies = state.actors.filter((a) => a.alive && a.side === actor.side);
  const enemies = state.actors.filter((a) => a.alive && a.side !== actor.side);

  // ヒーラーは味方HPが低いとき回復技を優先
  const lowAlly = [...allies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  let chosenSkill = 0;

  if (actor.role === 'healer' && lowAlly && lowAlly.hp / lowAlly.maxHp < 0.72) {
    for (let i = actor.skills.length - 1; i >= 0; i--) {
      if (actor.cooldowns[i] === 0 && actor.skills[i].effects.some((e) => e.kind === 'heal')) {
        chosenSkill = i;
        break;
      }
    }
  } else {
    for (let i = actor.skills.length - 1; i >= 0; i--) {
      if (actor.cooldowns[i] === 0) {
        chosenSkill = i;
        break;
      }
    }
  }

  const skill = actor.skills[chosenSkill];
  if (skill.target === 'ally_single') {
    return { skillIndex: chosenSkill, targetId: lowAlly?.instanceId ?? actor.instanceId };
  }
  if (skill.target === 'ally_all' || skill.target === 'self') {
    return { skillIndex: chosenSkill, targetId: actor.instanceId };
  }
  if (actor.side === 'enemy') {
    return { skillIndex: chosenSkill, targetId: chooseEnemyTarget(enemies)?.instanceId ?? null };
  }
  // 味方オート：属性有利の敵か、HP割合が低い敵を優先
  const bestEnemy =
    enemies.find((e) => getElementMultiplier(actor.element, e.element).relation === 'weak') ||
    [...enemies].sort((a, b) => a.hp - b.hp)[0] ||
    null;
  return { skillIndex: chosenSkill, targetId: bestEnemy?.instanceId ?? null };
}

export function executeActorSkill(
  prevState: BattleState,
  skillIndex: number,
  preferredTargetId: string | null,
  stage: StageDef
): { state: BattleState; chaosTriggered: boolean; hitCrit: boolean; didHeal: boolean } {
  const state: BattleState = {
    ...prevState,
    actors: prevState.actors.map((a) => ({
      ...a,
      cooldowns: [...a.cooldowns] as [number, number, number],
      statuses: a.statuses.map((s) => ({ ...s })),
      animState: 'idle'
    })),
    dps: Object.fromEntries(Object.entries(prevState.dps).map(([k, v]) => [k, { ...v }])),
    logs: [...prevState.logs],
    floatingNumbers: [...prevState.floatingNumbers],
    fxEvents: [...prevState.fxEvents]
  };

  const actor = state.actors.find((a) => a.instanceId === state.activeActorId && a.alive);
  if (!actor) {
    state.activeActorId = null;
    state.waitingManual = false;
    return { state, chaosTriggered: false, hitCrit: false, didHeal: false };
  }

  const idx = Math.min(Math.max(0, skillIndex), actor.skills.length - 1);
  const skill: SkillDef = actor.cooldowns[idx] === 0 ? actor.skills[idx] : actor.skills[0];
  const actualIdx = actor.cooldowns[idx] === 0 ? idx : 0;

  // CD更新
  for (let i = 0; i < actor.cooldowns.length; i++) {
    if (actor.cooldowns[i] > 0) actor.cooldowns[i] -= 1;
  }
  if (skill.cooldown > 0) {
    actor.cooldowns[actualIdx] = skill.cooldown;
  }

  // 専用武器パッシブ（行動時発動）
  if (actor.side === 'ally' && actor.sigPassiveKey === 'team_haste') {
    for (const a of state.actors) {
      if (a.alive && a.side === 'ally') a.gauge = Math.min(100, a.gauge + 8);
    }
  }
  if (actor.side === 'ally' && actor.sigPassiveKey === 'iron_fortress') {
    for (const a of state.actors) {
      if (a.alive && a.side === 'ally') a.shield = Math.min(a.maxHp, a.shield + Math.round(actor.maxHp * 0.08));
    }
  }

  const allies = state.actors.filter((a) => a.alive && a.side === actor.side);
  const enemies = state.actors.filter((a) => a.alive && a.side !== actor.side);

  let mainTarget =
    enemies.find((e) => e.instanceId === preferredTargetId) ||
    allies.find((a) => a.instanceId === preferredTargetId) ||
    enemies[0] ||
    actor;

  actor.animState = actualIdx === 2 ? 'burst' : 'attack';
  actor.animNonce++;

  let totalDmg = 0;
  let totalHeal = 0;
  let anyCrit = false;
  let chaosTriggered = false;

  const isSkill3 = actualIdx === 2;
  const durationBonus = actor.role === 'supporter' ? 1 : 0;

  for (const eff of skill.effects) {
    if (eff.kind === 'damage') {
      const hits = eff.hits ?? 1;
      const extraHit = state.activeLaw?.id === 'gravity_bug' && Math.random() < 0.35 ? 1 : 0;
      const totalHits = hits + extraHit;

      const targets =
        skill.target === 'enemy_all'
          ? enemies
          : skill.target === 'enemy_random'
            ? []
            : [enemies.includes(mainTarget) ? mainTarget : enemies[0]].filter(Boolean);

      if (skill.target === 'enemy_random') {
        for (let h = 0; h < totalHits; h++) {
          const livingE = state.actors.filter((a) => a.alive && a.side !== actor.side);
          if (livingE.length === 0) break;
          const t = livingE[Math.floor(Math.random() * livingE.length)];
          const res = applyDamage(state, actor, t, eff.value, { isSkill3 });
          totalDmg += res.dealt;
          if (res.crit) anyCrit = true;
          pushFx(state, { kind: isSkill3 ? 'burst' : 'slash', element: actor.element, targetSide: t.side, targetSlot: t.slotIndex });
        }
      } else {
        for (let h = 0; h < totalHits; h++) {
          for (const t of targets) {
            if (!t.alive) continue;
            const res = applyDamage(state, actor, t, eff.value, { isSkill3 });
            totalDmg += res.dealt;
            if (res.crit) anyCrit = true;
          }
        }
        pushFx(state, {
          kind: isSkill3 ? 'burst' : 'slash',
          element: actor.element,
          targetSide: actor.side === 'ally' ? 'enemy' : 'ally',
          targetSlot: skill.target === 'enemy_all' ? undefined : mainTarget.slotIndex
        });
      }
      if (actor.role === 'dealer') {
        actor.dealerStacks = Math.min(5, actor.dealerStacks + 1);
      }
    } else if (eff.kind === 'heal') {
      const targets =
        skill.target === 'ally_single'
          ? [allies.includes(mainTarget) ? mainTarget : [...allies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]].filter(Boolean)
          : skill.target === 'self'
            ? [actor]
            : skill.target === 'enemy_single' && actor.role === 'healer'
              ? [[...allies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]].filter(Boolean)
              : allies;
      for (const t of targets) {
        totalHeal += applyHeal(state, actor, t, eff.value);
      }
      pushFx(state, { kind: 'heal', element: actor.element, targetSide: actor.side });
    } else if (eff.kind === 'shield') {
      const targets = skill.target === 'enemy_single' ? [actor] : allies;
      for (const t of targets) {
        const sh = Math.round(actor.maxHp * eff.value);
        t.shield = Math.min(t.maxHp, t.shield + sh);
        pushFloat(state, t.instanceId, `盾+${sh}`, 'shield');
      }
    } else if (eff.kind === 'taunt') {
      addStatus(actor, 'taunt', (eff.duration ?? 2) + durationBonus, 1);
      pushFloat(state, actor.instanceId, '挑発!', 'shield');
    } else if (eff.kind === 'buff_atk' || eff.kind === 'buff_def' || eff.kind === 'buff_spd') {
      const statusId = eff.kind === 'buff_atk' ? 'atk_up' : eff.kind === 'buff_def' ? 'def_up' : 'spd_up';
      const targets = skill.target === 'ally_all' ? allies : [actor];
      for (const t of targets) {
        addStatus(t, statusId, (eff.duration ?? 2) + durationBonus, eff.value);
      }
    } else if (eff.kind === 'debuff_def' || eff.kind === 'debuff_atk') {
      const statusId = eff.kind === 'debuff_def' ? 'def_down' : 'atk_down';
      const targets = skill.target === 'enemy_all' ? enemies : [enemies.includes(mainTarget) ? mainTarget : enemies[0]].filter(Boolean);
      for (const t of targets) {
        if (t.alive) addStatus(t, statusId, (eff.duration ?? 2) + durationBonus, eff.value);
      }
    } else if (eff.kind === 'stun') {
      const chance = eff.chance ?? 0.35;
      const targets = skill.target === 'enemy_all' ? enemies : [enemies.includes(mainTarget) ? mainTarget : enemies[0]].filter(Boolean);
      for (const t of targets) {
        if (t.alive && Math.random() < (t.isBoss ? chance * 0.55 : chance)) {
          addStatus(t, 'stun', 1, 1);
          pushFloat(state, t.instanceId, '気絶!', 'chaos');
        }
      }
    } else if (eff.kind === 'gauge_up') {
      const targets =
        skill.target === 'ally_all' || skill.target === 'enemy_all'
          ? allies
          : skill.target === 'ally_single'
            ? [allies.includes(mainTarget) ? mainTarget : actor]
            : [actor];
      for (const t of targets) {
        t.gauge = Math.min(100, t.gauge + eff.value);
      }
    } else if (eff.kind === 'gauge_down') {
      const targets = skill.target === 'enemy_all' ? enemies : [enemies.includes(mainTarget) ? mainTarget : enemies[0]].filter(Boolean);
      for (const t of targets) {
        if (t.alive) t.gauge = Math.max(0, t.gauge - eff.value);
      }
    } else if (eff.kind === 'cleanse') {
      for (const t of allies) {
        t.statuses = t.statuses.filter((s) => s.id !== 'atk_down' && s.id !== 'def_down' && s.id !== 'stun');
      }
    } else if (eff.kind === 'chaos_gain' && actor.side === 'ally') {
      if (addChaosGauge(state, actor, eff.value)) chaosTriggered = true;
    }
  }

  // スキル固有のカオスゲージ加算
  if (actor.side === 'ally') {
    const bonus = actor.sigPassiveKey === 'chaos_surge' ? 10 : 0;
    if (addChaosGauge(state, actor, skill.chaosGain + bonus)) {
      chaosTriggered = true;
    }
  }

  // 1行短縮ログ追加
  if (totalDmg > 0 && totalHeal > 0) {
    pushLog(state, `${actor.name}▶${skill.name} ${totalDmg}ダメ / +${totalHeal}癒`, anyCrit ? 'crit' : 'damage');
  } else if (totalDmg > 0) {
    pushLog(state, `${actor.name}▶${skill.name} ${totalDmg}ダメ${anyCrit ? '★会心' : ''}`, anyCrit ? 'crit' : 'damage');
  } else if (totalHeal > 0) {
    pushLog(state, `${actor.name}▶${skill.name} 味方+${totalHeal}回復`, 'heal');
  } else {
    pushLog(state, `${actor.name}▶${skill.name} 発動！`, 'buff');
  }

  // ステータス経過減少
  actor.statuses = actor.statuses
    .map((s) => ({ ...s, turns: s.turns - 1 }))
    .filter((s) => s.turns > 0);

  // カオス法則の残アクション減算
  if (state.activeLaw) {
    state.activeLaw = {
      ...state.activeLaw,
      remainingActions: state.activeLaw.remainingActions - 1
    };
    if (state.activeLaw.remainingActions <= 0) {
      pushLog(state, `法則【${state.activeLaw.name}】終了`, 'system');
      state.activeLaw = null;
    }
  }

  state.turnCount += 1;
  state.activeActorId = null;
  state.waitingManual = false;

  // 勝敗・ウェーブ進行チェック
  const aliveAllies = state.actors.filter((a) => a.alive && a.side === 'ally');
  const aliveEnemies = state.actors.filter((a) => a.alive && a.side === 'enemy');

  if (aliveAllies.length === 0) {
    state.phase = 'defeat';
    pushLog(state, 'パーティ全滅…敗北！', 'system');
  } else if (aliveEnemies.length === 0) {
    if (state.waveIndex + 1 < stage.waves.length) {
      const nextWave = state.waveIndex + 1;
      const nextEnemies = createEnemyActors(stage.waves[nextWave], nextWave);
      state.waveIndex = nextWave;
      state.actors = [...state.actors.filter((a) => a.side === 'ally'), ...nextEnemies];
      state.selectedTargetId = nextEnemies[0]?.instanceId ?? null;
      pushLog(state, `WAVE ${nextWave + 1}/${stage.waves.length} 突入！`, 'system');
    } else {
      state.phase = 'victory';
      pushLog(state, `【${stage.name}】制覇！`, 'chaos');
    }
  } else {
    // ターゲットが生存していない場合、次の生存敵に自動補正
    if (!aliveEnemies.some((e) => e.instanceId === state.selectedTargetId)) {
      state.selectedTargetId = aliveEnemies[0].instanceId;
    }
  }

  return { state, chaosTriggered, hitCrit: anyCrit, didHeal: totalHeal > 0 };
}

export function triggerChaosOrb(
  prevState: BattleState,
  mode: 'enemy' | 'ally',
  stage: StageDef
): { state: BattleState; activated: boolean } {
  if (!prevState.chaosOrbReady || prevState.phase !== 'running') {
    return { state: prevState, activated: false };
  }
  const state: BattleState = {
    ...prevState,
    actors: prevState.actors.map((a) => ({
      ...a,
      statuses: a.statuses.map((s) => ({ ...s }))
    })),
    dps: Object.fromEntries(Object.entries(prevState.dps).map(([k, v]) => [k, { ...v }])),
    logs: [...prevState.logs],
    floatingNumbers: [...prevState.floatingNumbers],
    fxEvents: [...prevState.fxEvents]
  };

  state.chaosOrbReady = false;
  const allies = state.actors.filter((a) => a.alive && a.side === 'ally');
  const enemies = state.actors.filter((a) => a.alive && a.side === 'enemy');

  if (mode === 'enemy' && allies.length > 0) {
    const lead = allies.reduce((best, a) => (a.atk > best.atk ? a : best), allies[0]);
    let sum = 0;
    for (const e of enemies) {
      const res = applyDamage(state, lead, e, 2.15, { allowExtra: false });
      sum += res.dealt;
      if (e.alive) addStatus(e, 'def_down', 2, 0.35);
    }
    pushFx(state, { kind: 'orb', element: 'fire', targetSide: 'enemy' });
    pushLog(state, `★カオスオーブ炸裂！敵全体へ ${sum}ダメ＋防御崩壊`, 'chaos');
  } else {
    for (const a of allies) {
      const heal = Math.round(a.maxHp * 0.36);
      const actual = Math.min(a.maxHp - a.hp, heal);
      a.hp += actual;
      a.shield = Math.min(a.maxHp, a.shield + Math.round(a.maxHp * 0.24));
      a.gauge = Math.min(100, a.gauge + 35);
      addStatus(a, 'atk_up', 2, 0.3);
      pushFloat(state, a.instanceId, `覚醒+${heal}`, 'chaos');
      if (state.dps[a.instanceId]) {
        state.dps[a.instanceId].healingReceived += heal;
      }
    }
    pushFx(state, { kind: 'orb', element: 'light', targetSide: 'ally' });
    pushLog(state, '★カオスオーブ解放！味方全体超回復＆+35%加速', 'chaos');
  }

  // 敵全滅チェック
  const aliveEnemies = state.actors.filter((a) => a.alive && a.side === 'enemy');
  if (aliveEnemies.length === 0) {
    if (state.waveIndex + 1 < stage.waves.length) {
      const nextWave = state.waveIndex + 1;
      const nextEnemies = createEnemyActors(stage.waves[nextWave], nextWave);
      state.waveIndex = nextWave;
      state.actors = [...state.actors.filter((a) => a.side === 'ally'), ...nextEnemies];
      state.selectedTargetId = nextEnemies[0]?.instanceId ?? null;
      pushLog(state, `WAVE ${nextWave + 1}/${stage.waves.length} 突入！`, 'system');
    } else {
      state.phase = 'victory';
      pushLog(state, `【${stage.name}】制覇！`, 'chaos');
    }
  }

  return { state, activated: true };
}

export function advanceTimelineStep(
  prevState: BattleState,
  deltaSec: number
): { state: BattleState; readyActor: BattleActor | null; skippedStun: boolean } {
  if (prevState.phase !== 'running' || prevState.activeActorId) {
    return { state: prevState, readyActor: null, skippedStun: false };
  }

  const state: BattleState = {
    ...prevState,
    elapsedSec: prevState.elapsedSec + deltaSec,
    actors: prevState.actors.map((a) => ({
      ...a,
      statuses: a.statuses.map((s) => ({ ...s })),
      animState: 'idle'
    })),
    logs: [...prevState.logs],
    floatingNumbers: [...prevState.floatingNumbers],
    fxEvents: [...prevState.fxEvents]
  };

  const living = state.actors.filter((a) => a.alive);
  if (living.length === 0) return { state, readyActor: null, skippedStun: false };

  // ゲージを進める
  const stepFactor = deltaSec * 0.42;
  for (const a of living) {
    const spd = getEffectiveSpeed(a, state.activeLaw?.id);
    a.gauge += spd * stepFactor;
  }

  const ready = living.filter((a) => a.gauge >= 100).sort((a, b) => b.gauge - a.gauge)[0];
  if (!ready) {
    return { state, readyActor: null, skippedStun: false };
  }

  ready.gauge = Math.max(0, ready.gauge - 100);

  // 気絶チェック
  const stunIdx = ready.statuses.findIndex((s) => s.id === 'stun');
  if (stunIdx >= 0) {
    ready.statuses.splice(stunIdx, 1);
    pushLog(state, `${ready.name}は気絶して動けない！`, 'system');
    pushFloat(state, ready.instanceId, '気絶中', 'chaos');
    return { state, readyActor: null, skippedStun: true };
  }

  // サポーターロールアビリティ: 行動開始時に最遅の味方ゲージ+18%
  if (ready.side === 'ally' && ready.role === 'supporter') {
    const slowest = state.actors
      .filter((a) => a.alive && a.side === 'ally' && a.instanceId !== ready.instanceId)
      .sort((a, b) => a.gauge - b.gauge)[0];
    if (slowest) {
      slowest.gauge = Math.min(100, slowest.gauge + 18);
    }
  }

  state.activeActorId = ready.instanceId;
  state.waitingManual = ready.side === 'ally' && !state.autoBattle;
  if (ready.side === 'ally') {
    // 利用可能な最良スキルをデフォルト選択（手動時も1タップで撃てる快適さ）
    const auto = chooseAutoSkillAndTarget(state, ready);
    state.selectedSkillIndex = auto.skillIndex;
  }

  return { state, readyActor: ready, skippedStun: false };
}
