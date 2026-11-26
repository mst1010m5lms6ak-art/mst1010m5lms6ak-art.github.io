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

  let battleRefs = null;
  let lastDpsDetailFlag = null;

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

  function buildBuffStrip(buffs, debuffs) {
    const SvgIcons = IkaiApp.SvgIcons;
    const list = [];
    const maxItems = 5;

    for (let i = 0; i < buffs.length && list.length < maxItems; i += 1) {
      const b = buffs[i];
      list.push(el('span', { className: 'buff-badge is-buff' }, [
        SvgIcons.createBuffIcon(mapBuffIconKey(b.stat), 'buff-svg'),
        el('span', { className: 'buff-dur', text: String(b.duration) })
      ]));
    }
    for (let i = 0; i < debuffs.length && list.length < maxItems; i += 1) {
      const d = debuffs[i];
      list.push(el('span', { className: 'buff-badge is-debuff' }, [
        SvgIcons.createBuffIcon(mapBuffIconKey(d.stat), 'buff-svg'),
        el('span', { className: 'buff-dur', text: String(d.duration) })
      ]));
    }
    return list;
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
      const chips = res.results.map(function (item) {
        const outcomeLabel = item.outcome === 'new'
          ? '新規'
          : (item.outcome === 'crystal' ? ('結晶+' + item.crystalsGained) : '覚醒片+1');
        return el('div', { className: 'summon-pull-chip rarity-' + item.rarity }, [
          el('div', { className: 'summon-pull-left' }, [
            SvgIcons.createRoleIcon(item.role, 'plate-role-svg'),
            el('span', { className: 'unit-name', text: item.name })
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
      const awk = selectedOwned.awakening;
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
          })
        ])
      ]));
    }

    let sourceList = MasterData.CHARACTERS.slice();
    if (uiState.rosterFilter === 'owned') {
      sourceList = sourceList.filter(function (c) {
        return hasOwn(state.roster, c.id);
      });
    }
    const sorted = StateStore.sortUnits(sourceList);

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

    return nodes.concat([filterRow], rows);
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
      const slotCards = MasterData.EQUIP_SLOTS.map(function (slot) {
        const unlocked = tierDef.unlockedSlots.indexOf(slot) >= 0;
        const uid = owned.equipped[slot];
        const eq = uid ? state.equips.find(function (e) { return e.uid === uid; }) : null;
        const eqDef = eq && hasOwn(MasterData.EQUIP_MAP, eq.equipId) ? MasterData.EQUIP_MAP[eq.equipId] : null;
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

    // Bulk Sell bar (0..3, protects equipped & locked & 極4)
    nodes.push(el('div', { className: 'm3-card' }, [
      el('div', { className: 'm3-card-title', text: '不要品質 一括売却（装着中・保護中・極は自動保護）' }),
      el('div', { className: 'btn-grid-4' }, [0, 1, 2, 3].map(function (qIdx) {
        const label = qIdx === 0 ? '並のみ' : (MasterData.QUALITY_RANKS[qIdx].name + '以下');
        return el('button', {
          className: 'btn btn-compact btn-danger',
          text: label,
          attrs: { type: 'button' },
          dataset: { action: 'bulk-sell-equips', maxQuality: String(qIdx) }
        });
      }))
    ]));

    // Equip inventory rows
    nodes.push(el('div', { className: 'muted-note', text: '所持装備一覧（' + state.equips.length + '個）' }));
    state.equips.forEach(function (eq) {
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
            className: 'btn btn-primary btn-sortie',
            text: '無限深淵 第' + curFloor + '層へ出撃',
            attrs: { type: 'button' },
            dataset: { action: 'start-abyss', floor: String(curFloor) }
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
          })),
          el('button', {
            className: 'btn btn-primary btn-sortie',
            text: '『' + boss.name + '（' + diff.name + '）』へ討伐出撃',
            attrs: { type: 'button' },
            dataset: { action: 'start-raid', raidId: boss.id, diffId: diff.id }
          })
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

      const validationPanel = !check.ok
        ? el('div', { className: 'notice-banner is-error' }, [
            el('div', { text: check.reasons.join(' ／ ') }),
            el('button', {
              className: 'btn btn-compact btn-secondary',
              text: '編成タブで編成を変更',
              attrs: { type: 'button' },
              dataset: { action: 'switch-tab', tabId: 'party' }
            })
          ])
        : el('div', { className: 'notice-banner is-ok', text: '現在の4人枠は試練制約に適合しています。' });

      return notices.concat([
        pillarBar,
        validationPanel,
        el('div', { className: 'sortie-panel' }, [
          el('div', { className: 'sortie-party-line', text: '出撃編成：' + partyNames }),
          el('button', {
            className: 'btn btn-primary btn-sortie',
            text: '『' + trial.name + '』へ挑戦',
            attrs: { type: 'button' },
            disabled: !check.ok,
            dataset: { action: 'start-trial', trialId: trial.id }
          })
        ])
      ], trialCards);
    }

    // Default: story pillar
    const areas = MasterData.AREAS;
    const currentArea = findAreaById(uiState.selectedAreaId);
    const currentStage = findStageInArea(currentArea, uiState.selectedStageId);
    const stageUnlocked = Progression.isStageUnlocked(state, currentStage.id);

    const repeatChoices = [
      { count: 0, label: '単発' },
      { count: 3, label: '3回' },
      { count: 5, label: '5回' },
      { count: 10, label: '10回' }
    ];

    const repeatBtns = repeatChoices.map(function (item) {
      const isActive = state.settings.autoRepeatCount === item.count;
      return el('button', {
        className: isActive ? 'btn btn-primary' : 'btn btn-secondary',
        text: item.label,
        attrs: { type: 'button' },
        dataset: { action: 'set-auto-repeat', count: String(item.count) }
      });
    });

    const policyBtns = POLICY_ORDER.map(function (p) {
      return el('button', {
        className: uiState.hubGlobalPolicy === p ? 'btn btn-primary' : 'btn btn-secondary',
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
      ].concat(repeatBtns)),
      el('button', {
        className: 'btn btn-primary btn-sortie',
        text: stageUnlocked ? ('『' + currentStage.id + ' ' + currentStage.name + '』へ出撃開始') : ('『' + currentStage.id + '』未開放（前ステージ踏破で開放）'),
        attrs: { type: 'button' },
        disabled: !stageUnlocked,
        dataset: { action: 'start-stage', stageId: currentStage.id }
      })
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
      return hasOwn(state.roster, c.id);
    }));

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
              el('div', { className: 'unit-kana', text: c.rarity + '・' + c.role + ' ／ 方針：' + (POLICY_LABELS[entry.tactic.policy] || '均衡') })
            ])
          ]),
          el('div', { className: 'unit-meta-right' }, [
            inExp ? el('span', { className: 'tag-chip tag-chip-boss', text: '調査中' })
              : (partyIdx >= 0 ? el('span', { className: 'tag-chip tag-chip-owned', text: '枠' + (partyIdx + 1) })
                : (resIdx >= 0 ? el('span', { className: 'tag-chip', text: '共鳴' + (resIdx + 1) }) : null))
          ])
        ]),
        el('div', { className: 'btn-grid-3' }, [
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
          }),
          el('button', {
            className: 'btn btn-compact btn-secondary',
            text: '方針切替',
            attrs: { type: 'button' },
            dataset: { action: 'cycle-roster-policy', charId: c.id }
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

    const candidateSet = new Set(uiState.expCandidateIds || []);
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
      return el('button', {
        className: 'btn btn-compact ' + (active ? 'btn-primary' : 'btn-secondary'),
        text: b.name,
        attrs: { type: 'button' },
        dataset: { action: 'select-banner', bannerId: b.id }
      });
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

    return notices.concat([
      subBar,
      el('div', { className: 'summon-banner-card' }, [
        el('div', { className: 'btn-grid-2' }, bannerCards),
        el('div', { className: 'detail-desc', text: '回数制限・時間制限なしでいつでも実行可能。最大覚醒超過時は交換結晶（SSR 50 / SR 15 / R 5）へ自動変換。' }),
        pullBar
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
    return [catBar, searchInput, listContainer];
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
      el('div', { className: 'btn-grid-3' }, [
        el('button', {
          className: 'btn btn-primary',
          text: 'バックアップ書出',
          attrs: { type: 'button' },
          dataset: { action: 'export-backup' }
        }),
        el('button', {
          className: 'btn btn-secondary',
          text: 'JSON復元実行',
          attrs: { type: 'button' },
          dataset: { action: 'import-backup' }
        }),
        el('button', {
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

      // M1 compatibility hidden tab button for 'audio_icons'
      tabButtons.push(el('button', {
        className: 'tab-btn is-hidden',
        text: '音響・紋章',
        attrs: { type: 'button', tabindex: '-1', 'aria-hidden': 'true' },
        dataset: { action: 'switch-tab', tabId: 'audio_icons' }
      }));

      const tabBar = el('nav', { className: 'lower-tabs', attrs: { 'aria-label': '下半分操作タブ' } }, tabButtons);

      lowerEl.appendChild(header);
      lowerEl.appendChild(scrollArea);
      lowerEl.appendChild(tabBar);
      if (prevScrollTop > 0 && uiState.activeTab === 'codex') {
        scrollArea.scrollTop = prevScrollTop;
      }
    }
  }

  // =========================================================================
  // Battle Scene & Result Screen
  // =========================================================================

  function createDpsCell(label, fillClass) {
    const fill = el('div', { className: 'meter-fill bar-smooth ' + fillClass });
    fill.style.width = '0%';
    const valNode = el('span', { className: 'dps-val', text: '0' });
    const rootNode = el('div', { className: 'dps-cell' }, [
      el('div', { className: 'dps-cell-head' }, [
        el('span', { className: 'dps-label', text: label }),
        valNode
      ]),
      el('div', { className: 'meter-track dps-track' }, [fill])
    ]);
    return { rootNode, fill, valNode };
  }

  function buildEnemyZone(enemies, isBossWave) {
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

      const hpFill = el('div', { className: 'meter-fill fill-dmg bar-smooth' });
      hpFill.style.width = boss.hpPct + '%';
      const atbFill = el('div', { className: 'meter-fill fill-cyan bar-smooth' });
      atbFill.style.width = boss.gauge + '%';
      const hpText = el('span', { className: 'plate-hp-num', text: boss.hp + '/' + boss.maxHp });
      const buffBox = el('div', { className: 'buff-strip' }, buildBuffStrip(boss.buffs, boss.debuffs));

      const bossBadgeText = boss.bossType === 'area' ? 'エリアボス' : (boss.bossType === 'raid' ? '討伐ボス' : '中ボス');
      const bossFrame = el('div', { className: 'boss-frame is-boss' }, [
        el('div', { className: 'boss-head' }, [
          SvgIcons.createUiIcon('warning', 'icon-svg'),
          el('span', { className: 'tag-chip tag-chip-boss', text: bossBadgeText }),
          el('span', { className: 'unit-name boss-name', text: boss.name }),
          hpText
        ]),
        el('div', { className: 'boss-bars' }, [
          el('div', { className: 'meter-track hp-track' }, [hpFill]),
          el('div', { className: 'meter-track atb-track' }, [atbFill])
        ]),
        buffBox
      ]);

      const telegraphText = el('span', { className: 'telegraph-text', text: '通常警戒中' });
      const telegraphTurns = el('span', { className: 'telegraph-turns', text: '待機' });
      const telegraphBar = el('div', { className: 'boss-telegraph-bar' }, [
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
        hpFill,
        atbFill,
        hpText,
        buffBox,
        effSig: signatureOfEffects(boss.buffs, boss.debuffs)
      };

      const children = [bossFrame, telegraphBar];
      if (minions.length > 0) {
        const minionPlates = minions.map(function (m) {
          const mHp = el('div', { className: 'meter-fill fill-dmg bar-smooth' });
          mHp.style.width = m.hpPct + '%';
          const mHpTxt = el('span', { className: 'plate-hp-num', text: m.hp + '/' + m.maxHp });
          const mBuff = el('div', { className: 'buff-strip' }, buildBuffStrip(m.buffs, m.debuffs));
          const mPlate = el('div', { className: 'enemy-minion-plate' }, [
            el('div', { className: 'plate-head' }, [
              el('span', { className: 'unit-name plate-name', text: m.name }),
              mHpTxt
            ]),
            el('div', { className: 'meter-track hp-track-sm' }, [mHp]),
            mBuff
          ]);
          refs.units[m.id] = {
            plate: mPlate,
            hpFill: mHp,
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
      const hpFill = el('div', { className: 'meter-fill fill-dmg bar-smooth' });
      hpFill.style.width = e.hpPct + '%';
      const atbFill = el('div', { className: 'meter-fill fill-cyan bar-smooth' });
      atbFill.style.width = e.gauge + '%';
      const hpText = el('span', { className: 'plate-hp-num', text: e.hp + '/' + e.maxHp });
      const buffBox = el('div', { className: 'buff-strip' }, buildBuffStrip(e.buffs, e.debuffs));

      const plate = el('div', { className: 'enemy-plate' }, [
        el('div', { className: 'plate-head' }, [
          SvgIcons.createRoleIcon(e.role, 'plate-role-svg'),
          el('span', { className: 'unit-name plate-name', text: e.name }),
          hpText
        ]),
        el('div', { className: 'plate-bars' }, [
          el('div', { className: 'meter-track hp-track-sm' }, [hpFill]),
          el('div', { className: 'meter-track atb-track' }, [atbFill])
        ]),
        buffBox
      ]);

      refs.units[e.id] = {
        plate,
        hpFill,
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

  function buildBattleScene(upperEl, lowerEl, snapshot, uiState) {
    const SvgIcons = IkaiApp.SvgIcons;

    const stageTitle = el('span', { className: 'battle-stage-label', text: snapshot.stageLabel });
    const wavePill = el('span', { className: 'battle-pill', text: 'W ' + (snapshot.waveIndex + 1) + '/' + snapshot.totalWaves });
    const speedPill = el('span', { className: 'battle-pill', text: '×' + snapshot.speed });
    const repeatPill = el('span', {
      className: 'battle-pill',
      text: snapshot.autoRepeat > 0 ? '周回 ' + uiState.autoRepeatDone + '/' + snapshot.autoRepeat : '単発'
    });

    const topbar = el('header', { className: 'battle-topbar' }, [
      stageTitle,
      el('div', { className: 'battle-meta-pills' }, [wavePill, speedPill, repeatPill])
    ]);

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
    const timelineBar = el('div', { className: 'turn-timeline' }, timelineChips.map(function (c) { return c.chip; }));

    const enemyField = el('div', { className: 'enemy-field' });
    const enemyBuilt = buildEnemyZone(snapshot.enemies, snapshot.isBossWave);
    enemyField.appendChild(enemyBuilt.node);

    const allyRefs = {};
    const allyPlates = snapshot.allies.map(function (a) {
      const reservedTag = el('span', { className: 'reserved-tag', text: '予約' });
      const hpFill = el('div', { className: 'meter-fill fill-heal bar-smooth' });
      hpFill.style.width = a.hpPct + '%';
      const atbFill = el('div', { className: 'meter-fill fill-cyan bar-smooth' });
      atbFill.style.width = a.gauge + '%';
      const hpText = el('span', { className: 'plate-hp-num', text: a.hp + '/' + a.maxHp });
      const buffBox = el('div', { className: 'buff-strip' }, buildBuffStrip(a.buffs, a.debuffs));

      const plate = el('div', { className: 'ally-plate rarity-' + a.rarity }, [
        el('div', { className: 'plate-head' }, [
          SvgIcons.createRoleIcon(a.role, 'plate-role-svg'),
          el('span', { className: 'unit-name plate-name', text: a.name }),
          reservedTag
        ]),
        el('div', { className: 'plate-bars' }, [
          el('div', { className: 'plate-hp-row' }, [
            el('div', { className: 'meter-track hp-track-sm' }, [hpFill]),
            hpText
          ]),
          el('div', { className: 'meter-track atb-track' }, [atbFill])
        ]),
        buffBox
      ]);

      allyRefs[a.id] = {
        plate,
        reservedTag,
        hpFill,
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
    const dpsPanel = el('div', { className: 'dps-meter-panel' }, [
      dpsDealt.rootNode,
      dpsTaken.rootNode,
      dpsHeal.rootNode,
      dpsHealed.rootNode
    ]);

    const vfxLayer = el('div', { className: 'battle-vfx-layer' });

    const battleStage = el('div', { className: 'battle-stage' }, [
      topbar,
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
      className: 'btn btn-compact' + (snapshot.autoRepeat > 0 ? ' btn-primary' : ' btn-secondary'),
      text: snapshot.autoRepeat > 0 ? '周回ON' : '周回OFF',
      attrs: { type: 'button' },
      dataset: { action: 'toggle-battle-repeat' }
    });

    const dpsToggleBtn = el('button', {
      className: 'btn btn-compact' + (uiState.showDpsDetail ? ' btn-primary' : ' btn-secondary'),
      text: 'DPS詳細',
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
        className: 'btn btn-compact' + (snapshot.globalTargetPolicy === t ? ' btn-primary' : 'btn-secondary'),
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
        text: skillName + '（即発可）',
        attrs: { type: 'button' },
        dataset: { action: 'reserve-skill', unitId: a.id, skillId: 'unique' }
      });

      const card = el('div', { className: 'ally-control-card rarity-' + a.rarity }, [
        el('div', { className: 'ally-control-head' }, [
          SvgIcons.createRoleIcon(a.role, 'plate-role-svg'),
          el('span', { className: 'unit-name ally-ctrl-name', text: a.name }),
          tacticBtn
        ]),
        reserveBtn
      ]);

      unitControls[a.id] = { card, tacticBtn, reserveBtn, skillName };
      return card;
    });

    const dpsDetailContainer = el('div', { className: 'dps-detail-box' });
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
      dpsDetailContainer
    };
    lastDpsDetailFlag = uiState.showDpsDetail;
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

    refs.wavePill.textContent = 'W ' + (snapshot.waveIndex + 1) + '/' + snapshot.totalWaves;
    refs.speedPill.textContent = '×' + snapshot.speed;
    refs.repeatPill.textContent = snapshot.autoRepeat > 0 ? '周回 ' + uiState.autoRepeatDone + '/' + snapshot.autoRepeat : '単発';

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
      const rebuilt = buildEnemyZone(snapshot.enemies, snapshot.isBossWave);
      refs.enemyField.appendChild(rebuilt.node);
      refs.enemyZone = rebuilt.refs;
    } else {
      for (let i = 0; i < snapshot.enemies.length; i += 1) {
        const e = snapshot.enemies[i];
        const uRef = refs.enemyZone.units[e.id];
        if (!uRef) continue;
        uRef.plate.classList.toggle('is-ko', e.hp <= 0);
        uRef.hpFill.style.width = e.hpPct + '%';
        if (uRef.atbFill) {
          uRef.atbFill.style.width = e.gauge + '%';
        }
        uRef.hpText.textContent = e.hp + '/' + e.maxHp;
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
        aRef.reservedTag.classList.toggle('is-visible', Boolean(a.reservedSkillId));
        aRef.hpFill.style.width = a.hpPct + '%';
        aRef.atbFill.style.width = a.gauge + '%';
        aRef.hpText.textContent = a.hp + '/' + a.maxHp;
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
        const isRes = Boolean(a.reservedSkillId);
        const cd = a.uniqueSkill ? a.uniqueSkill.currentCd : 0;
        cRef.reserveBtn.disabled = a.hp <= 0;
        cRef.reserveBtn.classList.toggle('is-reserved', isRes);
        if (a.hp <= 0) {
          cRef.reserveBtn.textContent = cRef.skillName + '（戦闘不能）';
        } else if (isRes) {
          cRef.reserveBtn.textContent = cRef.skillName + '（予約済）';
        } else if (cd > 0) {
          cRef.reserveBtn.textContent = cRef.skillName + '（CT' + cd + '）';
        } else {
          cRef.reserveBtn.textContent = cRef.skillName + '（予約可）';
        }
      }
    }

    const totals = snapshot.dpsMeters.totals;
    const maxMetric = Math.max(1, totals.damageDealt, totals.damageTaken, totals.healingDone, totals.healingReceived);
    refs.dpsDealt.fill.style.width = Math.round((totals.damageDealt / maxMetric) * 100) + '%';
    refs.dpsDealt.valNode.textContent = String(totals.damageDealt);
    refs.dpsTaken.fill.style.width = Math.round((totals.damageTaken / maxMetric) * 100) + '%';
    refs.dpsTaken.valNode.textContent = String(totals.damageTaken);
    refs.dpsHeal.fill.style.width = Math.round((totals.healingDone / maxMetric) * 100) + '%';
    refs.dpsHeal.valNode.textContent = String(totals.healingDone);
    refs.dpsHealed.fill.style.width = Math.round((totals.healingReceived / maxMetric) * 100) + '%';
    refs.dpsHealed.valNode.textContent = String(totals.healingReceived);

    [1, 2, 3].forEach(function (spd) {
      const active = snapshot.speed === spd;
      refs.speedBtns[spd].classList.toggle('btn-primary', active);
      refs.speedBtns[spd].classList.toggle('btn-secondary', !active);
    });

    const repeatOn = snapshot.autoRepeat > 0;
    refs.autoBtn.classList.toggle('btn-primary', repeatOn);
    refs.autoBtn.classList.toggle('btn-secondary', !repeatOn);
    refs.autoBtn.textContent = repeatOn ? '周回ON' : '周回OFF';

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

    if (uiState.showDpsDetail || lastDpsDetailFlag !== uiState.showDpsDetail) {
      lastDpsDetailFlag = uiState.showDpsDetail;
      refs.dpsDetailContainer.classList.toggle('is-hidden', !uiState.showDpsDetail);
      if (uiState.showDpsDetail) {
        renderDpsDetailRows(refs.dpsDetailContainer, snapshot.dpsMeters);
      }
    }

    spawnVfxForEvents(refs, snapshot);
  }

  function renderResult(upperEl, lowerEl, snapshot, uiState) {
    battleRefs = null;
    lastDpsDetailFlag = null;

    const isVictory = snapshot && snapshot.status === 'victory';
    const totals = snapshot ? snapshot.dpsMeters.totals : { damageDealt: 0, damageTaken: 0, healingDone: 0, healingReceived: 0 };
    const maxMetric = Math.max(1, totals.damageDealt, totals.damageTaken, totals.healingDone, totals.healingReceived);

    if (upperEl) {
      clearNode(upperEl);

      const dpsDealt = createDpsCell('与ダメージ', 'fill-dmg');
      const dpsTaken = createDpsCell('被ダメージ', 'fill-taken');
      const dpsHeal = createDpsCell('回復量', 'fill-heal');
      const dpsHealed = createDpsCell('被回復量', 'fill-healed');

      dpsDealt.fill.style.width = Math.round((totals.damageDealt / maxMetric) * 100) + '%';
      dpsDealt.valNode.textContent = String(totals.damageDealt);
      dpsTaken.fill.style.width = Math.round((totals.damageTaken / maxMetric) * 100) + '%';
      dpsTaken.valNode.textContent = String(totals.damageTaken);
      dpsHeal.fill.style.width = Math.round((totals.healingDone / maxMetric) * 100) + '%';
      dpsHeal.valNode.textContent = String(totals.healingDone);
      dpsHealed.fill.style.width = Math.round((totals.healingReceived / maxMetric) * 100) + '%';
      dpsHealed.valNode.textContent = String(totals.healingReceived);

      const allyChips = (snapshot ? snapshot.allies : []).map(function (a) {
        return el('div', { className: 'result-ally-chip rarity-' + a.rarity }, [
          el('span', { className: 'unit-name', text: a.name }),
          el('span', { className: 'muted-note', text: '残HP ' + a.hp + '/' + a.maxHp })
        ]);
      });

      const stage = el('div', { className: 'result-stage anim-fade-in' }, [
        el('div', { className: 'result-banner ' + (isVictory ? 'is-victory' : 'is-defeat') }, [
          el('div', { className: 'result-status-title', text: isVictory ? '作戦成功' : '作戦失敗' }),
          el('div', { className: 'result-stage-sub', text: (snapshot ? snapshot.stageLabel : '') + ' ・ 経過 ' + (snapshot ? snapshot.turnCount : 0) + ' 行動' })
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
          el('span', { text: '自動周回進行中：次戦まで待機中（残り ' + uiState.autoRepeatRemaining + ' 回） ' }),
          el('button', {
            className: 'btn btn-compact btn-danger',
            text: '周回停止',
            attrs: { type: 'button' },
            dataset: { action: 'cancel-auto-repeat' }
          })
        ]));
      }

      if (uiState.lastRewards && !uiState.lastRewards.retreated) {
        const rw = uiState.lastRewards;
        const rewardParts = [];
        if (rw.echoStones) rewardParts.push('残響石 +' + rw.echoStones);
        if (rw.starCoins) rewardParts.push('星貨 +' + rw.starCoins);
        if (rw.emblemShards) rewardParts.push('紋章片 +' + rw.emblemShards);
        if (rw.masteryBooks) rewardParts.push('熟練の書 +' + rw.masteryBooks);
        if (rw.exchangeCrystals) rewardParts.push('交換結晶 +' + rw.exchangeCrystals);
        if (rw.universalShards) rewardParts.push('汎用結晶 +' + rw.universalShards);
        if (rw.qualityCatalysts) rewardParts.push('昇格触媒 +' + rw.qualityCatalysts);
        if (rw.skillName) rewardParts.push('収集技『' + rw.skillName + '』');
        if (rw.equipText) rewardParts.push('装備『' + rw.equipText + '』');
        if (rw.advancedExpeditions > 0) rewardParts.push('異界調査進行 +' + rw.advancedExpeditions + '枠');
        if (rw.raidBestDamage !== null && rw.raidBestDamage !== undefined) {
          rewardParts.push('討伐最大与ダメ ' + rw.raidBestDamage);
        }

        scrollNodes.push(el('div', { className: 'detail-block' }, [
          el('div', { className: 'detail-heading', text: rw.isFirstClear ? '初回踏破報酬を獲得' : (isVictory ? '戦闘報酬を獲得' : '戦闘記録を更新') }),
          el('div', { className: 'detail-desc', text: rewardParts.join(' ／ ') || '報酬記録済み' })
        ]));
      }

      const unitDpsBox = el('div', { className: 'dps-detail-box' });
      if (snapshot) {
        renderDpsDetailRows(unitDpsBox, snapshot.dpsMeters);
      }
      scrollNodes.push(unitDpsBox);

      const scrollArea = el('div', { className: 'lower-scroll' }, scrollNodes);

      const mode = snapshot ? snapshot.mode : 'stage';
      const hasNextStage = mode === 'stage' && Boolean(uiState.nextStageId);
      const isAbyss = mode === 'abyss';

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

      const actionsBar = el('div', { className: 'result-actions btn-grid-3' }, [
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
