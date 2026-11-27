(function (root) {
  'use strict';

  const IkaiApp = root.IkaiApp = root.IkaiApp || {};

  const TABS = [
    { id: 'areas', label: '出撃', icon: 'sword' },
    { id: 'party', label: '編成', icon: 'party' },
    { id: 'roster', label: '強化', icon: 'enhance' },
    { id: 'expedition', label: '調査', icon: 'compass' },
    { id: 'summon', label: '召喚', icon: 'summon' },
    { id: 'codex', label: '図鑑', icon: 'book' },
    { id: 'records', label: '設定', icon: 'settings' }
  ];

  const POLICY_LABELS = {
    aggressive: '全力攻撃',
    balanced: '均衡',
    defensive: '防御支援',
    conserve: '温存'
  };

  const TARGET_LABELS = {
    lowest_hp: 'HP最低',
    boss_first: 'ボス優先',
    fastest_enemy: '高速敵',
    debuffed_first: '弱体敵'
  };

  const PRIORITY_LABELS = {
    unique_first: '固有優先',
    collect_first: '収集優先',
    auto: '自動判断'
  };

  const POLICY_ORDER = ['aggressive', 'balanced', 'defensive', 'conserve'];
  const TARGET_ORDER = ['lowest_hp', 'boss_first', 'fastest_enemy', 'debuffed_first'];
  const PRIORITY_ORDER = ['unique_first', 'collect_first', 'auto'];

  const BUFF_ICON_MAP = {
    atkUp: 'atk_up',
    defUp: 'def_up',
    defPct: 'def_up',
    dmgDealtPct: 'atk_up',
    dmgDown: 'dmg_down',
    spdUp: 'spd_up',
    critUp: 'crit_up',
    atkDown: 'atk_down',
    defDown: 'def_down',
    spdDown: 'spd_down',
    critDown: 'crit_down',
    healDown: 'heal_down',
    shield: 'shield',
    regen: 'regen',
    counter: 'counter',
    taunt: 'taunt',
    burn: 'burn',
    stun: 'stun',
    freeze: 'freeze',
    vuln: 'vuln'
  };

  const BUFF_LEGEND = [
    { stat: 'stun', iconKey: 'stun', label: '気絶（行動不能）', kind: 'debuff', crit: true },
    { stat: 'freeze', iconKey: 'freeze', label: '凍結（行動不能）', kind: 'debuff', crit: true },
    { stat: 'burn', iconKey: 'burn', label: '火傷（継続HP減少）', kind: 'debuff', crit: true },
    { stat: 'taunt', iconKey: 'taunt', label: '挑発（単体攻撃誘導）', kind: 'buff', def: true },
    { stat: 'counter', iconKey: 'counter', label: '反撃（被弾時反撃）', kind: 'buff', def: true },
    { stat: 'shield', iconKey: 'shield', label: '障壁（ダメージ吸収）', kind: 'buff', def: true },
    { stat: 'dmgDown', iconKey: 'dmg_down', label: '被ダメ軽減', kind: 'buff', def: true },
    { stat: 'defUp', iconKey: 'def_up', label: 'DEF上昇', kind: 'buff', def: true },
    { stat: 'defPct', iconKey: 'def_up', label: 'DEF累積（特性）', kind: 'buff', def: true },
    { stat: 'atkUp', iconKey: 'atk_up', label: 'ATK上昇', kind: 'buff' },
    { stat: 'dmgDealtPct', iconKey: 'atk_up', label: '与ダメ累積（特性）', kind: 'buff' },
    { stat: 'spdUp', iconKey: 'spd_up', label: 'SPD上昇', kind: 'buff' },
    { stat: 'critUp', iconKey: 'crit_up', label: '会心率上昇', kind: 'buff' },
    { stat: 'regen', iconKey: 'regen', label: '再生（毎行動回復）', kind: 'buff' },
    { stat: 'atkDown', iconKey: 'atk_down', label: 'ATK低下', kind: 'debuff' },
    { stat: 'defDown', iconKey: 'def_down', label: 'DEF低下', kind: 'debuff' },
    { stat: 'spdDown', iconKey: 'spd_down', label: 'SPD低下', kind: 'debuff' },
    { stat: 'critDown', iconKey: 'crit_down', label: '会心率低下', kind: 'debuff' },
    { stat: 'healDown', iconKey: 'heal_down', label: '被回復量低下', kind: 'debuff' },
    { stat: 'vuln', iconKey: 'vuln', label: '脆弱（被ダメ増加）', kind: 'debuff' }
  ];

  const BUFF_META_MAP = {};
  BUFF_LEGEND.forEach(function (item) {
    BUFF_META_MAP[item.stat] = item;
  });

  let battleRefs = null;
  let lastDpsDetailFlag = null;
  let lastBattleDetailMode = null;
  let lastHubScrollKey = '';

  function el(tag, opts, children) {
    return IkaiApp.Env.createEl(tag, opts, children);
  }

  function clearNode(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function hasOwn(obj, key) {
    return Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function findCharById(charId) {
    const MasterData = IkaiApp.MasterData;
    return (MasterData && hasOwn(MasterData.CHARACTER_MAP, charId))
      ? MasterData.CHARACTER_MAP[charId]
      : MasterData.CHARACTERS[0];
  }

  function findAreaById(areaId) {
    const areas = IkaiApp.MasterData.AREAS;
    for (let i = 0; i < areas.length; i += 1) {
      if (areas[i].id === areaId) {
        return areas[i];
      }
    }
    return areas[0];
  }

  function findStageInArea(area, stageId) {
    for (let i = 0; i < area.stages.length; i += 1) {
      if (area.stages[i].id === stageId) {
        return area.stages[i];
      }
    }
    return area.stages[0];
  }

  function mapBuffIconKey(stat) {
    return hasOwn(BUFF_ICON_MAP, stat) ? BUFF_ICON_MAP[stat] : 'shield';
  }

  function formatStatsLine(stats) {
    if (!stats) return '';
    const parts = [];
    if (stats.hp) parts.push('HP+' + stats.hp);
    if (stats.atk) parts.push('ATK+' + stats.atk);
    if (stats.def) parts.push('DEF+' + stats.def);
    if (stats.spd) parts.push('SPD+' + stats.spd);
    if (stats.crit) parts.push('会心+' + stats.crit + '%');
    return parts.join(' ');
  }

  function getActiveExpCharSet(state) {
    const set = new Set();
    const list = state && Array.isArray(state.expeditions) ? state.expeditions : [];
    for (let i = 0; i < list.length; i += 1) {
      const exp = list[i];
      if (exp && !exp.claimed && Array.isArray(exp.charIds)) {
        for (let c = 0; c < exp.charIds.length; c += 1) {
          set.add(exp.charIds[c]);
        }
      }
    }
    return set;
  }

  function getEquippedOwnerMap(state) {
    const map = new Map();
    if (!state || !state.roster) return map;
    const cids = Object.keys(state.roster);
    for (let i = 0; i < cids.length; i += 1) {
      const cid = cids[i];
      const entry = state.roster[cid];
      if (!entry || !entry.equipped) continue;
      const slots = Object.keys(entry.equipped);
      for (let s = 0; s < slots.length; s += 1) {
        const uid = entry.equipped[slots[s]];
        if (uid) {
          map.set(uid, cid);
        }
      }
    }
    return map;
  }

  function buildNoticeNodes(uiState) {
    const nodes = [];
    if (uiState.tamperWarning) {
      nodes.push(el('div', {
        className: 'notice-banner is-error',
        text: '起動時署名検証エラー：' + uiState.tamperWarning
      }));
    }
    if (uiState.notice) {
      const cls = uiState.notice.type === 'error'
        ? 'notice-banner is-error'
        : (uiState.notice.type === 'ok' ? 'notice-banner is-ok' : 'notice-banner');
      nodes.push(el('div', {
        className: cls,
        attrs: { role: 'status' },
        text: uiState.notice.text
      }));
    }
    return nodes;
  }

  function buffPriority(item) {
    if (item.stat === 'stun' || item.stat === 'freeze') return 0;
    if (item.stat === 'taunt' || item.stat === 'counter' || item.stat === 'shield') return 1;
    if (item.stat === 'burn' || item.stat === 'healDown' || item.stat === 'vuln') return 2;
    return item.isBuff ? 3 : 4;
  }

  function buildBuffStrip(buffs, debuffs) {
    const SvgIcons = IkaiApp.SvgIcons;
    const allItems = [];
    for (let i = 0; i < buffs.length; i += 1) {
      allItems.push({ stat: buffs[i].stat, value: buffs[i].value, duration: buffs[i].duration, isBuff: true });
    }
    for (let i = 0; i < debuffs.length; i += 1) {
      allItems.push({ stat: debuffs[i].stat, value: debuffs[i].value, duration: debuffs[i].duration, isBuff: false });
    }
    allItems.sort(function (a, b) {
      return buffPriority(a) - buffPriority(b);
    });

    const maxItems = 4;
    const list = [];
    const shownCount = Math.min(allItems.length, maxItems);
    for (let i = 0; i < shownCount; i += 1) {
      const it = allItems[i];
      const meta = hasOwn(BUFF_META_MAP, it.stat) ? BUFF_META_MAP[it.stat] : null;
      let cls = it.isBuff ? 'buff-badge is-buff' : 'buff-badge is-debuff';
      if (meta && meta.def) cls += ' is-buff-def';
      if (meta && meta.crit) cls += ' is-debuff-crit';
      list.push(el('span', { className: cls }, [
        SvgIcons.createBuffIcon(mapBuffIconKey(it.stat), 'buff-svg'),
        el('span', { className: 'buff-dur', text: String(it.duration) })
      ]));
    }
    if (allItems.length > maxItems) {
      list.push(el('span', {
        className: 'buff-badge is-overflow',
        text: '+' + (allItems.length - maxItems)
      }));
    }
    return list;
  }

  function makeHpTrack(trackClass, fillClass, hpPct, shieldPct) {
    const lagFill = el('div', { className: 'meter-lag' });
    lagFill.style.width = hpPct + '%';
    const hpFill = el('div', { className: 'meter-fill bar-smooth ' + fillClass });
    hpFill.style.width = hpPct + '%';
    const shieldFill = el('div', { className: 'meter-shield' });
    shieldFill.style.width = (shieldPct || 0) + '%';
    const track = el('div', { className: 'meter-track ' + trackClass }, [lagFill, hpFill, shieldFill]);
    return { track, lagFill, hpFill, shieldFill };
  }

  function formatUnitHpText(u, includePct) {
    const base = u.hp + '/' + u.maxHp + (includePct ? (' (' + Math.round(u.hpPct) + '%)') : '');
    return u.shield > 0 ? (base + ' 盾+' + u.shield) : base;
  }

  function calcShieldPct(u) {
    if (!u || !u.maxHp || u.shield <= 0) return 0;
    return Math.min(100, Math.round((u.shield / u.maxHp) * 100));
  }

  function signatureOfEffects(buffs, debuffs) {
    const bStr = buffs.map(function (b) { return b.stat + ':' + b.duration; }).join(',');
    const dStr = debuffs.map(function (d) { return d.stat + ':' + d.duration; }).join(',');
    return bStr + '|' + dStr;
  }

  function buildTopBar(state) {
    const SvgIcons = IkaiApp.SvgIcons;
    const emblemIcon = SvgIcons.createUiIcon('compass');
    const c = state.currencies;

    return el('header', { className: 'stage-topbar' }, [
      el('div', { className: 'stage-brand' }, [
        emblemIcon,
        el('span', { className: 'stage-title', text: IkaiApp.MasterData.TITLE })
      ]),
      el('div', { className: 'stage-currencies' }, [
        el('span', { className: 'currency-pill', text: '残響石 ' + c.echoStones }),
        el('span', { className: 'currency-pill', text: '星貨 ' + c.starCoins }),
        el('span', { className: 'currency-pill', text: '結晶 ' + c.exchangeCrystals }),
        el('span', { className: 'currency-pill', text: '紋章片 ' + c.emblemShards })
      ])
    ]);
  }

  // =========================================================================
  // Upper Stage Context Previews (0-50%, pointer-events: none, <= 315px)
  // =========================================================================

  function renderUpperRoster(state, uiState) {
    const SvgIcons = IkaiApp.SvgIcons;
    const MasterData = IkaiApp.MasterData;
    const charDef = findCharById(uiState.selectedCharId);
    const owned = hasOwn(state.roster, charDef.id) ? state.roster[charDef.id] : null;
    const partyIdx = state.party.indexOf(charDef.id);
    const expSet = getActiveExpCharSet(state);
    const resIdx = state.resonanceSlots.indexOf(charDef.id);
    const statusLabel = partyIdx >= 0
      ? '編成枠' + (partyIdx + 1)
      : (expSet.has(charDef.id) ? '調査派遣中' : (resIdx >= 0 ? '共鳴支援' + (resIdx + 1) : (owned ? '所持控え' : '未契約')));
    const st = charDef.baseStats;

    let extraBlock;
    if (uiState.enhanceSub === 'emblem' && owned) {
      extraBlock = el('div', { className: 'detail-block' }, [
        el('div', { className: 'detail-heading', text: '紋章ボード解放状況：' + owned.emblemNodes.length + ' / 12 節点' }),
        el('div', { className: 'detail-desc', text: '第1層(覚醒0) → 第2層(覚醒2) → 第3層(第2層全解放)。所持紋章片 ' + state.currencies.emblemShards })
      ]);
    } else if (uiState.enhanceSub === 'skills') {
      const sk = hasOwn(MasterData.SKILL_MAP, uiState.selectedSkillId) ? MasterData.SKILL_MAP[uiState.selectedSkillId] : MasterData.SKILLS[0];
      const inv = hasOwn(state.skillInventory, sk.id) ? state.skillInventory[sk.id] : null;
      const rInfo = inv ? MasterData.SKILL_MASTERY_RANKS[inv.rank - 1] : MasterData.SKILL_MASTERY_RANKS[0];
      extraBlock = el('div', { className: 'detail-block' }, [
        el('div', { className: 'detail-heading', text: '収集技『' + sk.name + '』［' + sk.rarity + ' / ' + sk.targetType + '］' }),
        el('div', { className: 'detail-desc', text: (inv ? ('熟練ランク' + rInfo.label + '・使用' + inv.uses + '回') : '未習得') + ' ／ 熟練の書 ' + state.currencies.masteryBooks + ' 冊' })
      ]);
    } else if (uiState.enhanceSub === 'equips') {
      const eq = uiState.selectedEquipUid ? state.equips.find(function (e) { return e.uid === uiState.selectedEquipUid; }) : null;
      const eqDef = eq && hasOwn(MasterData.EQUIP_MAP, eq.equipId) ? MasterData.EQUIP_MAP[eq.equipId] : null;
      const qRank = eq ? MasterData.QUALITY_RANKS[eq.qualityIdx] : null;
      const pityKey = eq ? (eq.equipId + ':' + eq.qualityIdx) : '';
      const pityCur = pityKey ? (state.synthesisPity[pityKey] || 0) : 0;
      const rule = eq && eq.qualityIdx < 4 ? MasterData.EQUIP_SYNTHESIS_RULES[eq.qualityIdx] : null;
      extraBlock = el('div', { className: 'detail-block' }, [
        el('div', {
          className: 'detail-heading',
          text: eqDef ? ('選択装備：' + eqDef.name + '［' + qRank.name + '・' + eqDef.slot + '］') : ('所持装備：' + state.equips.length + ' 個 ／ 昇格触媒 ' + state.currencies.qualityCatalysts + ' 個')
        }),
        el('div', {
          className: 'detail-desc',
          text: eqDef && rule
            ? (formatStatsLine(IkaiApp.Progression.getEquipStats(eq.equipId, eq.qualityIdx)) + ' ／ 合成天井 ' + pityCur + '/' + rule.pityMax)
            : '同種同品質の合成で昇格。天井到達で100%昇格保証。'
        })
      ]);
    } else {
      extraBlock = el('div', { className: 'detail-block' }, [
        el('div', { className: 'detail-heading', text: '特性『' + charDef.trait.name + '』 ／ 共鳴：' + charDef.resonance.description }),
        el('div', { className: 'detail-desc', text: charDef.trait.description + (owned ? (' ／ 覚醒片 ' + owned.shards + '・汎用結晶 ' + state.currencies.universalShards) : '') })
      ]);
    }

    return el('div', { className: 'stage-body anim-fade-in' }, [
      el('div', { className: 'unit-preview-card rarity-' + charDef.rarity }, [
        el('div', { className: 'unit-ident' }, [
          SvgIcons.createRoleIcon(charDef.role, 'icon-svg-lg'),
          el('div', { className: 'unit-text-col' }, [
            el('div', { className: 'unit-kana', text: charDef.kana }),
            el('div', { className: 'unit-name', text: charDef.name })
          ]),
          el('div', { className: 'unit-meta-right' }, [
            el('span', { className: 'rarity-badge rarity-' + charDef.rarity, text: charDef.rarity }),
            el('span', { className: 'role-chip', text: charDef.role }),
            el('span', { className: owned ? 'tag-chip tag-chip-owned' : 'tag-chip', text: statusLabel })
          ])
        ]),
        el('div', { className: 'stats-grid' }, [
          el('div', { className: 'stat-cell' }, [
            el('span', { className: 'stat-label', text: 'HP' }),
            el('span', { className: 'stat-value', text: String(st.hp) })
          ]),
          el('div', { className: 'stat-cell' }, [
            el('span', { className: 'stat-label', text: 'ATK' }),
            el('span', { className: 'stat-value', text: String(st.atk) })
          ]),
          el('div', { className: 'stat-cell' }, [
            el('span', { className: 'stat-label', text: 'DEF' }),
            el('span', { className: 'stat-value', text: String(st.def) })
          ]),
          el('div', { className: 'stat-cell' }, [
            el('span', { className: 'stat-label', text: 'SPD' }),
            el('span', { className: 'stat-value', text: String(st.spd) })
          ]),
          el('div', { className: 'stat-cell' }, [
            el('span', { className: 'stat-label', text: '会心率' }),
            el('span', { className: 'stat-value', text: st.crit + '%' })
          ]),
          el('div', { className: 'stat-cell' }, [
            el('span', { className: 'stat-label', text: '覚醒段階' }),
            el('span', { className: 'stat-value', text: owned ? String(owned.awakening) + ' / 3' : '0 / 3' })
          ])
        ]),
        el('div', { className: 'detail-block' }, [
          el('div', {
            className: 'detail-heading',
            text: '固有技『' + charDef.uniqueSkill.name + '』［' + charDef.uniqueSkill.targetType + ' / CT' + charDef.uniqueSkill.cooldown + '］'
          }),
          el('div', { className: 'detail-desc', text: charDef.uniqueSkill.description })
        ]),
        extraBlock
      ])
    ]);
  }

  function renderUpperAreas(state, uiState) {
    const MasterData = IkaiApp.MasterData;
    const SvgIcons = IkaiApp.SvgIcons;

    if (uiState.areasPillar === 'abyss') {
      const floor = Math.max(1, uiState.selectedAbyssFloor || 1);
      const scale = MasterData.ABYSS_CONFIG.baseHpScale + (floor - 1) * MasterData.ABYSS_CONFIG.perFloorGrowth;
      const isBossFloor = floor % 5 === 0;
      const isTenFloor = floor % 10 === 0;
      return el('div', { className: 'stage-body anim-fade-in' }, [
        el('div', { className: 'stage-preview-card' }, [
          el('div', { className: 'unit-ident' }, [
            SvgIcons.createUiIcon(isBossFloor ? 'warning' : 'sword', 'icon-svg-lg'),
            el('div', { className: 'unit-text-col' }, [
              el('div', { className: 'unit-name', text: '無限深淵 第' + floor + '層' }),
              el('div', { className: 'unit-kana', text: '最高踏破記録：第' + state.progress.abyssMaxFloor + '層 ／ 敵補正 ×' + scale.toFixed(2) })
            ]),
            isBossFloor
              ? el('span', { className: 'tag-chip tag-chip-boss', text: isTenFloor ? '節目の大ボス層' : '守護ボス層' })
              : el('span', { className: 'tag-chip', text: '通常階層' })
          ]),
          el('div', { className: 'detail-block' }, [
            el('div', { className: 'detail-heading', text: '踏破報酬見込' }),
            el('div', {
              className: 'detail-desc',
              text: isTenFloor
                ? '10階層節目初回：残響石300追加・交換結晶15・秀以上確定装備ドロップ'
                : (isBossFloor ? '5階層節目：残響石+100・良以上確定装備ドロップ' : '階層踏破ごとに残響石・星貨・紋章片・熟練の書を獲得')
            })
          ])
        ])
      ]);
    }

    if (uiState.areasPillar === 'raid') {
      const boss = MasterData.RAID_BOSSES.find(function (b) { return b.id === uiState.selectedRaidId; }) || MasterData.RAID_BOSSES[0];
      const diff = boss.difficulties.find(function (d) { return d.id === uiState.selectedRaidDiff; }) || boss.difficulties[0];
      const clearedVal = state.progress.raidCleared && state.progress.raidCleared[boss.id] ? state.progress.raidCleared[boss.id][diff.id] : 0;
      const clearCount = clearedVal === true ? 1 : (Number(clearedVal) || 0);
      const bestDmg = state.progress.raidBestDamage && state.progress.raidBestDamage[boss.id] ? (state.progress.raidBestDamage[boss.id][diff.id] || 0) : 0;
      const qMinName = MasterData.QUALITY_RANKS[diff.rewards.minQualityIdx].name;

      return el('div', { className: 'stage-body anim-fade-in' }, [
        el('div', { className: 'stage-preview-card' }, [
          el('div', { className: 'unit-ident' }, [
            SvgIcons.createUiIcon('warning', 'icon-svg-lg'),
            el('div', { className: 'unit-text-col' }, [
              el('div', { className: 'unit-name', text: boss.name }),
              el('div', { className: 'unit-kana', text: boss.subtitle + '［' + diff.name + '］' })
            ]),
            el('span', { className: 'tag-chip tag-chip-boss', text: '討伐 ' + clearCount + '回' })
          ]),
          el('div', { className: 'stats-grid' }, [
            el('div', { className: 'stat-cell' }, [
              el('span', { className: 'stat-label', text: 'ボスHP' }),
              el('span', { className: 'stat-value', text: String(diff.hp) })
            ]),
            el('div', { className: 'stat-cell' }, [
              el('span', { className: 'stat-label', text: 'ATK / SPD' }),
              el('span', { className: 'stat-value', text: diff.atk + ' / ' + diff.spd })
            ]),
            el('div', { className: 'stat-cell' }, [
              el('span', { className: 'stat-label', text: '最大与ダメ記録' }),
              el('span', { className: 'stat-value', text: String(bestDmg) })
            ])
          ]),
          el('div', { className: 'detail-block' }, [
            el('div', { className: 'detail-heading', text: '討伐報酬（品質「' + qMinName + '」以上装備確定）' }),
            el('div', { className: 'detail-desc', text: '残響石 ' + diff.rewards.echoStones + '・星貨 ' + diff.rewards.starCoins + '・紋章片 ' + diff.rewards.emblemShards + '・熟練の書 ' + diff.rewards.masteryBooks })
          ])
        ])
      ]);
    }

    if (uiState.areasPillar === 'trial') {
      const trial = MasterData.TRIALS.find(function (t) { return t.id === uiState.selectedTrialId; }) || MasterData.TRIALS[0];
      const check = IkaiApp.Progression.validateTrialEntry(state, trial.id, state.party);
      const isCleared = state.progress.trialsCleared.indexOf(trial.id) >= 0;
      const rw = trial.rewards;
      const rwParts = [];
      if (rw.echoStones) rwParts.push('残響石' + rw.echoStones);
      if (rw.starCoins) rwParts.push('星貨' + rw.starCoins);
      if (rw.emblemShards) rwParts.push('紋章片' + rw.emblemShards);
      if (rw.masteryBooks) rwParts.push('熟練の書' + rw.masteryBooks);
      if (rw.universalShards) rwParts.push('汎用結晶' + rw.universalShards);
      if (rw.qualityCatalysts) rwParts.push('昇格触媒' + rw.qualityCatalysts);
      if (rw.exchangeCrystals) rwParts.push('交換結晶' + rw.exchangeCrystals);

      return el('div', { className: 'stage-body anim-fade-in' }, [
        el('div', { className: 'stage-preview-card' }, [
          el('div', { className: 'unit-ident' }, [
            SvgIcons.createUiIcon(check.ok ? 'check' : 'warning', 'icon-svg-lg'),
            el('div', { className: 'unit-text-col' }, [
              el('div', { className: 'unit-name', text: trial.name }),
              el('div', { className: 'unit-kana', text: trial.description })
            ]),
            el('span', {
              className: check.ok ? 'tag-chip tag-chip-owned' : 'tag-chip tag-chip-boss',
              text: check.ok ? (isCleared ? '制覇済・出撃可' : '条件適合') : '制約違反'
            })
          ]),
          el('div', { className: 'detail-block' }, [
            el('div', { className: 'detail-heading', text: isCleared ? '再挑戦報酬（初回報酬獲得済）' : '初回突破報酬' }),
            el('div', { className: 'detail-desc', text: isCleared ? '星貨 500 ／ 紋章片 5' : rwParts.join(' ／ ') })
          ])
        ])
      ]);
    }

    // Default: story
    const area = findAreaById(uiState.selectedAreaId);
    const stage = findStageInArea(area, uiState.selectedStageId);
    const boss = stage.bossId ? MasterData.ENEMIES[stage.bossId] : null;
    const bossSkill = boss && boss.skills && boss.skills[0] ? boss.skills[0] : null;

    return el('div', { className: 'stage-body anim-fade-in' }, [
      el('div', { className: 'detail-block' }, [
        el('div', { className: 'detail-heading', text: '第' + area.order + '異界：' + area.name }),
        el('div', { className: 'detail-desc', text: area.modernTheme + ' × ' + area.otherworldTheme + ' — ' + area.description })
      ]),
      el('div', { className: 'stage-preview-card' }, [
        el('div', { className: 'unit-ident' }, [
          SvgIcons.createUiIcon(stage.isBossStage ? 'warning' : 'sword', 'icon-svg-lg'),
          el('div', { className: 'unit-text-col' }, [
            el('div', { className: 'unit-name', text: stage.id + ' ' + stage.name }),
            el('div', { className: 'unit-kana', text: stage.subtitle + '（全' + stage.waves.length + 'WAVE・敵倍率 ×' + stage.statScale.toFixed(2) + '）' })
          ]),
          stage.isBossStage
            ? el('span', {
                className: 'tag-chip tag-chip-boss',
                text: stage.bossType === 'area' ? 'エリアボス戦' : '中ボス戦'
              })
            : el('span', { className: 'tag-chip', text: '通常掃討' })
        ]),
        el('div', { className: 'detail-block' }, [
          el('div', {
            className: 'detail-heading',
            text: boss ? '出現ボス：' + boss.name : '構成ウェーブ情報'
          }),
          el('div', {
            className: 'detail-desc',
            text: bossSkill && bossSkill.telegraph
              ? bossSkill.telegraph.warningText + '（区分：' + bossSkill.targetType + ' / 予告' + bossSkill.telegraph.chargeTurns + '行動）'
              : '全5ウェーブの異界存在を突破し、初回残響石 ' + stage.firstClearRewards.echoStones + ' 個を獲得。'
          })
        ])
      ])
    ]);
  }

  function renderUpperParty(state) {
    const MasterData = IkaiApp.MasterData;
    const SvgIcons = IkaiApp.SvgIcons;

    const partyCards = state.party.map(function (cid, idx) {
      if (!cid || !hasOwn(MasterData.CHARACTER_MAP, cid)) {
        return el('div', { className: 'upper-party-card' }, [
          el('span', { className: 'muted-note', text: '出撃枠 ' + (idx + 1) + '：空き' })
        ]);
      }
      const ch = MasterData.CHARACTER_MAP[cid];
      const entry = state.roster[cid];
      const tac = entry ? entry.tactic : { policy: 'balanced' };
      return el('div', { className: 'upper-party-card rarity-' + ch.rarity }, [
        el('div', { className: 'unit-ident' }, [
          SvgIcons.createRoleIcon(ch.role, 'plate-role-svg'),
          el('span', { className: 'unit-name', text: ch.name })
        ]),
        el('div', {
          className: 'unit-kana',
          text: ch.rarity + '・' + ch.role + ' ／ 方針：' + (POLICY_LABELS[tac.policy] || '均衡')
        })
      ]);
    });

    const resTexts = state.resonanceSlots.map(function (cid, idx) {
      if (!cid || !hasOwn(MasterData.CHARACTER_MAP, cid)) {
        return '枠' + (idx + 1) + ':空';
      }
      const ch = MasterData.CHARACTER_MAP[cid];
      return ch.name + '(' + ch.resonance.description + ')';
    });

    return el('div', { className: 'stage-body anim-fade-in' }, [
      el('div', { className: 'upper-party-grid' }, partyCards),
      el('div', { className: 'detail-block' }, [
        el('div', { className: 'detail-heading', text: '共鳴支援枠（控えキャラのパッシブ恩恵を全員へ付与）' }),
        el('div', { className: 'detail-desc', text: resTexts.join(' ／ ') })
      ])
    ]);
  }

  function renderUpperExpedition(state) {
    const MasterData = IkaiApp.MasterData;
    const cards = MasterData.EXPEDITION_ZONES.map(function (zone) {
      const activeIdx = state.expeditions.findIndex(function (e) { return e.zoneId === zone.id && !e.claimed; });
      const active = activeIdx >= 0 ? state.expeditions[activeIdx] : null;
      const memberNames = active
        ? active.charIds.map(function (cid) { return hasOwn(MasterData.CHARACTER_MAP, cid) ? MasterData.CHARACTER_MAP[cid].name : cid; }).join('・')
        : '未派遣（最大' + zone.maxChars + '名）';

      return el('div', { className: 'expedition-mini-card' }, [
        el('div', { className: 'm3-card-head' }, [
          el('span', { className: 'detail-heading', text: zone.name }),
          el('span', {
            className: active && active.battlesDone >= active.requiredBattles ? 'tag-chip tag-chip-owned' : 'tag-chip',
            text: active ? (active.battlesDone + '/' + active.requiredBattles + '戦') : ('必要' + zone.requiredBattles + '戦')
          })
        ]),
        el('div', { className: 'detail-desc', text: memberNames })
      ]);
    });

    return el('div', { className: 'stage-body anim-fade-in' }, [
      el('div', { className: 'expedition-mini-grid' }, cards),
      el('div', { className: 'detail-block' }, [
        el('div', { className: 'detail-heading', text: '異界調査（戦闘回数で自動進行）' }),
        el('div', { className: 'detail-desc', text: '待ち時間は戦闘回数のみ。編成・共鳴支援以外の控え仲間を最大4区画へ派遣可能。' })
      ])
    ]);
  }

  function renderUpperSummon(state, uiState) {
    const MasterData = IkaiApp.MasterData;
    const SvgIcons = IkaiApp.SvgIcons;
    const banner = MasterData.BANNERS.find(function (b) { return b.id === state.summon.selectedBannerId; }) || MasterData.BANNERS[0];

    if (uiState.lastSummonResult && Array.isArray(uiState.lastSummonResult.results)) {
      const res = uiState.lastSummonResult;
      const chips = res.results.map(function (item, idx) {
        const outcomeLabel = item.outcome === 'new'
          ? '新規'
          : (item.outcome === 'crystal' ? ('結晶+' + item.crystalsGained) : '覚醒片+1');
        const chipCls = 'summon-pull-chip rarity-' + item.rarity +
          ' summon-pop-chip stagger-' + (idx % 10) +
          (item.rarity === 'SSR' ? ' is-ssr-glow' : '');
        return el('div', { className: chipCls }, [
          el('div', { className: 'summon-pull-left' }, [
            SvgIcons.createRoleIcon(item.role, 'plate-role-svg'),
            el('span', { className: 'unit-name', text: item.name }),
            item.outcome === 'new' ? el('span', { className: 'new-tag', text: 'NEW' }) : null
          ]),
          el('span', { className: 'rarity-badge rarity-' + item.rarity, text: item.rarity + ' ' + outcomeLabel })
        ]);
      });

      return el('div', { className: 'stage-body anim-fade-in' }, [
        el('div', { className: 'detail-block' }, [
          el('div', {
            className: 'detail-heading',
            text: '召喚結果：' + res.bannerName + '（SSR天井 ' + state.summon.pityCount + '/80・SR保証 ' + (state.summon.srPityCount || 0) + '/40）'
          })
        ]),
        el('div', { className: 'summon-showcase-grid' }, chips)
      ]);
    }

    const pickupNames = banner.pickupCharIds.length > 0
      ? banner.pickupCharIds.map(function (cid) { return hasOwn(MasterData.CHARACTER_MAP, cid) ? MasterData.CHARACTER_MAP[cid].name : cid; }).join(' ／ ')
      : '全SSR均等排出';

    const pityFill = el('div', { className: 'meter-fill fill-cyan bar-smooth' });
    pityFill.style.width = Math.min(100, Math.round((state.summon.pityCount / MasterData.SUMMON_CONFIG.pitySSR) * 100)) + '%';

    return el('div', { className: 'stage-body anim-fade-in' }, [
      el('div', { className: 'stage-preview-card' }, [
        el('div', { className: 'unit-ident' }, [
          SvgIcons.createUiIcon('summon', 'icon-svg-lg'),
          el('div', { className: 'unit-text-col' }, [
            el('div', { className: 'unit-name', text: banner.name }),
            el('div', { className: 'unit-kana', text: banner.description })
          ])
        ]),
        el('div', { className: 'detail-block' }, [
          el('div', { className: 'detail-heading', text: '対象ピックアップ：' + pickupNames }),
          el('div', { className: 'detail-desc', text: '提供割合 SSR 4% / SR 18% / R 78%（10連SR以上1体確定・40連SR以上保証・80連PU SSR確定）' })
        ]),
        el('div', { className: 'pity-bar-wrap' }, [
          el('div', { className: 'm3-card-head' }, [
            el('span', { className: 'muted-note', text: 'SSR天井カウント：' + state.summon.pityCount + ' / 80' }),
            el('span', { className: 'muted-note', text: '交換結晶 ' + state.currencies.exchangeCrystals })
          ]),
          el('div', { className: 'meter-track' }, [pityFill])
        ])
      ])
    ]);
  }

  function renderUpperCodex(state, uiState) {
    const MasterData = IkaiApp.MasterData;
    const SvgIcons = IkaiApp.SvgIcons;
    const cat = uiState.codexCategory || 'chars';

    if (cat === 'enemies') {
      const enemies = Object.values(MasterData.ENEMIES);
      const enemy = MasterData.ENEMIES[uiState.codexSelectedId] || enemies[0];
      const skNames = (enemy.skills || []).map(function (s) { return s.name + '(' + s.targetType + ')'; }).join(' ／ ');
      return el('div', { className: 'stage-body anim-fade-in' }, [
        el('div', { className: 'stage-preview-card' }, [
          el('div', { className: 'unit-ident' }, [
            SvgIcons.createUiIcon(enemy.isBoss ? 'warning' : 'sword', 'icon-svg-lg'),
            el('div', { className: 'unit-text-col' }, [
              el('div', { className: 'unit-name', text: enemy.name }),
              el('div', { className: 'unit-kana', text: (enemy.isBoss ? '異界ボス' : '通常異界体') + ' ／ ロール：' + enemy.role })
            ])
          ]),
          el('div', { className: 'detail-block' }, [
            el('div', { className: 'detail-heading', text: '基礎能力：HP ' + enemy.baseStats.hp + ' / ATK ' + enemy.baseStats.atk + ' / DEF ' + enemy.baseStats.def + ' / SPD ' + enemy.baseStats.spd }),
            el('div', { className: 'detail-desc', text: '固有技：' + (skNames || '通常攻撃') })
          ])
        ])
      ]);
    }

    if (cat === 'equips') {
      const eq = hasOwn(MasterData.EQUIP_MAP, uiState.codexSelectedId) ? MasterData.EQUIP_MAP[uiState.codexSelectedId] : MasterData.EQUIPS[0];
      const setDef = MasterData.SET_MAP[eq.setId];
      return el('div', { className: 'stage-body anim-fade-in' }, [
        el('div', { className: 'stage-preview-card' }, [
          el('div', { className: 'unit-ident' }, [
            SvgIcons.createEquipIcon(eq.slot, 'icon-svg-lg'),
            el('div', { className: 'unit-text-col' }, [
              el('div', { className: 'unit-name', text: eq.name }),
              el('div', { className: 'unit-kana', text: '部位：' + eq.slot + ' ／ セット：' + (setDef ? setDef.name : '') })
            ])
          ]),
          el('div', { className: 'detail-block' }, [
            el('div', { className: 'detail-heading', text: '基礎性能（品質並）：' + formatStatsLine(eq.baseStats) }),
            el('div', { className: 'detail-desc', text: setDef ? ('2部位：' + setDef.twoSetDesc + ' ／ 4部位：' + setDef.fourSetDesc) : '' })
          ])
        ])
      ]);
    }

    if (cat === 'skills') {
      const sk = hasOwn(MasterData.SKILL_MAP, uiState.codexSelectedId) ? MasterData.SKILL_MAP[uiState.codexSelectedId] : MasterData.SKILLS[0];
      const owned = hasOwn(state.skillInventory, sk.id) && state.skillInventory[sk.id].ownedCount > 0;
      return el('div', { className: 'stage-body anim-fade-in' }, [
        el('div', { className: 'stage-preview-card' }, [
          el('div', { className: 'unit-ident' }, [
            SvgIcons.createUiIcon('book', 'icon-svg-lg'),
            el('div', { className: 'unit-text-col' }, [
              el('div', { className: 'unit-name', text: sk.name }),
              el('div', { className: 'unit-kana', text: sk.rarity + ' ／ 対象：' + sk.targetType + ' ／ CT ' + sk.cooldown })
            ]),
            el('span', { className: owned ? 'tag-chip tag-chip-owned' : 'tag-chip', text: owned ? '習得済' : '未習得' })
          ]),
          el('div', { className: 'detail-block' }, [
            el('div', { className: 'detail-heading', text: '効果詳細' }),
            el('div', { className: 'detail-desc', text: sk.description })
          ])
        ])
      ]);
    }

    // chars
    const ch = hasOwn(MasterData.CHARACTER_MAP, uiState.codexSelectedId) ? MasterData.CHARACTER_MAP[uiState.codexSelectedId] : MasterData.CHARACTERS[0];
    const owned = hasOwn(state.roster, ch.id);
    return el('div', { className: 'stage-body anim-fade-in' }, [
      el('div', { className: 'stage-preview-card rarity-' + ch.rarity }, [
        el('div', { className: 'unit-ident' }, [
          SvgIcons.createRoleIcon(ch.role, 'icon-svg-lg'),
          el('div', { className: 'unit-text-col' }, [
            el('div', { className: 'unit-name', text: ch.name }),
            el('div', { className: 'unit-kana', text: ch.kana + '（' + ch.rarity + '・' + ch.role + '）' })
          ]),
          el('span', { className: owned ? 'tag-chip tag-chip-owned' : 'tag-chip', text: owned ? '契約済' : '未契約' })
        ]),
        el('div', { className: 'detail-block' }, [
          el('div', { className: 'detail-heading', text: '固有技『' + ch.uniqueSkill.name + '』［' + ch.uniqueSkill.targetType + '］' }),
          el('div', { className: 'detail-desc', text: ch.uniqueSkill.description })
        ]),
        el('div', { className: 'detail-block' }, [
          el('div', { className: 'detail-heading', text: '特性『' + ch.trait.name + '』' }),
          el('div', { className: 'detail-desc', text: ch.trait.description + ' ／ 共鳴：' + ch.resonance.description })
        ])
      ])
    ]);
  }

  function renderUpperAudioIcons() {
    const SvgIcons = IkaiApp.SvgIcons;
    const AudioSE = IkaiApp.AudioSE;
    const settings = AudioSE.getSettings();
    const pct = settings.muted ? 0 : Math.round(settings.volume * 100);

    const barFill = el('div', { className: 'meter-fill fill-cyan bar-smooth' });
    barFill.style.width = pct + '%';

    const roleTiles = IkaiApp.MasterData.ROLE_ORDER.map(function (role) {
      return el('span', { className: 'icon-tile' }, [
        SvgIcons.createRoleIcon(role),
        el('span', { text: role })
      ]);
    });

    const equipTiles = IkaiApp.MasterData.EQUIP_SLOTS.map(function (slot) {
      return el('span', { className: 'icon-tile' }, [
        SvgIcons.createEquipIcon(slot),
        el('span', { text: slot })
      ]);
    });

    return el('div', { className: 'stage-body anim-fade-in' }, [
      el('div', { className: 'stage-preview-card' }, [
        el('div', { className: 'unit-ident' }, [
          SvgIcons.createUiIcon(settings.muted ? 'sound_off' : 'sound_on', 'icon-svg-lg'),
          el('div', { className: 'unit-text-col' }, [
            el('div', { className: 'unit-name', text: '音響出力：' + (settings.muted ? '消音中' : '有効') + '（音量 ' + pct + '%）' }),
            el('div', { className: 'unit-kana', text: '内部合成音源による効果音出力' })
          ])
        ]),
        el('div', { className: 'meter-row' }, [
          el('span', { text: 'SE音量' }),
          el('div', { className: 'meter-track' }, [barFill]),
          el('span', { text: pct + '%' })
        ]),
        el('div', { className: 'detail-block' }, [
          el('div', { className: 'detail-heading', text: 'ロール紋章（SVG）' }),
          el('div', { className: 'icon-gallery' }, roleTiles)
        ]),
        el('div', { className: 'detail-block' }, [
          el('div', { className: 'detail-heading', text: '装備部位紋章（SVG）' }),
          el('div', { className: 'icon-gallery' }, equipTiles)
        ])
      ])
    ]);
  }

  function renderUpperRecords(state, uiState) {
    const SvgIcons = IkaiApp.SvgIcons;
    const MasterData = IkaiApp.MasterData;
    const c = state.currencies;
    const isSecure = !uiState.tamperWarning;
    const autoQ = state.settings.autoSellMaxQualityIdx;
    const autoLabel = autoQ < 0 ? '無効' : (MasterData.QUALITY_RANKS[autoQ].name + '以下');

    return el('div', { className: 'stage-body anim-fade-in' }, [
      el('div', { className: 'stage-preview-card' }, [
        el('div', { className: 'unit-ident' }, [
          SvgIcons.createUiIcon(isSecure ? 'lock' : 'warning', 'icon-svg-lg'),
          el('div', { className: 'unit-text-col' }, [
            el('div', {
              className: 'unit-name',
              text: isSecure ? '記録保護状態：署名検証済み' : '記録保護警告：不正データを検知し初期状態で保護起動中'
            }),
            el('div', {
              className: 'unit-kana',
              text: '自動売却：' + autoLabel + ' ／ 熟練の書：' + c.masteryBooks + ' ／ 汎用結晶：' + c.universalShards
            })
          ])
        ]),
        el('div', { className: 'stats-grid' }, [
          el('div', { className: 'stat-cell' }, [
            el('span', { className: 'stat-label', text: '所持仲間数' }),
            el('span', { className: 'stat-value', text: String(Object.keys(state.roster).length) + ' / 20' })
          ]),
          el('div', { className: 'stat-cell' }, [
            el('span', { className: 'stat-label', text: '所持装備数' }),
            el('span', { className: 'stat-value', text: String(state.equips.length) })
          ]),
          el('div', { className: 'stat-cell' }, [
            el('span', { className: 'stat-label', text: '本編踏破' }),
            el('span', { className: 'stat-value', text: String(state.progress.clearedStages.length) + ' / 30' })
          ]),
          el('div', { className: 'stat-cell' }, [
            el('span', { className: 'stat-label', text: '無限深淵' }),
            el('span', { className: 'stat-value', text: '第' + state.progress.abyssMaxFloor + '層' })
          ]),
          el('div', { className: 'stat-cell' }, [
            el('span', { className: 'stat-label', text: '制約試練' }),
            el('span', { className: 'stat-value', text: String(state.progress.trialsCleared.length) + ' / 5' })
          ]),
          el('div', { className: 'stat-cell' }, [
            el('span', { className: 'stat-label', text: '累計戦闘回数' }),
            el('span', { className: 'stat-value', text: String(state.progress.totalBattles) })
          ])
        ])
      ])
    ]);
  }

  // =========================================================================
  // Lower Deck Screens (50-100%, all user interactions)
  // =========================================================================

  function renderLowerRosterChars(state, uiState) {
    const MasterData = IkaiApp.MasterData;
    const StateStore = IkaiApp.StateStore;
    const SvgIcons = IkaiApp.SvgIcons;

    const selectedChar = findCharById(uiState.selectedCharId);
    const selectedOwned = hasOwn(state.roster, selectedChar.id) ? state.roster[selectedChar.id] : null;

    const partySlotButtons = state.party.map(function (cid, slotIdx) {
      const ch = cid && hasOwn(MasterData.CHARACTER_MAP, cid) ? MasterData.CHARACTER_MAP[cid] : null;
      const isTarget = cid === selectedChar.id;
      return el('button', {
        className: 'party-slot-btn' + (isTarget ? ' is-active' : ''),
        attrs: { type: 'button' },
        dataset: { action: 'assign-party-slot', slotIdx: String(slotIdx) }
      }, [
        el('span', { className: 'party-slot-label', text: '枠' + (slotIdx + 1) }),
        el('span', { className: 'party-slot-name', text: ch ? ch.name : '空き枠' })
      ]);
    });

    const partyBar = el('div', { className: 'party-slot-bar' }, [
      el('div', { className: 'party-slot-head' }, [
        el('span', { className: 'section-heading', text: '4人編成枠（枠タップで「' + selectedChar.name + '」を配置/交代）' })
      ]),
      el('div', { className: 'party-slot-grid' }, partySlotButtons)
    ]);

    const nodes = [partyBar];

    if (selectedOwned) {
      const tac = selectedOwned.tactic;
      const skillId0 = selectedOwned.skills[0];
      const skillObj0 = skillId0 && hasOwn(MasterData.SKILL_MAP, skillId0) ? MasterData.SKILL_MAP[skillId0] : null;
      const skillId1 = selectedOwned.skills[1];
      const skillObj1 = skillId1 && hasOwn(MasterData.SKILL_MAP, skillId1) ? MasterData.SKILL_MAP[skillId1] : null;
      const awk = selectedOwned.awakening;
      const tierDef = MasterData.AWAKENING_TIERS[awk];
      const hasSlot2 = tierDef && tierDef.skillSlots >= 2;
      const nextTier = awk < 3 ? MasterData.AWAKENING_TIERS[awk + 1] : null;

      nodes.push(el('div', { className: 'tactic-config-card' }, [
        el('div', { className: 'm3-card-head' }, [
          el('span', { className: 'tactic-config-title', text: selectedChar.name + '（覚醒 ' + awk + '/3・欠片 ' + selectedOwned.shards + '・汎用 ' + state.currencies.universalShards + '）' }),
          el('button', {
            className: 'btn btn-compact btn-primary',
            text: nextTier ? ('覚醒実行（必要 ' + nextTier.shardCost + '）') : '最大覚醒済',
            attrs: { type: 'button' },
            disabled: !nextTier,
            dataset: { action: 'awaken-char', charId: selectedChar.id }
          })
        ]),
        el('div', { className: 'btn-grid-3' }, [
          el('button', {
            className: 'btn btn-secondary',
            text: '方針：' + (POLICY_LABELS[tac.policy] || tac.policy),
            attrs: { type: 'button' },
            dataset: { action: 'cycle-roster-policy', charId: selectedChar.id }
          }),
          el('button', {
            className: 'btn btn-secondary',
            text: '標的：' + (TARGET_LABELS[tac.target] || tac.target),
            attrs: { type: 'button' },
            dataset: { action: 'cycle-roster-target', charId: selectedChar.id }
          }),
          el('button', {
            className: 'btn btn-secondary',
            text: '技順：' + (PRIORITY_LABELS[tac.skillPriority] || tac.skillPriority),
            attrs: { type: 'button' },
            dataset: { action: 'cycle-roster-priority', charId: selectedChar.id }
          })
        ]),
        el('div', { className: 'btn-row' }, [
          el('button', {
            className: 'btn btn-primary',
            text: '収集技枠1：' + (skillObj0 ? skillObj0.name : '未装備（切替）'),
            attrs: { type: 'button' },
            dataset: { action: 'cycle-roster-skill', charId: selectedChar.id, slotIdx: '0' }
          }),
          el('button', {
            className: 'btn ' + (hasSlot2 ? 'btn-primary' : 'btn-secondary'),
            text: hasSlot2 ? ('収集技枠2：' + (skillObj1 ? skillObj1.name : '未装備（切替）')) : '収集技枠2（覚醒1で開放）',
            attrs: { type: 'button' },
            disabled: !hasSlot2,
            dataset: { action: 'cycle-roster-skill', charId: selectedChar.id, slotIdx: '1' }
          }),
          el('button', {
            className: 'btn btn-compact btn-secondary',
            text: '収集技・熟練へ',
            attrs: { type: 'button' },
            dataset: { action: 'switch-enhance-sub', sub: 'skills' }
          })
        ])
      ]));
    } else {
      nodes.push(el('div', { className: 'notice-banner' }, [
        el('div', { text: '『' + selectedChar.name + '』は未契約です。召喚または所持済み仲間を選んで強化できます。' }),
        el('button', {
          className: 'btn btn-compact btn-primary',
          text: '召喚画面で契約する',
          attrs: { type: 'button' },
          dataset: { action: 'switch-tab', tabId: 'summon' }
        })
      ]));
    }

    let sourceList = MasterData.CHARACTERS.slice();
    if (uiState.rosterFilter === 'owned') {
      sourceList = sourceList.filter(function (c) {
        return hasOwn(state.roster, c.id);
      });
    }
    if (uiState.roleFilter && uiState.roleFilter !== 'all') {
      sourceList = sourceList.filter(function (c) {
        return c.role === uiState.roleFilter;
      });
    }
    const sorted = StateStore.sortUnits(sourceList);

    const roleChips = ['all'].concat(MasterData.ROLE_ORDER).map(function (r) {
      const label = r === 'all' ? '全役割' : r;
      const active = (uiState.roleFilter || 'all') === r;
      return el('button', {
        className: 'btn btn-compact ' + (active ? 'btn-primary' : 'btn-secondary'),
        text: label,
        attrs: { type: 'button' },
        dataset: { action: 'set-role-filter', role: r }
      });
    });

    const filterRow = el('div', { className: 'btn-row' }, [
      el('button', {
        className: uiState.rosterFilter === 'all' ? 'btn btn-primary' : 'btn btn-secondary',
        text: '全仲間 (' + MasterData.CHARACTERS.length + ')',
        attrs: { type: 'button' },
        dataset: { action: 'filter-roster', filter: 'all' }
      }),
      el('button', {
        className: uiState.rosterFilter === 'owned' ? 'btn btn-primary' : 'btn btn-secondary',
        text: '所持のみ (' + Object.keys(state.roster).length + ')',
        attrs: { type: 'button' },
        dataset: { action: 'filter-roster', filter: 'owned' }
      }),
      el('span', { className: 'muted-note', text: '並替：レア順→ロール順→五十音順' })
    ]);

    const roleFilterRow = el('div', { className: 'area-pills' }, roleChips);

    const rows = sorted.map(function (c) {
      const owned = hasOwn(state.roster, c.id);
      const isSelected = uiState.selectedCharId === c.id;
      const partyIdx = state.party.indexOf(c.id);
      const cls = 'roster-row rarity-' + c.rarity + (isSelected ? ' is-selected' : '');

      return el('button', {
        className: cls,
        attrs: { type: 'button' },
        dataset: { action: 'select-char', charId: c.id }
      }, [
        el('div', { className: 'unit-ident' }, [
          SvgIcons.createRoleIcon(c.role),
          el('div', { className: 'unit-text-col' }, [
            el('div', { className: 'unit-name', text: c.name }),
            el('div', { className: 'unit-kana', text: c.kana })
          ])
        ]),
        el('div', { className: 'unit-meta-right' }, [
          el('span', { className: 'rarity-badge rarity-' + c.rarity, text: c.rarity }),
          el('span', { className: 'role-chip', text: c.role }),
          partyIdx >= 0
            ? el('span', { className: 'tag-chip tag-chip-owned', text: '編成' + (partyIdx + 1) })
            : (owned ? el('span', { className: 'tag-chip', text: '控え' }) : null)
        ])
      ]);
    });

    return nodes.concat([filterRow, roleFilterRow], rows);
  }

  function renderLowerRosterEmblem(state, uiState) {
    const MasterData = IkaiApp.MasterData;
    const StateStore = IkaiApp.StateStore;
    const charDef = findCharById(uiState.selectedCharId);
    const owned = hasOwn(state.roster, charDef.id) ? state.roster[charDef.id] : null;

    const ownedChars = StateStore.sortUnits(MasterData.CHARACTERS.filter(function (c) {
      return hasOwn(state.roster, c.id);
    }));

    const charPicker = el('div', { className: 'area-pills' }, ownedChars.map(function (c) {
      return el('button', {
        className: c.id === charDef.id ? 'btn btn-compact btn-primary' : 'btn btn-compact btn-secondary',
        text: c.name,
        attrs: { type: 'button' },
        dataset: { action: 'select-char', charId: c.id }
      });
    }));

    if (!owned) {
      return [
        charPicker,
        el('div', { className: 'notice-banner is-error', text: '未契約の仲間です。所持済みの仲間を選択してください。' })
      ];
    }

    const layerNames = { 1: '第1層（覚醒0）', 2: '第2層（覚醒2）', 3: '第3層（第2層全解放後）' };
    const layerNodes = [1, 2, 3].map(function (layer) {
      const nodesInLayer = MasterData.EMBLEM_NODES.filter(function (n) { return n.layer === layer; });
      const prevLayerAllUnlocked = layer <= 1 || MasterData.EMBLEM_NODES
        .filter(function (n) { return n.layer === layer - 1; })
        .every(function (n) { return owned.emblemNodes.indexOf(n.id) >= 0; });

      return el('div', { className: 'emblem-layer-group' }, [
        el('div', { className: 'muted-note', text: layerNames[layer] }),
        el('div', { className: 'emblem-grid-4' }, nodesInLayer.map(function (n) {
          const unlocked = owned.emblemNodes.indexOf(n.id) >= 0;
          const canUnlock = !unlocked &&
            owned.awakening >= n.reqAwakening &&
            (!n.reqPrevLayerAll || prevLayerAllUnlocked) &&
            state.currencies.emblemShards >= n.shardCost;
          const label = n.roleSpecialByRole && n.roleSpecialByRole[charDef.role]
            ? n.roleSpecialByRole[charDef.role].label
            : n.label;
          const cls = 'emblem-node-card ' + (unlocked ? 'is-unlocked' : (canUnlock ? 'is-available' : 'is-locked'));
          return el('button', {
            className: cls,
            attrs: { type: 'button' },
            disabled: unlocked,
            dataset: { action: 'unlock-emblem', nodeId: String(n.id) }
          }, [
            el('div', { className: 'm3-card-head' }, [
              el('span', { className: 'detail-heading', text: '節点 ' + n.id }),
              el('span', { className: 'tag-chip', text: unlocked ? '解放済' : ('片 ' + n.shardCost) })
            ]),
            el('div', { className: 'detail-desc', text: label })
          ]);
        }))
      ]);
    });

    return [charPicker].concat(layerNodes);
  }

  function renderLowerRosterSkills(state, uiState) {
    const MasterData = IkaiApp.MasterData;
    const StateStore = IkaiApp.StateStore;
    const charDef = findCharById(uiState.selectedCharId);
    const owned = hasOwn(state.roster, charDef.id) ? state.roster[charDef.id] : null;
    const ownedChars = StateStore.sortUnits(MasterData.CHARACTERS.filter(function (c) {
      return hasOwn(state.roster, c.id);
    }));

    const charPicker = el('div', { className: 'area-pills' }, ownedChars.map(function (c) {
      return el('button', {
        className: c.id === charDef.id ? 'btn btn-compact btn-primary' : 'btn btn-compact btn-secondary',
        text: c.name,
        attrs: { type: 'button' },
        dataset: { action: 'select-char', charId: c.id }
      });
    }));

    const nodes = [charPicker];

    if (owned) {
      const tierDef = MasterData.AWAKENING_TIERS[owned.awakening];
      const slotCards = [0, 1].map(function (slotIdx) {
        const unlocked = slotIdx < tierDef.skillSlots;
        const sid = owned.skills[slotIdx];
        const sk = sid && hasOwn(MasterData.SKILL_MAP, sid) ? MasterData.SKILL_MAP[sid] : null;
        return el('div', { className: 'm3-card' }, [
          el('div', { className: 'm3-card-head' }, [
            el('span', { className: 'm3-card-title', text: '収集技枠 ' + (slotIdx + 1) + (unlocked ? '' : '（覚醒1で開放）') }),
            sk ? el('button', {
              className: 'btn btn-compact btn-danger',
              text: '外す',
              attrs: { type: 'button' },
              dataset: { action: 'equip-collect-skill', slotIdx: String(slotIdx), skillId: '' }
            }) : null
          ]),
          el('div', { className: 'detail-desc', text: sk ? (sk.name + '［' + sk.rarity + '・' + sk.targetType + '］') : '未装着' }),
          unlocked ? el('button', {
            className: 'btn btn-compact btn-primary',
            text: '選択中の技を枠' + (slotIdx + 1) + 'に装着',
            attrs: { type: 'button' },
            dataset: { action: 'equip-collect-skill', slotIdx: String(slotIdx), skillId: uiState.selectedSkillId }
          }) : null
        ]);
      });
      nodes.push(el('div', { className: 'btn-grid-2' }, slotCards));
    }

    const ownedSkillIds = Object.keys(state.skillInventory).filter(function (sid) {
      return state.skillInventory[sid].ownedCount >= 1 && hasOwn(MasterData.SKILL_MAP, sid);
    });

    nodes.push(el('div', { className: 'muted-note', text: '所持収集技（熟練の書：' + state.currencies.masteryBooks + ' 冊）' }));

    ownedSkillIds.forEach(function (sid) {
      const sk = MasterData.SKILL_MAP[sid];
      const inv = state.skillInventory[sid];
      const curRank = MasterData.SKILL_MASTERY_RANKS[inv.rank - 1];
      const nextRank = inv.rank < 5 ? MasterData.SKILL_MASTERY_RANKS[inv.rank] : null;
      const isSel = uiState.selectedSkillId === sid;

      nodes.push(el('div', { className: 'equip-row' + (isSel ? ' is-selected' : '') }, [
        el('div', { className: 'm3-card-head' }, [
          el('button', {
            className: 'btn btn-compact ' + (isSel ? 'btn-primary' : 'btn-secondary'),
            text: sk.name + '（' + sk.rarity + '・' + sk.targetType + '）',
            attrs: { type: 'button' },
            dataset: { action: 'select-skill', skillId: sid }
          }),
          el('span', { className: 'tag-chip', text: '熟練' + curRank.label + '（使用' + inv.uses + '）' })
        ]),
        el('div', { className: 'm3-card-head' }, [
          el('span', { className: 'detail-desc', text: sk.description }),
          el('button', {
            className: 'btn btn-compact btn-primary',
            text: nextRank ? ('鍛錬→' + nextRank.label + '（書' + nextRank.bookCost + '）') : '最大熟練',
            attrs: { type: 'button' },
            disabled: !nextRank || state.currencies.masteryBooks < nextRank.bookCost,
            dataset: { action: 'upgrade-skill-mastery', skillId: sid }
          })
        ])
      ]));
    });

    return nodes;
  }

  function renderLowerRosterEquips(state, uiState) {
    const MasterData = IkaiApp.MasterData;
    const StateStore = IkaiApp.StateStore;
    const Progression = IkaiApp.Progression;
    const SvgIcons = IkaiApp.SvgIcons;

    const charDef = findCharById(uiState.selectedCharId);
    const owned = hasOwn(state.roster, charDef.id) ? state.roster[charDef.id] : null;
    const ownedChars = StateStore.sortUnits(MasterData.CHARACTERS.filter(function (c) {
      return hasOwn(state.roster, c.id);
    }));
    const ownerMap = getEquippedOwnerMap(state);

    const charPicker = el('div', { className: 'area-pills' }, ownedChars.map(function (c) {
      return el('button', {
        className: c.id === charDef.id ? 'btn btn-compact btn-primary' : 'btn btn-compact btn-secondary',
        text: c.name,
        attrs: { type: 'button' },
        dataset: { action: 'select-char', charId: c.id }
      });
    }));

    const nodes = [charPicker];

    if (owned) {
      const tierDef = MasterData.AWAKENING_TIERS[owned.awakening];
      const setCounts = {};
      const slotCards = MasterData.EQUIP_SLOTS.map(function (slot) {
        const unlocked = tierDef.unlockedSlots.indexOf(slot) >= 0;
        const uid = owned.equipped[slot];
        const eq = uid ? state.equips.find(function (e) { return e.uid === uid; }) : null;
        const eqDef = eq && hasOwn(MasterData.EQUIP_MAP, eq.equipId) ? MasterData.EQUIP_MAP[eq.equipId] : null;
        if (unlocked && eqDef && eqDef.setId) {
          setCounts[eqDef.setId] = (setCounts[eqDef.setId] || 0) + 1;
        }
        const qRank = eq ? MasterData.QUALITY_RANKS[eq.qualityIdx] : null;
        return el('div', { className: 'equip-slot-card' }, [
          el('div', { className: 'm3-card-head' }, [
            el('span', { className: 'detail-heading', text: slot }),
            eq ? el('span', { className: 'quality-badge quality-' + eq.qualityIdx, text: qRank.name }) : el('span', { className: 'muted-note', text: unlocked ? '空き' : '未開放' })
          ]),
          el('div', { className: 'detail-desc', text: eqDef ? eqDef.name : (unlocked ? '下の装備から装着可能' : '覚醒で開放') }),
          eq ? el('button', {
            className: 'btn btn-compact btn-danger',
            text: '外す',
            attrs: { type: 'button' },
            dataset: { action: 'unequip-slot', slotName: slot }
          }) : null
        ]);
      });
      nodes.push(el('div', { className: 'equip-slot-grid' }, slotCards));

      const activeSetEffects = [];
      Object.keys(setCounts).forEach(function (sid) {
        const cnt = setCounts[sid];
        const setDef = hasOwn(MasterData.SET_MAP, sid) ? MasterData.SET_MAP[sid] : null;
        if (!setDef) return;
        if (cnt >= 2) {
          activeSetEffects.push(setDef.name + '(2)：' + setDef.twoSetDesc);
        }
        if (cnt >= 4) {
          activeSetEffects.push(setDef.name + '(4)：' + setDef.fourSetDesc);
        }
      });

      nodes.push(el('div', { className: 'm3-card' }, [
        el('div', { className: 'm3-card-head' }, [
          el('span', { className: 'm3-card-title', text: charDef.name + ' の装着セット効果' }),
          el('button', {
            className: 'btn btn-compact btn-primary',
            text: 'おまかせ装備',
            attrs: { type: 'button' },
            dataset: { action: 'auto-equip-char', charId: charDef.id }
          })
        ]),
        el('div', {
          className: 'detail-desc',
          text: activeSetEffects.length > 0 ? activeSetEffects.join(' ／ ') : '発動中のセット効果はありません（同種セット2/4部位で発動）'
        })
      ]));
    }

    // Synthesis panel
    const baseEq = uiState.synthBaseUid ? state.equips.find(function (e) { return e.uid === uiState.synthBaseUid; }) : null;
    const matEq = uiState.synthMatUid ? state.equips.find(function (e) { return e.uid === uiState.synthMatUid; }) : null;
    const baseDef = baseEq && hasOwn(MasterData.EQUIP_MAP, baseEq.equipId) ? MasterData.EQUIP_MAP[baseEq.equipId] : null;
    const rule = baseEq && baseEq.qualityIdx < 4 ? MasterData.EQUIP_SYNTHESIS_RULES[baseEq.qualityIdx] : null;
    const pityKey = baseEq ? (baseEq.equipId + ':' + baseEq.qualityIdx) : '';
    const pityCur = pityKey ? (state.synthesisPity[pityKey] || 0) : 0;

    nodes.push(el('div', { className: 'm3-card' }, [
      el('div', { className: 'm3-card-head' }, [
        el('span', { className: 'm3-card-title', text: '同種装備 品質合成昇格' }),
        el('span', { className: 'muted-note', text: '昇格触媒：' + state.currencies.qualityCatalysts + ' 個' })
      ]),
      el('div', {
        className: 'detail-desc',
        text: baseDef
          ? ('ベース：' + baseDef.name + '［' + MasterData.QUALITY_RANKS[baseEq.qualityIdx].name + '］' + (matEq ? ' ＋ 素材選択済' : '（同種同品質の素材を選択）'))
          : '一覧から「合成元」と「素材」を選択して昇格。'
      }),
      rule ? el('div', {
        className: 'detail-desc',
        text: '成功率 ' + Math.min(100, Math.round((rule.baseRate + (uiState.useCatalyst ? 0.25 : 0)) * 100)) + '% ／ 天井 ' + pityCur + '/' + rule.pityMax + '（次回 ' + (pityCur + 1 >= rule.pityMax ? '100%確定' : '通常') + '）／ 費用 ' + rule.coinCost + ' 星貨'
      }) : null,
      el('div', { className: 'btn-grid-2' }, [
        el('button', {
          className: 'btn btn-compact ' + (uiState.useCatalyst ? 'btn-primary' : 'btn-secondary'),
          text: uiState.useCatalyst ? '触媒ON（+25%）' : '触媒OFF',
          attrs: { type: 'button' },
          dataset: { action: 'toggle-use-catalyst' }
        }),
        el('button', {
          className: 'btn btn-compact btn-primary',
          text: '合成昇格を実行',
          attrs: { type: 'button' },
          disabled: !(baseEq && matEq && rule),
          dataset: { action: 'synthesize-equip' }
        })
      ])
    ]));

    // Bulk Sell bar (0..3, protects equipped & locked & 極4) with count & coins preview
    nodes.push(el('div', { className: 'm3-card' }, [
      el('div', { className: 'm3-card-title', text: '不要品質 一括売却（装着中・保護中・極は自動保護）' }),
      el('div', { className: 'btn-grid-2' }, [0, 1, 2, 3].map(function (qIdx) {
        let sellCnt = 0;
        let sellCoins = 0;
        for (let i = 0; i < state.equips.length; i += 1) {
          const eq = state.equips[i];
          if (!eq.locked && !ownerMap.has(eq.uid) && eq.qualityIdx <= qIdx && eq.qualityIdx < 4) {
            sellCnt += 1;
            sellCoins += Progression.getEquipSellValue(eq.equipId, eq.qualityIdx);
          }
        }
        const label = qIdx === 0 ? '並のみ' : (MasterData.QUALITY_RANKS[qIdx].name + '以下');
        return el('button', {
          className: 'btn btn-compact btn-danger',
          text: label + '（' + sellCnt + '件 / +' + sellCoins + '）',
          attrs: { type: 'button' },
          disabled: sellCnt === 0,
          dataset: { action: 'bulk-sell-equips', maxQuality: String(qIdx) }
        });
      }))
    ]));

    // Slot filter & sort bar
    const slotFilterVal = uiState.equipSlotFilter || 'all';
    const slotFilterBtns = ['all'].concat(MasterData.EQUIP_SLOTS).map(function (sl) {
      return el('button', {
        className: 'btn btn-compact ' + (slotFilterVal === sl ? 'btn-primary' : 'btn-secondary'),
        text: sl === 'all' ? '全部位' : sl,
        attrs: { type: 'button' },
        dataset: { action: 'set-equip-slot-filter', slot: sl }
      });
    });
    slotFilterBtns.push(el('button', {
      className: 'btn btn-compact btn-secondary',
      text: uiState.equipSortMode === 'recent' ? '並替：入手順' : '並替：品質順',
      attrs: { type: 'button' },
      dataset: { action: 'toggle-equip-sort' }
    }));

    const filteredEquips = state.equips.filter(function (eq) {
      if (slotFilterVal === 'all') return true;
      const eqDef = hasOwn(MasterData.EQUIP_MAP, eq.equipId) ? MasterData.EQUIP_MAP[eq.equipId] : null;
      return Boolean(eqDef && eqDef.slot === slotFilterVal);
    });

    const isEligibleMat = function (eq) {
      const ownerCid = ownerMap.get(eq.uid);
      return Boolean(baseEq && !eq.locked && !ownerCid && baseEq.uid !== eq.uid && baseEq.equipId === eq.equipId && baseEq.qualityIdx === eq.qualityIdx && eq.qualityIdx < 4);
    };

    const sortedEquips = filteredEquips.slice().sort(function (a, b) {
      if (baseEq) {
        const matA = isEligibleMat(a) ? 1 : 0;
        const matB = isEligibleMat(b) ? 1 : 0;
        if (matA !== matB) return matB - matA;
      }
      if (uiState.equipSortMode !== 'recent') {
        if (b.qualityIdx !== a.qualityIdx) return b.qualityIdx - a.qualityIdx;
      }
      return 0;
    });

    nodes.push(el('div', { className: 'area-pills' }, slotFilterBtns));
    nodes.push(el('div', { className: 'muted-note', text: '所持装備一覧（表示 ' + sortedEquips.length + ' / 全 ' + state.equips.length + ' 個）' }));
    sortedEquips.forEach(function (eq) {
      const eqDef = hasOwn(MasterData.EQUIP_MAP, eq.equipId) ? MasterData.EQUIP_MAP[eq.equipId] : null;
      if (!eqDef) return;
      const qRank = MasterData.QUALITY_RANKS[eq.qualityIdx];
      const stats = Progression.getEquipStats(eq.equipId, eq.qualityIdx);
      const ownerCid = ownerMap.get(eq.uid);
      const ownerName = ownerCid && hasOwn(MasterData.CHARACTER_MAP, ownerCid) ? MasterData.CHARACTER_MAP[ownerCid].name : null;
      const isBase = uiState.synthBaseUid === eq.uid;
      const isMat = uiState.synthMatUid === eq.uid;
      const canBeMat = !eq.locked && !ownerCid && baseEq && baseEq.uid !== eq.uid && baseEq.equipId === eq.equipId && baseEq.qualityIdx === eq.qualityIdx && eq.qualityIdx < 4;

      nodes.push(el('div', { className: 'equip-row' + (uiState.selectedEquipUid === eq.uid ? ' is-selected' : '') }, [
        el('div', { className: 'm3-card-head' }, [
          el('div', { className: 'unit-ident' }, [
            SvgIcons.createEquipIcon(eqDef.slot),
            el('div', { className: 'unit-text-col' }, [
              el('div', { className: 'unit-name', text: eqDef.name }),
              el('div', { className: 'unit-kana', text: eqDef.slot + ' ／ ' + formatStatsLine(stats) + (ownerName ? (' ／ 装着：' + ownerName) : '') })
            ])
          ]),
          el('span', { className: 'quality-badge quality-' + eq.qualityIdx, text: qRank.name })
        ]),
        el('div', { className: 'btn-grid-4' }, [
          el('button', {
            className: 'btn btn-compact btn-primary',
            text: ownerCid === charDef.id ? '装着中' : '装着',
            attrs: { type: 'button' },
            disabled: !owned,
            dataset: { action: 'equip-item', uid: eq.uid }
          }),
          el('button', {
            className: 'btn btn-compact ' + (eq.locked ? 'btn-primary' : 'btn-secondary'),
            text: eq.locked ? '保護中' : '保護',
            attrs: { type: 'button' },
            dataset: { action: 'toggle-equip-lock', uid: eq.uid }
          }),
          el('button', {
            className: 'btn btn-compact ' + (isBase ? 'btn-primary' : 'btn-secondary'),
            text: isBase ? '合成元✓' : '合成元',
            attrs: { type: 'button' },
            disabled: eq.qualityIdx >= 4,
            dataset: { action: 'set-synth-base', uid: eq.uid }
          }),
          el('button', {
            className: 'btn btn-compact ' + (isMat ? 'btn-primary' : 'btn-secondary'),
            text: isMat ? '素材✓' : '素材',
            attrs: { type: 'button' },
            disabled: !canBeMat,
            dataset: { action: 'set-synth-mat', uid: eq.uid }
          })
        ])
      ]));
    });

    return nodes;
  }

  function renderLowerRoster(state, uiState) {
    const subTabs = [
      { id: 'chars', label: 'キャラ・覚醒' },
      { id: 'emblem', label: '紋章ボード' },
      { id: 'skills', label: '収集技・熟練' },
      { id: 'equips', label: '装備・合成' }
    ];
    const subBar = el('div', { className: 'subtab-bar' }, subTabs.map(function (st) {
      return el('button', {
        className: 'btn btn-compact ' + (uiState.enhanceSub === st.id ? 'btn-primary' : 'btn-secondary'),
        text: st.label,
        attrs: { type: 'button' },
        dataset: { action: 'switch-enhance-sub', sub: st.id }
      });
    }));

    let body = [];
    if (uiState.enhanceSub === 'emblem') {
      body = renderLowerRosterEmblem(state, uiState);
    } else if (uiState.enhanceSub === 'skills') {
      body = renderLowerRosterSkills(state, uiState);
    } else if (uiState.enhanceSub === 'equips') {
      body = renderLowerRosterEquips(state, uiState);
    } else {
      body = renderLowerRosterChars(state, uiState);
    }

    return buildNoticeNodes(uiState).concat([subBar], body);
  }

  function renderLowerAreas(state, uiState) {
    const MasterData = IkaiApp.MasterData;
    const Progression = IkaiApp.Progression;

    const pillarDefs = [
      { id: 'story', label: '本編異界' },
      { id: 'abyss', label: '無限深淵' },
      { id: 'raid', label: '異界討伐' },
      { id: 'trial', label: '制約試練' }
    ];
    const pillarBar = el('div', { className: 'subtab-bar' }, pillarDefs.map(function (p) {
      return el('button', {
        className: 'btn btn-compact ' + (uiState.areasPillar === p.id ? 'btn-primary' : 'btn-secondary'),
        text: p.label,
        attrs: { type: 'button' },
        dataset: { action: 'switch-areas-pillar', pillar: p.id }
      });
    }));

    const notices = buildNoticeNodes(uiState);
    const partyNames = state.party.filter(Boolean).map(function (cid) {
      return hasOwn(MasterData.CHARACTER_MAP, cid) ? MasterData.CHARACTER_MAP[cid].name : cid;
    }).join(' ／ ');

    if (uiState.areasPillar === 'abyss') {
      const maxSelectable = Math.max(1, state.progress.abyssMaxFloor + 1);
      const curFloor = Math.min(maxSelectable, Math.max(1, uiState.selectedAbyssFloor || 1));
      const quickFloors = [1, Math.max(1, Math.floor(maxSelectable / 2)), state.progress.abyssMaxFloor, maxSelectable].filter(function (v, idx, arr) {
        return v >= 1 && arr.indexOf(v) === idx;
      });
      const repeatChoices = [
        { count: 0, label: '単発' },
        { count: 3, label: '3回' },
        { count: 5, label: '5回' },
        { count: 10, label: '10回' }
      ];

      return notices.concat([
        pillarBar,
        el('div', { className: 'sortie-panel' }, [
          el('div', { className: 'sortie-party-line', text: '出撃編成：' + partyNames }),
          el('div', { className: 'btn-grid-3' }, [
            el('button', {
              className: 'btn btn-compact btn-secondary',
              text: '-1層',
              attrs: { type: 'button' },
              disabled: curFloor <= 1,
              dataset: { action: 'select-abyss-floor', floor: String(Math.max(1, curFloor - 1)) }
            }),
            el('button', {
              className: 'btn btn-compact btn-primary',
              text: '挑戦：第' + curFloor + '層',
              attrs: { type: 'button' },
              dataset: { action: 'select-abyss-floor', floor: String(curFloor) }
            }),
            el('button', {
              className: 'btn btn-compact btn-secondary',
              text: '+1層',
              attrs: { type: 'button' },
              disabled: curFloor >= maxSelectable,
              dataset: { action: 'select-abyss-floor', floor: String(Math.min(maxSelectable, curFloor + 1)) }
            })
          ]),
          el('div', { className: 'area-pills' }, quickFloors.map(function (fl) {
            return el('button', {
              className: 'btn btn-compact ' + (fl === curFloor ? 'btn-primary' : 'btn-secondary'),
              text: '第' + fl + '層',
              attrs: { type: 'button' },
              dataset: { action: 'select-abyss-floor', floor: String(fl) }
            });
          })),
          el('div', { className: 'sortie-subrow' }, [
            el('span', { className: 'muted-note', text: '自動周回：' })
          ].concat(repeatChoices.map(function (item) {
            return el('button', {
              className: 'btn btn-compact ' + (state.settings.autoRepeatCount === item.count ? 'btn-primary' : 'btn-secondary'),
              text: item.label,
              attrs: { type: 'button' },
              dataset: { action: 'set-auto-repeat', count: String(item.count) }
            });
          }))),
          el('button', {
            className: 'btn btn-compact ' + (uiState.abyssAutoAdvance ? 'btn-primary' : 'btn-secondary'),
            text: uiState.abyssAutoAdvance ? '周回時：勝利で自動で次層へ (ON)' : '周回時：同層を周回 (OFF)',
            attrs: { type: 'button' },
            dataset: { action: 'toggle-abyss-auto-advance' }
          })
        ])
      ]);
    }

    if (uiState.areasPillar === 'raid') {
      const boss = MasterData.RAID_BOSSES.find(function (b) { return b.id === uiState.selectedRaidId; }) || MasterData.RAID_BOSSES[0];
      const diff = boss.difficulties.find(function (d) { return d.id === uiState.selectedRaidDiff; }) || boss.difficulties[0];

      return notices.concat([
        pillarBar,
        el('div', { className: 'sortie-panel' }, [
          el('div', { className: 'sortie-party-line', text: '出撃編成：' + partyNames }),
          el('div', { className: 'area-pills' }, MasterData.RAID_BOSSES.map(function (rb) {
            return el('button', {
              className: 'btn btn-compact ' + (rb.id === boss.id ? 'btn-primary' : 'btn-secondary'),
              text: rb.name,
              attrs: { type: 'button' },
              dataset: { action: 'select-raid-boss', raidId: rb.id }
            });
          })),
          el('div', { className: 'btn-grid-3' }, boss.difficulties.map(function (df) {
            return el('button', {
              className: 'btn btn-compact ' + (df.id === diff.id ? 'btn-primary' : 'btn-secondary'),
              text: df.name,
              attrs: { type: 'button' },
              dataset: { action: 'select-raid-diff', diffId: df.id }
            });
          }))
        ])
      ]);
    }

    if (uiState.areasPillar === 'trial') {
      const trial = MasterData.TRIALS.find(function (t) { return t.id === uiState.selectedTrialId; }) || MasterData.TRIALS[0];
      const check = Progression.validateTrialEntry(state, trial.id, state.party);

      const trialCards = MasterData.TRIALS.map(function (t) {
        const isSelected = t.id === trial.id;
        const isCleared = state.progress.trialsCleared.indexOf(t.id) >= 0;
        return el('button', {
          className: 'stage-card-btn' + (isSelected ? ' is-selected' : ''),
          attrs: { type: 'button' },
          dataset: { action: 'select-trial', trialId: t.id }
        }, [
          el('div', { className: 'unit-text-col' }, [
            el('div', { className: 'unit-name', text: t.name }),
            el('div', { className: 'unit-kana', text: t.description })
          ]),
          el('span', { className: isCleared ? 'tag-chip tag-chip-owned' : 'tag-chip', text: isCleared ? '突破済' : '未突破' })
        ]);
      });

      const violatingChips = (check.violatingCharIds || []).map(function (cid) {
        const ch = hasOwn(MasterData.CHARACTER_MAP, cid) ? MasterData.CHARACTER_MAP[cid] : null;
        return el('span', {
          className: 'tag-chip tag-chip-boss',
          text: '違反：' + (ch ? ch.name : cid)
        });
      });

      const validationPanel = !check.ok
        ? el('div', { className: 'notice-banner is-error' }, [
            el('div', { text: check.reasons.join(' ／ ') }),
            violatingChips.length > 0 ? el('div', { className: 'area-pills' }, violatingChips) : null,
            el('div', { className: 'btn-row' }, [
              el('button', {
                className: 'btn btn-compact btn-primary',
                text: '条件に合う仮編成',
                attrs: { type: 'button' },
                dataset: { action: 'auto-fit-trial', trialId: trial.id }
              }),
              el('button', {
                className: 'btn btn-compact btn-secondary',
                text: '編成タブで編成を変更',
                attrs: { type: 'button' },
                dataset: { action: 'switch-tab', tabId: 'party' }
              })
            ])
          ])
        : el('div', { className: 'notice-banner is-ok', text: '現在の編成は試練制約に適合しています。' });

      return notices.concat([
        pillarBar,
        validationPanel,
        el('div', { className: 'sortie-panel' }, [
          el('div', { className: 'sortie-party-line', text: '出撃編成：' + partyNames })
        ])
      ], trialCards);
    }

    // Default: story pillar
    const areas = MasterData.AREAS;
    const currentArea = findAreaById(uiState.selectedAreaId);

    const repeatChoices = [
      { count: 0, label: '単発' },
      { count: 3, label: '3回' },
      { count: 5, label: '5回' },
      { count: 10, label: '10回' }
    ];

    const repeatBtns = repeatChoices.map(function (item) {
      const isActive = state.settings.autoRepeatCount === item.count;
      return el('button', {
        className: 'btn btn-compact ' + (isActive ? 'btn-primary' : 'btn-secondary'),
        text: item.label,
        attrs: { type: 'button' },
        dataset: { action: 'set-auto-repeat', count: String(item.count) }
      });
    });

    const policyBtns = POLICY_ORDER.map(function (p) {
      return el('button', {
        className: 'btn btn-compact ' + (uiState.hubGlobalPolicy === p ? 'btn-primary' : 'btn-secondary'),
        text: POLICY_LABELS[p],
        attrs: { type: 'button' },
        dataset: { action: 'set-hub-policy', policy: p }
      });
    });

    const sortiePanel = el('div', { className: 'sortie-panel' }, [
      el('div', { className: 'sortie-party-line', text: '出撃編成：' + partyNames }),
      el('div', { className: 'sortie-subrow' }, [
        el('span', { className: 'muted-note', text: '全体方針：' })
      ].concat(policyBtns)),
      el('div', { className: 'sortie-subrow' }, [
        el('span', { className: 'muted-note', text: '自動周回：' })
      ].concat(repeatBtns))
    ]);

    const areaBtns = areas.map(function (area) {
      return el('button', {
        className: area.id === currentArea.id ? 'btn btn-primary' : 'btn btn-secondary',
        text: area.order + '. ' + area.name,
        attrs: { type: 'button' },
        dataset: { action: 'select-area', areaId: area.id }
      });
    });

    const stageBtns = currentArea.stages.map(function (stage) {
      const isSelected = stage.id === uiState.selectedStageId;
      const isCleared = state.progress.clearedStages.indexOf(stage.id) >= 0;
      const unlocked = Progression.isStageUnlocked(state, stage.id);
      return el('button', {
        className: 'stage-card-btn' + (isSelected ? ' is-selected' : '') + (unlocked ? '' : ' is-locked'),
        attrs: { type: 'button' },
        dataset: { action: 'select-stage', stageId: stage.id }
      }, [
        el('div', { className: 'unit-text-col' }, [
          el('div', { className: 'unit-name', text: stage.id + ' ' + stage.name }),
          el('div', { className: 'unit-kana', text: stage.subtitle + ' ・ ' + stage.waves.length + 'WAVE' })
        ]),
        el('div', { className: 'unit-meta-right' }, [
          isCleared ? el('span', { className: 'tag-chip tag-chip-owned', text: '踏破' }) : (!unlocked ? el('span', { className: 'tag-chip', text: '未開放' }) : null),
          stage.isBossStage
            ? el('span', {
                className: 'tag-chip tag-chip-boss',
                text: stage.bossType === 'area' ? 'エリアボス' : '中ボス'
              })
            : el('span', { className: 'tag-chip', text: '通常' })
        ])
      ]);
    });

    return notices.concat([
      pillarBar,
      sortiePanel,
      el('div', { className: 'area-pills' }, areaBtns)
    ], stageBtns);
  }

  function buildAreasStickyCta(state, uiState) {
    const MasterData = IkaiApp.MasterData;
    const Progression = IkaiApp.Progression;

    if (uiState.areasPillar === 'abyss') {
      const maxSelectable = Math.max(1, state.progress.abyssMaxFloor + 1);
      const curFloor = Math.min(maxSelectable, Math.max(1, uiState.selectedAbyssFloor || 1));
      return el('div', { className: 'lower-sticky-cta' }, [
        el('div', { className: 'sticky-cta-info' }, [
          el('div', { className: 'sticky-cta-title', text: '無限深淵 第' + curFloor + '層' }),
          el('div', { className: 'sticky-cta-sub', text: state.settings.autoRepeatCount > 0 ? ('周回 ' + state.settings.autoRepeatCount + '回') : '単発挑戦' })
        ]),
        el('button', {
          className: 'btn btn-primary sticky-cta-btn',
          text: '深淵へ出撃',
          attrs: { type: 'button', 'data-testid': 'abyss-start-btn' },
          dataset: { action: 'start-abyss', floor: String(curFloor) }
        })
      ]);
    }

    if (uiState.areasPillar === 'raid') {
      const boss = MasterData.RAID_BOSSES.find(function (b) { return b.id === uiState.selectedRaidId; }) || MasterData.RAID_BOSSES[0];
      const diff = boss.difficulties.find(function (d) { return d.id === uiState.selectedRaidDiff; }) || boss.difficulties[0];
      return el('div', { className: 'lower-sticky-cta' }, [
        el('div', { className: 'sticky-cta-info' }, [
          el('div', { className: 'sticky-cta-title', text: boss.name }),
          el('div', { className: 'sticky-cta-sub', text: '難易度：' + diff.name })
        ]),
        el('button', {
          className: 'btn btn-primary sticky-cta-btn',
          text: '討伐出撃',
          attrs: { type: 'button', 'data-testid': 'raid-start-btn' },
          dataset: { action: 'start-raid', raidId: boss.id, diffId: diff.id }
        })
      ]);
    }

    if (uiState.areasPillar === 'trial') {
      const trial = MasterData.TRIALS.find(function (t) { return t.id === uiState.selectedTrialId; }) || MasterData.TRIALS[0];
      const check = Progression.validateTrialEntry(state, trial.id, state.party);
      return el('div', { className: 'lower-sticky-cta' }, [
        el('div', { className: 'sticky-cta-info' }, [
          el('div', { className: 'sticky-cta-title', text: trial.name }),
          el('div', { className: 'sticky-cta-sub', text: check.ok ? '制約条件適合（出撃可能）' : '制約違反あり' })
        ]),
        el('button', {
          className: 'btn btn-primary sticky-cta-btn',
          text: check.ok ? '試練へ挑戦' : '条件未達',
          attrs: { type: 'button', 'data-testid': 'trial-start-btn' },
          disabled: !check.ok,
          dataset: { action: 'start-trial', trialId: trial.id }
        })
      ]);
    }

    const currentArea = findAreaById(uiState.selectedAreaId);
    const currentStage = findStageInArea(currentArea, uiState.selectedStageId);
    const stageUnlocked = Progression.isStageUnlocked(state, currentStage.id);
    return el('div', { className: 'lower-sticky-cta' }, [
      el('div', { className: 'sticky-cta-info' }, [
        el('div', { className: 'sticky-cta-title', text: currentStage.id + ' ' + currentStage.name }),
        el('div', { className: 'sticky-cta-sub', text: POLICY_LABELS[uiState.hubGlobalPolicy] + ' ／ ' + (state.settings.autoRepeatCount > 0 ? ('周回' + state.settings.autoRepeatCount + '回') : '単発') })
      ]),
      el('button', {
        className: 'btn btn-primary sticky-cta-btn',
        text: stageUnlocked ? '出撃開始' : '未開放',
        attrs: { type: 'button', 'data-testid': 'sortie-start-btn' },
        disabled: !stageUnlocked,
        dataset: { action: 'start-stage', stageId: currentStage.id }
      })
    ]);
  }

  function renderLowerParty(state, uiState) {
    const MasterData = IkaiApp.MasterData;
    const StateStore = IkaiApp.StateStore;
    const SvgIcons = IkaiApp.SvgIcons;

    const expSet = getActiveExpCharSet(state);
    const activeSlot = Math.min(3, Math.max(0, Number(uiState.selectedPartySlot) || 0));
    const activeResSlot = Math.min(3, Math.max(0, Number(uiState.selectedResonanceSlot) || 0));

    const partySlots = state.party.map(function (cid, idx) {
      const ch = cid && hasOwn(MasterData.CHARACTER_MAP, cid) ? MasterData.CHARACTER_MAP[cid] : null;
      return el('div', { className: 'm3-card' }, [
        el('div', { className: 'm3-card-head' }, [
          el('button', {
            className: 'btn btn-compact ' + (activeSlot === idx ? 'btn-primary' : 'btn-secondary'),
            text: '編成枠' + (idx + 1) + '：' + (ch ? ch.name : '空き'),
            attrs: { type: 'button' },
            dataset: { action: 'select-party-slot', slotIdx: String(idx) }
          }),
          ch ? el('button', {
            className: 'btn btn-compact btn-danger',
            text: '外す',
            attrs: { type: 'button' },
            disabled: state.party.filter(Boolean).length <= 1,
            dataset: { action: 'party-clear-slot', slotIdx: String(idx) }
          }) : null
        ])
      ]);
    });

    const ownedChars = StateStore.sortUnits(MasterData.CHARACTERS.filter(function (c) {
      if (!hasOwn(state.roster, c.id)) return false;
      if (uiState.roleFilter && uiState.roleFilter !== 'all' && c.role !== uiState.roleFilter) return false;
      return true;
    }));

    const roleChips = ['all'].concat(MasterData.ROLE_ORDER).map(function (r) {
      const label = r === 'all' ? '全役割' : r;
      const active = (uiState.roleFilter || 'all') === r;
      return el('button', {
        className: 'btn btn-compact ' + (active ? 'btn-primary' : 'btn-secondary'),
        text: label,
        attrs: { type: 'button' },
        dataset: { action: 'set-role-filter', role: r }
      });
    });

    const memberRows = ownedChars.map(function (c) {
      const partyIdx = state.party.indexOf(c.id);
      const resIdx = state.resonanceSlots.indexOf(c.id);
      const inExp = expSet.has(c.id);
      const entry = state.roster[c.id];

      return el('div', { className: 'party-member-row rarity-' + c.rarity }, [
        el('div', { className: 'm3-card-head' }, [
          el('div', { className: 'unit-ident' }, [
            SvgIcons.createRoleIcon(c.role),
            el('div', { className: 'unit-text-col' }, [
              el('div', { className: 'unit-name', text: c.name }),
              el('div', { className: 'unit-kana', text: c.rarity + '・' + c.role + ' ／ 共鳴：' + c.resonance.description })
            ])
          ]),
          el('div', { className: 'unit-meta-right' }, [
            inExp ? el('span', { className: 'tag-chip tag-chip-boss', text: '調査中' })
              : (partyIdx >= 0 ? el('span', { className: 'tag-chip tag-chip-owned', text: '枠' + (partyIdx + 1) })
                : (resIdx >= 0 ? el('span', { className: 'tag-chip', text: '共鳴' + (resIdx + 1) }) : null))
          ])
        ]),
        el('div', { className: 'btn-grid-2' }, [
          el('button', {
            className: 'btn btn-compact btn-primary',
            text: '編成枠' + (activeSlot + 1) + 'へ配置',
            attrs: { type: 'button' },
            disabled: inExp,
            dataset: { action: 'party-assign-char', charId: c.id }
          }),
          el('button', {
            className: 'btn btn-compact btn-secondary',
            text: '共鳴枠' + (activeResSlot + 1) + 'へ',
            attrs: { type: 'button' },
            disabled: inExp || partyIdx >= 0,
            dataset: { action: 'set-resonance-char', charId: c.id }
          })
        ]),
        el('div', { className: 'btn-grid-3' }, [
          el('button', {
            className: 'btn btn-compact btn-secondary',
            text: '方針：' + (POLICY_LABELS[entry.tactic.policy] || '均衡'),
            attrs: { type: 'button' },
            dataset: { action: 'cycle-roster-policy', charId: c.id }
          }),
          el('button', {
            className: 'btn btn-compact btn-secondary',
            text: '標的：' + (TARGET_LABELS[entry.tactic.target] || 'HP最低'),
            attrs: { type: 'button' },
            dataset: { action: 'cycle-roster-target', charId: c.id }
          }),
          el('button', {
            className: 'btn btn-compact btn-secondary',
            text: '技順：' + (PRIORITY_LABELS[entry.tactic.skillPriority] || '固有優先'),
            attrs: { type: 'button' },
            dataset: { action: 'cycle-roster-priority', charId: c.id }
          })
        ])
      ]);
    });

    const resonancePanel = el('div', { className: 'm3-card' }, [
      el('div', { className: 'm3-card-title', text: '共鳴支援 4枠（編成・調査外の控え仲間からパッシブ加算）' }),
      el('div', { className: 'resonance-slot-grid' }, state.resonanceSlots.map(function (cid, idx) {
        const ch = cid && hasOwn(MasterData.CHARACTER_MAP, cid) ? MasterData.CHARACTER_MAP[cid] : null;
        return el('div', { className: 'equip-slot-card' }, [
          el('button', {
            className: 'btn btn-compact ' + (activeResSlot === idx ? 'btn-primary' : 'btn-secondary'),
            text: '共鳴' + (idx + 1) + '：' + (ch ? ch.name : '空き'),
            attrs: { type: 'button' },
            dataset: { action: 'select-resonance-slot', slotIdx: String(idx) }
          }),
          ch ? el('button', {
            className: 'btn btn-compact btn-danger',
            text: '解除',
            attrs: { type: 'button' },
            dataset: { action: 'clear-resonance-slot', slotIdx: String(idx) }
          }) : null
        ]);
      }))
    ]);

    return buildNoticeNodes(uiState).concat([
      el('div', { className: 'btn-grid-2' }, partySlots),
      resonancePanel,
      el('div', { className: 'area-pills' }, roleChips),
      el('div', { className: 'muted-note', text: '所持仲間一覧（並替：レア順→ロール順→五十音順）' })
    ], memberRows);
  }

  function renderLowerExpedition(state, uiState) {
    const MasterData = IkaiApp.MasterData;
    const StateStore = IkaiApp.StateStore;

    const selectedZone = MasterData.EXPEDITION_ZONES.find(function (z) { return z.id === uiState.selectedZoneId; }) || MasterData.EXPEDITION_ZONES[0];
    const partySet = new Set(state.party.filter(Boolean));
    const resSet = new Set(state.resonanceSlots.filter(Boolean));
    const activeExpSet = getActiveExpCharSet(state);

    const activeCards = state.expeditions.map(function (exp, idx) {
      const zone = MasterData.EXPEDITION_ZONES.find(function (z) { return z.id === exp.zoneId; });
      const done = exp.battlesDone >= exp.requiredBattles;
      const memberNames = exp.charIds.map(function (cid) {
        return hasOwn(MasterData.CHARACTER_MAP, cid) ? MasterData.CHARACTER_MAP[cid].name : cid;
      }).join(' ／ ');
      return el('div', { className: 'expedition-card' }, [
        el('div', { className: 'm3-card-head' }, [
          el('span', { className: 'm3-card-title', text: (zone ? zone.name : exp.zoneId) + '（' + exp.battlesDone + '/' + exp.requiredBattles + '戦）' }),
          el('button', {
            className: 'btn btn-compact ' + (done ? 'btn-primary' : 'btn-secondary'),
            text: done ? '報酬受取' : '進行中',
            attrs: { type: 'button' },
            disabled: !done,
            dataset: { action: 'claim-expedition', slotIdx: String(idx) }
          })
        ]),
        el('div', { className: 'detail-desc', text: '派遣：' + memberNames })
      ]);
    });

    const zoneButtons = el('div', { className: 'btn-grid-2' }, MasterData.EXPEDITION_ZONES.map(function (z) {
      return el('button', {
        className: 'btn btn-compact ' + (z.id === selectedZone.id ? 'btn-primary' : 'btn-secondary'),
        text: z.name + '（' + z.requiredBattles + '戦・最大' + z.maxChars + '名）',
        attrs: { type: 'button' },
        dataset: { action: 'select-zone', zoneId: z.id }
      });
    }));

    const availableChars = StateStore.sortUnits(MasterData.CHARACTERS.filter(function (c) {
      return hasOwn(state.roster, c.id) && !partySet.has(c.id) && !resSet.has(c.id) && !activeExpSet.has(c.id);
    }));

    const availableSet = new Set(availableChars.map(function (c) { return c.id; }));
    const filteredCandidateIds = (uiState.expCandidateIds || []).filter(function (cid) {
      return availableSet.has(cid);
    }).slice(0, selectedZone.maxChars);
    uiState.expCandidateIds = filteredCandidateIds;
    const candidateSet = new Set(filteredCandidateIds);
    const pickerButtons = availableChars.length > 0
      ? el('div', { className: 'area-pills' }, availableChars.map(function (c) {
          const picked = candidateSet.has(c.id);
          return el('button', {
            className: 'btn btn-compact ' + (picked ? 'btn-primary' : 'btn-secondary'),
            text: c.name + (picked ? ' ✓' : ''),
            attrs: { type: 'button' },
            dataset: { action: 'toggle-exp-char', charId: c.id }
          });
        }))
      : el('div', { className: 'muted-note', text: '派遣可能な控え仲間がいません（召喚や編成外調整で増加）' });

    const dispatchCard = el('div', { className: 'm3-card' }, [
      el('div', { className: 'm3-card-head' }, [
        el('span', { className: 'm3-card-title', text: '新規派遣：' + selectedZone.name }),
        el('span', { className: 'muted-note', text: '選択 ' + candidateSet.size + '/' + selectedZone.maxChars + ' 名' })
      ]),
      el('div', { className: 'detail-desc', text: selectedZone.description }),
      pickerButtons,
      el('button', {
        className: 'btn btn-primary btn-sortie',
        text: '調査派遣を開始（戦闘' + selectedZone.requiredBattles + '回で完了）',
        attrs: { type: 'button' },
        disabled: candidateSet.size === 0 || state.expeditions.length >= 4,
        dataset: { action: 'start-expedition' }
      })
    ]);

    return buildNoticeNodes(uiState).concat(
      activeCards.length > 0 ? activeCards : [el('div', { className: 'muted-note', text: '現在進行中の調査はありません。' })],
      [zoneButtons, dispatchCard]
    );
  }

  function renderLowerSummon(state, uiState) {
    const MasterData = IkaiApp.MasterData;
    const subBar = el('div', { className: 'subtab-bar is-2col' }, [
      el('button', {
        className: 'btn btn-compact ' + (uiState.summonSub === 'pull' ? 'btn-primary' : 'btn-secondary'),
        text: '残響召喚（天井・PU）',
        attrs: { type: 'button' },
        dataset: { action: 'switch-summon-sub', sub: 'pull' }
      }),
      el('button', {
        className: 'btn btn-compact ' + (uiState.summonSub === 'shop' ? 'btn-primary' : 'btn-secondary'),
        text: '交換結晶ショップ（所持 ' + state.currencies.exchangeCrystals + '）',
        attrs: { type: 'button' },
        dataset: { action: 'switch-summon-sub', sub: 'shop' }
      })
    ]);

    const notices = buildNoticeNodes(uiState);

    if (uiState.summonSub === 'shop') {
      const shopCards = MasterData.CRYSTAL_SHOP_ITEMS.map(function (item) {
        const isOwnedSkill = Boolean(
          item.reward && item.reward.skillId &&
          state.skillInventory[item.reward.skillId] &&
          state.skillInventory[item.reward.skillId].ownedCount >= 1
        );
        const canBuy = !isOwnedSkill && state.currencies.exchangeCrystals >= item.costCrystals;
        return el('div', { className: 'm3-card' }, [
          el('div', { className: 'm3-card-head' }, [
            el('span', { className: 'm3-card-title', text: item.name }),
            el('button', {
              className: 'btn btn-compact ' + (canBuy ? 'btn-primary' : 'btn-secondary'),
              text: isOwnedSkill ? '習得済' : ('交換（結晶 ' + item.costCrystals + '）'),
              attrs: { type: 'button' },
              disabled: !canBuy,
              dataset: { action: 'exchange-crystal', itemId: item.id }
            })
          ])
        ]);
      });
      return notices.concat([subBar], shopCards);
    }

    const bannerCards = MasterData.BANNERS.map(function (b) {
      const active = b.id === state.summon.selectedBannerId;
      const puNames = (b.pickupCharIds && b.pickupCharIds.length > 0)
        ? b.pickupCharIds.map(function (cid) { return hasOwn(MasterData.CHARACTER_MAP, cid) ? MasterData.CHARACTER_MAP[cid].name : cid; }).join('・')
        : '全SSR均等';
      return el('button', {
        className: 'btn btn-compact ' + (active ? 'btn-primary' : 'btn-secondary'),
        attrs: { type: 'button' },
        dataset: { action: 'select-banner', bannerId: b.id }
      }, [
        el('div', { className: 'unit-name', text: b.name }),
        el('div', { className: 'unit-kana', text: 'PU：' + puNames })
      ]);
    });

    const pullBar = el('div', { className: 'btn-grid-2' }, [
      el('button', {
        className: 'btn btn-secondary',
        text: '1回召喚（残響石 150）',
        attrs: { type: 'button' },
        disabled: state.currencies.echoStones < MasterData.SUMMON_CONFIG.singleCost,
        dataset: { action: 'roll-summon', count: '1' }
      }),
      el('button', {
        className: 'btn btn-primary',
        text: '10回召喚（残響石 1500）',
        attrs: { type: 'button' },
        disabled: state.currencies.echoStones < MasterData.SUMMON_CONFIG.tenCost,
        dataset: { action: 'roll-summon', count: '10' }
      })
    ]);

    const shortcutBar = uiState.lastSummonResult
      ? el('div', { className: 'btn-grid-2' }, [
          el('button', {
            className: 'btn btn-compact btn-secondary',
            text: '強化へ移動',
            attrs: { type: 'button' },
            dataset: { action: 'switch-tab', tabId: 'roster' }
          }),
          el('button', {
            className: 'btn btn-compact btn-secondary',
            text: '編成へ移動',
            attrs: { type: 'button' },
            dataset: { action: 'switch-tab', tabId: 'party' }
          })
        ])
      : null;

    return notices.concat([
      subBar,
      el('div', { className: 'summon-banner-card' }, [
        el('div', { className: 'btn-grid-2' }, bannerCards),
        el('div', { className: 'detail-desc', text: '回数制限・時間制限なしでいつでも実行可能。最大覚醒超過時は交換結晶（SSR 50 / SR 15 / R 5）へ自動変換。' }),
        pullBar,
        shortcutBar
      ])
    ]);
  }

  function renderLowerCodex(state, uiState) {
    const MasterData = IkaiApp.MasterData;
    const StateStore = IkaiApp.StateStore;
    const SvgIcons = IkaiApp.SvgIcons;

    const cats = [
      { id: 'chars', label: '仲間' },
      { id: 'enemies', label: '敵・ボス' },
      { id: 'equips', label: '装備' },
      { id: 'skills', label: '収集技' }
    ];
    const ownedCount = MasterData.CHARACTERS.filter(function (c) {
      return hasOwn(state.roster, c.id);
    }).length;
    const summaryNote = el('div', {
      className: 'muted-note',
      text: '所持仲間：' + ownedCount + ' / ' + MasterData.CHARACTERS.length
    });

    const catBar = el('div', { className: 'subtab-bar' }, cats.map(function (c) {
      return el('button', {
        className: 'btn btn-compact ' + (uiState.codexCategory === c.id ? 'btn-primary' : 'btn-secondary'),
        text: c.label,
        attrs: { type: 'button' },
        dataset: { action: 'switch-codex-cat', category: c.id }
      });
    }));

    const searchInput = el('input', {
      className: 'codex-search-input',
      attrs: {
        id: 'codex-search-input',
        type: 'search',
        placeholder: '名称・役割・効果で検索',
        'aria-label': '図鑑検索'
      },
      dataset: { action: 'codex-search' }
    });
    searchInput.value = uiState.codexQuery || '';

    const q = (uiState.codexQuery || '').trim().toLowerCase();
    const listContainer = el('div', { className: 'btn-row' });
    const rows = [];

    if (uiState.codexCategory === 'enemies') {
      Object.values(MasterData.ENEMIES).filter(function (e) {
        return !q || e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q);
      }).forEach(function (e) {
        rows.push(el('button', {
          className: 'stage-card-btn' + (uiState.codexSelectedId === e.id ? ' is-selected' : ''),
          attrs: { type: 'button' },
          dataset: { action: 'codex-select', id: e.id }
        }, [
          el('div', { className: 'unit-text-col' }, [
            el('div', { className: 'unit-name', text: e.name }),
            el('div', { className: 'unit-kana', text: (e.isBoss ? 'ボス' : '通常敵') + '・' + e.role })
          ])
        ]));
      });
    } else if (uiState.codexCategory === 'equips') {
      MasterData.EQUIPS.filter(function (eq) {
        const setDef = MasterData.SET_MAP[eq.setId];
        return !q || eq.name.toLowerCase().includes(q) || eq.slot.includes(q) || (setDef && setDef.name.includes(q));
      }).forEach(function (eq) {
        rows.push(el('button', {
          className: 'stage-card-btn' + (uiState.codexSelectedId === eq.id ? ' is-selected' : ''),
          attrs: { type: 'button' },
          dataset: { action: 'codex-select', id: eq.id }
        }, [
          el('div', { className: 'unit-ident' }, [
            SvgIcons.createEquipIcon(eq.slot),
            el('div', { className: 'unit-text-col' }, [
              el('div', { className: 'unit-name', text: eq.name }),
              el('div', { className: 'unit-kana', text: eq.slot + ' ／ ' + formatStatsLine(eq.baseStats) })
            ])
          ])
        ]));
      });
    } else if (uiState.codexCategory === 'skills') {
      MasterData.SKILLS.filter(function (sk) {
        return !q || sk.name.toLowerCase().includes(q) || sk.description.toLowerCase().includes(q) || sk.targetType.includes(q);
      }).forEach(function (sk) {
        const owned = hasOwn(state.skillInventory, sk.id) && state.skillInventory[sk.id].ownedCount > 0;
        rows.push(el('button', {
          className: 'stage-card-btn' + (uiState.codexSelectedId === sk.id ? ' is-selected' : ''),
          attrs: { type: 'button' },
          dataset: { action: 'codex-select', id: sk.id }
        }, [
          el('div', { className: 'unit-text-col' }, [
            el('div', { className: 'unit-name', text: sk.name }),
            el('div', { className: 'unit-kana', text: sk.rarity + '・' + sk.targetType + ' ／ ' + sk.description })
          ]),
          el('span', { className: owned ? 'tag-chip tag-chip-owned' : 'tag-chip', text: owned ? '習得' : '未所持' })
        ]));
      });
    } else {
      const sorted = StateStore.sortUnits(MasterData.CHARACTERS.filter(function (c) {
        return !q || c.name.toLowerCase().includes(q) || c.kana.includes(q) || c.role.includes(q);
      }));
      sorted.forEach(function (c) {
        const owned = hasOwn(state.roster, c.id);
        rows.push(el('button', {
          className: 'stage-card-btn rarity-' + c.rarity + (uiState.codexSelectedId === c.id ? ' is-selected' : ''),
          attrs: { type: 'button' },
          dataset: { action: 'codex-select', id: c.id }
        }, [
          el('div', { className: 'unit-ident' }, [
            SvgIcons.createRoleIcon(c.role),
            el('div', { className: 'unit-text-col' }, [
              el('div', { className: 'unit-name', text: c.name }),
              el('div', { className: 'unit-kana', text: c.kana })
            ])
          ]),
          el('div', { className: 'unit-meta-right' }, [
            el('span', { className: 'rarity-badge rarity-' + c.rarity, text: c.rarity }),
            el('span', { className: owned ? 'tag-chip tag-chip-owned' : 'tag-chip', text: owned ? '契約済' : '未契約' })
          ])
        ]));
      });
    }

    rows.forEach(function (r) { listContainer.appendChild(r); });

    const legendTiles = BUFF_LEGEND.map(function (item) {
      return el('span', { className: 'icon-tile' }, [
        SvgIcons.createBuffIcon(item.iconKey, 'buff-svg'),
        el('span', { text: item.label })
      ]);
    });
    const legendCard = el('div', { className: 'm3-card' }, [
      el('div', { className: 'm3-card-title', text: '戦闘 付与状態（強化・弱体）凡例' }),
      el('div', { className: 'icon-gallery' }, legendTiles)
    ]);

    return [catBar, summaryNote, searchInput, listContainer, legendCard];
  }

  function renderLowerAudioIcons() {
    const AudioSE = IkaiApp.AudioSE;
    const settings = AudioSE.getSettings();
    const pct = Math.round(settings.volume * 100);

    const muteBtn = el('button', {
      className: settings.muted ? 'btn btn-danger' : 'btn btn-primary',
      text: settings.muted ? '消音中（解除する）' : '音響有効（消音にする）',
      attrs: { type: 'button' },
      dataset: { action: 'toggle-mute' }
    });

    const slider = el('input', {
      className: 'range-input',
      attrs: {
        type: 'range',
        min: '0',
        max: '100',
        step: '5',
        value: String(pct),
        'aria-label': 'SE音量調整'
      },
      dataset: { action: 'volume-range' }
    });
    slider.value = String(pct);

    const seButtons = AudioSE.SE_LIST.map(function (item) {
      return el('button', {
        className: 'btn btn-secondary',
        text: item.label,
        attrs: { type: 'button' },
        dataset: { action: 'play-se', seId: item.id }
      });
    });

    return [
      el('div', { className: 'btn-row' }, [
        muteBtn,
        el('span', { className: 'muted-note', text: '音量: ' + pct + '%' })
      ]),
      el('div', { className: 'range-row' }, [
        el('span', { className: 'muted-note', text: '音量調整' }),
        slider
      ]),
      el('h3', { className: 'section-heading', text: '効果音試聴（全9種）' }),
      el('div', { className: 'btn-grid-3' }, seButtons)
    ];
  }

  function renderLowerRecords(state, uiState) {
    const AudioSE = IkaiApp.AudioSE;
    const settings = AudioSE.getSettings();
    const pct = Math.round(settings.volume * 100);

    const textarea = el('textarea', {
      className: 'backup-textarea',
      attrs: {
        id: 'backup-json-input',
        placeholder: 'ここに署名済みバックアップJSONが出力・入力されます',
        'aria-label': 'バックアップJSON入出力'
      },
      dataset: { action: 'backup-input' }
    });
    textarea.value = uiState.backupText;

    const autoChoices = [
      { idx: -1, label: '無効' },
      { idx: 0, label: '並のみ' },
      { idx: 1, label: '良以下' },
      { idx: 2, label: '秀以下' },
      { idx: 3, label: '優以下' }
    ];

    const slider = el('input', {
      className: 'range-input',
      attrs: {
        type: 'range',
        min: '0',
        max: '100',
        step: '5',
        value: String(pct),
        'aria-label': 'SE音量調整'
      },
      dataset: { action: 'volume-range' }
    });
    slider.value = String(pct);

    const nodes = buildNoticeNodes(uiState);

    nodes.push(
      el('div', { className: 'm3-card' }, [
        el('div', { className: 'm3-card-title', text: 'ドロップ装備 自動売却設定（品質「極」は常に保護）' }),
        el('div', { className: 'btn-row' }, autoChoices.map(function (c) {
          const active = state.settings.autoSellMaxQualityIdx === c.idx;
          return el('button', {
            className: 'btn btn-compact ' + (active ? 'btn-primary' : 'btn-secondary'),
            text: c.label,
            attrs: { type: 'button' },
            dataset: { action: 'set-auto-sell', maxQuality: String(c.idx) }
          });
        }))
      ]),
      el('div', { className: 'm3-card' }, [
        el('div', { className: 'm3-card-head' }, [
          el('span', { className: 'm3-card-title', text: '効果音設定' }),
          el('button', {
            className: 'btn btn-compact ' + (settings.muted ? 'btn-danger' : 'btn-primary'),
            text: settings.muted ? '消音中（解除）' : '音響有効（消音へ）',
            attrs: { type: 'button' },
            dataset: { action: 'toggle-mute' }
          })
        ]),
        el('div', { className: 'range-row' }, [
          el('span', { className: 'muted-note', text: '音量 ' + pct + '%' }),
          slider
        ]),
        el('div', { className: 'btn-grid-3' }, AudioSE.SE_LIST.map(function (item) {
          return el('button', {
            className: 'btn btn-compact btn-secondary',
            text: item.label,
            attrs: { type: 'button' },
            dataset: { action: 'play-se', seId: item.id }
          });
        }))
      ]),
      el('div', { className: 'btn-grid-2' }, [
        el('button', {
          className: 'btn btn-primary',
          text: uiState.backupBusy ? '処理中' : 'バックアップ書出',
          attrs: { type: 'button' },
          disabled: Boolean(uiState.backupBusy),
          dataset: { action: 'export-backup' }
        }),
        el('button', {
          className: 'btn btn-secondary',
          text: 'JSONコピー',
          attrs: { type: 'button' },
          disabled: Boolean(uiState.backupBusy),
          dataset: { action: 'copy-backup' }
        }),
        el('button', {
          className: 'btn btn-secondary',
          text: uiState.backupBusy ? '復元中' : 'JSON復元実行',
          attrs: { type: 'button' },
          disabled: Boolean(uiState.backupBusy),
          dataset: { action: 'import-backup' }
        }),
        uiState.confirmResetArmed
          ? el('div', { className: 'btn-grid-2' }, [
              el('button', {
                className: 'btn btn-danger',
                text: '初期化を確定',
                attrs: { type: 'button' },
                dataset: { action: 'confirm-reset-save' }
              }),
              el('button', {
                className: 'btn btn-secondary',
                text: '取消',
                attrs: { type: 'button' },
                dataset: { action: 'cancel-reset-save' }
              })
            ])
          : el('button', {
              className: 'btn btn-danger',
              text: '初期記録を再生成',
              attrs: { type: 'button' },
              dataset: { action: 'reset-save' }
            })
      ]),
      textarea
    );

    return nodes;
  }

  function renderHub(upperEl, lowerEl, state, uiState) {
    battleRefs = null;
    lastDpsDetailFlag = null;
    const SvgIcons = IkaiApp.SvgIcons;

    if (upperEl) {
      clearNode(upperEl);
      upperEl.appendChild(buildTopBar(state));
      if (uiState.activeTab === 'roster') {
        upperEl.appendChild(renderUpperRoster(state, uiState));
      } else if (uiState.activeTab === 'areas') {
        upperEl.appendChild(renderUpperAreas(state, uiState));
      } else if (uiState.activeTab === 'party') {
        upperEl.appendChild(renderUpperParty(state));
      } else if (uiState.activeTab === 'expedition') {
        upperEl.appendChild(renderUpperExpedition(state));
      } else if (uiState.activeTab === 'summon') {
        upperEl.appendChild(renderUpperSummon(state, uiState));
      } else if (uiState.activeTab === 'codex') {
        upperEl.appendChild(renderUpperCodex(state, uiState));
      } else if (uiState.activeTab === 'audio_icons') {
        upperEl.appendChild(renderUpperAudioIcons());
      } else {
        upperEl.appendChild(renderUpperRecords(state, uiState));
      }
    }

    if (lowerEl) {
      const prevScrollTop = lowerEl.querySelector('.lower-scroll') ? lowerEl.querySelector('.lower-scroll').scrollTop : 0;
      const scrollKey = [
        uiState.activeTab || '',
        uiState.areasPillar || '',
        uiState.enhanceSub || '',
        uiState.summonSub || '',
        uiState.codexCategory || ''
      ].join(':');
      clearNode(lowerEl);
      const activeTabObj = TABS.find(function (t) { return t.id === uiState.activeTab; }) ||
        (uiState.activeTab === 'audio_icons' ? { id: 'audio_icons', label: '音響・紋章' } : TABS[2]);

      const header = el('div', { className: 'lower-header' }, [
        el('span', { className: 'section-heading', text: activeTabObj.label }),
        el('span', {
          className: 'muted-note',
          text: IkaiApp.Env.isFile() ? 'ローカル動作' : 'PWA準備完了'
        })
      ]);

      const scrollArea = el('div', { className: 'lower-scroll' });
      let contentNodes = [];
      if (uiState.activeTab === 'roster') {
        contentNodes = renderLowerRoster(state, uiState);
      } else if (uiState.activeTab === 'areas') {
        contentNodes = renderLowerAreas(state, uiState);
      } else if (uiState.activeTab === 'party') {
        contentNodes = renderLowerParty(state, uiState);
      } else if (uiState.activeTab === 'expedition') {
        contentNodes = renderLowerExpedition(state, uiState);
      } else if (uiState.activeTab === 'summon') {
        contentNodes = renderLowerSummon(state, uiState);
      } else if (uiState.activeTab === 'codex') {
        contentNodes = renderLowerCodex(state, uiState);
      } else if (uiState.activeTab === 'audio_icons') {
        contentNodes = renderLowerAudioIcons();
      } else {
        contentNodes = renderLowerRecords(state, uiState);
      }
      for (let i = 0; i < contentNodes.length; i += 1) {
        scrollArea.appendChild(contentNodes[i]);
      }

      const tabButtons = TABS.map(function (t) {
        return el('button', {
          className: 'tab-btn' + (t.id === uiState.activeTab ? ' is-active' : ''),
          attrs: {
            type: 'button',
            'aria-pressed': t.id === uiState.activeTab ? 'true' : 'false'
          },
          dataset: { action: 'switch-tab', tabId: t.id }
        }, [
          SvgIcons.createUiIcon(t.icon),
          el('span', { text: t.label })
        ]);
      });

      // M1 compatibility hidden tab element for 'audio_icons'
      tabButtons.push(el('span', {
        className: 'tab-btn is-hidden',
        text: '音響・紋章',
        attrs: { 'aria-hidden': 'true' },
        dataset: { action: 'switch-tab', tabId: 'audio_icons' }
      }));

      const tabBar = el('nav', { className: 'lower-tabs', attrs: { 'aria-label': '下半分操作タブ' } }, tabButtons);

      lowerEl.appendChild(header);
      lowerEl.appendChild(scrollArea);
      if (uiState.activeTab === 'areas') {
        lowerEl.appendChild(buildAreasStickyCta(state, uiState));
      }
      lowerEl.appendChild(tabBar);
      if (prevScrollTop > 0 && lastHubScrollKey === scrollKey) {
        scrollArea.scrollTop = prevScrollTop;
      }
      lastHubScrollKey = scrollKey;
    }
  }

  // =========================================================================
  // Battle Scene & Result Screen
  // =========================================================================

  function createDpsCell(label, fillClass) {
    const dot = el('span', { className: 'dps-dot ' + fillClass });
    const fill = el('div', { className: 'meter-fill bar-smooth ' + fillClass });
    fill.style.width = '0%';
    const valNode = el('span', { className: 'dps-val', text: '0' });
    const rateNode = el('span', { className: 'dps-rate', text: '0/s' });
    const rootNode = el('div', { className: 'dps-cell' }, [
      el('div', { className: 'dps-cell-head' }, [
        el('span', { className: 'dps-label-wrap' }, [
          dot,
          el('span', { className: 'dps-label', text: label })
        ]),
        el('span', { className: 'dps-val-wrap' }, [valNode, rateNode])
      ]),
      el('div', { className: 'meter-track dps-track' }, [fill])
    ]);
    return { rootNode, fill, valNode, rateNode };
  }

  function buildEnemyZone(enemies, isBossWave, nextActorId) {
    const SvgIcons = IkaiApp.SvgIcons;
    const refs = {
      waveSignature: enemies.map(function (e) { return e.id; }).join(','),
      bossFrame: null,
      bossTelegraphBar: null,
      bossTelegraphText: null,
      bossTelegraphTurns: null,
      units: {}
    };

    const hasBoss = isBossWave || enemies.some(function (e) { return e.isBoss; });

    if (hasBoss) {
      const boss = enemies.find(function (e) { return e.isBoss; }) || enemies[0];
      const minions = enemies.filter(function (e) { return e.id !== boss.id; });

      const bossTrack = makeHpTrack('hp-track', 'fill-boss-hp', boss.hpPct, calcShieldPct(boss));
      const atbFill = el('div', { className: 'meter-fill fill-cyan bar-smooth' });
      atbFill.style.width = boss.gauge + '%';
      const hpText = el('span', { className: 'plate-hp-num', text: formatUnitHpText(boss, true) });
      const buffBox = el('div', { className: 'buff-strip' }, buildBuffStrip(boss.buffs, boss.debuffs));

      const bossBadgeText = boss.bossType === 'area' ? 'エリアボス' : (boss.bossType === 'raid' ? '討伐ボス' : '中ボス');
      const bossFrame = el('div', {
        className: 'boss-frame is-boss' + (boss.id === nextActorId && boss.hp > 0 ? ' is-acting-next' : ''),
        attrs: { 'data-testid': 'boss-plate' }
      }, [
        el('div', { className: 'boss-head' }, [
          SvgIcons.createUiIcon('warning', 'icon-svg'),
          el('span', { className: 'tag-chip tag-chip-boss', text: bossBadgeText }),
          el('span', { className: 'unit-name boss-name', text: boss.name }),
          hpText
        ]),
        el('div', { className: 'boss-bars' }, [
          bossTrack.track,
          el('div', { className: 'meter-track atb-track' }, [atbFill])
        ]),
        buffBox
      ]);

      const telegraphText = el('span', { className: 'telegraph-text', text: '通常警戒中' });
      const telegraphTurns = el('span', { className: 'telegraph-turns', text: '待機' });
      const telegraphBar = el('div', {
        className: 'boss-telegraph-bar',
        attrs: { 'data-testid': 'boss-telegraph' }
      }, [
        SvgIcons.createUiIcon('warning', 'icon-svg'),
        telegraphText,
        telegraphTurns
      ]);

      refs.bossFrame = bossFrame;
      refs.bossTelegraphBar = telegraphBar;
      refs.bossTelegraphText = telegraphText;
      refs.bossTelegraphTurns = telegraphTurns;
      refs.units[boss.id] = {
        plate: bossFrame,
        hpFill: bossTrack.hpFill,
        lagFill: bossTrack.lagFill,
        shieldFill: bossTrack.shieldFill,
        atbFill,
        hpText,
        buffBox,
        effSig: signatureOfEffects(boss.buffs, boss.debuffs)
      };

      const children = [bossFrame, telegraphBar];
      if (minions.length > 0) {
        const minionPlates = minions.map(function (m) {
          const mTrack = makeHpTrack('hp-track-sm', 'fill-dmg', m.hpPct, calcShieldPct(m));
          const mHpTxt = el('span', { className: 'plate-hp-num', text: formatUnitHpText(m, false) });
          const mBuff = el('div', { className: 'buff-strip' }, buildBuffStrip(m.buffs, m.debuffs));
          const mPlate = el('div', {
            className: 'enemy-minion-plate' + (m.id === nextActorId && m.hp > 0 ? ' is-acting-next' : '')
          }, [
            el('div', { className: 'plate-head' }, [
              el('span', { className: 'unit-name plate-name', text: m.name }),
              mHpTxt
            ]),
            mTrack.track,
            mBuff
          ]);
          refs.units[m.id] = {
            plate: mPlate,
            hpFill: mTrack.hpFill,
            lagFill: mTrack.lagFill,
            shieldFill: mTrack.shieldFill,
            atbFill: null,
            hpText: mHpTxt,
            buffBox: mBuff,
            effSig: signatureOfEffects(m.buffs, m.debuffs)
          };
          return mPlate;
        });
        children.push(el('div', { className: 'boss-minions-row' }, minionPlates));
      }

      const zoneNode = el('div', { className: 'boss-zone' }, children);
      return { node: zoneNode, refs };
    }

    const plates = enemies.map(function (e) {
      const eTrack = makeHpTrack('hp-track-sm', 'fill-dmg', e.hpPct, calcShieldPct(e));
      const atbFill = el('div', { className: 'meter-fill fill-cyan bar-smooth' });
      atbFill.style.width = e.gauge + '%';
      const hpText = el('span', { className: 'plate-hp-num', text: formatUnitHpText(e, false) });
      const buffBox = el('div', { className: 'buff-strip' }, buildBuffStrip(e.buffs, e.debuffs));

      const plate = el('div', {
        className: 'enemy-plate' + (e.id === nextActorId && e.hp > 0 ? ' is-acting-next' : '')
      }, [
        el('div', { className: 'plate-head' }, [
          SvgIcons.createRoleIcon(e.role, 'plate-role-svg'),
          el('span', { className: 'unit-name plate-name', text: e.name }),
          hpText
        ]),
        el('div', { className: 'plate-bars' }, [
          eTrack.track,
          el('div', { className: 'meter-track atb-track' }, [atbFill])
        ]),
        buffBox
      ]);

      refs.units[e.id] = {
        plate,
        hpFill: eTrack.hpFill,
        lagFill: eTrack.lagFill,
        shieldFill: eTrack.shieldFill,
        atbFill,
        hpText,
        buffBox,
        effSig: signatureOfEffects(e.buffs, e.debuffs)
      };
      return plate;
    });

    const grid = el('div', { className: 'enemy-grid' }, plates);
    return { node: grid, refs };
  }

  function formatRepeatPill(snapshot, uiState) {
    if (snapshot.mode === 'trial') {
      return '制約試練';
    }
    return snapshot.autoRepeat > 0
      ? ('周回 ' + uiState.autoRepeatDone + '/' + snapshot.autoRepeat)
      : '単発';
  }

  function buildBattleScene(upperEl, lowerEl, snapshot, uiState) {
    const SvgIcons = IkaiApp.SvgIcons;
    const isTrial = snapshot.mode === 'trial';
    const nextActorId = (snapshot.timeline && snapshot.timeline[0]) ? snapshot.timeline[0].unitId : null;

    const stageTitle = el('span', { className: 'battle-stage-label', text: snapshot.stageLabel });
    const wavePill = el('span', { className: 'battle-pill', text: 'W ' + (snapshot.waveIndex + 1) + '/' + snapshot.totalWaves });
    const speedPill = el('span', { className: 'battle-pill', text: '×' + snapshot.speed });
    const repeatPill = el('span', {
      className: 'battle-pill',
      text: formatRepeatPill(snapshot, uiState)
    });

    const topbar = el('header', { className: 'battle-topbar' }, [
      stageTitle,
      el('div', { className: 'battle-meta-pills' }, [wavePill, speedPill, repeatPill])
    ]);

    const latestLog = (snapshot.logs && snapshot.logs.length > 0) ? snapshot.logs[snapshot.logs.length - 1] : '戦闘開始';
    const tickerText = el('span', { className: 'battle-ticker-text', text: latestLog });
    const elapsedText = el('span', { className: 'battle-elapsed', text: '経過 ' + ((snapshot.elapsedMs || 0) / 1000).toFixed(1) + 's' });
    const tickerBar = el('div', { className: 'battle-ticker' }, [tickerText, elapsedText]);

    const timelineChips = [];
    for (let i = 0; i < 8; i += 1) {
      const chipIconWrap = el('span', { className: 'timeline-icon-wrap' });
      const chipOrder = el('span', { className: 'timeline-order', text: i === 0 ? '次' : String(i + 1) });
      const chip = el('div', { className: 'timeline-chip' + (i === 0 ? ' is-next' : '') }, [
        chipOrder,
        chipIconWrap
      ]);
      timelineChips.push({ chip, chipOrder, chipIconWrap, lastKey: '' });
    }
    const timelineBar = el('div', {
      className: 'turn-timeline',
      attrs: { 'data-testid': 'battle-timeline' }
    }, timelineChips.map(function (c) { return c.chip; }));

    const enemyField = el('div', { className: 'enemy-field' });
    const enemyBuilt = buildEnemyZone(snapshot.enemies, snapshot.isBossWave, nextActorId);
    enemyField.appendChild(enemyBuilt.node);

    const allyRefs = {};
    const allyPlates = snapshot.allies.map(function (a) {
      const reservedTag = el('span', { className: 'reserved-tag', text: '予約' });
      const aTrack = makeHpTrack('hp-track-sm', 'fill-heal', a.hpPct, calcShieldPct(a));
      const atbFill = el('div', { className: 'meter-fill fill-cyan bar-smooth' });
      atbFill.style.width = a.gauge + '%';
      const hpText = el('span', { className: 'plate-hp-num', text: formatUnitHpText(a, false) });
      const buffBox = el('div', { className: 'buff-strip' }, buildBuffStrip(a.buffs, a.debuffs));

      const plate = el('div', {
        className: 'ally-plate rarity-' + a.rarity + (a.id === nextActorId && a.hp > 0 ? ' is-acting-next' : '')
      }, [
        el('div', { className: 'plate-head' }, [
          SvgIcons.createRoleIcon(a.role, 'plate-role-svg'),
          el('span', { className: 'unit-name plate-name', text: a.name }),
          reservedTag
        ]),
        el('div', { className: 'plate-bars' }, [
          el('div', { className: 'plate-hp-row' }, [
            aTrack.track,
            hpText
          ]),
          el('div', { className: 'meter-track atb-track' }, [atbFill])
        ]),
        buffBox
      ]);

      allyRefs[a.id] = {
        plate,
        reservedTag,
        hpFill: aTrack.hpFill,
        lagFill: aTrack.lagFill,
        shieldFill: aTrack.shieldFill,
        atbFill,
        hpText,
        buffBox,
        effSig: signatureOfEffects(a.buffs, a.debuffs)
      };
      return plate;
    });
    const allyGrid = el('div', { className: 'ally-grid' }, allyPlates);

    const dpsDealt = createDpsCell('与ダメージ', 'fill-dmg');
    const dpsTaken = createDpsCell('被ダメージ', 'fill-taken');
    const dpsHeal = createDpsCell('回復量', 'fill-heal');
    const dpsHealed = createDpsCell('被回復量', 'fill-healed');
    const dpsPanel = el('div', {
      className: 'dps-meter-panel',
      attrs: { 'data-testid': 'dps-meter' }
    }, [
      dpsDealt.rootNode,
      dpsTaken.rootNode,
      dpsHeal.rootNode,
      dpsHealed.rootNode
    ]);

    const vfxLayer = el('div', { className: 'battle-vfx-layer' });

    const battleStage = el('div', { className: 'battle-stage' }, [
      topbar,
      tickerBar,
      timelineBar,
      enemyField,
      allyGrid,
      dpsPanel,
      vfxLayer
    ]);

    if (upperEl) {
      clearNode(upperEl);
      upperEl.appendChild(battleStage);
    }

    const speedBtns = {};
    [1, 2, 3].forEach(function (spd) {
      const btn = el('button', {
        className: 'btn btn-compact' + (snapshot.speed === spd ? ' btn-primary' : ' btn-secondary'),
        text: '×' + spd,
        attrs: { type: 'button' },
        dataset: { action: 'battle-speed', speed: String(spd) }
      });
      speedBtns[spd] = btn;
    });

    const autoBtn = el('button', {
      className: 'btn btn-compact' + (!isTrial && snapshot.autoRepeat > 0 ? ' btn-primary' : ' btn-secondary'),
      text: isTrial ? '周回不可' : (snapshot.autoRepeat > 0 ? '周回ON' : '周回OFF'),
      attrs: { type: 'button' },
      disabled: isTrial,
      dataset: { action: 'toggle-battle-repeat' }
    });

    const dpsToggleBtn = el('button', {
      className: 'btn btn-compact' + (uiState.showDpsDetail ? ' btn-primary' : ' btn-secondary'),
      text: '詳細',
      attrs: { type: 'button' },
      dataset: { action: 'toggle-dps-detail' }
    });

    const retreatBtn = el('button', {
      className: 'btn btn-compact btn-danger',
      text: '撤退',
      attrs: { type: 'button' },
      dataset: { action: 'retreat-battle' }
    });

    const lowerHeader = el('div', { className: 'lower-header battle-ctrl-bar' }, [
      el('div', { className: 'btn-row' }, [speedBtns[1], speedBtns[2], speedBtns[3], autoBtn]),
      el('div', { className: 'btn-row' }, [dpsToggleBtn, retreatBtn])
    ]);

    const policyBtns = {};
    POLICY_ORDER.forEach(function (p) {
      policyBtns[p] = el('button', {
        className: 'btn btn-compact' + (snapshot.globalTactic === p ? ' btn-primary' : ' btn-secondary'),
        text: POLICY_LABELS[p],
        attrs: { type: 'button' },
        dataset: { action: 'battle-global-policy', policy: p }
      });
    });

    const targetBtns = {};
    TARGET_ORDER.forEach(function (t) {
      targetBtns[t] = el('button', {
        className: 'btn btn-compact' + (snapshot.globalTargetPolicy === t ? ' btn-primary' : ' btn-secondary'),
        text: TARGET_LABELS[t],
        attrs: { type: 'button' },
        dataset: { action: 'battle-global-target', target: t }
      });
    });

    const unitControls = {};
    const unitControlCards = snapshot.allies.map(function (a) {
      const tacticBtn = el('button', {
        className: 'btn btn-compact btn-secondary',
        text: POLICY_LABELS[a.tactic.policy] || '均衡',
        attrs: { type: 'button' },
        dataset: { action: 'cycle-unit-tactic', unitId: a.id }
      });

      const skillName = a.uniqueSkill ? a.uniqueSkill.name : '固有技';
      const reserveBtn = el('button', {
        className: 'btn btn-compact btn-primary',
        text: skillName + '（予約可）',
        attrs: { type: 'button' },
        dataset: { action: 'reserve-skill', unitId: a.id, skillId: 'unique' }
      });

      const collectBtns = (a.collectSkills || []).map(function (sk) {
        const cBtn = el('button', {
          className: 'btn btn-compact btn-secondary',
          text: sk.name + '（予約可）',
          attrs: { type: 'button' },
          dataset: { action: 'reserve-skill', unitId: a.id, skillId: sk.id }
        });
        return { skillId: sk.id, skillName: sk.name, btn: cBtn };
      });

      const reserveList = el('div', { className: 'ally-reserve-list' }, [reserveBtn].concat(collectBtns.map(function (c) { return c.btn; })));

      const card = el('div', { className: 'ally-control-card rarity-' + a.rarity }, [
        el('div', { className: 'ally-control-head' }, [
          SvgIcons.createRoleIcon(a.role, 'plate-role-svg'),
          el('span', { className: 'unit-name ally-ctrl-name', text: a.name }),
          tacticBtn
        ]),
        reserveList
      ]);

      unitControls[a.id] = { card, tacticBtn, reserveBtn, skillName, collectBtns };
      return card;
    });

    const detailModeInit = uiState.battleDetailMode || 'dps';
    const dpsDetailBtns = {
      dps: el('button', {
        className: 'btn btn-compact ' + (detailModeInit === 'dps' ? 'btn-primary' : 'btn-secondary'),
        text: 'DPS詳細',
        attrs: { type: 'button', 'aria-pressed': detailModeInit === 'dps' ? 'true' : 'false' },
        dataset: { action: 'switch-battle-detail', detailMode: 'dps' }
      }),
      logs: el('button', {
        className: 'btn btn-compact ' + (detailModeInit === 'logs' ? 'btn-primary' : 'btn-secondary'),
        text: '戦況ログ',
        attrs: { type: 'button', 'aria-pressed': detailModeInit === 'logs' ? 'true' : 'false' },
        dataset: { action: 'switch-battle-detail', detailMode: 'logs' }
      }),
      buffs: el('button', {
        className: 'btn btn-compact ' + (detailModeInit === 'buffs' ? 'btn-primary' : 'btn-secondary'),
        text: '付与状態',
        attrs: { type: 'button', 'aria-pressed': detailModeInit === 'buffs' ? 'true' : 'false' },
        dataset: { action: 'switch-battle-detail', detailMode: 'buffs' }
      })
    };
    const dpsDetailSwitcher = el('div', { className: 'btn-grid-3' }, [
      dpsDetailBtns.dps,
      dpsDetailBtns.logs,
      dpsDetailBtns.buffs
    ]);
    const dpsDetailBody = el('div', { className: 'dps-detail-body' });
    const dpsDetailContainer = el('div', { className: 'dps-detail-box' }, [
      dpsDetailSwitcher,
      dpsDetailBody
    ]);
    if (!uiState.showDpsDetail) {
      dpsDetailContainer.classList.add('is-hidden');
    }

    const scrollArea = el('div', { className: 'lower-scroll' }, [
      el('div', { className: 'ctrl-section' }, [
        el('span', { className: 'ctrl-label', text: '全体作戦' }),
        el('div', { className: 'btn-grid-4' }, POLICY_ORDER.map(function (p) { return policyBtns[p]; }))
      ]),
      el('div', { className: 'ctrl-section' }, [
        el('span', { className: 'ctrl-label', text: '標的優先' }),
        el('div', { className: 'btn-grid-4' }, TARGET_ORDER.map(function (t) { return targetBtns[t]; }))
      ]),
      el('div', { className: 'ally-control-grid' }, unitControlCards),
      dpsDetailContainer
    ]);

    if (lowerEl) {
      clearNode(lowerEl);
      lowerEl.appendChild(lowerHeader);
      lowerEl.appendChild(scrollArea);
    }

    battleRefs = {
      battleId: snapshot.id,
      wavePill,
      speedPill,
      repeatPill,
      tickerText,
      elapsedText,
      timelineChips,
      enemyField,
      enemyZone: enemyBuilt.refs,
      allyRefs,
      dpsDealt,
      dpsTaken,
      dpsHeal,
      dpsHealed,
      vfxLayer,
      speedBtns,
      autoBtn,
      dpsToggleBtn,
      policyBtns,
      targetBtns,
      unitControls,
      dpsDetailContainer,
      dpsDetailBtns,
      dpsDetailBody
    };
    lastDpsDetailFlag = uiState.showDpsDetail;
    lastBattleDetailMode = uiState.battleDetailMode;
    if (uiState.showDpsDetail) {
      renderBattleDetailBox(dpsDetailContainer, snapshot, uiState, {
        btns: dpsDetailBtns,
        body: dpsDetailBody
      });
    }
  }

  function renderDpsDetailRows(container, dpsMeters) {
    clearNode(container);
    const header = el('div', { className: 'dps-table-row is-head' }, [
      el('span', { text: '仲間' }),
      el('span', { text: '与ダメ' }),
      el('span', { text: '被ダメ' }),
      el('span', { text: '回復' }),
      el('span', { text: '被回復' })
    ]);
    container.appendChild(header);

    for (let i = 0; i < dpsMeters.byUnit.length; i += 1) {
      const u = dpsMeters.byUnit[i];
      container.appendChild(el('div', { className: 'dps-table-row' }, [
        el('span', { className: 'unit-name', text: u.name }),
        el('span', { text: String(u.damageDealt) }),
        el('span', { text: String(u.damageTaken) }),
        el('span', { text: String(u.healingDone) }),
        el('span', { text: String(u.healingReceived) })
      ]));
    }
  }

  function ensureBattleDetailStructure(container) {
    if (container._detailRefs) {
      return container._detailRefs;
    }
    clearNode(container);
    const btns = {
      dps: el('button', {
        className: 'btn btn-compact btn-secondary',
        text: 'DPS詳細',
        attrs: { type: 'button', 'aria-pressed': 'false' },
        dataset: { action: 'switch-battle-detail', detailMode: 'dps' }
      }),
      logs: el('button', {
        className: 'btn btn-compact btn-secondary',
        text: '戦況ログ',
        attrs: { type: 'button', 'aria-pressed': 'false' },
        dataset: { action: 'switch-battle-detail', detailMode: 'logs' }
      }),
      buffs: el('button', {
        className: 'btn btn-compact btn-secondary',
        text: '付与状態',
        attrs: { type: 'button', 'aria-pressed': 'false' },
        dataset: { action: 'switch-battle-detail', detailMode: 'buffs' }
      })
    };
    const switcher = el('div', { className: 'btn-grid-3' }, [btns.dps, btns.logs, btns.buffs]);
    const body = el('div', { className: 'dps-detail-body' });
    container.appendChild(switcher);
    container.appendChild(body);
    container._detailRefs = { btns, body };
    return container._detailRefs;
  }

  function renderBattleDetailBox(container, snapshot, uiState, providedRefs) {
    const refs = providedRefs || ensureBattleDetailStructure(container);
    const mode = uiState.battleDetailMode || 'dps';
    ['dps', 'logs', 'buffs'].forEach(function (k) {
      const btn = refs.btns[k];
      if (!btn) return;
      const isActive = mode === k;
      btn.classList.toggle('btn-primary', isActive);
      btn.classList.toggle('btn-secondary', !isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    const body = refs.body;
    clearNode(body);

    if (mode === 'logs') {
      const logs = (snapshot.logs || []).slice().reverse();
      const logList = el('div', { className: 'battle-log-list' },
        logs.length > 0
          ? logs.map(function (ln) { return el('div', { className: 'battle-log-line', text: ln }); })
          : [el('div', { className: 'muted-note', text: 'まだ行動ログはありません。' })]
      );
      body.appendChild(logList);
      return;
    }

    if (mode === 'buffs') {
      const units = snapshot.allies.concat(snapshot.enemies).filter(function (u) { return u.hp > 0; });
      const rows = units.map(function (u) {
        const effs = [];
        if (u.shield > 0) effs.push('障壁+' + u.shield);
        (u.buffs || []).forEach(function (b) {
          if (b.stat === 'shield') return;
          const m = BUFF_META_MAP[b.stat];
          const suffix = b.isTraitStack ? ((b.stacks || b.duration) + '層') : (b.duration + 'T');
          effs.push((m ? m.label.split('（')[0] : b.stat) + '(' + suffix + ')');
        });
        (u.debuffs || []).forEach(function (d) {
          const m = BUFF_META_MAP[d.stat];
          effs.push('[' + (m ? m.label.split('（')[0] : d.stat) + '(' + d.duration + 'T)]');
        });
        return el('div', { className: 'battle-log-line', text: u.name + '：' + (effs.length > 0 ? effs.join(' ／ ') : '付与なし') });
      });
      body.appendChild(el('div', { className: 'battle-log-list' }, rows));
      return;
    }

    const tableWrap = el('div');
    renderDpsDetailRows(tableWrap, snapshot.dpsMeters);
    body.appendChild(tableWrap);
    body.appendChild(el('div', {
      className: 'muted-note',
      text: '経過 ' + ((snapshot.elapsedMs || 0) / 1000).toFixed(1) + '秒 ／ 累計 ' + snapshot.turnCount + '行動'
    }));
  }

  function spawnVfxForEvents(refs, snapshot) {
    if (!refs || !refs.vfxLayer || !Array.isArray(snapshot.events) || snapshot.events.length === 0) {
      return;
    }
    const maxToRender = Math.min(snapshot.events.length, 6);
    for (let i = 0; i < maxToRender; i += 1) {
      const ev = snapshot.events[i];
      if (ev.type !== 'damage' && ev.type !== 'heal' && ev.type !== 'endure') {
        continue;
      }
      const targetId = ev.targetId || ev.unitId;
      const targetRef = ev.targetSide === 'enemy'
        ? (refs.enemyZone && refs.enemyZone.units ? refs.enemyZone.units[targetId] : null)
        : (refs.allyRefs ? refs.allyRefs[targetId] : null);
      if (targetRef && targetRef.plate) {
        const animCls = ev.type === 'endure'
          ? 'anim-endure-flash'
          : (ev.type === 'heal' ? 'anim-heal' : (ev.isCrit ? 'anim-crit-flash' : 'anim-hit'));
        targetRef.plate.classList.remove('anim-hit', 'anim-heal', 'anim-crit-flash', 'anim-endure-flash');
        void targetRef.plate.offsetWidth;
        targetRef.plate.classList.add(animCls);
        if (typeof root.setTimeout === 'function') {
          root.setTimeout(function () {
            targetRef.plate.classList.remove(animCls);
          }, 380);
        }
      }

      const floatEl = el('span', {
        className: 'vfx-float ' + (ev.type === 'heal' ? 'is-heal' : (ev.isCrit ? 'is-crit' : 'is-dmg')),
        text: ev.type === 'endure' ? '不屈!' : ((ev.type === 'heal' ? '+' : '-') + ev.value + (ev.isCrit ? '!' : ''))
      });
      const isEnemyTarget = ev.targetSide === 'enemy';
      const leftPct = 18 + ((i * 19 + snapshot.turnCount * 11) % 64);
      const topPct = isEnemyTarget ? (26 + (i % 3) * 6) : (56 + (i % 3) * 6);
      floatEl.style.left = leftPct + '%';
      floatEl.style.top = topPct + '%';

      refs.vfxLayer.appendChild(floatEl);
      if (typeof root.setTimeout === 'function') {
        root.setTimeout(function () {
          if (floatEl.parentNode) {
            floatEl.parentNode.removeChild(floatEl);
          }
        }, 650);
      }
    }
  }

  function patchBattleFrame(upperEl, lowerEl, snapshot, uiState) {
    if (!battleRefs || battleRefs.battleId !== snapshot.id) {
      buildBattleScene(upperEl, lowerEl, snapshot, uiState);
      return;
    }

    const SvgIcons = IkaiApp.SvgIcons;
    const refs = battleRefs;
    const isTrial = snapshot.mode === 'trial';
    const nextActorId = (snapshot.timeline && snapshot.timeline[0]) ? snapshot.timeline[0].unitId : null;

    refs.wavePill.textContent = 'W ' + (snapshot.waveIndex + 1) + '/' + snapshot.totalWaves;
    refs.speedPill.textContent = '×' + snapshot.speed;
    refs.repeatPill.textContent = formatRepeatPill(snapshot, uiState);

    const latestLog = (snapshot.logs && snapshot.logs.length > 0) ? snapshot.logs[snapshot.logs.length - 1] : '戦闘進行中';
    refs.tickerText.textContent = latestLog;
    refs.elapsedText.textContent = '経過 ' + ((snapshot.elapsedMs || 0) / 1000).toFixed(1) + 's';

    for (let i = 0; i < 8; i += 1) {
      const slot = refs.timelineChips[i];
      const item = snapshot.timeline[i] || null;
      if (!item) {
        slot.chip.classList.add('is-empty');
        slot.chip.classList.remove('is-ally', 'is-enemy', 'is-boss');
        continue;
      }
      slot.chip.classList.remove('is-empty');
      slot.chip.classList.toggle('is-ally', item.side === 'ally');
      slot.chip.classList.toggle('is-enemy', item.side === 'enemy');
      slot.chip.classList.toggle('is-boss', Boolean(item.isBoss));
      const key = item.role + ':' + item.side;
      if (slot.lastKey !== key) {
        slot.lastKey = key;
        clearNode(slot.chipIconWrap);
        slot.chipIconWrap.appendChild(SvgIcons.createRoleIcon(item.role, 'timeline-svg'));
      }
    }

    const nextWaveSig = snapshot.enemies.map(function (e) { return e.id; }).join(',');
    if (refs.enemyZone.waveSignature !== nextWaveSig) {
      clearNode(refs.enemyField);
      const rebuilt = buildEnemyZone(snapshot.enemies, snapshot.isBossWave, nextActorId);
      refs.enemyField.appendChild(rebuilt.node);
      refs.enemyZone = rebuilt.refs;
    } else {
      for (let i = 0; i < snapshot.enemies.length; i += 1) {
        const e = snapshot.enemies[i];
        const uRef = refs.enemyZone.units[e.id];
        if (!uRef) continue;
        uRef.plate.classList.toggle('is-ko', e.hp <= 0);
        uRef.plate.classList.toggle('is-acting-next', e.id === nextActorId && e.hp > 0);
        uRef.hpFill.style.width = e.hpPct + '%';
        if (uRef.lagFill) {
          uRef.lagFill.style.width = e.hpPct + '%';
        }
        if (uRef.shieldFill) {
          uRef.shieldFill.style.width = calcShieldPct(e) + '%';
        }
        if (uRef.atbFill) {
          uRef.atbFill.style.width = e.gauge + '%';
        }
        uRef.hpText.textContent = formatUnitHpText(e, e.isBoss);
        const sig = signatureOfEffects(e.buffs, e.debuffs);
        if (sig !== uRef.effSig) {
          uRef.effSig = sig;
          clearNode(uRef.buffBox);
          const badges = buildBuffStrip(e.buffs, e.debuffs);
          for (let b = 0; b < badges.length; b += 1) {
            uRef.buffBox.appendChild(badges[b]);
          }
        }
      }
    }

    if (refs.enemyZone.bossTelegraphBar) {
      const tg = snapshot.bossTelegraph;
      refs.enemyZone.bossTelegraphBar.classList.toggle('is-telegraph-active', Boolean(tg));
      if (tg) {
        refs.enemyZone.bossTelegraphText.textContent = tg.warningText;
        refs.enemyZone.bossTelegraphTurns.textContent = 'あと ' + tg.remainingTurns + ' 行動';
      } else {
        refs.enemyZone.bossTelegraphText.textContent = '通常警戒中';
        refs.enemyZone.bossTelegraphTurns.textContent = '待機';
      }
    }

    for (let i = 0; i < snapshot.allies.length; i += 1) {
      const a = snapshot.allies[i];
      const aRef = refs.allyRefs[a.id];
      if (aRef) {
        aRef.plate.classList.toggle('is-ko', a.hp <= 0);
        aRef.plate.classList.toggle('is-acting-next', a.id === nextActorId && a.hp > 0);
        aRef.reservedTag.classList.toggle('is-visible', Boolean(a.reservedSkillId) && a.hp > 0);
        aRef.hpFill.style.width = a.hpPct + '%';
        if (aRef.lagFill) {
          aRef.lagFill.style.width = a.hpPct + '%';
        }
        if (aRef.shieldFill) {
          aRef.shieldFill.style.width = calcShieldPct(a) + '%';
        }
        aRef.atbFill.style.width = a.gauge + '%';
        aRef.hpText.textContent = formatUnitHpText(a, false);
        const sig = signatureOfEffects(a.buffs, a.debuffs);
        if (sig !== aRef.effSig) {
          aRef.effSig = sig;
          clearNode(aRef.buffBox);
          const badges = buildBuffStrip(a.buffs, a.debuffs);
          for (let b = 0; b < badges.length; b += 1) {
            aRef.buffBox.appendChild(badges[b]);
          }
        }
      }

      const cRef = refs.unitControls[a.id];
      if (cRef) {
        cRef.tacticBtn.textContent = POLICY_LABELS[a.tactic.policy] || '均衡';
        cRef.tacticBtn.disabled = a.hp <= 0;
        const isUniqueRes = a.reservedSkillId === 'unique';
        const cd = a.uniqueSkill ? a.uniqueSkill.currentCd : 0;
        cRef.reserveBtn.disabled = a.hp <= 0;
        cRef.reserveBtn.classList.toggle('is-reserved', isUniqueRes);
        if (a.hp <= 0) {
          cRef.reserveBtn.textContent = cRef.skillName + '（戦闘不能）';
        } else if (isUniqueRes) {
          cRef.reserveBtn.textContent = cRef.skillName + '（予約済）';
        } else if (cd > 0) {
          cRef.reserveBtn.textContent = cRef.skillName + '（CT' + cd + '）';
        } else {
          cRef.reserveBtn.textContent = cRef.skillName + '（予約可）';
        }

        if (Array.isArray(cRef.collectBtns)) {
          for (let k = 0; k < cRef.collectBtns.length; k += 1) {
            const cb = cRef.collectBtns[k];
            const sk = (a.collectSkills || []).find(function (s) { return s.id === cb.skillId; });
            const isSkRes = a.reservedSkillId === cb.skillId;
            const skCd = sk ? sk.currentCd : 0;
            cb.btn.disabled = a.hp <= 0;
            cb.btn.classList.toggle('is-reserved', isSkRes);
            if (a.hp <= 0) {
              cb.btn.textContent = cb.skillName + '（戦闘不能）';
            } else if (isSkRes) {
              cb.btn.textContent = cb.skillName + '（予約済）';
            } else if (skCd > 0) {
              cb.btn.textContent = cb.skillName + '（CT' + skCd + '）';
            } else {
              cb.btn.textContent = cb.skillName + '（予約可）';
            }
          }
        }
      }
    }

    const totals = snapshot.dpsMeters.totals;
    const maxMetric = Math.max(1, totals.damageDealt, totals.damageTaken, totals.healingDone, totals.healingReceived);
    const sec = Math.max(0.1, (snapshot.elapsedMs || 0) / 1000);
    refs.dpsDealt.fill.style.width = Math.round((totals.damageDealt / maxMetric) * 100) + '%';
    refs.dpsDealt.valNode.textContent = String(totals.damageDealt);
    refs.dpsDealt.rateNode.textContent = Math.round(totals.damageDealt / sec) + '/s';
    refs.dpsTaken.fill.style.width = Math.round((totals.damageTaken / maxMetric) * 100) + '%';
    refs.dpsTaken.valNode.textContent = String(totals.damageTaken);
    refs.dpsTaken.rateNode.textContent = Math.round(totals.damageTaken / sec) + '/s';
    refs.dpsHeal.fill.style.width = Math.round((totals.healingDone / maxMetric) * 100) + '%';
    refs.dpsHeal.valNode.textContent = String(totals.healingDone);
    refs.dpsHeal.rateNode.textContent = Math.round(totals.healingDone / sec) + '/s';
    refs.dpsHealed.fill.style.width = Math.round((totals.healingReceived / maxMetric) * 100) + '%';
    refs.dpsHealed.valNode.textContent = String(totals.healingReceived);
    refs.dpsHealed.rateNode.textContent = Math.round(totals.healingReceived / sec) + '/s';

    [1, 2, 3].forEach(function (spd) {
      const active = snapshot.speed === spd;
      refs.speedBtns[spd].classList.toggle('btn-primary', active);
      refs.speedBtns[spd].classList.toggle('btn-secondary', !active);
    });

    const repeatOn = !isTrial && snapshot.autoRepeat > 0;
    refs.autoBtn.disabled = isTrial;
    refs.autoBtn.classList.toggle('btn-primary', repeatOn);
    refs.autoBtn.classList.toggle('btn-secondary', !repeatOn);
    refs.autoBtn.textContent = isTrial ? '周回不可' : (repeatOn ? '周回ON' : '周回OFF');

    refs.dpsToggleBtn.classList.toggle('btn-primary', Boolean(uiState.showDpsDetail));
    refs.dpsToggleBtn.classList.toggle('btn-secondary', !uiState.showDpsDetail);

    POLICY_ORDER.forEach(function (p) {
      const active = snapshot.globalTactic === p;
      refs.policyBtns[p].classList.toggle('btn-primary', active);
      refs.policyBtns[p].classList.toggle('btn-secondary', !active);
    });

    TARGET_ORDER.forEach(function (t) {
      const active = snapshot.globalTargetPolicy === t;
      refs.targetBtns[t].classList.toggle('btn-primary', active);
      refs.targetBtns[t].classList.toggle('btn-secondary', !active);
    });

    if (uiState.showDpsDetail || lastDpsDetailFlag !== uiState.showDpsDetail || lastBattleDetailMode !== uiState.battleDetailMode) {
      lastDpsDetailFlag = uiState.showDpsDetail;
      lastBattleDetailMode = uiState.battleDetailMode;
      refs.dpsDetailContainer.classList.toggle('is-hidden', !uiState.showDpsDetail);
      if (uiState.showDpsDetail) {
        renderBattleDetailBox(refs.dpsDetailContainer, snapshot, uiState, {
          btns: refs.dpsDetailBtns,
          body: refs.dpsDetailBody
        });
      }
    }

    spawnVfxForEvents(refs, snapshot);
  }

  function renderResult(upperEl, lowerEl, snapshot, uiState) {
    battleRefs = null;
    lastDpsDetailFlag = null;
    lastBattleDetailMode = null;

    const MasterData = IkaiApp.MasterData;
    const isVictory = snapshot && snapshot.status === 'victory';
    const totals = snapshot ? snapshot.dpsMeters.totals : { damageDealt: 0, damageTaken: 0, healingDone: 0, healingReceived: 0 };
    const maxMetric = Math.max(1, totals.damageDealt, totals.damageTaken, totals.healingDone, totals.healingReceived);
    const sec = Math.max(0.1, snapshot ? ((snapshot.elapsedMs || 0) / 1000) : 1);

    if (upperEl) {
      clearNode(upperEl);

      const dpsDealt = createDpsCell('与ダメージ', 'fill-dmg');
      const dpsTaken = createDpsCell('被ダメージ', 'fill-taken');
      const dpsHeal = createDpsCell('回復量', 'fill-heal');
      const dpsHealed = createDpsCell('被回復量', 'fill-healed');

      dpsDealt.fill.style.width = Math.round((totals.damageDealt / maxMetric) * 100) + '%';
      dpsDealt.valNode.textContent = String(totals.damageDealt);
      dpsDealt.rateNode.textContent = Math.round(totals.damageDealt / sec) + '/s';
      dpsTaken.fill.style.width = Math.round((totals.damageTaken / maxMetric) * 100) + '%';
      dpsTaken.valNode.textContent = String(totals.damageTaken);
      dpsTaken.rateNode.textContent = Math.round(totals.damageTaken / sec) + '/s';
      dpsHeal.fill.style.width = Math.round((totals.healingDone / maxMetric) * 100) + '%';
      dpsHeal.valNode.textContent = String(totals.healingDone);
      dpsHeal.rateNode.textContent = Math.round(totals.healingDone / sec) + '/s';
      dpsHealed.fill.style.width = Math.round((totals.healingReceived / maxMetric) * 100) + '%';
      dpsHealed.valNode.textContent = String(totals.healingReceived);
      dpsHealed.rateNode.textContent = Math.round(totals.healingReceived / sec) + '/s';

      let mvpId = null;
      let bestScore = -1;
      const byUnit = snapshot && snapshot.dpsMeters ? snapshot.dpsMeters.byUnit : [];
      const useDmg = totals.damageDealt > 0;
      for (let i = 0; i < byUnit.length; i += 1) {
        const sc = useDmg ? byUnit[i].damageDealt : byUnit[i].healingDone;
        if (sc > bestScore) {
          bestScore = sc;
          mvpId = byUnit[i].unitId;
        }
      }

      const allyChips = (snapshot ? snapshot.allies : []).map(function (a) {
        return el('div', { className: 'result-ally-chip rarity-' + a.rarity }, [
          el('div', { className: 'unit-ident' }, [
            el('span', { className: 'unit-name', text: a.name }),
            a.id === mvpId ? el('span', { className: 'mvp-chip', text: 'MVP' }) : null
          ]),
          el('span', { className: 'muted-note', text: '残HP ' + a.hp + '/' + a.maxHp })
        ]);
      });

      const stage = el('div', { className: 'result-stage anim-fade-in' }, [
        el('div', { className: 'result-banner ' + (isVictory ? 'is-victory anim-victory-sweep' : 'is-defeat') }, [
          el('div', { className: 'result-status-title', text: isVictory ? '作戦成功' : '作戦失敗' }),
          el('div', {
            className: 'result-stage-sub',
            text: (snapshot ? snapshot.stageLabel : '') + ' ・ 経過 ' + (snapshot ? snapshot.turnCount : 0) + '行動（' + ((snapshot ? (snapshot.elapsedMs || 0) : 0) / 1000).toFixed(1) + 's）'
          })
        ]),
        el('div', { className: 'dps-meter-panel is-result' }, [
          dpsDealt.rootNode,
          dpsTaken.rootNode,
          dpsHeal.rootNode,
          dpsHealed.rootNode
        ]),
        el('div', { className: 'result-ally-grid' }, allyChips)
      ]);
      upperEl.appendChild(stage);
    }

    if (lowerEl) {
      clearNode(lowerEl);
      const header = el('div', { className: 'lower-header' }, [
        el('span', { className: 'section-heading', text: isVictory ? '戦闘リザルト（勝利）' : '戦闘リザルト（撤退・敗北）' }),
        el('span', { className: 'muted-note', text: '4項目DPS内訳・報酬' })
      ]);

      const scrollNodes = [];
      if (uiState.autoRepeatPending) {
        scrollNodes.push(el('div', { className: 'notice-banner is-ok' }, [
          el('div', { text: '自動周回進行中：次戦まで待機中（残り ' + uiState.autoRepeatRemaining + ' 回）' }),
          el('div', { className: 'btn-row' }, [
            el('button', {
              className: 'btn btn-compact btn-primary',
              text: 'すぐ次戦へ',
              attrs: { type: 'button' },
              dataset: { action: 'proceed-auto-repeat' }
            }),
            el('button', {
              className: 'btn btn-compact btn-danger',
              text: '周回停止',
              attrs: { type: 'button' },
              dataset: { action: 'cancel-auto-repeat' }
            })
          ])
        ]));
      }

      if (uiState.lastRewards && !uiState.lastRewards.retreated) {
        const rw = uiState.lastRewards;
        const rewardPills = [];
        if (rw.echoStones) rewardPills.push(el('span', { className: 'reward-pill', text: '残響石 +' + rw.echoStones }));
        if (rw.starCoins) rewardPills.push(el('span', { className: 'reward-pill', text: '星貨 +' + rw.starCoins }));
        if (rw.emblemShards) rewardPills.push(el('span', { className: 'reward-pill', text: '紋章片 +' + rw.emblemShards }));
        if (rw.masteryBooks) rewardPills.push(el('span', { className: 'reward-pill', text: '熟練の書 +' + rw.masteryBooks }));
        if (rw.exchangeCrystals) rewardPills.push(el('span', { className: 'reward-pill', text: '交換結晶 +' + rw.exchangeCrystals }));
        if (rw.universalShards) rewardPills.push(el('span', { className: 'reward-pill', text: '汎用結晶 +' + rw.universalShards }));
        if (rw.qualityCatalysts) rewardPills.push(el('span', { className: 'reward-pill', text: '昇格触媒 +' + rw.qualityCatalysts }));
        if (rw.skillName) rewardPills.push(el('span', { className: 'reward-pill', text: '収集技『' + rw.skillName + '』' }));
        if (rw.equipText) rewardPills.push(el('span', { className: 'reward-pill', text: '装備『' + rw.equipText + '』' }));
        if (rw.advancedExpeditions > 0) rewardPills.push(el('span', { className: 'reward-pill', text: '異界調査進行 +' + rw.advancedExpeditions + '枠' }));
        if (rw.raidBestDamage !== null && rw.raidBestDamage !== undefined) {
          rewardPills.push(el('span', { className: 'reward-pill', text: '討伐最大与ダメ ' + rw.raidBestDamage }));
        }

        scrollNodes.push(el('div', { className: 'detail-block' }, [
          el('div', { className: 'detail-heading', text: rw.isFirstClear ? '初回踏破報酬を獲得' : (isVictory ? '戦闘報酬を獲得' : '戦闘記録を更新') }),
          rewardPills.length > 0
            ? el('div', { className: 'reward-pill-grid' }, rewardPills)
            : el('div', { className: 'detail-desc', text: '報酬記録済み' })
        ]));

        if (Array.isArray(rw.rankedUpSkills) && rw.rankedUpSkills.length > 0) {
          const rankMsgs = rw.rankedUpSkills.map(function (rk) {
            const rankInfo = MasterData.SKILL_MASTERY_RANKS[(rk.newRank || 1) - 1];
            const rankLabel = rankInfo ? rankInfo.label : String(rk.newRank);
            return el('div', {
              className: 'detail-desc',
              text: '『' + rk.name + '』が 熟練ランク' + rankLabel + ' に昇格しました'
            });
          });
          scrollNodes.push(el('div', { className: 'notice-banner is-ok' }, [
            el('div', { className: 'detail-heading', text: '収集技 熟練度昇格！' })
          ].concat(rankMsgs)));
        }
      }

      if (uiState.autoRepeatSummary && uiState.autoRepeatSummary.runs >= 1) {
        const sum = uiState.autoRepeatSummary;
        const sumPills = [
          el('span', { className: 'reward-pill', text: sum.runs + '戦 ' + sum.victories + '勝' })
        ];
        if (sum.echoStones) sumPills.push(el('span', { className: 'reward-pill', text: '残響石 +' + sum.echoStones }));
        if (sum.starCoins) sumPills.push(el('span', { className: 'reward-pill', text: '星貨 +' + sum.starCoins }));
        if (sum.emblemShards) sumPills.push(el('span', { className: 'reward-pill', text: '紋章片 +' + sum.emblemShards }));
        if (sum.masteryBooks) sumPills.push(el('span', { className: 'reward-pill', text: '熟練の書 +' + sum.masteryBooks }));
        if (sum.exchangeCrystals) sumPills.push(el('span', { className: 'reward-pill', text: '交換結晶 +' + sum.exchangeCrystals }));
        if (sum.equipDrops) sumPills.push(el('span', { className: 'reward-pill', text: '装備獲得 ' + sum.equipDrops + '個' }));

        scrollNodes.push(el('div', { className: 'm3-card' }, [
          el('div', { className: 'm3-card-title', text: '自動周回 累計獲得サマリー' }),
          el('div', { className: 'reward-pill-grid' }, sumPills)
        ]));
      }

      const unitDpsBox = el('div', { className: 'dps-detail-box' });
      if (snapshot) {
        renderDpsDetailRows(unitDpsBox, snapshot.dpsMeters);
      }
      scrollNodes.push(unitDpsBox);

      const logs = snapshot && Array.isArray(snapshot.logs) ? snapshot.logs : [];
      if (logs.length > 0) {
        scrollNodes.push(el('div', { className: 'm3-card' }, [
          el('div', { className: 'm3-card-head' }, [
            el('span', { className: 'm3-card-title', text: '戦況ログ（直近 ' + logs.length + ' 件）' }),
            el('button', {
              className: 'btn btn-compact btn-secondary',
              text: uiState.showResultLogs ? '閉じる' : '開く',
              attrs: { type: 'button' },
              dataset: { action: 'toggle-result-logs' }
            })
          ]),
          uiState.showResultLogs
            ? el('div', { className: 'battle-log-list' }, logs.slice().reverse().map(function (ln) {
                return el('div', { className: 'battle-log-line', text: ln });
              }))
            : null
        ]));
      }

      const scrollArea = el('div', { className: 'lower-scroll' }, scrollNodes);

      const mode = snapshot ? snapshot.mode : 'stage';
      const hasNextStage = mode === 'stage' && Boolean(uiState.nextStageId);
      const isAbyss = mode === 'abyss';
      const isTwoCol = mode === 'raid' || mode === 'trial';

      let actionsBar;
      if (isTwoCol) {
        actionsBar = el('div', { className: 'result-actions btn-grid-2' }, [
          el('button', {
            className: 'btn btn-primary',
            text: '再挑戦',
            attrs: { type: 'button' },
            dataset: { action: 'retry-battle' }
          }),
          el('button', {
            className: 'btn btn-secondary',
            text: '拠点へ戻る',
            attrs: { type: 'button' },
            dataset: { action: 'return-hub' }
          })
        ]);
      } else {
        const middleBtn = isAbyss
          ? el('button', {
              className: 'btn btn-primary',
              text: '次の階層へ',
              attrs: { type: 'button' },
              disabled: !isVictory,
              dataset: { action: 'next-abyss-floor' }
            })
          : el('button', {
              className: 'btn btn-primary',
              text: '次のステージ',
              attrs: { type: 'button' },
              disabled: !(isVictory && hasNextStage),
              dataset: { action: 'next-stage' }
            });

        actionsBar = el('div', { className: 'result-actions btn-grid-3' }, [
          el('button', {
            className: 'btn btn-secondary',
            text: '再戦',
            attrs: { type: 'button' },
            dataset: { action: 'retry-battle' }
          }),
          middleBtn,
          el('button', {
            className: 'btn btn-secondary',
            text: '拠点へ戻る',
            attrs: { type: 'button' },
            dataset: { action: 'return-hub' }
          })
        ]);
      }

      lowerEl.appendChild(header);
      lowerEl.appendChild(scrollArea);
      lowerEl.appendChild(actionsBar);
    }
  }

  function renderAll(upperEl, lowerEl, state, uiState, battleSnapshot) {
    if (uiState.mode === 'battle' && battleSnapshot) {
      patchBattleFrame(upperEl, lowerEl, battleSnapshot, uiState);
      return;
    }
    if (uiState.mode === 'result') {
      renderResult(upperEl, lowerEl, battleSnapshot, uiState);
      return;
    }
    renderHub(upperEl, lowerEl, state, uiState);
  }

  function resetBattleCache() {
    battleRefs = null;
    lastDpsDetailFlag = null;
    lastBattleDetailMode = null;
  }

  IkaiApp.UIRenderer = Object.freeze({
    renderAll,
    patchBattleFrame,
    resetBattleCache,
    POLICY_LABELS,
    TARGET_LABELS,
    PRIORITY_LABELS,
    POLICY_ORDER,
    TARGET_ORDER,
    PRIORITY_ORDER
  });
})(typeof window !== 'undefined' ? window : globalThis);
