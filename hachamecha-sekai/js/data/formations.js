(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  /*
   * サガ式「陣形」8種（4ポジション別補正＋狙われ率＋特殊効果）
   * 2×2グリッド（0:左上前衛 / 1:右上前衛 / 2:左下後衛 / 3:右下後衛）
   */
  HW.FORMATIONS = [
    {
      id: 'form_standard',
      name: '均衡スクエア',
      unlockDesc: '初期解放',
      summary: '前衛の防御UP・後衛の攻撃UP',
      slots: [
        { label: '前左', aggro: 1.45, mod: { defPct: 0.14, hpPct: 0.08 } },
        { label: '前右', aggro: 1.45, mod: { defPct: 0.14, hpPct: 0.08 } },
        { label: '後左', aggro: 0.70, mod: { atkPct: 0.12 } },
        { label: '後右', aggro: 0.70, mod: { atkPct: 0.12 } }
      ]
    },
    {
      id: 'form_phoenix',
      name: '鳳天一点陣',
      unlockDesc: '初期解放',
      summary: '1番に攻撃集中＆超鉄壁、他3人は火力＆速度UP',
      slots: [
        { label: '主盾', aggro: 3.20, mod: { defPct: 0.30, hpPct: 0.20, dmgRed: 0.12 } },
        { label: '翼左', aggro: 0.45, mod: { atkPct: 0.15, spdFlat: 6 } },
        { label: '翼右', aggro: 0.45, mod: { atkPct: 0.15, spdFlat: 6 } },
        { label: '後援', aggro: 0.40, mod: { healOutPct: 0.18, spdFlat: 8 } }
      ]
    },
    {
      id: 'form_blitz',
      name: '電光突撃陣',
      unlockDesc: 'エリア1制覇で解放',
      summary: '全員の速度・開戦ゲージ大幅UP、速攻特化',
      slots: [
        { label: '先鋒', aggro: 1.25, mod: { spdFlat: 16, atkPct: 0.14, startGauge: 0.18 } },
        { label: '突撃', aggro: 1.25, mod: { spdFlat: 16, atkPct: 0.14, startGauge: 0.18 } },
        { label: '追撃', aggro: 0.80, mod: { spdFlat: 12, crit: 0.10, startGauge: 0.14 } },
        { label: '支援', aggro: 0.70, mod: { spdFlat: 14, startGauge: 0.22 } }
      ]
    },
    {
      id: 'form_dragon',
      name: '竜顎破砕陣',
      unlockDesc: '異界塔Ⅰ 10F踏破で解放',
      summary: '1・2番に会心＆防御貫通を集中付与',
      slots: [
        { label: '竜牙', aggro: 1.15, mod: { atkPct: 0.22, crit: 0.12, defPen: 0.15 } },
        { label: '竜爪', aggro: 1.15, mod: { atkPct: 0.22, crit: 0.12, defPen: 0.15 } },
        { label: '竜鱗', aggro: 1.00, mod: { defPct: 0.16, hpPct: 0.12 } },
        { label: '竜尾', aggro: 0.70, mod: { spdFlat: 10, healOutPct: 0.14 } }
      ]
    },
    {
      id: 'form_citadel',
      name: '双盾要塞陣',
      unlockDesc: 'エリア2制覇で解放',
      summary: '前衛2枚が超耐久＆反撃、後衛が回復＆継続火力',
      slots: [
        { label: '左盾', aggro: 2.10, mod: { defPct: 0.24, hpPct: 0.18, counterChance: 0.15 } },
        { label: '右盾', aggro: 2.10, mod: { defPct: 0.24, hpPct: 0.18, counterChance: 0.15 } },
        { label: '後方', aggro: 0.45, mod: { atkPct: 0.18, critDmg: 0.20 } },
        { label: '救護', aggro: 0.45, mod: { healOutPct: 0.24, res: 0.20 } }
      ]
    },
    {
      id: 'form_hex',
      name: '混沌呪術陣',
      unlockDesc: '異界塔Ⅰ 25F踏破で解放',
      summary: '効果命中＆状態異常特効を強化する変則陣',
      slots: [
        { label: '呪核', aggro: 1.30, mod: { hpPct: 0.14, effHit: 0.25, res: 0.20 } },
        { label: '呪刃', aggro: 1.00, mod: { effHit: 0.25, ailmentBonus: 0.22 } },
        { label: '呪鎖', aggro: 0.90, mod: { effHit: 0.25, spdFlat: 10 } },
        { label: '呪星', aggro: 0.80, mod: { ailmentBonus: 0.22, atkPct: 0.14 } }
      ]
    },
    {
      id: 'form_sanctuary',
      name: '聖樹循環陣',
      unlockDesc: 'エリア3制覇で解放',
      summary: '全員の被回復＆毎行動再生で粘り勝つ耐久陣',
      slots: [
        { label: '聖盾', aggro: 1.80, mod: { hpPct: 0.18, healInPct: 0.22, turnRegenPct: 0.04 } },
        { label: '聖剣', aggro: 1.00, mod: { atkPct: 0.14, healInPct: 0.18, turnRegenPct: 0.04 } },
        { label: '聖風', aggro: 0.70, mod: { spdFlat: 10, healInPct: 0.18, turnRegenPct: 0.04 } },
        { label: '聖泉', aggro: 0.50, mod: { healOutPct: 0.26, turnRegenPct: 0.06 } }
      ]
    },
    {
      id: 'form_chaos',
      name: 'はちゃめちゃ乱舞陣',
      unlockDesc: '異界塔Ⅰ 50F踏破で解放',
      summary: '全員に追撃・会心・速度が乗る究極カオス陣形',
      slots: [
        { label: '乱1', aggro: 1.10, mod: { atkPct: 0.16, spdFlat: 10, extraHitChance: 0.12 } },
        { label: '乱2', aggro: 1.00, mod: { atkPct: 0.16, crit: 0.10, extraHitChance: 0.12 } },
        { label: '乱3', aggro: 0.95, mod: { defPct: 0.16, spdFlat: 10, extraHitChance: 0.12 } },
        { label: '乱4', aggro: 0.95, mod: { hpPct: 0.16, healOutPct: 0.16, extraHitChance: 0.12 } }
      ]
    }
  ];

  HW.getFormation = function (id) {
    return HW.FORMATIONS.find((f) => f.id === id) || HW.FORMATIONS[0];
  };

  /**
   * 編成シナジー自動計算（出撃4体＋バディリンク4体の属性・種族・ロールを参照）
   */
  HW.evaluateSynergies = function (mainIds, linkIds) {
    const mains = (mainIds || []).filter(Boolean).map((id) => HW.getCharDef(id)).filter(Boolean);
    const links = (linkIds || []).filter(Boolean).map((id) => HW.getCharDef(id)).filter(Boolean);
    const all = mains.concat(links);

    const active = [];
    const teamMod = {};

    function addMod(m) {
      Object.keys(m).forEach((k) => {
        teamMod[k] = (teamMod[k] || 0) + m[k];
      });
    }

    // 1. 属性シナジー（メイン4体基準）
    const elCounts = {};
    mains.forEach((c) => {
      elCounts[c.element] = (elCounts[c.element] || 0) + 1;
    });
    const uniqueEls = Object.keys(elCounts).length;
    if (uniqueEls >= 4) {
      active.push({ name: '四彩混成', desc: '全基礎ステ+10%・与ダメ+8%' });
      addMod({ hpPct: 0.10, atkPct: 0.10, defPct: 0.10, dmgUp: 0.08 });
    }
    Object.keys(elCounts).forEach((el) => {
      const cnt = elCounts[el];
      const meta = HW.getElement(el);
      if (cnt >= 4) {
        active.push({ name: meta.name + '極統一(4)', desc: '攻撃+22%・HP+18%・速度+8' });
        addMod({ atkPct: 0.22, hpPct: 0.18, spdFlat: 8 });
      } else if (cnt === 3) {
        active.push({ name: meta.name + '共鳴(3)', desc: '攻撃+15%・HP+12%' });
        addMod({ atkPct: 0.15, hpPct: 0.12 });
      } else if (cnt === 2) {
        active.push({ name: meta.name + '調和(2)', desc: '攻撃+8%・防御+6%' });
        addMod({ atkPct: 0.08, defPct: 0.06 });
      }
    });

    // 2. 種族シナジー（2種族持ちは両方にカウント！バディリンクも含め絆を評価）
    const raceCounts = {};
    all.forEach((c) => {
      (c.races || []).forEach((r) => {
        raceCounts[r] = (raceCounts[r] || 0) + 1;
      });
    });
    const raceBonuses = {
      human: { name: '人類結束', desc: '速度+8・与回復+10%', mod: { spdFlat: 8, healOutPct: 0.10 } },
      dragon: { name: '竜族覇気', desc: '攻撃+12%・防御貫通+10%', mod: { atkPct: 0.12, defPen: 0.10 } },
      god: { name: '神域威光', desc: '与ダメ+10%・異常耐性+18%', mod: { dmgUp: 0.10, res: 0.18 } },
      monster: { name: '魔物狂宴', desc: '効果命中+18%・異常特効+12%', mod: { effHit: 0.18, ailmentBonus: 0.12 } },
      fairy: { name: '妖精円舞', desc: '回避+8%・速度+10', mod: { eva: 0.08, spdFlat: 10 } },
      beast: { name: '獣牙連撃', desc: '会心率+10%・吸血+8%', mod: { crit: 0.10, lifesteal: 0.08 } },
      machine: { name: '機械連動', desc: '防御+14%・開戦盾HP10%', mod: { defPct: 0.14, waveShieldPct: 0.10 } }
    };
    Object.keys(raceCounts).forEach((r) => {
      if (raceCounts[r] >= 2 && raceBonuses[r]) {
        const rb = raceBonuses[r];
        const mult = raceCounts[r] >= 4 ? 1.5 : 1.0;
        active.push({
          name: rb.name + '(' + raceCounts[r] + ')',
          desc: rb.desc + (mult > 1 ? ' [強化]' : '')
        });
        const scaled = {};
        Object.keys(rb.mod).forEach((k) => {
          scaled[k] = rb.mod[k] * mult;
        });
        addMod(scaled);
      }
    });

    // 3. ロールシナジー（メイン4体基準）
    const roleCounts = {};
    mains.forEach((c) => {
      roleCounts[c.role] = (roleCounts[c.role] || 0) + 1;
    });
    if (Object.keys(roleCounts).length === 4) {
      active.push({ name: '四職完全均衡', desc: 'HP+10%・攻撃+10%・防御+10%・回復+10%' });
      addMod({ hpPct: 0.10, atkPct: 0.10, defPct: 0.10, healOutPct: 0.10 });
    } else {
      if ((roleCounts.dealer || 0) >= 2) {
        active.push({ name: '猛攻シフト', desc: '会心ダメ+20%' });
        addMod({ critDmg: 0.20 });
      }
      if ((roleCounts.tank || 0) >= 2) {
        active.push({ name: '鉄壁シフト', desc: '被ダメ-10%' });
        addMod({ dmgRed: 0.10 });
      }
      if ((roleCounts.supporter || 0) >= 2) {
        active.push({ name: '戦術シフト', desc: '開戦ゲージ+14%' });
        addMod({ startGauge: 0.14 });
      }
    }

    // 4. バディリンク一致シナジー
    let linkMatches = 0;
    for (let i = 0; i < 4; i++) {
      const m = mainIds && mainIds[i] ? HW.getCharDef(mainIds[i]) : null;
      const l = linkIds && linkIds[i] ? HW.getCharDef(linkIds[i]) : null;
      if (m && l) {
        const sameEl = m.element === l.element;
        const sameRace = (m.races || []).some((r) => (l.races || []).includes(r));
        if (sameEl || sameRace) linkMatches++;
      }
    }
    if (linkMatches > 0) {
      active.push({ name: 'バディ共鳴×' + linkMatches, desc: '全基礎ステ+' + linkMatches * 4 + '%' });
      addMod({ hpPct: linkMatches * 0.04, atkPct: linkMatches * 0.04, defPct: linkMatches * 0.04 });
    }

    return { active: active, teamMod: teamMod };
  };
})();
