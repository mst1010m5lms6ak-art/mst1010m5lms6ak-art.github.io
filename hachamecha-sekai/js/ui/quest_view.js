(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  HS.UI = HS.UI || {};

  var dom = { upper: null, lower: null, ctx: null };
  var unsubs = [];

  var ui = {
    mode: 'stage', // 'stage' | 'tower' | 'superboss' | 'relay' | 'bounty' | 'expedition'
    selectedAreaId: null,
    selectedStageId: null,
    selectedTowerFloor: 1,
    selectedSuperbossId: null,
    selectedRelayId: null,
    selectedRelaySquad: 0,
    selectedBountyId: null,
    selectedExpSlot: 0,
    expSubMode: 'members' // 'members' | 'routes'
  };

  // Permanent 6-mode bottom context bar so 別働隊 is ALWAYS 1 tap away with active highlight!
  var CTX_TABS = [
    { id: 'stage',      label: '冒険' },
    { id: 'tower',      label: 'タワー' },
    { id: 'superboss',  label: '超ボス' },
    { id: 'relay',      label: '総力戦' },
    { id: 'bounty',     label: '手配' },
    { id: 'expedition', label: '別働隊' }
  ];

  function el(tag, attrs, children) {
    return HS.Utils.el(tag, attrs, children);
  }

  function fmt(n) {
    return HS.Utils.formatNum(n);
  }

  function setWorld(wId) {
    if (HS.Anim && typeof HS.Anim.setWorldTheme === 'function') {
      HS.Anim.setWorldTheme(wId || 'frontier');
    }
  }

  function toast(msg, kind) {
    if (HS.UI.App && typeof HS.UI.App.showToast === 'function') {
      HS.UI.App.showToast(msg, kind);
    }
  }

  function getChar(id) {
    return (id && HS.Data && HS.Data.CHAR_BY_ID) ? HS.Data.CHAR_BY_ID[id] || null : null;
  }

  function getEnemy(id) {
    return (id && HS.Data && HS.Data.ENEMY_BY_ID) ? HS.Data.ENEMY_BY_ID[id] || null : null;
  }

  function getEquipSet(id) {
    return (id && HS.Data && HS.Data.EQUIP_SET_BY_ID) ? HS.Data.EQUIP_SET_BY_ID[id] || null : null;
  }

  function getRelic(id) {
    return (id && HS.Data && HS.Data.RELIC_BY_ID) ? HS.Data.RELIC_BY_ID[id] || null : null;
  }

  function getMatMeta(id) {
    return (id && HS.Data && HS.Data.MATERIALS && HS.Data.MATERIALS[id]) || { name: id, icon: '◆' };
  }

  function getElementMeta(id) {
    return (HS.Data && HS.Data.ELEMENTS_META && HS.Data.ELEMENTS_META[id]) || { name: '無', icon: '❖' };
  }

  function getRoleMeta(id) {
    return (HS.Data && HS.Data.ROLES_META && HS.Data.ROLES_META[id]) || { name: id, icon: '⚔️', short: '前' };
  }

  function getRaceMeta(id) {
    return (HS.Data && HS.Data.RACES_META && HS.Data.RACES_META[id]) || { name: id, icon: '✦' };
  }

  function getWorldMeta(id) {
    return (HS.Data && HS.Data.WORLDS_META && HS.Data.WORLDS_META[id]) || { name: '境界平原', emblem: '⚜️' };
  }

  function makeElBadge(elId) {
    var m = getElementMeta(elId);
    return el('span', { class: 'el-badge el-' + (elId || 'none') }, m.icon + m.name);
  }

  function makeRoleBadge(roleId) {
    var m = getRoleMeta(roleId);
    return el('span', { class: 'role-badge role-' + (roleId || 'dealer') }, m.icon + m.name);
  }

  function makeRaceText(races) {
    return (Array.isArray(races) ? races : []).map(function (r) {
      var m = getRaceMeta(r);
      return m.icon + m.name;
    }).join('・');
  }

  function makeTwoRowSkill(sk) {
    var scope = HS.CONST.TARGET_NAMES[sk.target] || '単体';
    return el('div', { class: 'skill-preview-row' }, [
      el('div', { class: 'skill-preview-head' }, [
        el('span', { class: 'skill-preview-name' }, sk.name),
        el('span', { class: 'tag tag-accent' }, '[' + scope + ']')
      ]),
      el('div', { class: 'skill-preview-desc' }, sk.desc)
    ]);
  }

  function makeDropSetPreview(dropSetIds) {
    var sets = (dropSetIds || []).map(getEquipSet).filter(Boolean);
    if (!sets.length) return null;
    return el('div', { class: 'col', style: { gap: '2px' } }, sets.slice(0, 3).map(function (st) {
      return el('div', { class: 'card-note' },
        st.icon + st.name + '：2部位(' + st.bonus2.desc + ') / 4部位(' + st.bonus4.desc + ')'
      );
    }));
  }

  function getSavedScrollTop() {
    if (!dom.lower) return 0;
    var sb = dom.lower.querySelector('.scroll-body');
    return sb ? sb.scrollTop : 0;
  }

  function restoreScrollTop(top) {
    if (!dom.lower || !top) return;
    var sb = dom.lower.querySelector('.scroll-body');
    if (sb) sb.scrollTop = top;
  }

  function makeScaleGauge(ratio, fillColor) {
    var r = HS.Utils.clamp(Number(ratio) || 0, 0, 1);
    return el('div', {
      style: {
        position: 'relative',
        height: '8px',
        borderRadius: '999px',
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        flexShrink: '0'
      }
    }, [
      el('div', {
        style: {
          width: '100%',
          height: '100%',
          background: fillColor || 'var(--accent)',
          transformOrigin: 'left center',
          transform: 'scaleX(' + r.toFixed(4) + ')'
        }
      })
    ]);
  }

  function ensureSelections(s) {
    var areas = HS.Data.AREAS || [];
    if (!ui.selectedAreaId) ui.selectedAreaId = s.progress.selectedAreaId || (areas[0] && areas[0].id);
    if (!ui.selectedStageId) ui.selectedStageId = s.progress.selectedStageId || 'a1_s1';

    var highTower = Math.min(20, (s.progress.towerHighest || 0) + 1);
    if (!ui.selectedTowerFloor || ui.selectedTowerFloor < 1 || ui.selectedTowerFloor > 20) {
      ui.selectedTowerFloor = highTower;
    }

    if (!ui.selectedSuperbossId && HS.Data.SUPERBOSSES[0]) {
      ui.selectedSuperbossId = HS.Data.SUPERBOSSES[0].id;
    }
    if (!ui.selectedRelayId && HS.Data.RELAY_RAIDS[0]) {
      ui.selectedRelayId = HS.Data.RELAY_RAIDS[0].id;
    }
    if (!ui.selectedBountyId && HS.Data.BOUNTIES[0]) {
      ui.selectedBountyId = HS.Data.BOUNTIES[0].id;
    }
  }

  function getAreaById(areaId) {
    var areas = HS.Data.AREAS || [];
    for (var i = 0; i < areas.length; i++) {
      if (areas[i].id === areaId) return areas[i];
    }
    return areas[0] || null;
  }

  // =========================================================================
  // UPPER 50% (100% READ-ONLY HIGH-DENSITY BRIEFING — ZERO DEAD SPACE!)
  // =========================================================================

  function renderUpperStage(s) {
    var area = getAreaById(ui.selectedAreaId);
    var stage = HS.Data.STAGE_BY_ID[ui.selectedStageId] || (area && area.stages[0]);
    if (!stage) return;
    setWorld(stage.world || (area && area.world) || 'frontier');

    var wm = getWorldMeta(stage.world);
    var cleared = Boolean(s.progress.clearedStages[stage.id]);
    var boss = getEnemy(stage.bossId);
    var mat = getMatMeta(stage.matId);

    var enemyPills = (stage.enemyPool || []).slice(0, 5).map(function (eid) {
      var en = getEnemy(eid);
      return en ? el('span', { class: 'tag' }, getElementMeta(en.element).icon + en.name) : null;
    });

    var intruderNames = (stage.intruderPool || []).map(function (iid) {
      var ie = getEnemy(iid);
      return ie ? ie.name : '';
    }).filter(Boolean);

    var firstClearNodes = [];
    if (!cleared && stage.firstClear) {
      var fc = stage.firstClear;
      if (fc.unlockCharId) {
        var uc = getChar(fc.unlockCharId);
        if (uc) firstClearNodes.push(el('span', { class: 'pill tag-gold' }, '★初回加入：' + uc.name));
      }
      if (fc.unlockRelicId) {
        var ur = getRelic(fc.unlockRelicId);
        if (ur) firstClearNodes.push(el('span', { class: 'pill tag-good' }, '★初回遺物：' + ur.icon + ur.name));
      }
      firstClearNodes.push(el('span', { class: 'tag tag-gold tnum' }, '初回：🪙' + fmt(fc.gold) + ' 💎' + fc.chaosShard));
    }

    var bossSection = null;
    if (boss) {
      var bossEl = getElementMeta(boss.element);
      var weakMeta = bossEl.weakAgainst ? getElementMeta(bossEl.weakAgainst) : null;
      var bossSkills = (boss.skills || []).slice(0, 2).map(makeTwoRowSkill);
      bossSection = el('div', { class: 'upper-section' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, (stage.isAreaBoss ? '👑 エリアボス：' : 'WAVE5 強敵：') + boss.name),
          el('div', { class: 'row', style: { gap: '3px' } }, [
            makeElBadge(boss.element),
            weakMeta ? el('span', { class: 'tag tag-good' }, '弱点:' + weakMeta.icon + weakMeta.name) : el('span', { class: 'tag' }, '弱点なし')
          ])
        ]),
        el('div', { class: 'skill-preview-list' }, bossSkills)
      ]);
    }

    var qRange = stage.qualityRange || [1, 100];
    dom.upper.appendChild(el('div', { class: 'briefing-card' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, (area ? area.name : '') + ' ／ ' + stage.waves + ' WAVE'),
            el('div', { class: 'inspector-name' }, stage.code + ' ' + stage.name)
          ])
        ]),
        el('div', { class: 'row', style: { gap: '3px' } }, [
          cleared ? el('span', { class: 'tag tag-good' }, 'クリア済') : el('span', { class: 'tag tag-gold' }, '未クリア'),
          qRange[1] >= 100 ? el('span', { class: 'q-pill q-max' }, '👑極あり') : el('span', { class: 'tag tnum' }, '品質' + qRange[0] + '〜' + qRange[1])
        ])
      ]),
      area ? el('div', { class: 'card-note' }, area.desc) : null,
      bossSection,
      el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, '出現敵 ＆ ドロップ報酬'),
          el('span', { class: 'tnum' }, '🪙' + fmt(stage.goldReward) + ' ' + mat.icon + '×' + stage.matQty)
        ]),
        el('div', { class: 'row-wrap' }, enemyPills),
        el('div', { class: 'card-note', style: { color: '#ffc9c9' } },
          '⚡ 乱入出現：' + intruderNames.join(' / ')
        ),
        makeDropSetPreview(stage.dropSets),
        firstClearNodes.length > 0 ? el('div', { class: 'row-wrap' }, firstClearNodes) : null
      ])
    ]));
  }

  function renderUpperTower(s) {
    var fl = HS.Data.TOWER_FLOORS[ui.selectedTowerFloor - 1] || HS.Data.TOWER_FLOORS[0];
    if (!fl) return;
    setWorld(fl.world);

    var wm = getWorldMeta(fl.world);
    var cleared = Boolean(s.progress.towerCleared[String(fl.floor)]);
    var boss = getEnemy(fl.bossId);

    var fcRewards = [];
    if (fl.firstClear) {
      fcRewards.push(el('span', { class: 'tag tnum' }, '🪙' + fmt(fl.firstClear.gold)));
      fcRewards.push(el('span', { class: 'tag tnum' }, '🗼×' + fl.firstClear.matQty));
      if (fl.firstClear.unlockCharId) {
        var uc = getChar(fl.firstClear.unlockCharId);
        if (uc) fcRewards.push(el('span', { class: 'pill tag-gold' }, '★加入：' + uc.name));
      }
      if (fl.firstClear.unlockRelicId) {
        var ur = getRelic(fl.firstClear.unlockRelicId);
        if (ur) fcRewards.push(el('span', { class: 'pill tag-good' }, '★遺物：' + ur.icon + ur.name));
      }
    }

    var bossSkills = boss ? (boss.skills || []).slice(0, 2).map(makeTwoRowSkill) : [];

    dom.upper.appendChild(el('div', { class: 'briefing-card' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, '異界混線タワー（最高 ' + (s.progress.towerHighest || 0) + '/20階）'),
            el('div', { class: 'inspector-name' }, fl.floor + 'F ' + fl.name)
          ])
        ]),
        el('span', { class: cleared ? 'tag tag-good' : 'tag tag-gold' }, cleared ? '踏破済' : '3 WAVE')
      ]),
      el('div', { class: 'lore-box' }, [
        el('div', { style: { fontWeight: '900', color: 'var(--accent)' } }, '✦ 階層ルール：' + fl.ruleName),
        el('div', { class: 'card-note', style: { color: 'var(--text-main)' } }, fl.ruleDesc)
      ]),
      boss ? el('div', { class: 'upper-section' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, '階層ボス：' + boss.name + '（' + makeRaceText(boss.races) + '）'),
          makeElBadge(boss.element)
        ]),
        el('div', { class: 'skill-preview-list' }, bossSkills)
      ]) : null,
      el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, cleared ? '周回報酬＆ドロップ' : '初回報酬＆ドロップ'),
          el('span', { class: 'tnum' }, '品質' + fl.qualityRange[0] + '〜' + fl.qualityRange[1])
        ]),
        el('div', { class: 'row-wrap' }, cleared
          ? [el('span', { class: 'tag tnum' }, '🪙' + fmt(fl.repeatReward.gold) + ' 🗼×' + fl.repeatReward.matQty)]
          : fcRewards
        ),
        makeDropSetPreview(fl.dropSets)
      ])
    ]));
  }

  function renderUpperSuperboss(s) {
    var sb = HS.Data.SUPERBOSS_BY_ID[ui.selectedSuperbossId] || HS.Data.SUPERBOSSES[0];
    if (!sb) return;
    setWorld(sb.world);

    var wm = getWorldMeta(sb.world);
    var boss = getEnemy(sb.enemyId);
    var bestDmg = s.progress.superbossBest[sb.id] || 0;
    var claimed = s.progress.superbossClaimed[sb.id] || [];
    var maxTarget = sb.milestones[sb.milestones.length - 1].dmg;

    // Unified ms.id milestone completion check!
    var msRows = sb.milestones.map(function (ms) {
      var done = claimed.indexOf(ms.id) !== -1 || bestDmg >= ms.dmg;
      var extra = [];
      if (ms.reward.unlockCharId) {
        var uc = getChar(ms.reward.unlockCharId);
        if (uc) extra.push('★' + uc.name);
      }
      if (ms.reward.unlockRelicId) {
        var ur = getRelic(ms.reward.unlockRelicId);
        if (ur) extra.push('★' + ur.name);
      }
      extra.push('🪙' + fmt(ms.reward.gold));
      extra.push('🔥×' + ms.reward.matQty);
      return el('div', { class: 'row-between', style: { padding: '2px 4px', borderRadius: '5px', background: 'rgba(255,255,255,0.04)' } }, [
        el('span', { class: done ? 'tag tag-good' : 'tag' }, (done ? '✓' : '・') + ms.label),
        el('span', { class: 'card-note tnum', style: { color: done ? '#a6f7cf' : 'var(--text-bright)' } }, extra.join(' '))
      ]);
    });

    var bossSkills = boss ? (boss.skills || []).slice(0, 2).map(makeTwoRowSkill) : [];

    dom.upper.appendChild(el('div', { class: 'briefing-card' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, '超ボス計測戦（制限 ' + sb.maxActions + '行動）'),
            el('div', { class: 'inspector-name' }, sb.name)
          ])
        ]),
        boss ? el('div', { class: 'row', style: { gap: '3px' } }, [makeElBadge(boss.element), makeRoleBadge(boss.role)]) : null
      ]),
      el('div', { class: 'row-between' }, [
        el('span', { class: 'tag tag-accent tnum' }, '自己ベスト：' + fmt(bestDmg) + ' ダメ'),
        el('span', { class: 'q-pill q-max' }, '👑極あり')
      ]),
      makeScaleGauge(bestDmg / Math.max(1, maxTarget), 'linear-gradient(90deg, var(--accent), #ff5d47)'),
      el('div', { class: 'upper-section' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, '到達ダメージ報酬'),
          el('span', { class: 'tnum' }, '目標 ' + fmt(maxTarget))
        ]),
        el('div', { class: 'col', style: { gap: '2px' } }, msRows)
      ]),
      el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, '超ボス主要技 ＆ 特徴'),
          boss ? el('span', {}, makeRaceText(boss.races)) : null
        ]),
        el('div', { class: 'skill-preview-list' }, bossSkills),
        el('div', { class: 'card-note' }, sb.desc)
      ])
    ]));
  }

  function renderUpperRelay(s) {
    var raid = HS.Data.RELAY_BY_ID[ui.selectedRelayId] || HS.Data.RELAY_RAIDS[0];
    if (!raid) return;
    setWorld(raid.world);

    var wm = getWorldMeta(raid.world);
    var cleared = Boolean(s.progress.relayCleared[raid.id]);

    var phaseCards = (raid.phases || []).map(function (ph) {
      var en = getEnemy(ph.enemyId);
      return el('div', { class: 'tag' },
        (en ? getElementMeta(en.element).icon : '') + ph.name
      );
    });

    var squadCards = [0, 1, 2].map(function (qIdx) {
      var sq = s.relaySquads[qIdx] || [];
      var sum = HS.Calc.calcPartySummary(sq, []);
      var names = sq.map(function (cid) {
        var c = getChar(cid);
        return c ? (getElementMeta(c.element).icon + c.name) : '';
      }).filter(Boolean);
      var isSel = (ui.selectedRelaySquad === qIdx);
      return el('div', {
        class: 'stat-cell',
        style: isSel ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : null
      }, [
        el('div', { class: 'row-between' }, [
          el('span', { class: 'stat-label', style: { color: isSel ? 'var(--accent)' : 'var(--text-sub)', fontWeight: '800' } }, (qIdx + 1) + '軍 (' + sq.length + '/4)'),
          el('span', { class: 'card-note tnum' }, '戦力 ' + fmt(sum.totalPower))
        ]),
        el('div', { class: 'card-note', style: { color: 'var(--text-bright)', fontWeight: '700' } },
          names.length > 0 ? names.join(' ／ ') : '未編成（下の一覧からタップ配置）'
        )
      ]);
    });

    var fcRewardTxt = [];
    if (!cleared && raid.firstClear) {
      if (raid.firstClear.unlockCharId) {
        var uc = getChar(raid.firstClear.unlockCharId);
        if (uc) fcRewardTxt.push(el('span', { class: 'pill tag-gold' }, '★初回加入：' + uc.name));
      }
      if (raid.firstClear.unlockRelicId) {
        var ur = getRelic(raid.firstClear.unlockRelicId);
        if (ur) fcRewardTxt.push(el('span', { class: 'pill tag-good' }, '★初回遺物：' + ur.icon + ur.name));
      }
      fcRewardTxt.push(el('span', { class: 'tag tnum' }, '🎖️×' + raid.firstClear.matQty));
    } else {
      fcRewardTxt.push(el('span', { class: 'tag tag-good' }, '制覇済・周回報酬 🎖️×' + (raid.repeatReward ? raid.repeatReward.matQty : 4)));
    }

    dom.upper.appendChild(el('div', { class: 'briefing-card' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, '多部隊リレー総力戦（3部隊重複なし・3連戦）'),
            el('div', { class: 'inspector-name' }, raid.name)
          ])
        ]),
        el('span', { class: cleared ? 'tag tag-good' : 'tag tag-gold' }, cleared ? '制覇済' : '3連ボス')
      ]),
      el('div', { class: 'card-note' }, raid.desc),
      el('div', { class: 'row-wrap' }, phaseCards),
      el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, '出撃部隊リレー編成（1軍 → 2軍 → 3軍）'),
          raid.qualityRange[1] >= 100 ? el('span', { class: 'q-pill q-max' }, '👑極あり') : null
        ]),
        el('div', { class: 'col', style: { gap: '3px' } }, squadCards),
        el('div', { class: 'row-wrap' }, fcRewardTxt),
        makeDropSetPreview(raid.dropSets)
      ])
    ]));
  }

  function renderUpperBounty(s) {
    var bt = HS.Data.BOUNTY_BY_ID[ui.selectedBountyId] || HS.Data.BOUNTIES[0];
    if (!bt) return;
    setWorld(bt.world);

    var wm = getWorldMeta(bt.world);
    var intruder = getEnemy(bt.intruderId);
    var kills = s.progress.intruderKills[bt.intruderId] || 0;
    var recruitChar = bt.recruitCharId ? getChar(bt.recruitCharId) : null;
    var ownedRecruit = recruitChar && HS.State.isCharOwned(recruitChar.id);

    var recruitNode;
    if (recruitChar) {
      if (ownedRecruit) {
        recruitNode = el('span', { class: 'pill tag-good' }, '★ ' + recruitChar.name + ' 加入済！');
      } else {
        var reqK = bt.killsToRecruit || 3;
        recruitNode = el('span', { class: 'pill tag-gold tnum' }, '★ 討伐 ' + Math.min(kills, reqK) + '/' + reqK + ' で「' + recruitChar.name + '」加入！');
      }
    } else {
      recruitNode = el('span', { class: 'tag tnum' }, '累計討伐数：' + kills + '体');
    }

    var qRange = bt.qualityRange || [40, 100];
    var skills = intruder ? (intruder.skills || []).slice(0, 2).map(makeTwoRowSkill) : [];

    dom.upper.appendChild(el('div', { class: 'briefing-card' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, '乱入指名手配（単独討伐・自動周回可）'),
            el('div', { class: 'inspector-name' }, intruder ? intruder.name : bt.name)
          ])
        ]),
        intruder ? el('div', { class: 'row', style: { gap: '3px' } }, [
          makeElBadge(intruder.element),
          makeRoleBadge(intruder.role)
        ]) : null
      ]),
      el('div', { class: 'row-between' }, [
        recruitNode,
        qRange[1] >= 100 ? el('span', { class: 'q-pill q-max' }, '👑極あり') : el('span', { class: 'tag tnum' }, '品質' + qRange[0] + '〜' + qRange[1])
      ]),
      el('div', { class: 'lore-box' }, [
        el('div', {}, bt.desc),
        intruder ? el('div', { class: 'card-note', style: { marginTop: '2px' } }, '種族：' + makeRaceText(intruder.races) + ' ／ ' + intruder.lore) : null
      ]),
      el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, '標的スキル ＆ 専用ドロップ'),
          el('span', { class: 'tnum' }, '🪙' + fmt(bt.goldReward) + ' ⚡×' + bt.matQty)
        ]),
        el('div', { class: 'skill-preview-list' }, skills),
        makeDropSetPreview(bt.dropSets)
      ])
    ]));
  }

  function renderUpperExpedition(s) {
    var slot = s.expeditions[ui.selectedExpSlot] || s.expeditions[0];
    var route = HS.Expedition.getRouteById(slot.routeId) || HS.Data.EXPEDITIONS[0];
    if (!route) return;
    setWorld(route.world);

    var wm = getWorldMeta(route.world);
    var req = route.battlesRequired || 5;
    var remain = Math.max(0, req - (slot.progress || 0));
    // Directly read HS.Expedition.evaluateSquad() so qualityBonus & matchPercent are 100% engine-synced!
    var ev = HS.Expedition.evaluateSquad(route.id, slot.charIds);
    var prefs = ev.prefs || { elements: route.prefElements || [], races: route.prefRaces || [], role: route.prefRole || null };

    var prefBadges = [];
    (prefs.elements || []).forEach(function (eid) { prefBadges.push(makeElBadge(eid)); });
    (prefs.races || []).forEach(function (rid) {
      var rm = getRaceMeta(rid);
      prefBadges.push(el('span', { class: 'tag' }, rm.icon + rm.name));
    });
    if (prefs.role) prefBadges.push(makeRoleBadge(prefs.role));

    var memberBadges = (slot.charIds || []).map(function (cid) {
      var c = getChar(cid);
      return c ? el('span', { class: 'tag tag-accent' }, getElementMeta(c.element).icon + c.name) : null;
    });

    var rew = route.rewards || {};
    var mat = getMatMeta(rew.matId);
    var statusBadge;
    if (slot.paused) {
      statusBadge = el('span', { class: 'tag tag-gold' }, '⏸ 帰還完了・再出発待ち');
    } else if (slot.charIds.length > 0) {
      statusBadge = el('span', { class: 'tag tag-good tnum' }, 'あと ' + remain + ' 勝で帰還 (' + slot.progress + '/' + req + ')');
    } else {
      statusBadge = el('span', { class: 'tag' }, '隊員を1名以上編成で開始');
    }

    dom.upper.appendChild(el('div', { class: 'briefing-card' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, '別働隊' + (ui.selectedExpSlot + 1) + '（戦闘勝利ごとに進行・待ち時間ゼロ）'),
            el('div', { class: 'inspector-name' }, route.name)
          ])
        ]),
        el('span', { class: 'tag tag-accent tnum' }, '帰還 ' + (slot.completions || 0) + '回')
      ]),
      el('div', { class: 'row-between' }, [
        statusBadge,
        el('span', { class: 'tag tag-gold tnum' }, '適性 +' + ev.matchPercent + '% ／ 品質+' + ev.qualityBonus)
      ]),
      makeScaleGauge(slot.paused ? 1 : ((slot.progress || 0) / req), slot.paused ? '#ffd15c' : 'linear-gradient(90deg, #36d687, var(--accent))'),
      el('div', { class: 'upper-section' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, '適性ボーナス（複合種族W一致で大上昇）'),
          el('span', { class: 'tnum' }, '追加装備率 ' + ev.bonusDropChance + '%')
        ]),
        el('div', { class: 'row-wrap' }, prefBadges),
        el('div', { class: 'card-note' }, route.desc)
      ]),
      el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, '派遣中メンバー (' + slot.charIds.length + '/4)'),
          el('span', { class: 'tnum' }, '🪙' + fmt(rew.gold) + ' ' + mat.icon + '×' + rew.matQty + ' 💎×' + (rew.chaosShard || 1))
        ]),
        el('div', { class: 'row-wrap' }, memberBadges.length ? memberBadges : [el('span', { class: 'card-note' }, '下の待機メンバーからタップして編成')]),
        makeDropSetPreview(rew.dropSets)
      ])
    ]));
  }

  // =========================================================================
  // LOWER 50% (AREA SHORTNAMES, RICH 2x5 TILES, 2-ROW RELAY, PAUSE RESUME!)
  // =========================================================================

  function renderLowerStage(s) {
    var areas = HS.Data.AREAS || [];
    // 1. Fixed 4 Area Pills using clean area.shortName (ZERO .slice(0,4)!)
    dom.lower.appendChild(el('div', { class: 'area-bar' }, areas.map(function (ar) {
      var unlocked = HS.State.isStageUnlocked(ar.id, 1);
      var label = ar.shortName || ar.name.split('×')[0];
      return el('button', {
        type: 'button',
        class: 'role-btn' + (ui.selectedAreaId === ar.id ? ' is-active' : '') + (!unlocked ? ' is-locked' : ''),
        onClick: function () {
          if (!unlocked) {
            toast('前のエリアのステージ10をクリアすると解放されます', 'warn');
            return;
          }
          ui.selectedAreaId = ar.id;
          var high = s.progress.highestStageByArea[ar.id] || 1;
          var targetStage = ar.stages[Math.min(high - 1, ar.stages.length - 1)] || ar.stages[0];
          ui.selectedStageId = targetStage.id;
          HS.State.selectStage(ar.id, targetStage.id);
          render();
        }
      }, (unlocked ? (ar.idx + '.') : '🔒') + label);
    })));

    // 2. Fixed 2x5 Stage Grid (ZERO scroll!) with stage.shortName & clear/boss/char badges!
    var area = getAreaById(ui.selectedAreaId);
    var stageBtns = (area ? area.stages : []).map(function (st) {
      var unlocked = HS.State.isStageUnlocked(area.id, st.stageNum);
      var cleared = Boolean(s.progress.clearedStages[st.id]);
      var isSel = (ui.selectedStageId === st.id);
      var hasCharReward = !cleared && st.firstClear && st.firstClear.unlockCharId;

      var topTxt = st.code + (cleared ? '✓' : '');
      var subTxt = !unlocked ? '🔒' : (st.isAreaBoss ? '👑BOSS' : (hasCharReward ? '★加入' : (st.shortName || '5W')));
      return el('button', {
        type: 'button',
        class: 'stage-btn' + (isSel ? ' is-active' : '') + (cleared ? ' is-cleared' : '') + (st.isAreaBoss ? ' is-boss' : '') + (!unlocked ? ' is-locked' : ''),
        disabled: !unlocked,
        onClick: function () {
          ui.selectedStageId = st.id;
          HS.State.selectStage(area.id, st.id);
          render();
        }
      }, [
        el('span', {}, topTxt),
        el('span', { class: 'stage-sub' }, subTxt)
      ]);
    });
    dom.lower.appendChild(el('div', { class: 'stage-grid' }, stageBtns));

    // 3. Action Row: Launch / Auto-Repeat / Auto-Sell (別働隊 is permanently in #context-bar!)
    dom.lower.appendChild(el('div', { class: 'quest-action-row' }, [
      el('button', {
        type: 'button',
        class: 'btn btn-primary',
        onClick: function () {
          HS.UI.App.startBattle({ mode: 'stage', targetId: ui.selectedStageId, autoRepeat: false });
        }
      }, '⚔️出撃'),
      el('button', {
        type: 'button',
        class: 'btn btn-accent',
        onClick: function () {
          HS.UI.App.startBattle({ mode: 'stage', targetId: ui.selectedStageId, autoRepeat: true });
        }
      }, '🔄自動周回'),
      el('button', {
        type: 'button',
        class: 'btn btn-ghost',
        onClick: function () {
          HS.UI.App.openAutoSellSheet(function () { render(); });
        }
      }, '⚙自動売却')
    ]));
  }

  function renderLowerTower(s) {
    var highest = s.progress.towerHighest || 0;
    var rows = HS.Data.TOWER_FLOORS.map(function (fl) {
      var unlocked = fl.floor <= highest + 1;
      var cleared = Boolean(s.progress.towerCleared[String(fl.floor)]);
      var isSel = (ui.selectedTowerFloor === fl.floor);
      var rewardHint = '';
      if (!cleared && fl.firstClear) {
        if (fl.firstClear.unlockCharId) {
          var uc = getChar(fl.firstClear.unlockCharId);
          if (uc) rewardHint = '★仲間:' + uc.name;
        } else if (fl.firstClear.unlockRelicId) {
          var ur = getRelic(fl.firstClear.unlockRelicId);
          if (ur) rewardHint = '★遺物:' + ur.name;
        }
      }

      return el('button', {
        type: 'button',
        class: 'list-card' + (isSel ? ' is-selected' : '') + (!unlocked ? ' is-undiscovered' : ''),
        onClick: function () {
          ui.selectedTowerFloor = fl.floor;
          render();
        }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, [
            el('span', { class: 'tag tnum ' + (cleared ? 'tag-good' : 'tag-accent') }, fl.floor + 'F'),
            el('span', {}, fl.name)
          ]),
          el('div', { class: 'list-card-sub' }, 'ルール：' + fl.ruleName + (rewardHint ? (' ／ ' + rewardHint) : ''))
        ]),
        el('div', { class: 'list-card-right' }, [
          !unlocked ? el('span', { class: 'tag' }, '🔒未開放') :
          (cleared ? el('span', { class: 'tag tag-good' }, '✓踏破') : el('span', { class: 'tag tag-gold' }, '挑戦可'))
        ])
      ]);
    });

    dom.lower.appendChild(el('div', { class: 'scroll-frame' }, [
      el('div', { class: 'scroll-body' }, [
        el('div', { class: 'scroll-inner' }, [
          el('div', { class: 'list-stack' }, rows)
        ])
      ])
    ]));

    var canChallenge = ui.selectedTowerFloor <= highest + 1;
    dom.lower.appendChild(el('div', { class: 'quest-action-row' }, [
      el('button', {
        type: 'button',
        class: 'btn btn-primary',
        disabled: !canChallenge,
        onClick: function () {
          HS.UI.App.startBattle({ mode: 'tower', targetId: ui.selectedTowerFloor });
        }
      }, canChallenge ? ('🗼 ' + ui.selectedTowerFloor + 'F へ挑戦する') : '前の階層をクリアしてください')
    ]));
  }

  function renderLowerSuperboss(s) {
    var cards = HS.Data.SUPERBOSSES.map(function (sb) {
      var best = s.progress.superbossBest[sb.id] || 0;
      var claimed = s.progress.superbossClaimed[sb.id] || [];
      var hitCount = sb.milestones.filter(function (m) {
        return claimed.indexOf(m.id) !== -1 || best >= m.dmg;
      }).length;
      var isSel = (ui.selectedSuperbossId === sb.id);
      var boss = getEnemy(sb.enemyId);

      return el('button', {
        type: 'button',
        class: 'awaken-card' + (isSel ? ' is-selected' : ''),
        style: isSel ? { borderColor: 'var(--accent)', background: 'linear-gradient(90deg, var(--accent-soft), var(--card-bg))' } : null,
        onClick: function () {
          ui.selectedSuperbossId = sb.id;
          render();
        }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, [
            boss ? makeElBadge(boss.element) : null,
            el('span', {}, sb.name)
          ]),
          el('div', { class: 'list-card-sub tnum' }, '自己ベスト：' + fmt(best) + ' ／ 達成 ' + hitCount + '/3')
        ]),
        el('div', { class: 'list-card-right' }, [
          el('span', { class: hitCount >= 3 ? 'tag tag-good' : 'tag tag-gold' }, hitCount + '/3')
        ])
      ]);
    });

    dom.lower.appendChild(el('div', { class: 'awaken-grid' }, cards));

    dom.lower.appendChild(el('div', { class: 'quest-action-row' }, [
      el('button', {
        type: 'button',
        class: 'btn btn-primary',
        onClick: function () {
          HS.UI.App.startBattle({ mode: 'superboss', targetId: ui.selectedSuperbossId });
        }
      }, '🔥 超ボス計測を開始')
    ]));
  }

  function renderLowerRelay(s) {
    // COMPACT 2-ROW HEADER MAX -> leaves spacious scroll list even on iPhone SE + Safe Area!
    var totalAssigned = (s.relaySquads[0].length + s.relaySquads[1].length + s.relaySquads[2].length);

    // Row 1: 3 Raid Difficulty Tabs + Auto-Fill button
    var row1 = HS.Data.RELAY_RAIDS.map(function (rd, idx) {
      var shortTitle = ['境界防衛', '獣機激突', '七界融合'][idx] || rd.name;
      return el('button', {
        type: 'button',
        class: 'slot-btn' + (ui.selectedRelayId === rd.id ? ' is-active' : ''),
        onClick: function () {
          ui.selectedRelayId = rd.id;
          render();
        }
      }, (s.progress.relayCleared[rd.id] ? '✓' : '') + shortTitle);
    });
    row1.push(el('button', {
      type: 'button',
      class: 'btn btn-ghost',
      onClick: function () {
        HS.State.autoFillRelaySquads();
        toast('1軍〜3軍を重複なしで自動編成しました', 'good');
      }
    }, '✨自動'));
    dom.lower.appendChild(el('div', { class: 'toolbar-compact' }, row1));

    // Row 2: 3 Squad Selector Tabs + Launch button
    var row2 = [0, 1, 2].map(function (qIdx) {
      var cnt = (s.relaySquads[qIdx] || []).length;
      return el('button', {
        type: 'button',
        class: 'slot-btn' + (ui.selectedRelaySquad === qIdx ? ' is-active' : ''),
        onClick: function () {
          ui.selectedRelaySquad = qIdx;
          render();
        }
      }, (qIdx + 1) + '軍(' + cnt + '/4)');
    });
    row2.push(el('button', {
      type: 'button',
      class: 'btn btn-primary',
      disabled: totalAssigned === 0,
      onClick: function () {
        HS.UI.App.startBattle({ mode: 'relay', targetId: ui.selectedRelayId });
      }
    }, '🎖️出撃'));
    dom.lower.appendChild(el('div', { class: 'toolbar-compact' }, row2));

    // Scrollable Owned Roster (strictly sorted!)
    var owned = HS.State.getOwnedChars();
    var rows = owned.map(function (ch) {
      var inSquad = -1;
      for (var q = 0; q < 3; q++) {
        if ((s.relaySquads[q] || []).indexOf(ch.id) !== -1) { inSquad = q; break; }
      }
      var isHere = (inSquad === ui.selectedRelaySquad);
      return el('button', {
        type: 'button',
        class: 'list-card' + (isHere ? ' is-equipped' : (inSquad !== -1 ? ' is-busy' : '')),
        onClick: function () {
          var res = HS.State.toggleRelayChar(ui.selectedRelaySquad, ch.id);
          if (!res.ok && res.error) toast(res.error, 'warn');
        }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, [
            makeElBadge(ch.element),
            el('span', {}, ch.name),
            makeRoleBadge(ch.role)
          ]),
          el('div', { class: 'list-card-sub' }, makeRaceText(ch.races))
        ]),
        el('div', { class: 'list-card-right' }, [
          inSquad !== -1
            ? el('span', { class: 'tag ' + (isHere ? 'tag-accent' : 'tag-gold') }, (inSquad + 1) + '軍')
            : el('span', { class: 'tag' }, '未配置')
        ])
      ]);
    });

    dom.lower.appendChild(el('div', { class: 'scroll-frame' }, [
      el('div', { class: 'scroll-body' }, [
        el('div', { class: 'scroll-inner' }, [
          el('div', { class: 'list-stack' }, rows)
        ])
      ])
    ]));
  }

  function renderLowerBounty(s) {
    var rows = HS.Data.BOUNTIES.map(function (bt) {
      var intruder = getEnemy(bt.intruderId);
      var kills = s.progress.intruderKills[bt.intruderId] || 0;
      var recruit = bt.recruitCharId ? getChar(bt.recruitCharId) : null;
      var owned = recruit && HS.State.isCharOwned(recruit.id);
      var isSel = (ui.selectedBountyId === bt.id);

      var rightBadge;
      if (recruit) {
        rightBadge = owned
          ? el('span', { class: 'tag tag-good' }, '加入済')
          : el('span', { class: 'tag tag-gold tnum' }, '加入 ' + Math.min(kills, bt.killsToRecruit || 3) + '/' + (bt.killsToRecruit || 3));
      } else {
        rightBadge = el('span', { class: 'tag tnum' }, '討伐 ' + kills);
      }

      return el('button', {
        type: 'button',
        class: 'list-card' + (isSel ? ' is-selected' : ''),
        onClick: function () {
          ui.selectedBountyId = bt.id;
          render();
        }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, [
            intruder ? makeElBadge(intruder.element) : null,
            el('span', {}, intruder ? intruder.name : bt.name),
            intruder ? makeRoleBadge(intruder.role) : null
          ]),
          el('div', { class: 'list-card-sub' },
            '報酬：🪙' + fmt(bt.goldReward) + ' ⚡×' + bt.matQty +
            (bt.qualityRange && bt.qualityRange[1] >= 100 ? ' ／ 👑極あり' : '')
          )
        ]),
        el('div', { class: 'list-card-right' }, [rightBadge])
      ]);
    });

    dom.lower.appendChild(el('div', { class: 'scroll-frame' }, [
      el('div', { class: 'scroll-body' }, [
        el('div', { class: 'scroll-inner' }, [
          el('div', { class: 'list-stack' }, rows)
        ])
      ])
    ]));

    dom.lower.appendChild(el('div', { class: 'quest-action-row' }, [
      el('button', {
        type: 'button',
        class: 'btn btn-primary',
        onClick: function () {
          HS.UI.App.startBattle({ mode: 'bounty', targetId: ui.selectedBountyId, autoRepeat: false });
        }
      }, '⚡討伐出撃'),
      el('button', {
        type: 'button',
        class: 'btn btn-accent',
        onClick: function () {
          HS.UI.App.startBattle({ mode: 'bounty', targetId: ui.selectedBountyId, autoRepeat: true });
        }
      }, '🔄自動周回'),
      el('button', {
        type: 'button',
        class: 'btn btn-ghost',
        onClick: function () { HS.UI.App.openAutoSellSheet(function () { render(); }); }
      }, '⚙自動売')
    ]));
  }

  function renderLowerExpedition(s) {
    var slot = s.expeditions[ui.selectedExpSlot] || s.expeditions[0];

    // Row 1 (compact): 2 Expedition Slots + Auto-Restart Toggle (or Resume button when paused!)
    var row1 = [0, 1].map(function (idx) {
      var sl = s.expeditions[idx];
      var rt = HS.Expedition.getRouteById(sl.routeId);
      var req = (rt && rt.battlesRequired) || 5;
      var stateTxt = sl.paused ? '⏸停止' : (sl.progress + '/' + req);
      return el('button', {
        type: 'button',
        class: 'slot-btn' + (ui.selectedExpSlot === idx ? ' is-active' : ''),
        onClick: function () {
          ui.selectedExpSlot = idx;
          render();
        }
      }, '別働' + (idx + 1) + ' ' + stateTxt);
    });

    if (slot.paused) {
      row1.push(el('button', {
        type: 'button',
        class: 'btn btn-primary',
        onClick: function () {
          var res = HS.Expedition.resume(ui.selectedExpSlot);
          if (res && res.ok) toast('別働隊' + (ui.selectedExpSlot + 1) + 'を再出発させました！', 'good');
          else toast((res && res.error) || '隊員を1名以上編成してください', 'warn');
        }
      }, '▶再出発'));
    } else {
      row1.push(el('button', {
        type: 'button',
        class: 'btn ' + (slot.autoRestart ? 'btn-success' : 'btn-ghost'),
        onClick: function () {
          HS.Expedition.setAutoRestart(ui.selectedExpSlot, !slot.autoRestart);
          toast('自動再出発を' + (!slot.autoRestart ? 'ON' : 'OFF') + 'にしました', 'info');
        }
      }, '再出発:' + (slot.autoRestart ? 'ON' : 'OFF')));
    }
    dom.lower.appendChild(el('div', { class: 'toolbar-compact' }, row1));

    // Row 2 (compact): Squad Members | Route Picker | Auto-Fill (+ AutoRestart toggle if paused)
    var row2 = [
      el('button', {
        type: 'button',
        class: 'slot-btn' + (ui.expSubMode === 'members' ? ' is-active' : ''),
        onClick: function () { ui.expSubMode = 'members'; render(); }
      }, '隊員(' + slot.charIds.length + '/4)'),
      el('button', {
        type: 'button',
        class: 'slot-btn' + (ui.expSubMode === 'routes' ? ' is-active' : ''),
        onClick: function () { ui.expSubMode = 'routes'; render(); }
      }, 'ルート(6)'),
      el('button', {
        type: 'button',
        class: 'btn btn-ghost',
        onClick: function () {
          var res = HS.Expedition.autoFillSquad(ui.selectedExpSlot);
          if (!res.ok) toast(res.error || '待機中の仲間がいません', 'warn');
          else toast('適性が高い待機仲間を自動編成しました！', 'good');
        }
      }, '✨最適編成')
    ];
    if (slot.paused) {
      row2.push(el('button', {
        type: 'button',
        class: 'btn btn-ghost',
        onClick: function () {
          HS.Expedition.setAutoRestart(ui.selectedExpSlot, true);
          toast('自動再出発ONにして再出発しました！', 'good');
        }
      }, '自動ON'));
    }
    dom.lower.appendChild(el('div', { class: 'toolbar-compact' }, row2));

    var listNodes = [];
    var route = HS.Expedition.getRouteById(slot.routeId) || HS.Data.EXPEDITIONS[0];
    var ev = HS.Expedition.evaluateSquad(route.id, slot.charIds);
    var prefs = ev.prefs || { elements: route.prefElements || [], races: route.prefRaces || [], role: route.prefRole || null };

    if (ui.expSubMode === 'routes') {
      HS.Data.EXPEDITIONS.forEach(function (rt) {
        var isCur = (slot.routeId === rt.id);
        var rew = rt.rewards || {};
        var mat = getMatMeta(rew.matId);
        listNodes.push(el('button', {
          type: 'button',
          class: 'list-card' + (isCur ? ' is-equipped' : ''),
          onClick: function () {
            HS.Expedition.setRoute(ui.selectedExpSlot, rt.id);
            toast(rt.name + 'へ変更しました', 'good');
          }
        }, [
          el('div', { class: 'list-card-main' }, [
            el('div', { class: 'list-card-title' }, [
              el('span', { class: 'tag tag-accent tnum' }, rt.battlesRequired + '勝'),
              el('span', {}, rt.name)
            ]),
            el('div', { class: 'list-card-sub' }, '報酬：🪙' + fmt(rew.gold) + ' ' + mat.icon + '×' + rew.matQty + ' 💎×' + (rew.chaosShard || 1))
          ]),
          el('div', { class: 'list-card-right' }, [
            isCur ? el('span', { class: 'tag tag-good' }, '派遣中') : el('span', { class: 'tag' }, '選択')
          ])
        ]));
      });
    } else {
      var avail = HS.State.getAvailableForExpedition(ui.selectedExpSlot);
      if (avail.length === 0) {
        listNodes.push(el('div', { class: 'empty-state' }, '待機中の仲間がいません（出撃メンバー・控えリンク以外の仲間が別働隊に参加できます）'));
      } else {
        avail.forEach(function (ch) {
          var assigned = slot.charIds.indexOf(ch.id) !== -1;
          var hits = [];
          var raceHits = 0;
          (ch.races || []).forEach(function (r) { if ((prefs.races || []).indexOf(r) !== -1) raceHits++; });
          if (raceHits >= 2) hits.push('★複合W適性');
          else if (raceHits === 1) hits.push('★種族');
          if ((prefs.elements || []).indexOf(ch.element) !== -1) hits.push('★属性');
          if (prefs.role && ch.role === prefs.role) hits.push('★ロール');

          listNodes.push(el('button', {
            type: 'button',
            class: 'list-card' + (assigned ? ' is-equipped' : ''),
            onClick: function () {
              var res = HS.Expedition.toggleChar(ui.selectedExpSlot, ch.id);
              if (!res.ok && res.error) toast(res.error, 'warn');
            }
          }, [
            el('div', { class: 'list-card-main' }, [
              el('div', { class: 'list-card-title' }, [
                makeElBadge(ch.element),
                el('span', {}, ch.name),
                makeRoleBadge(ch.role),
                hits.length ? el('span', { class: 'pill tag-good' }, hits.join(' ')) : null
              ]),
              el('div', { class: 'list-card-sub' }, makeRaceText(ch.races))
            ]),
            el('div', { class: 'list-card-right' }, [
              assigned ? el('span', { class: 'tag tag-accent' }, '参加中') : el('span', { class: 'tag' }, '待機')
            ])
          ]));
        });
      }
    }

    dom.lower.appendChild(el('div', { class: 'scroll-frame' }, [
      el('div', { class: 'scroll-body' }, [
        el('div', { class: 'scroll-inner' }, [
          el('div', { class: 'list-stack' }, listNodes)
        ])
      ])
    ]));
  }

  function renderContextBar(s) {
    dom.ctx.textContent = '';
    var pausedExp = (s.expeditions || []).some(function (ex) { return ex && ex.paused; });
    CTX_TABS.forEach(function (tab) {
      var label = tab.label;
      if (tab.id === 'expedition' && pausedExp) label = '別働⏸';
      dom.ctx.appendChild(el('button', {
        type: 'button',
        class: 'btn btn-compact' + (ui.mode === tab.id ? ' is-active' : ''),
        onClick: function () {
          ui.mode = tab.id;
          render();
        }
      }, label));
    });
  }

  function render() {
    if (!dom.upper || !dom.lower || !dom.ctx || !HS.State) return;
    var scrollPos = getSavedScrollTop();
    var s = HS.State.get();
    ensureSelections(s);

    dom.upper.textContent = '';
    dom.lower.textContent = '';

    if (ui.mode === 'stage') {
      renderUpperStage(s);
      renderLowerStage(s);
    } else if (ui.mode === 'tower') {
      renderUpperTower(s);
      renderLowerTower(s);
    } else if (ui.mode === 'superboss') {
      renderUpperSuperboss(s);
      renderLowerSuperboss(s);
    } else if (ui.mode === 'relay') {
      renderUpperRelay(s);
      renderLowerRelay(s);
    } else if (ui.mode === 'bounty') {
      renderUpperBounty(s);
      renderLowerBounty(s);
    } else if (ui.mode === 'expedition') {
      renderUpperExpedition(s);
      renderLowerExpedition(s);
    }

    renderContextBar(s);
    restoreScrollTop(scrollPos);
  }

  var QuestView = {
    mount: function (upperEl, lowerEl, ctxEl) {
      dom.upper = upperEl;
      dom.lower = lowerEl;
      dom.ctx = ctxEl;

      if (HS.State && typeof HS.State.subscribe === 'function') {
        unsubs.push(HS.State.subscribe('progress:change', render));
        unsubs.push(HS.State.subscribe('relay:change', render));
        unsubs.push(HS.State.subscribe('expedition:change', render));
        unsubs.push(HS.State.subscribe('autosell:change', render));
        unsubs.push(HS.State.subscribe('char:unlock', render));
      }
      render();
    },

    unmount: function () {
      while (unsubs.length) {
        var fn = unsubs.pop();
        try { fn(); } catch (e) {}
      }
      dom.upper = null;
      dom.lower = null;
      dom.ctx = null;
    },

    render: render
  };

  HS.UI.QuestView = QuestView;
})(typeof window !== 'undefined' ? window : globalThis);
