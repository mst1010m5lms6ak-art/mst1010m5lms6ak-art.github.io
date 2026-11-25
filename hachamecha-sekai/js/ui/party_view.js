(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  HS.UI = HS.UI || {};

  var dom = { upper: null, lower: null, ctx: null };
  var unsubs = [];

  var ui = {
    mode: 'party', // 'party' | 'link' | 'equip' | 'relic'
    selectedPartySlot: 0,
    selectedLinkSlot: 0,
    selectedEquipSlot: 'weapon',
    selectedRelicSlot: 0,
    previewCharId: null,
    previewLinkId: undefined,
    previewEquipUid: undefined,
    previewRelicId: null
  };

  var MODE_TABS = [
    { id: 'party', label: '出撃4枠' },
    { id: 'link',  label: '控えリンク4' },
    { id: 'equip', label: '装備換装' },
    { id: 'relic', label: '世界遺物3' }
  ];

  var LINK_SHORT = {
    tank:      '壁15%・防+12%',
    dealer:    '攻+12%・追撃15%',
    supporter: '初ゲ+25%・速+10%',
    healer:    'WAVE癒15%・耐15%'
  };

  function el(tag, attrs, children) {
    return HS.Utils.el(tag, attrs, children);
  }

  function fmt(n) {
    return HS.Utils.formatNum(n);
  }

  function fmtPctVal(v, isCritDmg) {
    var num = Number(v) || 0;
    if (isCritDmg) {
      return Math.round(num > 0 && num < 10 ? num * 100 : num) + '%';
    }
    return Math.round(num > 0 && num <= 1 ? num * 100 : num) + '%';
  }

  function fmtDiffVal(delta, isPct, isCritDmg) {
    var d = Number(delta) || 0;
    if (isPct) {
      if (Math.abs(d) < 0.004) return null;
      var scaled = isCritDmg ? (Math.abs(d) <= 5 ? d * 100 : d) : (Math.abs(d) <= 1.5 ? d * 100 : d);
      var r = Math.round(scaled);
      if (r === 0) return null;
      return (r > 0 ? '+' : '') + r + '%';
    }
    var n = Math.round(d);
    if (n === 0) return null;
    return (n > 0 ? '+' : '') + fmt(n);
  }

  function getChar(id) {
    return (id && HS.Data && HS.Data.CHAR_BY_ID) ? HS.Data.CHAR_BY_ID[id] || null : null;
  }

  function getEquipDef(id) {
    return (id && HS.Data && HS.Data.EQUIP_DEF_BY_ID) ? HS.Data.EQUIP_DEF_BY_ID[id] || null : null;
  }

  function getEquipSet(id) {
    return (id && HS.Data && HS.Data.EQUIP_SET_BY_ID) ? HS.Data.EQUIP_SET_BY_ID[id] || null : null;
  }

  function getRelic(id) {
    return (id && HS.Data && HS.Data.RELIC_BY_ID) ? HS.Data.RELIC_BY_ID[id] || null : null;
  }

  function getElementMeta(elId) {
    return (HS.Data && HS.Data.ELEMENTS_META && HS.Data.ELEMENTS_META[elId]) || { name: '無', icon: '❖', color: '#b4c0d4' };
  }

  function getRoleMeta(roleId) {
    return (HS.Data && HS.Data.ROLES_META && HS.Data.ROLES_META[roleId]) || { name: '前衛', short: '前', icon: '⚔️', linkDesc: '' };
  }

  function getRaceMeta(raceId) {
    return (HS.Data && HS.Data.RACES_META && HS.Data.RACES_META[raceId]) || { name: raceId, icon: '✦' };
  }

  function getWorldMeta(worldId) {
    return (HS.Data && HS.Data.WORLDS_META && HS.Data.WORLDS_META[worldId]) || { name: '境界平原', emblem: '⚜️' };
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
    var arr = Array.isArray(races) ? races : [];
    return arr.map(function (r) {
      var m = getRaceMeta(r);
      return m.icon + m.name;
    }).join('・');
  }

  function makeQualityPill(q) {
    var tier = HS.Utils.getQualityTier(q);
    var label = q >= 100 ? '👑極100' : (tier.badge + q);
    return el('span', { class: 'q-pill q-' + tier.id }, label);
  }

  function setWorld(worldId) {
    if (HS.Anim && typeof HS.Anim.setWorldTheme === 'function') {
      HS.Anim.setWorldTheme(worldId || 'frontier');
    }
  }

  function toast(msg, kind) {
    if (HS.UI.App && typeof HS.UI.App.showToast === 'function') {
      HS.UI.App.showToast(msg, kind);
    }
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

  function clearPreviews() {
    ui.previewCharId = null;
    ui.previewLinkId = undefined;
    ui.previewEquipUid = undefined;
    ui.previewRelicId = null;
  }

  function buildStatCell(label, valText, diffVal, isPct, isCritDmg) {
    var diffText = diffVal !== undefined ? fmtDiffVal(diffVal, isPct, isCritDmg) : null;
    var diffSpan = null;
    if (diffText) {
      var cls = (Number(diffVal) > 0) ? 'stat-diff stat-pos' : 'stat-diff stat-neg';
      diffSpan = el('span', { class: cls }, diffText);
    }
    return el('div', { class: 'stat-cell' }, [
      el('span', { class: 'stat-label' }, label),
      el('div', { class: 'stat-val' }, [valText, diffSpan])
    ]);
  }

  function buildStatGrid(baseStats, diffObj) {
    var d = diffObj || {};
    return el('div', { class: 'stat-grid' }, [
      buildStatCell('HP', fmt(baseStats.hp), d.hp, false, false),
      buildStatCell('攻撃', fmt(baseStats.atk), d.atk, false, false),
      buildStatCell('防御', fmt(baseStats.def), d.def, false, false),
      buildStatCell('速度', fmt(baseStats.spd), d.spd, false, false),
      buildStatCell('会心', fmtPctVal(baseStats.crit, false), d.crit, true, false),
      buildStatCell('会心倍', fmtPctVal(baseStats.critDmg, true), d.critDmg, true, true),
      buildStatCell('耐性', fmtPctVal(baseStats.res, false), d.res, true, false),
      buildStatCell('戦力', fmt(baseStats.power), d.power, false, false)
    ]);
  }

  function buildSynergyDiffStrip(beforeSyns, afterSyns) {
    var bList = (beforeSyns && beforeSyns.active) ? beforeSyns.active : [];
    var aList = (afterSyns && afterSyns.active) ? afterSyns.active : bList;
    var bMap = {};
    var aMap = {};
    bList.forEach(function (x) { bMap[x.id] = x; });
    aList.forEach(function (x) { aMap[x.id] = x; });

    var pills = [];
    aList.forEach(function (x) {
      if (!bMap[x.id]) pills.push(el('span', { class: 'pill tag-good' }, '+' + x.name));
    });
    aList.forEach(function (x) {
      if (bMap[x.id]) pills.push(el('span', { class: 'synergy-pill' }, x.name));
    });
    if (afterSyns) {
      bList.forEach(function (x) {
        if (!aMap[x.id]) pills.push(el('span', { class: 'pill tag-danger' }, '-' + x.name));
      });
    }
    if (pills.length === 0) {
      pills.push(el('span', { class: 'tag' }, 'シナジー未発動'));
    }
    var visible = pills.slice(0, 5);
    if (pills.length > 5) {
      visible.push(el('span', { class: 'tag tnum' }, '+' + (pills.length - 5)));
    }
    return el('div', { class: 'synergy-strip' }, visible);
  }

  function simulatePartyAssignment(s, slotIdx, charId) {
    var nextParty = s.party.slice();
    var nextLinks = s.links.slice();
    if (!charId) {
      nextParty[slotIdx] = null;
      return { party: nextParty, links: nextLinks };
    }
    var exP = nextParty.indexOf(charId);
    if (exP !== -1) {
      var tmp = nextParty[slotIdx];
      nextParty[slotIdx] = charId;
      nextParty[exP] = tmp;
    } else {
      var exL = nextLinks.indexOf(charId);
      if (exL !== -1) nextLinks[exL] = null;
      nextParty[slotIdx] = charId;
    }
    return { party: nextParty, links: nextLinks };
  }

  function simulateLinkAssignment(s, slotIdx, charId) {
    var nextLinks = s.links.slice();
    if (!charId) {
      nextLinks[slotIdx] = null;
      return nextLinks;
    }
    var exL = nextLinks.indexOf(charId);
    if (exL !== -1) {
      var tmp = nextLinks[slotIdx];
      nextLinks[slotIdx] = charId;
      nextLinks[exL] = tmp;
    } else {
      nextLinks[slotIdx] = charId;
    }
    return nextLinks;
  }

  function summarizeEquipBaseStats(defId, quality) {
    var st = HS.Calc.calcEquipStats(defId, quality);
    var parts = [];
    if (st.hp) parts.push('HP+' + fmt(st.hp));
    if (st.atk) parts.push('攻+' + fmt(st.atk));
    if (st.def) parts.push('防+' + fmt(st.def));
    if (st.spd) parts.push('速+' + fmt(st.spd));
    if (st.crit) parts.push('会+' + fmtPctVal(st.crit, false));
    if (st.critDmg) parts.push('会倍+' + fmtPctVal(st.critDmg, false));
    if (st.res) parts.push('耐+' + fmtPctVal(st.res, false));
    return parts.join(' ');
  }

  function makeCompactSetTag(uStats) {
    if (!uStats || !Array.isArray(uStats.activeSets)) return '';
    var hits = uStats.activeSets.filter(function (st) { return st.active2; });
    if (!hits.length) return '';
    return hits.map(function (st) {
      return (st.set.icon || '◆') + (st.active4 ? '4' : '2');
    }).join('');
  }

  // =========================================================================
  // UPPER 50% (100% READ-ONLY HIGH-DENSITY LIVE COCKPIT — ZERO DEAD SPACE!)
  // =========================================================================

  function renderUpperParty(s) {
    var curSummary = HS.Calc.calcPartySummary(s.party, s.links);
    var previewing = Boolean(ui.previewCharId && ui.previewCharId !== s.party[ui.selectedPartySlot]);
    var sim = previewing ? simulatePartyAssignment(s, ui.selectedPartySlot, ui.previewCharId) : null;
    var nextSummary = sim ? HS.Calc.calcPartySummary(sim.party, sim.links) : null;

    var focusCharId = previewing ? ui.previewCharId : (s.party[ui.selectedPartySlot] || s.party.find(Boolean));
    var focusChar = getChar(focusCharId);
    setWorld(focusChar ? focusChar.world : 'frontier');

    var powerDiff = nextSummary ? (nextSummary.totalPower - curSummary.totalPower) : 0;
    var powerDiffText = fmtDiffVal(powerDiff, false, false);

    var header = el('div', { class: 'row-between' }, [
      el('div', { class: 'row' }, [
        el('span', { class: 'tag tag-accent' }, '出撃4枠＋控えリンク4'),
        previewing ? el('span', { class: 'tag tag-gold' }, '入替プレビュー') : null
      ]),
      el('span', { class: 'tag tnum' }, [
        '総戦力 ' + fmt(nextSummary ? nextSummary.totalPower : curSummary.totalPower),
        powerDiffText ? el('span', { class: 'stat-diff ' + (powerDiff > 0 ? 'stat-pos' : 'stat-neg') }, powerDiffText) : null
      ])
    ]);

    var displayParty = sim ? sim.party : s.party;
    var displayLinks = sim ? sim.links : s.links;
    var displayUnits = nextSummary ? nextSummary.units : curSummary.units;

    var pairCols = [];
    for (var i = 0; i < 4; i++) {
      var fChar = getChar(displayParty[i]);
      var lChar = getChar(displayLinks[i]);
      var uStats = displayUnits[i];
      var isSel = (i === ui.selectedPartySlot);

      var frontCard;
      if (fChar) {
        var fEl = getElementMeta(fChar.element);
        var fRole = getRoleMeta(fChar.role);
        var cp = HS.State.getCharProgress(fChar.id);
        var resLv = cp ? (cp.resonance || 0) : 0;
        var statBlock = uStats ? el('div', { class: 'unit-stat-grid' }, [
          el('div', { class: 'unit-stat-item' }, [el('span', { class: 'unit-stat-k' }, 'HP'), el('span', {}, fmt(uStats.hp))]),
          el('div', { class: 'unit-stat-item' }, [el('span', { class: 'unit-stat-k' }, '攻'), el('span', {}, fmt(uStats.atk))]),
          el('div', { class: 'unit-stat-item' }, [el('span', { class: 'unit-stat-k' }, '速'), el('span', {}, fmt(uStats.spd))])
        ]) : null;

        var setShort = makeCompactSetTag(uStats);
        frontCard = el('div', {
          class: 'party-front-card role-' + fChar.role + (isSel ? ' is-selected' : '')
        }, [
          el('div', { class: 'row-between', style: { gap: '2px' } }, [
            el('span', { style: { fontSize: '10px', color: fEl.color, fontWeight: '800' } }, fEl.icon + fEl.name),
            el('span', { style: { fontSize: '10px', color: 'var(--role-color)', fontWeight: '800' } }, fRole.short)
          ]),
          el('div', { class: 'party-card-name' }, fChar.name),
          statBlock,
          el('div', { class: 'unit-meta-line tnum' }, [
            setShort ? el('span', {}, setShort) : null,
            resLv > 0 ? el('span', { style: { color: '#ffd15c' } }, '★' + resLv) : null,
            uStats ? el('span', { style: { color: 'var(--text-bright)' } }, '戦' + fmt(uStats.power)) : null
          ])
        ]);
      } else {
        frontCard = el('div', { class: 'party-front-card' + (isSel ? ' is-selected' : '') }, [
          el('div', { class: 'card-note' }, '枠' + (i + 1)),
          el('div', { class: 'party-card-name', style: { color: 'var(--text-dim)' } }, '空き枠'),
          el('div', { class: 'card-note' }, '下から編成')
        ]);
      }

      var linkCard;
      if (lChar) {
        var lEl = getElementMeta(lChar.element);
        var lRole = getRoleMeta(lChar.role);
        var linkInfo = (fChar && lChar) ? HS.Calc.calcLinkBonus(fChar.id, lChar.id) : null;
        var matchTxt = '控え共鳴';
        if (linkInfo) {
          var mParts = [];
          if (linkInfo.sameElement) mParts.push('★同属性');
          if (linkInfo.sharedRaces.length > 0) mParts.push('★同種族');
          if (mParts.length) matchTxt = mParts.join(' ');
        }
        linkCard = el('div', { class: 'party-link-card' }, [
          el('div', { class: 'party-card-name', style: { fontSize: '10.5px' } }, lEl.icon + lChar.name),
          el('div', { class: 'link-passive-mini' }, LINK_SHORT[lChar.role] || lRole.short),
          el('div', { class: 'unit-meta-line', style: { color: matchTxt.indexOf('★') !== -1 ? '#9ff5cb' : 'var(--text-sub)' } }, matchTxt)
        ]);
      } else {
        linkCard = el('div', { class: 'party-link-card' }, [
          el('div', { class: 'card-note' }, '控えなし'),
          el('div', { class: 'card-note' }, 'リンク未設定')
        ]);
      }

      pairCols.push(el('div', { class: 'party-pair-col' }, [
        frontCard,
        el('div', { class: 'party-link-connector' }, '⇅'),
        linkCard
      ]));
    }

    var bottomBand;
    if (previewing && focusChar) {
      var prevUnit = curSummary.units[ui.selectedPartySlot];
      var nextUnit = nextSummary.units[ui.selectedPartySlot];
      var diff = (prevUnit && nextUnit) ? HS.Calc.calcStatDiff(prevUnit, nextUnit) : {};
      bottomBand = el('div', { class: 'upper-section' }, [
        el('div', { class: 'row-between' }, [
          el('div', { class: 'row', style: { gap: '4px' } }, [
            makeElBadge(focusChar.element),
            el('span', { style: { fontWeight: '900', fontSize: '12px' } }, focusChar.name),
            makeRoleBadge(focusChar.role)
          ]),
          el('span', { class: 'tag tag-gold' }, '「編成」or再タップで確定')
        ]),
        nextUnit ? el('div', { class: 'stat-grid' }, [
          buildStatCell('HP', fmt(nextUnit.hp), diff.hp, false, false),
          buildStatCell('攻撃', fmt(nextUnit.atk), diff.atk, false, false),
          buildStatCell('防御', fmt(nextUnit.def), diff.def, false, false),
          buildStatCell('速度', fmt(nextUnit.spd), diff.spd, false, false)
        ]) : null,
        buildSynergyDiffStrip(curSummary.synergies, nextSummary.synergies)
      ]);
    } else {
      var relicBadges = [];
      for (var r = 0; r < 3; r++) {
        var rel = getRelic(s.relics.equipped[r]);
        if (rel) relicBadges.push(el('span', { class: 'tag tag-gold' }, rel.icon + rel.name));
      }
      if (relicBadges.length === 0) {
        relicBadges.push(el('span', { class: 'tag' }, '世界遺物 未装備'));
      }
      bottomBand = el('div', { class: 'upper-section' }, [
        buildSynergyDiffStrip(curSummary.synergies, null),
        el('div', { class: 'row-wrap' }, relicBadges)
      ]);
    }

    dom.upper.appendChild(el('div', { class: 'party-overview' }, [
      header,
      el('div', { class: 'party-pair-grid' }, pairCols),
      bottomBand
    ]));
  }

  function renderUpperLink(s) {
    var slotIdx = ui.selectedLinkSlot;
    var frontId = s.party[slotIdx];
    var frontChar = getChar(frontId);
    var curLinkId = s.links[slotIdx] || null;
    var isPreview = (ui.previewLinkId !== undefined && ui.previewLinkId !== curLinkId);
    var nextLinkId = isPreview ? ui.previewLinkId : curLinkId;
    var curLinkChar = getChar(curLinkId);
    var nextLinkChar = getChar(nextLinkId);

    setWorld((nextLinkChar && nextLinkChar.world) || (frontChar && frontChar.world) || 'frontier');

    if (!frontChar) {
      dom.upper.appendChild(el('div', { class: 'inspector-card' }, [
        el('div', { class: 'empty-state' }, '出撃枠' + (slotIdx + 1) + 'に前衛キャラが編成されていません')
      ]));
      return;
    }

    var baseStats = HS.Calc.calcUnitStats(frontId);
    var nextLinks = isPreview ? simulateLinkAssignment(s, slotIdx, nextLinkId) : s.links;
    var previewStats = isPreview ? HS.Calc.calcUnitStats(frontId, { overrideLinkId: nextLinkId, overrideLinks: nextLinks }) : baseStats;
    var diff = isPreview ? HS.Calc.calcStatDiff(baseStats, previewStats) : {};
    var linkBonus = nextLinkId ? HS.Calc.calcLinkBonus(frontId, nextLinkId) : null;
    var wm = getWorldMeta(frontChar.world);

    var curLinkCol = el('div', { class: 'col', style: { gap: '2px' } }, [
      el('span', { class: 'stat-label' }, '現在の控えリンク'),
      curLinkChar
        ? el('div', { style: { fontWeight: '800', fontSize: '11.5px' } }, getElementMeta(curLinkChar.element).icon + curLinkChar.name + '（' + getRoleMeta(curLinkChar.role).name + '）')
        : el('div', { class: 'card-note' }, '未設定'),
      curLinkChar ? el('div', { class: 'card-note' }, getRoleMeta(curLinkChar.role).linkDesc) : null
    ]);

    var nextLinkCol = el('div', { class: 'col', style: { gap: '2px' } }, [
      el('span', { class: 'stat-label', style: { color: isPreview ? 'var(--accent)' : 'var(--text-sub)' } }, isPreview ? '変更プレビュー（再タップで確定）' : '発動中の共鳴ボーナス'),
      nextLinkChar
        ? el('div', { style: { fontWeight: '800', fontSize: '11.5px', color: 'var(--text-bright)' } }, getElementMeta(nextLinkChar.element).icon + nextLinkChar.name + '（' + getRoleMeta(nextLinkChar.role).name + '）')
        : el('div', { class: 'card-note' }, 'リンク解除'),
      linkBonus
        ? el('div', { class: 'row-wrap' }, [
            el('span', { class: 'tag' }, getRoleMeta(nextLinkChar.role).linkDesc),
            linkBonus.sameElement ? el('span', { class: 'pill tag-good' }, '★同属性') : null,
            linkBonus.sharedRaces.length > 0 ? el('span', { class: 'pill tag-good' }, '★同種族') : null
          ])
        : el('div', { class: 'card-note' }, '下の一覧から相棒を選ぶと差分を表示')
    ]);

    var beforeSyns = HS.Calc.calcPartySynergies(s.party, s.links);
    var afterSyns = isPreview ? HS.Calc.calcPartySynergies(s.party, nextLinks) : null;

    var synergyDetails = (afterSyns || beforeSyns).active.slice(0, 3).map(function (syn) {
      return el('div', { class: 'card-note' }, '・' + syn.name + '：' + syn.desc);
    });

    dom.upper.appendChild(el('div', { class: 'inspector-card' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, '枠' + (slotIdx + 1) + ' 前衛：' + frontChar.title),
            el('div', { class: 'inspector-name' }, frontChar.name)
          ])
        ]),
        el('div', { class: 'row', style: { gap: '3px' } }, [
          makeElBadge(frontChar.element),
          makeRoleBadge(frontChar.role)
        ])
      ]),
      el('div', { class: 'equip-compare-box' }, [curLinkCol, nextLinkCol]),
      buildStatGrid(previewStats, diff),
      el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, 'パーティシナジー（前衛4＋控え4 合算）'),
          el('span', { class: 'tnum' }, (afterSyns || beforeSyns).active.length + '件発動')
        ]),
        buildSynergyDiffStrip(beforeSyns, afterSyns),
        el('div', { class: 'col', style: { gap: '1px' } }, synergyDetails)
      ])
    ]));
  }

  function renderUpperEquip(s) {
    var charId = s.party[ui.selectedPartySlot] || s.party.find(Boolean);
    var ch = getChar(charId);
    if (!ch) {
      setWorld('frontier');
      dom.upper.appendChild(el('div', { class: 'inspector-card' }, [
        el('div', { class: 'empty-state' }, '出撃メンバーが編成されていません')
      ]));
      return;
    }

    var cp = HS.State.getCharProgress(charId);
    var slot = ui.selectedEquipSlot;
    var curUid = cp.equip[slot] || null;
    var isPreview = (ui.previewEquipUid !== undefined && ui.previewEquipUid !== curUid);

    var baseStats = HS.Calc.calcUnitStats(charId);
    var ov = {};
    if (isPreview) ov[slot] = ui.previewEquipUid;
    var nextStats = isPreview ? HS.Calc.calcUnitStats(charId, { overrideEquip: ov }) : baseStats;
    var diff = isPreview ? HS.Calc.calcStatDiff(baseStats, nextStats) : {};

    var targetWorld = ch.world;
    var prevItem = curUid ? HS.State.getItem(curUid) : null;
    var prevDef = prevItem ? getEquipDef(prevItem.defId) : null;
    var candItem = (isPreview && ui.previewEquipUid) ? HS.State.getItem(ui.previewEquipUid) : null;
    var candDef = candItem ? getEquipDef(candItem.defId) : null;
    if (candDef) {
      var candSet = getEquipSet(candDef.setId);
      if (candSet && candSet.world) targetWorld = candSet.world;
    }
    setWorld(targetWorld);
    var wm = getWorldMeta(targetWorld);

    // 2x2 Equipped 4 Slots Matrix (fills upper 50% with crisp live gear cockpit!)
    var equipGrid = el('div', { class: 'equip-slots-grid' }, HS.CONST.SLOTS.map(function (sl) {
      var eq = nextStats.resolvedEquip[sl];
      var isThis = (sl === slot);
      var cls = 'equip-slot-mini' + (isThis ? ' is-active-slot' : '') + (eq && eq.quality >= 100 ? ' q-max' : '');
      return el('div', { class: cls }, [
        el('div', { class: 'row-between' }, [
          el('span', { style: { fontWeight: '800', fontSize: '10.5px', color: isThis ? 'var(--accent)' : 'var(--text-sub)' } },
            HS.CONST.SLOT_ICONS[sl] + HS.CONST.SLOT_NAMES[sl] + (isThis && isPreview ? '（試着）' : '')
          ),
          eq ? makeQualityPill(eq.quality) : el('span', { class: 'tag' }, '空')
        ]),
        el('div', { style: { fontWeight: '800', fontSize: '11px', color: eq ? 'var(--text-bright)' : 'var(--text-dim)' } },
          eq && eq.def ? eq.def.name : '未装備'
        ),
        eq && eq.def ? el('div', { class: 'card-note tnum' }, summarizeEquipBaseStats(eq.defId, eq.quality)) : null
      ]);
    }));

    // Active 2pc / 4pc Set Effects with real-time diff
    var baseSetMap = {};
    baseStats.activeSets.forEach(function (st) {
      baseSetMap[st.setId] = (st.active4 ? 4 : (st.active2 ? 2 : 0));
    });
    var setPills = [];
    nextStats.activeSets.forEach(function (st) {
      if (!st.active2) return;
      var prevLv = baseSetMap[st.setId] || 0;
      var curLv = st.active4 ? 4 : 2;
      var cls = (isPreview && curLv > prevLv) ? 'pill tag-good' : 'synergy-pill';
      var eff = st.active4 ? st.set.bonus4.desc : st.set.bonus2.desc;
      setPills.push(el('span', { class: cls }, st.set.name + '(' + curLv + '): ' + eff));
    });
    if (isPreview) {
      baseStats.activeSets.forEach(function (st) {
        if (!st.active2) return;
        var still = nextStats.activeSets.find(function (x) { return x.setId === st.setId; });
        var prevLv = st.active4 ? 4 : 2;
        var curLv = still ? (still.active4 ? 4 : (still.active2 ? 2 : 0)) : 0;
        if (curLv < prevLv) {
          setPills.push(el('span', { class: 'pill tag-danger' }, '-' + st.set.name + '(' + prevLv + ')'));
        }
      });
    }
    if (setPills.length === 0) {
      setPills.push(el('span', { class: 'tag' }, 'セット未発動（同セット2個/4個で発動）'));
    }

    // Direct Current vs Preview Comparison Panel (compact 1-line headers for zero SE clip!)
    var compareSection;
    if (isPreview) {
      compareSection = el('div', { class: 'equip-compare-box' }, [
        el('div', { class: 'col', style: { gap: '1px' } }, [
          el('span', { class: 'stat-label' }, '現在装備'),
          prevDef
            ? el('div', { class: 'row-wrap', style: { gap: '3px' } }, [makeQualityPill(prevItem.quality), el('span', { style: { fontWeight: '800', fontSize: '10.5px' } }, prevDef.name)])
            : el('div', { class: 'card-note' }, '未装備'),
          prevDef ? el('div', { class: 'card-note tnum' }, summarizeEquipBaseStats(prevItem.defId, prevItem.quality)) : null
        ]),
        el('div', { class: 'col', style: { gap: '1px' } }, [
          el('span', { class: 'stat-label', style: { color: 'var(--accent)' } }, '試着（再タップ確定）'),
          candDef
            ? el('div', { class: 'row-wrap', style: { gap: '3px' } }, [makeQualityPill(candItem.quality), el('span', { style: { fontWeight: '800', fontSize: '10.5px' } }, candDef.name)])
            : el('div', { class: 'card-note' }, '部位を外す'),
          candDef ? el('div', { class: 'card-note tnum' }, summarizeEquipBaseStats(candItem.defId, candItem.quality)) : null
        ])
      ]);
    } else {
      var skillSummary = (ch.skills || []).map(function (sk, idx) {
        var aw = (cp.skillAwaken && cp.skillAwaken[idx]) || 0;
        var awTxt = aw > 0 ? ('覚' + ['I', 'II', 'III'][aw - 1]) : '';
        var scope = sk.type === 'passive' ? '固有' : (HS.CONST.TARGET_NAMES[sk.target] || '単体');
        return el('span', { class: 'tag' }, '[' + scope + ']' + sk.name + (awTxt ? (' ' + awTxt) : ''));
      });
      compareSection = el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, '発動セット効果 ＆ 保有スキル'),
          el('span', { class: 'card-note' }, '装備タップで差分比較')
        ]),
        el('div', { class: 'synergy-strip' }, setPills),
        el('div', { class: 'row-wrap' }, skillSummary)
      ]);
    }

    dom.upper.appendChild(el('div', { class: 'inspector-card' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, ch.title + (isPreview ? ' 【換装プレビュー】' : '')),
            el('div', { class: 'inspector-name' }, ch.name)
          ])
        ]),
        el('div', { class: 'row', style: { gap: '3px' } }, [
          makeElBadge(ch.element),
          makeRoleBadge(ch.role),
          el('span', { class: 'tag' }, makeRaceText(ch.races))
        ])
      ]),
      buildStatGrid(nextStats, diff),
      equipGrid,
      isPreview ? el('div', { class: 'synergy-strip' }, setPills) : null,
      compareSection
    ]));
  }

  function renderUpperRelic(s) {
    var targetRelicId = ui.previewRelicId || s.relics.equipped[ui.selectedRelicSlot] || s.relics.unlocked[0] || (HS.Data.RELICS[0] && HS.Data.RELICS[0].id);
    var rel = getRelic(targetRelicId);
    setWorld(rel ? rel.world : 'frontier');

    var curRelics = s.relics.equipped.slice();
    var isUnlocked = rel && s.relics.unlocked.indexOf(rel.id) !== -1;
    var isEquipped = rel && curRelics.indexOf(rel.id) !== -1;

    var curSummary = HS.Calc.calcPartySummary(s.party, s.links, { overrideRelics: curRelics });
    var simRelics = curRelics.slice();
    var nextSummary = curSummary;
    var previewDiff = 0;
    if (rel && isUnlocked) {
      if (isEquipped) {
        simRelics[curRelics.indexOf(rel.id)] = null;
      } else {
        var emptyIdx = simRelics.indexOf(null);
        simRelics[emptyIdx !== -1 ? emptyIdx : ui.selectedRelicSlot] = rel.id;
      }
      nextSummary = HS.Calc.calcPartySummary(s.party, s.links, { overrideRelics: simRelics });
      previewDiff = nextSummary.totalPower - curSummary.totalPower;
    }

    var wm = getWorldMeta(rel ? rel.world : 'frontier');
    var statusTag = !rel ? null : (
      isEquipped ? el('span', { class: 'tag tag-good' }, '装備中') :
      (isUnlocked ? el('span', { class: 'tag tag-accent' }, '所持済') : el('span', { class: 'tag' }, '未獲得'))
    );

    // 4-hero live impact grid (fills upper 50% with meaningful per-hero numbers!)
    var heroImpactCells = [0, 1, 2, 3].map(function (idx) {
      var cid = s.party[idx];
      var c = getChar(cid);
      var bu = curSummary.units[idx];
      var nu = nextSummary.units[idx];
      if (!c || !bu || !nu) {
        return el('div', { class: 'stat-cell' }, [
          el('span', { class: 'stat-label' }, '枠' + (idx + 1)),
          el('span', { class: 'card-note' }, '空き')
        ]);
      }
      var pD = nu.power - bu.power;
      var pTxt = fmtDiffVal(pD, false, false);
      return el('div', { class: 'stat-cell' }, [
        el('div', { class: 'row-between' }, [
          el('span', { class: 'stat-label', style: { color: 'var(--text-bright)', fontWeight: '800' } }, getElementMeta(c.element).icon + c.name),
          pTxt ? el('span', { class: 'stat-diff ' + (pD > 0 ? 'stat-pos' : 'stat-neg') }, pTxt) : null
        ]),
        el('div', { class: 'card-note tnum' }, 'HP' + fmt(nu.hp) + ' 攻' + fmt(nu.atk) + ' 戦' + fmt(nu.power))
      ]);
    });

    var slotSummary = [0, 1, 2].map(function (idx) {
      var eqRel = getRelic(curRelics[idx]);
      return el('span', { class: 'tag' + (idx === ui.selectedRelicSlot ? ' tag-accent' : '') },
        '枠' + (idx + 1) + ': ' + (eqRel ? (eqRel.icon + eqRel.name) : '空き')
      );
    });

    var diffBadge = null;
    if (rel && isUnlocked && previewDiff !== 0) {
      diffBadge = el('span', { class: 'tag tnum ' + (previewDiff > 0 ? 'tag-good' : 'tag-danger') },
        (isEquipped ? '外すと ' : '装備で ') + (previewDiff > 0 ? '+' : '') + fmt(previewDiff)
      );
    }

    dom.upper.appendChild(el('div', { class: 'inspector-card' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, rel ? rel.icon : wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, '世界遺物（パーティ全体効果・最大3枠）'),
            el('div', { class: 'inspector-name' }, rel ? rel.name : '世界遺物なし')
          ])
        ]),
        statusTag
      ]),
      rel ? el('div', { class: 'lore-box' }, [
        el('div', { style: { fontWeight: '800', color: 'var(--text-bright)' } }, rel.desc),
        el('div', { class: 'card-note', style: { marginTop: '2px' } }, '入手先：' + rel.sourceLabel)
      ]) : null,
      el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, '出撃メンバーへの影響（総戦力 ' + fmt(curSummary.totalPower) + '）'),
          diffBadge || el('span', { class: 'tnum' }, '所持 ' + s.relics.unlocked.length + '/' + HS.Data.RELICS.length)
        ]),
        el('div', { class: 'upper-grid-2' }, heroImpactCells),
        el('div', { class: 'row-wrap', style: { marginTop: '2px' } }, slotSummary)
      ])
    ]));
  }

  // =========================================================================
  // LOWER 50% (ZERO NESTED BUTTONS, >=42x44px TARGETS, MAX 2 COMPACT BARS!)
  // =========================================================================

  function renderLowerParty(s) {
    var slotBar = el('div', { class: 'slot-bar' }, [0, 1, 2, 3].map(function (idx) {
      var c = getChar(s.party[idx]);
      var label = c ? (getElementMeta(c.element).icon + c.name) : '空き';
      return el('button', {
        type: 'button',
        class: 'slot-btn' + (ui.selectedPartySlot === idx ? ' is-active' : ''),
        onClick: function () {
          ui.selectedPartySlot = idx;
          ui.previewCharId = null;
          render();
        }
      }, [
        el('span', {}, '枠' + (idx + 1)),
        el('span', { class: 'slot-sub' }, label)
      ]);
    }));
    dom.lower.appendChild(slotBar);

    var owned = HS.State.getOwnedChars();
    var listNodes = [];

    var curSlotCharId = s.party[ui.selectedPartySlot];
    if (curSlotCharId && s.party.filter(Boolean).length > 1) {
      listNodes.push(el('button', {
        type: 'button',
        class: 'list-card',
        onClick: function () {
          var res = HS.State.setPartySlot(ui.selectedPartySlot, null);
          if (!res.ok) toast(res.error, 'warn');
          else { ui.previewCharId = null; toast('枠' + (ui.selectedPartySlot + 1) + 'を空にしました', 'info'); }
        }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, '枠' + (ui.selectedPartySlot + 1) + 'から外す'),
          el('div', { class: 'list-card-sub' }, '控えへ下げて空き枠にします')
        ]),
        el('span', { class: 'tag tag-danger' }, '解除')
      ]));
    }

    owned.forEach(function (ch) {
      var pIdx = s.party.indexOf(ch.id);
      var lIdx = s.links.indexOf(ch.id);
      var expIdx = HS.State.isInExpedition(ch.id);
      var isInThisSlot = (pIdx === ui.selectedPartySlot);
      var isPreviewed = (ui.previewCharId === ch.id);

      var statusTag;
      if (pIdx !== -1) statusTag = el('span', { class: 'tag tag-accent' }, '出撃' + (pIdx + 1));
      else if (lIdx !== -1) statusTag = el('span', { class: 'tag tag-gold' }, 'リンク' + (lIdx + 1));
      else if (expIdx !== -1) statusTag = el('span', { class: 'tag tag-good' }, '別働' + (expIdx + 1));
      else statusTag = el('span', { class: 'tag' }, '待機');

      var mainBtn = el('button', {
        type: 'button',
        class: 'list-card' + (isInThisSlot ? ' is-equipped' : '') + (isPreviewed ? ' is-selected' : ''),
        onClick: function () {
          if (isInThisSlot) {
            ui.previewCharId = null;
            render();
            return;
          }
          if (isPreviewed) {
            var res = HS.State.setPartySlot(ui.selectedPartySlot, ch.id);
            if (!res.ok) toast(res.error, 'warn');
            else {
              ui.previewCharId = null;
              toast(ch.name + 'を枠' + (ui.selectedPartySlot + 1) + 'に編成しました', 'good');
            }
          } else {
            ui.previewCharId = ch.id;
            render();
          }
        }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, [
            makeElBadge(ch.element),
            el('span', {}, ch.name),
            makeRoleBadge(ch.role)
          ]),
          el('div', { class: 'list-card-sub' }, makeRaceText(ch.races) + ' ／ ' + ch.title)
        ]),
        el('div', { class: 'list-card-right' }, [statusTag])
      ]);

      if (!isInThisSlot && isPreviewed) {
        listNodes.push(el('div', { class: 'list-item-wrap' }, [
          mainBtn,
          el('div', { class: 'list-item-actions' }, [
            el('button', {
              type: 'button',
              class: 'btn btn-primary',
              onClick: function () {
                var res = HS.State.setPartySlot(ui.selectedPartySlot, ch.id);
                if (!res.ok) toast(res.error, 'warn');
                else {
                  ui.previewCharId = null;
                  toast(ch.name + 'を枠' + (ui.selectedPartySlot + 1) + 'に編成しました', 'good');
                }
              }
            }, pIdx !== -1 ? '入替' : '編成')
          ])
        ]));
      } else {
        listNodes.push(mainBtn);
      }
    });

    dom.lower.appendChild(el('div', { class: 'scroll-frame' }, [
      el('div', { class: 'scroll-body' }, [
        el('div', { class: 'scroll-inner' }, [
          el('div', { class: 'list-stack' }, listNodes)
        ])
      ])
    ]));
  }

  function renderLowerLink(s) {
    var slotBar = el('div', { class: 'slot-bar' }, [0, 1, 2, 3].map(function (idx) {
      var fc = getChar(s.party[idx]);
      var lc = getChar(s.links[idx]);
      return el('button', {
        type: 'button',
        class: 'slot-btn' + (ui.selectedLinkSlot === idx ? ' is-active' : ''),
        onClick: function () {
          ui.selectedLinkSlot = idx;
          ui.previewLinkId = undefined;
          render();
        }
      }, [
        el('span', {}, '枠' + (idx + 1) + '裏'),
        el('span', { class: 'slot-sub' }, lc ? lc.name : (fc ? ('前:' + fc.name) : '空き'))
      ]);
    }));
    dom.lower.appendChild(slotBar);

    var frontId = s.party[ui.selectedLinkSlot];
    var curLinkId = s.links[ui.selectedLinkSlot];
    var avail = HS.State.getAvailableForLinks();
    var listNodes = [];

    if (curLinkId) {
      var isPreClear = (ui.previewLinkId === null);
      var clrBtn = el('button', {
        type: 'button',
        class: 'list-card' + (isPreClear ? ' is-selected' : ''),
        onClick: function () {
          if (isPreClear) {
            HS.State.setLinkSlot(ui.selectedLinkSlot, null);
            ui.previewLinkId = undefined;
            toast('枠' + (ui.selectedLinkSlot + 1) + 'の控えリンクを解除しました', 'info');
          } else {
            ui.previewLinkId = null;
            render();
          }
        }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, '控えリンクを解除する'),
          el('div', { class: 'list-card-sub' }, isPreClear ? '「解除」または再タップで確定' : 'タップで解除時の差分をプレビュー')
        ]),
        !isPreClear ? el('span', { class: 'tag tag-danger' }, '外す') : null
      ]);

      if (isPreClear) {
        listNodes.push(el('div', { class: 'list-item-wrap' }, [
          clrBtn,
          el('div', { class: 'list-item-actions' }, [
            el('button', {
              type: 'button',
              class: 'btn btn-danger',
              onClick: function () {
                HS.State.setLinkSlot(ui.selectedLinkSlot, null);
                ui.previewLinkId = undefined;
                toast('控えリンクを解除しました', 'info');
              }
            }, '解除')
          ])
        ]));
      } else {
        listNodes.push(clrBtn);
      }
    }

    if (avail.length === 0) {
      listNodes.push(el('div', { class: 'empty-state' }, '控えに配置できる仲間がまだいません（冒険や酒場で仲間を増やしましょう）'));
    } else {
      avail.forEach(function (ch) {
        var lIdx = s.links.indexOf(ch.id);
        var expIdx = HS.State.isInExpedition(ch.id);
        var isHere = (lIdx === ui.selectedLinkSlot);
        var isPreviewed = (ui.previewLinkId === ch.id);
        var roleMeta = getRoleMeta(ch.role);
        var lb = frontId ? HS.Calc.calcLinkBonus(frontId, ch.id) : null;

        var matchTxt = '';
        if (lb && lb.sameElement) matchTxt += ' ★同属性';
        if (lb && lb.sharedRaces.length > 0) matchTxt += ' ★同種族';

        var badge = null;
        if (isHere) badge = el('span', { class: 'tag tag-accent' }, '設定中');
        else if (lIdx !== -1) badge = el('span', { class: 'tag tag-gold' }, '枠' + (lIdx + 1) + '裏');
        else if (expIdx !== -1) badge = el('span', { class: 'tag tag-good' }, '別働' + (expIdx + 1));

        var mainBtn = el('button', {
          type: 'button',
          class: 'list-card' + (isHere ? ' is-equipped' : '') + (isPreviewed ? ' is-selected' : ''),
          onClick: function () {
            if (isHere) {
              ui.previewLinkId = undefined;
              render();
              return;
            }
            if (isPreviewed) {
              var res = HS.State.setLinkSlot(ui.selectedLinkSlot, ch.id);
              if (!res.ok) toast(res.error, 'warn');
              else {
                ui.previewLinkId = undefined;
                toast(ch.name + 'を枠' + (ui.selectedLinkSlot + 1) + '裏にリンクしました', 'good');
              }
            } else {
              ui.previewLinkId = ch.id;
              render();
            }
          }
        }, [
          el('div', { class: 'list-card-main' }, [
            el('div', { class: 'list-card-title' }, [
              makeElBadge(ch.element),
              el('span', {}, ch.name),
              makeRoleBadge(ch.role),
              matchTxt ? el('span', { class: 'pill tag-good' }, matchTxt.trim()) : null
            ]),
            el('div', { class: 'list-card-sub' }, roleMeta.linkDesc + ' ／ ' + makeRaceText(ch.races))
          ]),
          badge ? el('div', { class: 'list-card-right' }, [badge]) : null
        ]);

        if (!isHere && isPreviewed) {
          listNodes.push(el('div', { class: 'list-item-wrap' }, [
            mainBtn,
            el('div', { class: 'list-item-actions' }, [
              el('button', {
                type: 'button',
                class: 'btn btn-primary',
                onClick: function () {
                  var res = HS.State.setLinkSlot(ui.selectedLinkSlot, ch.id);
                  if (!res.ok) toast(res.error, 'warn');
                  else {
                    ui.previewLinkId = undefined;
                    toast(ch.name + 'を枠' + (ui.selectedLinkSlot + 1) + '裏にリンクしました', 'good');
                  }
                }
              }, lIdx !== -1 ? '入替' : '設定')
            ])
          ]));
        } else {
          listNodes.push(mainBtn);
        }
      });
    }

    dom.lower.appendChild(el('div', { class: 'scroll-frame' }, [
      el('div', { class: 'scroll-body' }, [
        el('div', { class: 'scroll-inner' }, [
          el('div', { class: 'list-stack' }, listNodes)
        ])
      ])
    ]));
  }

  function renderLowerEquip(s) {
    var charId = s.party[ui.selectedPartySlot] || s.party.find(Boolean);
    var cp = charId ? HS.State.getCharProgress(charId) : null;

    // COMPACT 2-ROW HEADER MAX -> leaves spacious scroll area even on iPhone SE + Safe Area!
    // Row 1: 4 Frontline Heroes + Auto-Equip button
    var row1Btns = [0, 1, 2, 3].map(function (idx) {
      var c = getChar(s.party[idx]);
      return el('button', {
        type: 'button',
        class: 'slot-btn' + (ui.selectedPartySlot === idx ? ' is-active' : ''),
        disabled: !c,
        onClick: function () {
          ui.selectedPartySlot = idx;
          ui.previewEquipUid = undefined;
          render();
        }
      }, c ? c.name : ('枠' + (idx + 1)));
    });
    row1Btns.push(el('button', {
      type: 'button',
      class: 'btn btn-primary',
      disabled: !charId,
      onClick: function () {
        var res = HS.State.autoEquipChar(charId);
        ui.previewEquipUid = undefined;
        toast(res.changed ? '最適装備を装着しました！' : 'すでに最適な装備です', res.changed ? 'good' : 'info');
      }
    }, '✨最適'));
    dom.lower.appendChild(el('div', { class: 'toolbar-compact' }, row1Btns));

    // Row 2: 4 Equipment Slot Tabs + Auto-Sell button
    var row2Btns = HS.CONST.SLOTS.map(function (sl) {
      var uid = cp ? cp.equip[sl] : null;
      var item = uid ? HS.State.getItem(uid) : null;
      return el('button', {
        type: 'button',
        class: 'slot-btn' + (ui.selectedEquipSlot === sl ? ' is-active' : ''),
        onClick: function () {
          ui.selectedEquipSlot = sl;
          ui.previewEquipUid = undefined;
          render();
        }
      }, [
        el('span', {}, HS.CONST.SLOT_ICONS[sl] + HS.CONST.SLOT_NAMES[sl]),
        el('span', { class: 'slot-sub' }, item ? (item.quality >= 100 ? '👑極' : ('品' + item.quality)) : '空')
      ]);
    });
    row2Btns.push(el('button', {
      type: 'button',
      class: 'btn btn-ghost',
      onClick: function () {
        if (HS.UI.App && HS.UI.App.openAutoSellSheet) {
          HS.UI.App.openAutoSellSheet(function () { render(); });
        }
      }
    }, '⚙売設定'));
    dom.lower.appendChild(el('div', { class: 'toolbar-compact' }, row2Btns));

    // Scrollable Equipment List (strictly sorted via HS.Utils.sortEquipItems, ZERO nested buttons!)
    var slotItems = s.inventory.filter(function (it) {
      var def = getEquipDef(it.defId);
      return def && def.slot === ui.selectedEquipSlot;
    });
    var sortedItems = HS.Utils.sortEquipItems(slotItems, HS.Data.EQUIP_DEF_BY_ID);
    var listNodes = [];

    if (sortedItems.length === 0) {
      listNodes.push(el('div', { class: 'empty-state' }, HS.CONST.SLOT_NAMES[ui.selectedEquipSlot] + 'を所持していません（冒険や別働隊で獲得できます）'));
    } else {
      sortedItems.forEach(function (it) {
        var def = getEquipDef(it.defId);
        var setObj = def ? getEquipSet(def.setId) : null;
        var ownerId = HS.State.getEquippedOwner(it.uid);
        var ownerChar = ownerId ? getChar(ownerId) : null;
        var isEquippedHere = (ownerId === charId);
        var isPreviewed = (ui.previewEquipUid === it.uid);
        var isMax = (it.quality >= 100);

        var mainBtn = el('button', {
          type: 'button',
          class: 'list-card' + (isMax ? ' q-max' : '') + (isEquippedHere ? ' is-equipped' : '') + (isPreviewed ? ' is-selected' : ''),
          onClick: function () {
            if (isEquippedHere) {
              ui.previewEquipUid = undefined;
              render();
              return;
            }
            if (isPreviewed) {
              var res = HS.State.equipItem(charId, it.uid);
              if (!res.ok) toast(res.error, 'warn');
              else {
                ui.previewEquipUid = undefined;
                toast(def.name + 'を装備しました', 'good');
              }
            } else {
              ui.previewEquipUid = it.uid;
              render();
            }
          }
        }, [
          el('div', { class: 'list-card-main' }, [
            el('div', { class: 'list-card-title' }, [
              makeQualityPill(it.quality),
              el('span', {}, def.name),
              setObj ? el('span', { class: 'tag' }, setObj.name) : null
            ]),
            el('div', { class: 'list-card-sub tnum' },
              summarizeEquipBaseStats(it.defId, it.quality) +
              (isPreviewed ? ' ／ 再タップで確定' : (ownerChar && !isEquippedHere ? (' ／ ' + ownerChar.name + '装備中') : ''))
            )
          ]),
          isEquippedHere ? el('span', { class: 'tag tag-accent' }, '装備中') : null
        ]);

        // Sibling Action Buttons (>= 44x42px, ZERO nesting!)
        var actions = [];
        if (isEquippedHere) {
          actions.push(el('button', {
            type: 'button',
            class: 'btn btn-ghost',
            onClick: function () {
              HS.State.unequipSlot(charId, ui.selectedEquipSlot);
              ui.previewEquipUid = undefined;
              toast(HS.CONST.SLOT_NAMES[ui.selectedEquipSlot] + 'を外しました', 'info');
            }
          }, '外す'));
        } else if (isPreviewed) {
          actions.push(el('button', {
            type: 'button',
            class: 'btn btn-primary',
            onClick: function () {
              var res = HS.State.equipItem(charId, it.uid);
              if (!res.ok) toast(res.error, 'warn');
              else {
                ui.previewEquipUid = undefined;
                toast(def.name + 'を装備しました', 'good');
              }
            }
          }, ownerChar ? '付替' : '装備'));
        }

        actions.push(el('button', {
          type: 'button',
          class: 'btn btn-ghost',
          'aria-label': it.locked ? '保護解除' : '保護する',
          onClick: function () {
            HS.State.toggleLockItem(it.uid);
          }
        }, it.locked ? '🔒' : '🔓'));

        if (!ownerId && !it.locked && !isPreviewed) {
          actions.push(el('button', {
            type: 'button',
            class: 'btn btn-danger',
            onClick: function () {
              var res = HS.State.sellItem(it.uid);
              if (!res.ok) toast(res.error, 'warn');
              else {
                if (ui.previewEquipUid === it.uid) ui.previewEquipUid = undefined;
                toast(def.name + 'を売却 (+' + fmt(res.gold) + 'G)', 'info');
              }
            }
          }, '売' + fmt(HS.State.getSellValue(it))));
        }

        listNodes.push(el('div', { class: 'list-item-wrap' }, [
          mainBtn,
          el('div', { class: 'list-item-actions' }, actions)
        ]));
      });
    }

    dom.lower.appendChild(el('div', { class: 'scroll-frame' }, [
      el('div', { class: 'scroll-body' }, [
        el('div', { class: 'scroll-inner' }, [
          el('div', { class: 'list-stack' }, listNodes)
        ])
      ])
    ]));
  }

  function renderLowerRelic(s) {
    var slotBar = el('div', { class: 'slot-bar slot-bar-3' }, [0, 1, 2].map(function (idx) {
      var rid = s.relics.equipped[idx];
      var rel = getRelic(rid);
      return el('button', {
        type: 'button',
        class: 'slot-btn' + (ui.selectedRelicSlot === idx ? ' is-active' : ''),
        onClick: function () {
          ui.selectedRelicSlot = idx;
          ui.previewRelicId = rid || ui.previewRelicId;
          render();
        }
      }, [
        el('span', {}, '遺物枠' + (idx + 1)),
        el('span', { class: 'slot-sub' }, rel ? (rel.icon + rel.name) : '空き')
      ]);
    }));
    dom.lower.appendChild(slotBar);

    var allRelics = (HS.Data && HS.Data.RELICS) ? HS.Data.RELICS : [];
    var unlockedList = allRelics.filter(function (r) { return s.relics.unlocked.indexOf(r.id) !== -1; });
    var lockedList = allRelics.filter(function (r) { return s.relics.unlocked.indexOf(r.id) === -1; });
    var ordered = unlockedList.concat(lockedList);

    var listNodes = ordered.map(function (rel) {
      var isUnlocked = s.relics.unlocked.indexOf(rel.id) !== -1;
      var eqIdx = s.relics.equipped.indexOf(rel.id);
      var isEquipped = eqIdx !== -1;
      var isSelected = (ui.previewRelicId === rel.id);

      var mainBtn = el('button', {
        type: 'button',
        class: 'list-card' + (isEquipped ? ' is-equipped' : '') + (isSelected ? ' is-selected' : '') + (!isUnlocked ? ' is-undiscovered' : ''),
        onClick: function () {
          ui.previewRelicId = rel.id;
          render();
        }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, [
            el('span', { class: 'ico' }, rel.icon),
            el('span', {}, rel.name),
            isEquipped ? el('span', { class: 'tag tag-accent' }, '枠' + (eqIdx + 1)) : null
          ]),
          el('div', { class: 'list-card-sub' }, isUnlocked ? rel.desc : ('入手：' + rel.sourceLabel))
        ]),
        !isUnlocked ? el('span', { class: 'tag' }, '未獲得') : null
      ]);

      if (isUnlocked) {
        return el('div', { class: 'list-item-wrap' }, [
          mainBtn,
          el('div', { class: 'list-item-actions' }, [
            el('button', {
              type: 'button',
              class: 'btn ' + (isEquipped ? 'btn-danger' : 'btn-primary'),
              onClick: function () {
                if (isEquipped) {
                  HS.State.setRelicSlot(eqIdx, null);
                  toast(rel.name + 'を外しました', 'info');
                } else {
                  var emptyIdx = s.relics.equipped.indexOf(null);
                  var targetSlot = emptyIdx !== -1 ? emptyIdx : ui.selectedRelicSlot;
                  var res = HS.State.setRelicSlot(targetSlot, rel.id);
                  if (!res.ok) toast(res.error, 'warn');
                  else toast(rel.name + 'を枠' + (targetSlot + 1) + 'に装備しました', 'good');
                }
              }
            }, isEquipped ? '外す' : '装備')
          ])
        ]);
      }
      return mainBtn;
    });

    dom.lower.appendChild(el('div', { class: 'scroll-frame' }, [
      el('div', { class: 'scroll-body' }, [
        el('div', { class: 'scroll-inner' }, [
          el('div', { class: 'list-stack' }, listNodes)
        ])
      ])
    ]));
  }

  function renderContextBar() {
    dom.ctx.textContent = '';
    MODE_TABS.forEach(function (tab) {
      dom.ctx.appendChild(el('button', {
        type: 'button',
        class: 'btn btn-compact' + (ui.mode === tab.id ? ' is-active' : ''),
        onClick: function () {
          if (ui.mode !== tab.id) {
            ui.mode = tab.id;
            clearPreviews();
            render();
          }
        }
      }, tab.label));
    });
  }

  function render() {
    if (!dom.upper || !dom.lower || !dom.ctx || !HS.State) return;
    var scrollPos = getSavedScrollTop();
    var s = HS.State.get();

    dom.upper.textContent = '';
    dom.lower.textContent = '';

    if (ui.mode === 'party') {
      renderUpperParty(s);
      renderLowerParty(s);
    } else if (ui.mode === 'link') {
      renderUpperLink(s);
      renderLowerLink(s);
    } else if (ui.mode === 'equip') {
      renderUpperEquip(s);
      renderLowerEquip(s);
    } else if (ui.mode === 'relic') {
      renderUpperRelic(s);
      renderLowerRelic(s);
    }

    renderContextBar();
    restoreScrollTop(scrollPos);
  }

  var PartyView = {
    mount: function (upperEl, lowerEl, ctxEl) {
      dom.upper = upperEl;
      dom.lower = lowerEl;
      dom.ctx = ctxEl;
      clearPreviews();

      if (HS.State && typeof HS.State.subscribe === 'function') {
        unsubs.push(HS.State.subscribe('party:change', render));
        unsubs.push(HS.State.subscribe('equip:change', render));
        unsubs.push(HS.State.subscribe('inventory:change', render));
        unsubs.push(HS.State.subscribe('relic:change', render));
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
      clearPreviews();
    },

    render: render
  };

  HS.UI.PartyView = PartyView;
})(typeof window !== 'undefined' ? window : globalThis);
