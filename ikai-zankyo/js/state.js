/* 状態管理（IIFE完全隠蔽・必須4段ソート・共鳴・覇王の印・塔100F・装備80部位図鑑・暗号化永続化） */
(function () {
  'use strict';

  const SEC = window.__IZ_SEC__;
  const WDATA = window.__IZ_WORLDS__;
  const CDATA = window.__IZ_CHARS__;
  const EDATA = window.__IZ_EQUIP__;

  let uidSeq = 1;
  let S = null;
  let loadNotice = '';

  /* 必須ソート仕様：レアリティ順 → 属性順 → ロール順 → 五十音順 */
  function compareChar(a, b) {
    const rDiff = WDATA.RARITIES[a.rarity].order - WDATA.RARITIES[b.rarity].order;
    if (rDiff !== 0) return rDiff;
    const eDiff = WDATA.ELEMENTS[a.el].order - WDATA.ELEMENTS[b.el].order;
    if (eDiff !== 0) return eDiff;
    const roDiff = WDATA.ROLES[a.role].order - WDATA.ROLES[b.role].order;
    if (roDiff !== 0) return roDiff;
    return a.kana.localeCompare(b.kana, 'ja');
  }

  function sortCharIds(ids) {
    return ids.slice().sort((idA, idB) => {
      const a = CDATA.CHAR_MAP[idA];
      const b = CDATA.CHAR_MAP[idB];
      if (!a || !b) return 0;
      return compareChar(a, b);
    });
  }

  function getAllCharIdsSorted() {
    return sortCharIds(CDATA.CHARS.map((c) => c.id));
  }

  function makeEquipObj(seriesId, slotId, qualityId) {
    const id = 'eq_' + Date.now().toString(36) + '_' + (uidSeq++);
    return { id, seriesId, slotId, quality: qualityId, locked: false };
  }

  function createInitialState() {
    const starterIds = ['c_n_1', 'c_n_2', 'c_n_3', 'c_n_4', 'c_n_5', 'c_n_6'];
    const roster = {};
    starterIds.forEach((cid) => {
      roster[cid] = {
        awake: 0,
        board: [],
        equips: { weapon: null, armor: null, accessory: null, emblem: null },
        abilities: [],
        linkCharId: null
      };
    });

    const initEquips = [
      makeEquipObj('s_sky', 'weapon', 1),
      makeEquipObj('s_sky', 'emblem', 1),
      makeEquipObj('s_oath', 'armor', 1),
      makeEquipObj('s_oath', 'accessory', 0)
    ];
    roster.c_n_2.equips.weapon = initEquips[0].id;
    roster.c_n_2.equips.emblem = initEquips[1].id;
    roster.c_n_1.equips.armor = initEquips[2].id;
    roster.c_n_1.equips.accessory = initEquips[3].id;
    roster.c_n_2.abilities = ['ab_atk1'];
    roster.c_n_1.abilities = ['ab_def1'];
    roster.c_n_4.abilities = ['ab_heal1'];
    roster.c_n_5.abilities = ['ab_spd1'];
    roster.c_n_2.linkCharId = 'c_n_3';
    roster.c_n_1.linkCharId = 'c_n_6';

    const unlockedAbilities = EDATA.FREE_ABILITIES
      .filter((a) => a.unlockedByDefault)
      .map((a) => a.id);

    return {
      ver: 2,
      stone: 1500,
      crystal: 450,
      soul: 120,
      gold: 1600,
      mats: {},
      shards: {},
      bossMarks: {},
      roster,
      party: ['c_n_1', 'c_n_2', 'c_n_5', 'c_n_4'],
      gauntletParties: [
        ['c_n_1', 'c_n_2', 'c_n_5', 'c_n_4'],
        ['c_n_6', 'c_n_3', null, null],
        [null, null, null, null]
      ],
      equips: initEquips,
      unlockedAbilities,
      clearedStages: {},
      clearedRaids: {},
      clearedGauntlets: {},
      clearedTrials: {},
      towerMaxCleared: 0,
      codexEnemies: {},
      codexEquips: {
        's_sky:weapon': true,
        's_sky:emblem': true,
        's_oath:armor': true,
        's_oath:accessory': true
      },
      stats: { totalRuns: 0, totalIntruders: 0, totalSummons: 0 },
      settings: {
        speed: 2,
        sound: true,
        autoSellMaxQuality: -1
      }
    };
  }

  /* スキーマ・範囲の厳密検証（旧セーブ互換＆改ざん・破損対策） */
  function sanitizeState(raw) {
    const base = createInitialState();
    if (!raw || typeof raw !== 'object') return base;

    base.stone = SEC.clampInt(raw.stone, 0, 99999999, base.stone);
    base.crystal = SEC.clampInt(raw.crystal, 0, 99999999, base.crystal);
    base.soul = SEC.clampInt(raw.soul, 0, 99999999, base.soul);
    base.gold = SEC.clampInt(raw.gold, 0, 999999999, base.gold);

    if (raw.mats && typeof raw.mats === 'object') {
      base.mats = {};
      Object.entries(raw.mats).forEach(([k, v]) => {
        if (typeof k === 'string') base.mats[k] = SEC.clampInt(v, 0, 999999, 0);
      });
    }
    if (raw.shards && typeof raw.shards === 'object') {
      base.shards = {};
      Object.entries(raw.shards).forEach(([k, v]) => {
        if (CDATA.CHAR_MAP[k]) base.shards[k] = SEC.clampInt(v, 0, 9999, 0);
      });
    }
    if (raw.bossMarks && typeof raw.bossMarks === 'object') {
      base.bossMarks = {};
      Object.entries(raw.bossMarks).forEach(([k, v]) => {
        if (CDATA.CHAR_MAP[k]) base.bossMarks[k] = SEC.clampInt(v, 0, 9999, 0);
      });
    }

    if (Array.isArray(raw.equips)) {
      const seen = new Set();
      base.equips = [];
      raw.equips.slice(0, 800).forEach((eq) => {
        if (!eq || typeof eq.id !== 'string' || seen.has(eq.id)) return;
        if (!EDATA.SERIES_MAP[eq.seriesId]) return;
        if (!EDATA.SLOTS.some((sl) => sl.id === eq.slotId)) return;
        seen.add(eq.id);
        base.equips.push({
          id: eq.id,
          seriesId: eq.seriesId,
          slotId: eq.slotId,
          quality: SEC.clampInt(eq.quality, 0, 4, 0),
          locked: Boolean(eq.locked)
        });
      });
    }
    const validEquipIds = new Set(base.equips.map((e) => e.id));

    if (raw.roster && typeof raw.roster === 'object') {
      base.roster = {};
      Object.entries(raw.roster).forEach(([cid, r]) => {
        if (!CDATA.CHAR_MAP[cid] || !r || typeof r !== 'object') return;
        const eqObj = { weapon: null, armor: null, accessory: null, emblem: null };
        if (r.equips && typeof r.equips === 'object') {
          EDATA.SLOTS.forEach((sl) => {
            const eid = r.equips[sl.id];
            if (typeof eid === 'string' && validEquipIds.has(eid)) eqObj[sl.id] = eid;
          });
        }
        const board = Array.isArray(r.board)
          ? r.board.filter((k) => CDATA.BOARD_TEMPLATES.some((t) => t.key === k))
          : [];
        const abilities = Array.isArray(r.abilities)
          ? r.abilities.map((id) => (id === 'ab_tower_5' ? 'ab_tower_10' : (id === 'ab_tower_15' ? 'ab_tower_40' : id))).filter((id) => Boolean(EDATA.ABILITY_MAP[id])).slice(0, 3)
          : [];
        base.roster[cid] = {
          awake: SEC.clampInt(r.awake, 0, 5, 0),
          board: Array.from(new Set(board)),
          equips: eqObj,
          abilities: Array.from(new Set(abilities)),
          linkCharId: (typeof r.linkCharId === 'string' && CDATA.CHAR_MAP[r.linkCharId] && r.linkCharId !== cid) ? r.linkCharId : null
        };
      });
    }
    if (Object.keys(base.roster).length === 0) return createInitialState();

    if (Array.isArray(raw.party)) {
      const cleaned = raw.party.slice(0, 4).map((id) => (id && base.roster[id] ? id : null));
      while (cleaned.length < 4) cleaned.push(null);
      if (cleaned.every((x) => !x)) cleaned[0] = Object.keys(base.roster)[0];
      base.party = cleaned;
    }

    if (Array.isArray(raw.gauntletParties) && raw.gauntletParties.length === 3) {
      base.gauntletParties = raw.gauntletParties.map((arr) => {
        const res = Array.isArray(arr) ? arr.slice(0, 4).map((id) => (id && base.roster[id] ? id : null)) : [null, null, null, null];
        while (res.length < 4) res.push(null);
        return res;
      });
    }

    if (Array.isArray(raw.unlockedAbilities)) {
      const set = new Set(base.unlockedAbilities);
      raw.unlockedAbilities.forEach((rawId) => {
        const id = rawId === 'ab_tower_5' ? 'ab_tower_10' : (rawId === 'ab_tower_15' ? 'ab_tower_40' : rawId);
        if (EDATA.ABILITY_MAP[id]) set.add(id);
      });
      base.unlockedAbilities = Array.from(set);
    }

    if (raw.clearedStages && typeof raw.clearedStages === 'object') base.clearedStages = { ...raw.clearedStages };
    if (raw.clearedRaids && typeof raw.clearedRaids === 'object') base.clearedRaids = { ...raw.clearedRaids };
    if (raw.clearedGauntlets && typeof raw.clearedGauntlets === 'object') base.clearedGauntlets = { ...raw.clearedGauntlets };
    if (raw.clearedTrials && typeof raw.clearedTrials === 'object') base.clearedTrials = { ...raw.clearedTrials };
    base.towerMaxCleared = SEC.clampInt(raw.towerMaxCleared, 0, WDATA.TOWER_MAX_FLOOR, 0);

    if (raw.codexEnemies && typeof raw.codexEnemies === 'object') {
      base.codexEnemies = {};
      Object.entries(raw.codexEnemies).forEach(([k, v]) => {
        if (WDATA.ENEMIES[k]) base.codexEnemies[k] = SEC.clampInt(v, 0, 9999999, 0);
      });
    }
    if (raw.codexEquips && typeof raw.codexEquips === 'object') {
      base.codexEquips = { ...base.codexEquips };
      Object.keys(raw.codexEquips).forEach((k) => {
        if (EDATA.PART_MAP[k]) {
          base.codexEquips[k] = true;
        } else if (EDATA.SERIES_MAP[k]) {
          /* 旧シリーズ単位セーブを4部位へ互換展開 */
          EDATA.SLOTS.forEach((sl) => { base.codexEquips[`${k}:${sl.id}`] = true; });
        }
      });
    }
    /* 所持装備は図鑑発見済みに反映 */
    base.equips.forEach((eq) => {
      base.codexEquips[`${eq.seriesId}:${eq.slotId}`] = true;
    });

    if (raw.stats && typeof raw.stats === 'object') {
      base.stats = {
        totalRuns: SEC.clampInt(raw.stats.totalRuns, 0, 99999999, 0),
        totalIntruders: SEC.clampInt(raw.stats.totalIntruders, 0, 99999999, 0),
        totalSummons: SEC.clampInt(raw.stats.totalSummons, 0, 99999999, 0)
      };
    }
    if (raw.settings && typeof raw.settings === 'object') {
      base.settings = {
        speed: [1, 2, 3].includes(raw.settings.speed) ? raw.settings.speed : 2,
        sound: raw.settings.sound !== false,
        autoSellMaxQuality: SEC.clampInt(raw.settings.autoSellMaxQuality, -1, 3, -1)
      };
    }
    return base;
  }

  function init() {
    const loaded = SEC.loadSecure();
    if (loaded.status === 'ok') {
      S = sanitizeState(loaded.data);
    } else if (loaded.status === 'restored_backup') {
      S = sanitizeState(loaded.data);
      loadNotice = '直前の正常な記録から復旧しました';
    } else if (loaded.status === 'tampered') {
      S = createInitialState();
      loadNotice = 'データの異常を検知したため初期状態で開始しました';
      persist();
    } else {
      S = createInitialState();
      persist();
    }
    window.__IZ_AUDIO__.setEnabled(S.settings.sound);
  }

  function persist() {
    if (!S) return;
    SEC.saveSecure(S);
  }

  function consumeLoadNotice() {
    const n = loadNotice;
    loadNotice = '';
    return n;
  }

  /* 装備の持ち主検索 */
  function getEquipOwner(equipId) {
    for (const [cid, r] of Object.entries(S.roster)) {
      for (const sl of EDATA.SLOTS) {
        if (r.equips[sl.id] === equipId) return cid;
      }
    }
    return null;
  }

  function getEquipById(equipId) {
    return S.equips.find((e) => e.id === equipId) || null;
  }

  /* 装備単体ステータス値（品質倍率×シリーズ階級） */
  function getEquipStatValue(eq) {
    const series = EDATA.SERIES_MAP[eq.seriesId];
    const slot = EDATA.SLOT_MAP[eq.slotId];
    const qual = EDATA.QUALITIES[eq.quality];
    if (!series || !slot || !qual) return 0;
    return Math.round(slot.baseVal * series.tier * qual.mult);
  }

  /* 装備図鑑用：品質5段階すべてのパラメータ上昇値一覧 */
  function getEquipPartPreviewValues(seriesId, slotId) {
    const series = EDATA.SERIES_MAP[seriesId];
    const slot = EDATA.SLOT_MAP[slotId];
    if (!series || !slot) return [];
    return EDATA.QUALITIES.map((q) => ({
      qId: q.id,
      name: q.name,
      val: Math.round(slot.baseVal * series.tier * q.mult)
    }));
  }

  /* キャラの自由アビリティ解放枠数（覚醒0-1:1枠, 覚醒2-3:2枠, 覚醒4-5:3枠） */
  function getAbilitySlotCount(awake) {
    if (awake >= 4) return 3;
    if (awake >= 2) return 2;
    return 1;
  }

  /* キャラの現在総合ステータス・発動セット効果・パッシブ一括計算 */
  function getCharComputed(charId, partyIds) {
    const def = CDATA.CHAR_MAP[charId];
    const owned = S.roster[charId];
    if (!def) return null;
    const awake = owned ? owned.awake : 0;
    const rarMult = WDATA.RARITIES[def.rarity].mult;
    const awakeMult = 1 + awake * 0.14;

    let hpPct = 0, atkPct = 0, defPct = 0, spdFlat = 0;
    let crit = def.crit, critDmg = 1.5, skillPct = 0, healPct = 0, healRcvPct = 0;
    let dmgPct = 0, dmgCut = 0, startGauge = 0, afterGauge = 0, bossPct = 0, aoePct = 0, lifesteal = 0;
    let eqHp = 0, eqAtk = 0, eqDef = 0, eqSpd = 0;

    /* 固有アビリティ補正（全56体対応） */
    switch (def.id) {
      case 'c_ur_ignis':  atkPct += 0.12; break;
      case 'c_ur_levia':  dmgCut += 0.16; healRcvPct += 0.18; break;
      case 'c_ur_1':      crit += 0.10; dmgPct += 0.12; break;
      case 'c_ur_valk':   startGauge += 20; dmgPct += 0.14; break;
      case 'c_ur_6':      healPct += 0.20; break;
      case 'c_ur_5':      spdFlat += 6; bossPct += 0.18; break;
      case 'c_ur_chrono': startGauge += 12; break;
      case 'c_ur_kuchi':  lifesteal += 0.08; break;
      case 'c_tw_100':    hpPct += 0.10; atkPct += 0.10; defPct += 0.10; break;
      case 'c_ur_omega':  dmgPct += 0.18; bossPct += 0.18; break;
      case 'c_ur_7':      critDmg += 0.20; break;
      case 'c_ur_8':      startGauge += 18; break;
      case 'c_ur_9':      bossPct += 0.15; break;
      case 'c_ur_10':     hpPct += 0.14; healRcvPct += 0.16; break;
      case 'c_ssr_9':     hpPct += 0.12; dmgCut += 0.10; break;
      case 'c_ssr_3':     healPct += 0.15; break;
      case 'c_ssr_4':     bossPct += 0.16; break;
      case 'c_tw_50':     dmgPct += 0.14; crit += 0.08; break;
      case 'c_ssr_10':    startGauge += 18; spdFlat += 6; break;
      case 'c_tw_75':     spdFlat += 8; critDmg += 0.20; break;
      case 'c_ssr_6':     dmgPct += 0.12; break;
      case 'c_sr_1':      healPct += 0.10; break;
      case 'c_sr_2':      hpPct += 0.10; break;
      case 'c_sr_3':      dmgPct += 0.10; break;
      case 'c_tw_25':     healPct += 0.12; break;
      case 'c_sr_4':      crit += 0.10; break;
      case 'c_sr_6':      healRcvPct += 0.15; break;
      case 'c_sr_7':      spdFlat += 6; break;
      case 'c_sr_8':      startGauge += 20; break;
      case 'c_sr_9':      defPct += 0.12; break;
      case 'c_sr_10':     healPct += 0.12; break;
      case 'c_sr_11':     spdFlat += 6; crit += 0.08; break;
      case 'c_sr_12':     spdFlat += 6; startGauge += 12; break;
      case 'c_r_1':
      case 'c_n_3':       spdFlat += 5; break;
      case 'c_r_3':       defPct += 0.10; break;
      case 'c_r_4':
      case 'c_n_4':       healPct += 0.08; break;
      case 'c_r_6':       spdFlat += 6; break;
      case 'c_r_7':
      case 'c_n_5':       spdFlat += 4; break;
      case 'c_r_8':       dmgPct += 0.08; break;
      case 'c_n_1':       hpPct += 0.08; break;
      case 'c_n_2':       atkPct += 0.08; break;
      case 'c_n_6':       defPct += 0.08; break;
      default: break;
    }

    /* パッシブ技（常時系） */
    def.skills.forEach((sk) => {
      if (sk.scope === 'passive') {
        if (sk.passiveType === 'critBoost') { crit += 0.12; critDmg += sk.val; }
        if (sk.passiveType === 'dmgCut') dmgCut += sk.val;
      }
    });

    /* ① 刻印（12種・自由順解放） */
    if (owned) {
      owned.board.forEach((key) => {
        const node = CDATA.BOARD_TEMPLATES.find((t) => t.key === key);
        if (!node) return;
        if (node.stat === 'hpPct') hpPct += node.val;
        if (node.stat === 'atkPct') atkPct += node.val;
        if (node.stat === 'defPct') defPct += node.val;
        if (node.stat === 'spdFlat') spdFlat += node.val;
        if (node.stat === 'critPack') { crit += 0.12; critDmg += 0.20; }
        if (node.stat === 'skillPct') skillPct += node.val;
        if (node.stat === 'dmgCut') dmgCut += node.val;
        if (node.stat === 'startGauge') startGauge += node.val;
        if (node.stat === 'afterGauge') afterGauge += node.val;
        if (node.stat === 'bossPct') bossPct += node.val;
        if (node.stat === 'aoePct') aoePct += node.val;
        if (node.stat === 'healPack') { healPct += 0.18; healRcvPct += 0.12; }
      });
    }

    /* ② 装備4枠＆2/4セット効果（品質に応じてセット効果も強化） */
    const activeSets = [];
    if (owned) {
      const seriesGroups = {};
      EDATA.SLOTS.forEach((sl) => {
        const eq = getEquipById(owned.equips[sl.id]);
        if (!eq) return;
        const val = getEquipStatValue(eq);
        if (sl.baseStat === 'hp') eqHp += val;
        if (sl.baseStat === 'atk') eqAtk += val;
        if (sl.baseStat === 'def') eqDef += val;
        if (sl.baseStat === 'spd') eqSpd += val;
        if (!seriesGroups[eq.seriesId]) seriesGroups[eq.seriesId] = [];
        seriesGroups[eq.seriesId].push(eq);
      });

      Object.entries(seriesGroups).forEach(([sid, arr]) => {
        const ser = EDATA.SERIES_MAP[sid];
        const avgQ = arr.reduce((sum, e) => sum + EDATA.QUALITIES[e.quality].setMult, 0) / arr.length;
        if (arr.length >= 2) {
          activeSets.push({ seriesId: sid, name: ser.name, count: arr.length >= 4 ? 4 : 2, desc: arr.length >= 4 ? `${ser.set2.desc} / ${ser.set4.desc}` : ser.set2.desc });
          const s2 = ser.set2;
          if (s2.stat === 'hpPct') hpPct += s2.val * avgQ;
          if (s2.stat === 'atkPct') atkPct += s2.val * avgQ;
          if (s2.stat === 'defPct') defPct += s2.val * avgQ;
          if (s2.stat === 'spd') spdFlat += Math.round(s2.val * avgQ);
          if (s2.stat === 'crit') crit += s2.val * avgQ;
          if (s2.stat === 'healPct') healPct += s2.val * avgQ;
          if (s2.stat === 'allPct') { hpPct += s2.val * avgQ; atkPct += s2.val * avgQ; defPct += s2.val * avgQ; }
          if (s2.extraHp) hpPct += s2.extraHp * avgQ;
          if (s2.extraDef) defPct += s2.extraDef * avgQ;
          if (s2.extraSpd) spdFlat += Math.round(s2.extraSpd * avgQ);
          if (s2.extraCrit) crit += s2.extraCrit * avgQ;
          if (s2.extraHeal) healPct += s2.extraHeal * avgQ;
          if (s2.extraSkill) skillPct += s2.extraSkill * avgQ;
        }
        if (arr.length >= 4) {
          const s4 = ser.set4;
          if (s4.hpPct) hpPct += s4.hpPct * avgQ;
          if (s4.atkPct) atkPct += s4.atkPct * avgQ;
          if (s4.defPct) defPct += s4.defPct * avgQ;
          if (s4.spd) spdFlat += Math.round(s4.spd * avgQ);
          if (s4.crit) crit += s4.crit * avgQ;
          if (s4.critDmg) critDmg += s4.critDmg * avgQ;
          if (s4.skillPct) skillPct += s4.skillPct * avgQ;
          if (s4.healPct) healPct += s4.healPct * avgQ;
          if (s4.healRcvPct) healRcvPct += s4.healRcvPct * avgQ;
          if (s4.dmgPct) dmgPct += s4.dmgPct * avgQ;
          if (s4.dmgCut) dmgCut += s4.dmgCut * avgQ;
          if (s4.startGauge) startGauge += Math.round(s4.startGauge * avgQ);
          if (s4.afterGauge) afterGauge += Math.round(s4.afterGauge * avgQ);
          if (s4.bossPct) bossPct += s4.bossPct * avgQ;
          if (s4.aoePct) aoePct += s4.aoePct * avgQ;
        }
      });
    }

    /* ③ 自由アビリティ */
    if (owned) {
      const maxSlots = getAbilitySlotCount(awake);
      owned.abilities.slice(0, maxSlots).forEach((aid) => {
        const ab = EDATA.ABILITY_MAP[aid];
        if (!ab) return;
        const ef = ab.effect;
        if (ef.hpPct) hpPct += ef.hpPct;
        if (ef.atkPct) atkPct += ef.atkPct;
        if (ef.defPct) defPct += ef.defPct;
        if (ef.allPct) { hpPct += ef.allPct; atkPct += ef.allPct; defPct += ef.allPct; }
        if (ef.spd) spdFlat += ef.spd;
        if (ef.crit) crit += ef.crit;
        if (ef.critDmg) critDmg += ef.critDmg;
        if (ef.skillPct) skillPct += ef.skillPct;
        if (ef.healPct) healPct += ef.healPct;
        if (ef.healRcvPct) healRcvPct += ef.healRcvPct;
        if (ef.dmgPct) dmgPct += ef.dmgPct;
        if (ef.dmgCut) dmgCut += ef.dmgCut;
        if (ef.startGauge) startGauge += ef.startGauge;
        if (ef.afterGauge) afterGauge += ef.afterGauge;
        if (ef.bossPct) bossPct += ef.bossPct;
        if (ef.aoePct) aoePct += ef.aoePct;
        if (ef.lifesteal) lifesteal += ef.lifesteal;
      });
    }

    /* ④ 共鳴（控えキャラを共鳴させて能力＆特性加算） */
    let linkInfo = null;
    if (owned && owned.linkCharId && S.roster[owned.linkCharId]) {
      const linkDef = CDATA.CHAR_MAP[owned.linkCharId];
      const linkOwned = S.roster[owned.linkCharId];
      const isInActiveParty = Array.isArray(partyIds) && partyIds.includes(owned.linkCharId);
      if (!isInActiveParty && linkDef) {
        const linkScale = 1 + linkOwned.awake * 0.12 + linkOwned.board.length * 0.04;
        const lb = linkDef.linkBonus;
        if (lb.stat === 'hp') hpPct += (lb.val / 100) * linkScale;
        if (lb.stat === 'atk') atkPct += (lb.val / 100) * linkScale;
        if (lb.stat === 'def') defPct += (lb.val / 100) * linkScale;
        if (lb.stat === 'spd') spdFlat += Math.round(lb.val * linkScale);
        eqHp += Math.round(linkDef.hp * 0.10 * linkScale);
        eqAtk += Math.round(linkDef.atk * 0.10 * linkScale);
        eqDef += Math.round(linkDef.def * 0.10 * linkScale);
        linkInfo = { id: linkDef.id, name: linkDef.name, text: lb.text };
      }
    }

    /* ⑤ 3軸編成シナジー */
    if (Array.isArray(partyIds) && partyIds.length > 0) {
      const pChars = partyIds.map((id) => CDATA.CHAR_MAP[id]).filter(Boolean);
      const syn = EDATA.computePartySynergies(pChars).totals;
      hpPct += syn.hpPct;
      atkPct += syn.atkPct;
      defPct += syn.defPct;
      spdFlat += syn.spd;
      crit += syn.crit;
      healPct += syn.healPct;
      dmgPct += syn.dmgPct;
      dmgCut += syn.dmgCut;
    }

    const hp = Math.round((def.hp * rarMult * awakeMult + eqHp) * (1 + hpPct));
    const atk = Math.round((def.atk * rarMult * awakeMult + eqAtk) * (1 + atkPct));
    const defStat = Math.round((def.def * rarMult * awakeMult + eqDef) * (1 + defPct));
    const spd = Math.round(def.spd + eqSpd + spdFlat);
    const power = Math.round(hp * 0.22 + atk * 3.4 + defStat * 2.1 + spd * 5.2 + crit * 420);

    return {
      def,
      owned,
      awake,
      hp,
      atk,
      defStat,
      spd,
      crit: Math.min(0.95, crit),
      critDmg,
      skillPct,
      healPct,
      healRcvPct,
      dmgPct,
      dmgCut: Math.min(0.65, dmgCut),
      startGauge,
      afterGauge,
      bossPct,
      aoePct,
      lifesteal,
      power,
      activeSets,
      linkInfo
    };
  }

  /* キャラ入手（初回登録・重複時は覚醒させず魂晶＆結晶へ即時変換） */
  function grantChar(charId) {
    const def = CDATA.CHAR_MAP[charId];
    if (!def) return null;
    if (!S.roster[charId]) {
      S.roster[charId] = {
        awake: 0,
        board: [],
        equips: { weapon: null, armor: null, accessory: null, emblem: null },
        abilities: [],
        linkCharId: null
      };
      return { charId, status: 'new', name: def.name, rarity: def.rarity, el: def.el, role: def.role };
    }
    const soulMap = { N: 18, R: 32, SR: 65, SSR: 140, UR: 260 };
    const cryMap = { N: 35, R: 60, SR: 110, SSR: 220, UR: 400 };
    const gainSoul = soulMap[def.rarity] || 20;
    const gainCry = cryMap[def.rarity] || 40;
    S.soul += gainSoul;
    S.crystal += gainCry;
    return { charId, status: 'convert', gainSoul, gainCry, name: def.name, rarity: def.rarity, el: def.el, role: def.role };
  }

  /* 残響召喚（1回:120石 / 10連:1,100石・UR3% SSR10% SR25% R34% N28%・10枠目SR以上確定） */
  function doSummon(count) {
    const cost = count === 10 ? 1100 : 120;
    if (S.stone < cost) return { ok: false, msg: '残響石が不足しています' };
    S.stone -= cost;
    const pool = CDATA.CHARS.filter((c) => c.source === 'summon');
    const results = [];
    for (let i = 0; i < count; i++) {
      const forceHigh = (count === 10 && i === 9);
      const roll = Math.random();
      let rar = 'N';
      if (forceHigh) {
        rar = roll < 0.05 ? 'UR' : (roll < 0.25 ? 'SSR' : 'SR');
      } else if (roll < 0.03) {
        rar = 'UR';
      } else if (roll < 0.13) {
        rar = 'SSR';
      } else if (roll < 0.38) {
        rar = 'SR';
      } else if (roll < 0.72) {
        rar = 'R';
      } else {
        rar = 'N';
      }
      const candidates = pool.filter((c) => c.rarity === rar);
      const picked = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];
      results.push(grantChar(picked.id));
    }
    const order = { UR: 0, SSR: 1, SR: 2, R: 3, N: 4 };
    const highestRarity = results.reduce((best, r) => (order[r.rarity] < order[best] ? r.rarity : best), 'N');
    S.stats.totalSummons += count;
    persist();
    return { ok: true, results, highestRarity };
  }

  /* 異界討伐・限定キャラ解放（鍵5個で確定解放/覚醒） */
  function exchangeRaidChar(charId) {
    const have = S.shards[charId] || 0;
    if (have < 5) return { ok: false, msg: '解放の鍵が5個必要です' };
    S.shards[charId] -= 5;
    const res = grantChar(charId);
    persist();
    return { ok: true, result: res };
  }

  /* 異界討伐ボスUR 覇王降臨（覇王の印5個で確定解放/覚醒） */
  function exchangeRaidBoss(charId) {
    const have = S.bossMarks[charId] || 0;
    if (have < 5) return { ok: false, msg: '覇王の印が5個必要です' };
    S.bossMarks[charId] -= 5;
    const res = grantChar(charId);
    persist();
    return { ok: true, result: res };
  }

  /* 万能魂晶による手動覚醒 */
  function awakeWithSoul(charId) {
    const r = S.roster[charId];
    const def = CDATA.CHAR_MAP[charId];
    if (!r || !def) return { ok: false, msg: '未所持のキャラです' };
    if (r.awake >= 5) return { ok: false, msg: '最大覚醒に達しています' };
    const costMap = { N: 40, R: 70, SR: 120, SSR: 200, UR: 320 };
    const cost = costMap[def.rarity] + r.awake * 35;
    if (S.soul < cost) return { ok: false, msg: `魂晶が${cost}必要です` };
    S.soul -= cost;
    r.awake += 1;
    persist();
    return { ok: true, awake: r.awake, cost };
  }

  /* 刻印解放 */
  function unlockBoardNode(charId, nodeKey) {
    const r = S.roster[charId];
    const node = CDATA.BOARD_TEMPLATES.find((t) => t.key === nodeKey);
    if (!r || !node) return { ok: false, msg: '無効な刻印です' };
    if (r.board.includes(nodeKey)) return { ok: false, msg: '解放済みです' };
    if (S.crystal < node.cost) return { ok: false, msg: `結晶が${node.cost}必要です` };
    S.crystal -= node.cost;
    r.board.push(nodeKey);
    persist();
    return { ok: true, node };
  }

  /* 自由アビリティ解放（魂晶使用） */
  function unlockAbility(abId) {
    const ab = EDATA.ABILITY_MAP[abId];
    if (!ab || !ab.costSoul) return { ok: false, msg: '交換対象外です' };
    if (S.unlockedAbilities.includes(abId)) return { ok: false, msg: '解放済みです' };
    if (S.soul < ab.costSoul) return { ok: false, msg: `魂晶が${ab.costSoul}必要です` };
    S.soul -= ab.costSoul;
    S.unlockedAbilities.push(abId);
    persist();
    return { ok: true, ab };
  }

  /* 自由アビリティ着脱 */
  function toggleCharAbility(charId, abId) {
    const r = S.roster[charId];
    if (!r || !S.unlockedAbilities.includes(abId)) return { ok: false, msg: '装着できません' };
    const idx = r.abilities.indexOf(abId);
    if (idx >= 0) {
      r.abilities.splice(idx, 1);
      persist();
      return { ok: true, action: 'removed' };
    }
    const maxSlots = getAbilitySlotCount(r.awake);
    if (r.abilities.length >= maxSlots) {
      r.abilities.shift();
    }
    r.abilities.push(abId);
    persist();
    return { ok: true, action: 'equipped' };
  }

  /* 共鳴設定（出撃メンバー以外の控えキャラを共鳴） */
  function setCharLink(charId, linkCharId) {
    const r = S.roster[charId];
    if (!r) return { ok: false, msg: '対象が存在しません' };
    if (linkCharId === null) {
      r.linkCharId = null;
      persist();
      return { ok: true };
    }
    if (linkCharId === charId || !S.roster[linkCharId]) return { ok: false, msg: '共鳴できません' };
    Object.values(S.roster).forEach((other) => {
      if (other.linkCharId === linkCharId) other.linkCharId = null;
    });
    r.linkCharId = linkCharId;
    persist();
    return { ok: true };
  }

  /* パーティ編成変更 */
  function setPartySlot(slotIdx, charId) {
    if (slotIdx < 0 || slotIdx > 3) return { ok: false };
    if (charId === null) {
      const aliveCount = S.party.filter(Boolean).length;
      if (aliveCount <= 1 && S.party[slotIdx]) return { ok: false, msg: '最低1人は編成が必要です' };
      S.party[slotIdx] = null;
      persist();
      return { ok: true };
    }
    if (!S.roster[charId]) return { ok: false };
    const existing = S.party.indexOf(charId);
    if (existing >= 0) {
      const prev = S.party[slotIdx];
      S.party[existing] = prev;
    }
    S.party[slotIdx] = charId;
    persist();
    return { ok: true };
  }

  /* 総力連戦パーティ変更（3パーティ間で重複禁止） */
  function setGauntletSlot(teamIdx, slotIdx, charId) {
    if (teamIdx < 0 || teamIdx > 2 || slotIdx < 0 || slotIdx > 3) return { ok: false };
    if (charId === null) {
      S.gauntletParties[teamIdx][slotIdx] = null;
      persist();
      return { ok: true };
    }
    if (!S.roster[charId]) return { ok: false };
    S.gauntletParties.forEach((team) => {
      for (let i = 0; i < 4; i++) {
        if (team[i] === charId) team[i] = null;
      }
    });
    S.gauntletParties[teamIdx][slotIdx] = charId;
    persist();
    return { ok: true };
  }

  /* 品質抽選（常に高品質ほど低確率） */
  function rollQuality(bonusTier) {
    const shift = Math.min(0.45, (bonusTier || 0) * 0.05);
    const weights = [
      Math.max(24, 50 - shift * 35),
      28,
      14 + shift * 18,
      6 + shift * 11,
      2 + shift * 6
    ];
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return 0;
  }

  /* 装備ドロップ付与（自動売却設定を即時判定・部位単位で図鑑登録） */
  function grantEquipDrop(seriesId, bonusTier) {
    const slot = EDATA.SLOTS[Math.floor(Math.random() * EDATA.SLOTS.length)];
    const quality = rollQuality(bonusTier);
    S.codexEquips[`${seriesId}:${slot.id}`] = true;
    if (quality <= S.settings.autoSellMaxQuality) {
      const gold = EDATA.QUALITIES[quality].sellVal;
      S.gold += gold;
      return { autoSold: true, gold, seriesId, slotId: slot.id, quality };
    }
    const eq = makeEquipObj(seriesId, slot.id, quality);
    S.equips.push(eq);
    return { autoSold: false, equip: eq };
  }

  /* 限定装備製作（異界討伐素材を使用・品質抽選あり） */
  function craftLimitedEquip(seriesId, slotId) {
    const ser = EDATA.SERIES_MAP[seriesId];
    if (!ser || !ser.limited) return { ok: false, msg: '製作できない装備です' };
    const have = S.mats[ser.matId] || 0;
    if (have < ser.matCost) return { ok: false, msg: `限定素材が${ser.matCost}個必要です` };
    S.mats[ser.matId] -= ser.matCost;
    const quality = rollQuality(3);
    const eq = makeEquipObj(seriesId, slotId, quality);
    S.equips.push(eq);
    S.codexEquips[`${seriesId}:${slotId}`] = true;
    persist();
    return { ok: true, equip: eq };
  }

  /* 装備着脱 */
  function equipItem(charId, equipId) {
    const r = S.roster[charId];
    const eq = getEquipById(equipId);
    if (!r || !eq) return { ok: false };
    const owner = getEquipOwner(equipId);
    if (owner) S.roster[owner].equips[eq.slotId] = null;
    r.equips[eq.slotId] = equipId;
    persist();
    return { ok: true };
  }

  function unequipSlot(charId, slotId) {
    const r = S.roster[charId];
    if (!r) return { ok: false };
    r.equips[slotId] = null;
    persist();
    return { ok: true };
  }

  /* おまかせ最適装備 */
  function autoEquipChar(charId) {
    const r = S.roster[charId];
    if (!r) return { ok: false, changed: 0 };
    let changed = 0;
    EDATA.SLOTS.forEach((sl) => {
      const prevId = r.equips[sl.id];
      const candidates = S.equips.filter((e) => {
        if (e.slotId !== sl.id) return false;
        const ow = getEquipOwner(e.id);
        return !ow || ow === charId;
      });
      candidates.sort((a, b) => getEquipStatValue(b) - getEquipStatValue(a));
      if (candidates[0] && candidates[0].id !== prevId) {
        r.equips[sl.id] = candidates[0].id;
        changed++;
      }
    });
    if (changed > 0) persist();
    return { ok: true, changed };
  }

  /* 総力連戦3部隊のおまかせ自動編成 */
  function autoFillGauntletParties() {
    const ownedIds = Object.keys(S.roster);
    if (ownedIds.length < 3) return { ok: false, msg: '総力連戦には最低3体のキャラが必要です' };
    const ranked = ownedIds
      .map((id) => ({ id, power: getCharComputed(id, []).power }))
      .sort((a, b) => b.power - a.power)
      .map((x) => x.id);
    const teams = [[null, null, null, null], [null, null, null, null], [null, null, null, null]];
    for (let i = 0; i < Math.min(12, ranked.length); i++) {
      const tIdx = i % 3;
      const sIdx = Math.floor(i / 3);
      teams[tIdx][sIdx] = ranked[i];
    }
    S.gauntletParties = teams;
    persist();
    return { ok: true, count: Math.min(12, ranked.length) };
  }

  function toggleEquipLock(equipId) {
    const eq = getEquipById(equipId);
    if (!eq) return;
    eq.locked = !eq.locked;
    persist();
  }

  /* 一括売却（装着中・ロック保護済みは完全保護） */
  function bulkSellEquips(maxQuality) {
    const equippedSet = new Set();
    Object.values(S.roster).forEach((r) => {
      EDATA.SLOTS.forEach((sl) => {
        if (r.equips[sl.id]) equippedSet.add(r.equips[sl.id]);
      });
    });
    let soldCount = 0;
    let totalGold = 0;
    S.equips = S.equips.filter((eq) => {
      if (eq.locked || equippedSet.has(eq.id) || eq.quality > maxQuality) return true;
      soldCount++;
      totalGold += EDATA.QUALITIES[eq.quality].sellVal;
      return false;
    });
    S.gold += totalGold;
    persist();
    return { soldCount, totalGold };
  }

  /* 金貨→結晶・残響石への還元交換（1回／5回まとめて対応） */
  function buyResourceWithGold(kind, times) {
    const n = times === 5 ? 5 : 1;
    if (kind === 'crystal') {
      const cost = 400 * n;
      if (S.gold < cost) return { ok: false, msg: `金貨が${cost}必要です` };
      S.gold -= cost;
      S.crystal += 160 * n;
      persist();
      return { ok: true, msg: `結晶 +${160 * n} を獲得しました` };
    }
    if (kind === 'stone') {
      const cost = 600 * n;
      if (S.gold < cost) return { ok: false, msg: `金貨が${cost}必要です` };
      S.gold -= cost;
      S.stone += 120 * n;
      persist();
      return { ok: true, msg: `残響石 +${120 * n} を獲得しました` };
    }
    return { ok: false };
  }

  /* バトル報酬適用（覇王の印・塔限定キャラ加入も一括処理） */
  function applyBattleReward(reward) {
    S.stone += reward.stone || 0;
    S.crystal += reward.crystal || 0;
    S.gold += reward.gold || 0;
    S.soul += reward.soul || 0;
    if (reward.mats) {
      Object.entries(reward.mats).forEach(([k, v]) => {
        S.mats[k] = (S.mats[k] || 0) + v;
      });
    }
    if (reward.shards) {
      Object.entries(reward.shards).forEach(([k, v]) => {
        S.shards[k] = (S.shards[k] || 0) + v;
      });
    }
    if (reward.bossMarks) {
      Object.entries(reward.bossMarks).forEach(([k, v]) => {
        S.bossMarks[k] = (S.bossMarks[k] || 0) + v;
      });
    }
    const grantedChars = [];
    if (Array.isArray(reward.grantCharIds)) {
      reward.grantCharIds.forEach((cid) => {
        const gr = grantChar(cid);
        if (gr) grantedChars.push(gr);
      });
    }
    if (reward.unlockAbility && !S.unlockedAbilities.includes(reward.unlockAbility)) {
      S.unlockedAbilities.push(reward.unlockAbility);
    }
    if (reward.defeatedEnemyIds) {
      reward.defeatedEnemyIds.forEach((eid) => {
        S.codexEnemies[eid] = 1;
      });
    }
    if (reward.clearKey) {
      const { mode, id, floor } = reward.clearKey;
      if (mode === 'main') S.clearedStages[id] = true;
      if (mode === 'raid') S.clearedRaids[id] = true;
      if (mode === 'gauntlet') S.clearedGauntlets[id] = true;
      if (mode === 'trial') S.clearedTrials[id] = true;
      if (mode === 'tower' && floor > S.towerMaxCleared) S.towerMaxCleared = floor;
    }
    S.stats.totalRuns += 1;
    if (reward.hadIntruder) S.stats.totalIntruders += 1;
    persist();
    return { grantedChars };
  }

  /* 試練の狭間 編成条件検証 */
  function checkTrialRule(trial, partyIds) {
    const valid = partyIds.map((id) => CDATA.CHAR_MAP[id]).filter(Boolean);
    if (valid.length === 0) return { ok: false, reason: '出撃メンバーがいません' };
    switch (trial.ruleType) {
      case 'el':
        if (valid.every((c) => c.el === trial.ruleVal)) return { ok: true };
        return { ok: false, reason: trial.ruleText };
      case 'elPair':
        if (valid.every((c) => trial.ruleVal.includes(c.el))) return { ok: true };
        return { ok: false, reason: trial.ruleText };
      case 'rolesReq':
        if (trial.ruleVal.every((ro) => valid.some((c) => c.role === ro))) return { ok: true };
        return { ok: false, reason: trial.ruleText };
      case 'maxRar': {
        const minOrder = WDATA.RARITIES[trial.ruleVal].order;
        if (valid.every((c) => WDATA.RARITIES[c.rarity].order >= minOrder)) return { ok: true };
        return { ok: false, reason: trial.ruleText };
      }
      case 'maxCount':
        if (valid.length <= trial.ruleVal) return { ok: true };
        return { ok: false, reason: trial.ruleText };
      default:
        return { ok: true };
    }
  }

  /* 読み取り専用スナップショット取得 */
  function getSnapshot() {
    return {
      stone: S.stone,
      crystal: S.crystal,
      soul: S.soul,
      gold: S.gold,
      mats: { ...S.mats },
      shards: { ...S.shards },
      bossMarks: { ...S.bossMarks },
      roster: S.roster,
      party: S.party.slice(),
      gauntletParties: S.gauntletParties.map((p) => p.slice()),
      equips: S.equips.slice(),
      unlockedAbilities: S.unlockedAbilities.slice(),
      clearedStages: { ...S.clearedStages },
      clearedRaids: { ...S.clearedRaids },
      clearedGauntlets: { ...S.clearedGauntlets },
      clearedTrials: { ...S.clearedTrials },
      towerMaxCleared: S.towerMaxCleared,
      codexEnemies: { ...S.codexEnemies },
      codexEquips: { ...S.codexEquips },
      stats: { ...S.stats },
      settings: { ...S.settings }
    };
  }

  function getBattleSpeed() {
    return (S && S.settings && S.settings.speed) ? S.settings.speed : 2;
  }

  function setSpeed(spd) {
    S.settings.speed = [1, 2, 3].includes(spd) ? spd : 2;
    persist();
  }

  function setSound(on) {
    S.settings.sound = Boolean(on);
    window.__IZ_AUDIO__.setEnabled(S.settings.sound);
    persist();
  }

  function setAutoSellQuality(q) {
    S.settings.autoSellMaxQuality = SEC.clampInt(q, -1, 3, -1);
    persist();
  }

  function exportCode() {
    return SEC.exportTransferCode(S);
  }

  function importCode(code) {
    const res = SEC.importTransferCode(code);
    if (!res.ok) return { ok: false, msg: '引き継ぎコードが正しくありません' };
    S = sanitizeState(res.data);
    persist();
    window.__IZ_AUDIO__.setEnabled(S.settings.sound);
    return { ok: true, msg: 'データを復元しました' };
  }

  function resetAllData() {
    SEC.clearSecure();
    S = createInitialState();
    persist();
  }

  Object.defineProperty(window, '__IZ_STATE__', {
    value: Object.freeze({
      init,
      consumeLoadNotice,
      getSnapshot,
      sortCharIds,
      getAllCharIdsSorted,
      getCharComputed,
      getEquipOwner,
      getEquipById,
      getEquipStatValue,
      getEquipPartPreviewValues,
      getAbilitySlotCount,
      doSummon,
      exchangeRaidChar,
      exchangeRaidBoss,
      awakeWithSoul,
      unlockBoardNode,
      unlockAbility,
      toggleCharAbility,
      setCharLink,
      setPartySlot,
      setGauntletSlot,
      autoFillGauntletParties,
      grantEquipDrop,
      craftLimitedEquip,
      equipItem,
      unequipSlot,
      autoEquipChar,
      toggleEquipLock,
      bulkSellEquips,
      buyResourceWithGold,
      applyBattleReward,
      checkTrialRule,
      getBattleSpeed,
      setSpeed,
      setSound,
      setAutoSellQuality,
      exportCode,
      importCode,
      resetAllData
    }),
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
