(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  HS.UI = HS.UI || {};

  var dom = { upper: null, lower: null, ctx: null };
  var unsubs = [];

  var ui = {
    mode: 'chars', // 'chars' | 'enemies' | 'equips' | 'abilities' | 'settings'
    selectedCharId: null,
    selectedEnemyId: null,
    selectedEquipId: null,
    selectedAbilityId: null,
    enemyFilter: 'all',   // 'all' | 'normal' | 'boss' | 'intruder' | 'high'
    abilityFilter: 'all'  // 'all' | 'tank' | 'dealer' | 'supporter' | 'healer'
  };

  var MODE_TABS = [
    { id: 'chars',     label: 'キャラ' },
    { id: 'enemies',   label: '敵' },
    { id: 'equips',    label: '装備' },
    { id: 'abilities', label: 'アビ' },
    { id: 'settings',  label: '設定' }
  ];

  var ENEMY_FILTERS = [
    { id: 'all',      label: '全種' },
    { id: 'normal',   label: '通常' },
    { id: 'boss',     label: 'ボス' },
    { id: 'intruder', label: '乱入' },
    { id: 'high',     label: '超・強' }
  ];

  var ABILITY_FILTERS = [
    { id: 'all',       label: '全職' },
    { id: 'tank',      label: 'タンク' },
    { id: 'dealer',    label: 'ディーラー' },
    { id: 'supporter', label: 'サポーター' },
    { id: 'healer',    label: 'ヒーラー' }
  ];

  var ENEMY_KIND_LABELS = {
    normal:    '通常敵',
    boss:      'エリアボス',
    intruder:  '乱入敵',
    superboss: '超ボス',
    elite:     '強敵'
  };

  function el(tag, attrs, children) {
    return HS.Utils.el(tag, attrs, children);
  }

  function fmt(n) {
    return HS.Utils.formatNum(n);
  }

  function fmtPctVal(v, isCritDmg) {
    var num = Number(v) || 0;
    if (isCritDmg) return Math.round(num > 0 && num < 10 ? num * 100 : num) + '%';
    return Math.round(num > 0 && num <= 1 ? num * 100 : num) + '%';
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

  function getElementMeta(id) {
    return (HS.Data && HS.Data.ELEMENTS_META && HS.Data.ELEMENTS_META[id]) || { name: '無', icon: '❖' };
  }

  function getRoleMeta(id) {
    return (HS.Data && HS.Data.ROLES_META && HS.Data.ROLES_META[id]) || { name: id, icon: '⚔️' };
  }

  function getRaceText(races) {
    return (Array.isArray(races) ? races : []).map(function (r) {
      var m = HS.Data.RACES_META && HS.Data.RACES_META[r];
      return m ? (m.icon + m.name) : r;
    }).join('・');
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

  function makeTwoRowSkill(sk) {
    var scope = sk.type === 'passive' ? '固有' : (HS.CONST.TARGET_NAMES[sk.target] || '単体');
    return el('div', { class: 'skill-preview-row' }, [
      el('div', { class: 'skill-preview-head' }, [
        el('span', { class: 'skill-preview-name' }, sk.name),
        el('span', { class: 'tag tag-accent' }, '[' + scope + ']')
      ]),
      el('div', { class: 'skill-preview-desc' }, sk.desc)
    ]);
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

  function buildStatCell(label, val) {
    return el('div', { class: 'stat-cell' }, [
      el('span', { class: 'stat-label' }, label),
      el('div', { class: 'stat-val' }, val)
    ]);
  }

  function summarizeEquipStats(defId, q) {
    var st = HS.Calc.calcEquipStats(defId, q);
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

  function getEnemyDropHint(enemyId) {
    // Check bounties, areas, and superbosses for drop/appearance info
    var areas = HS.Data.AREAS || [];
    for (var a = 0; a < areas.length; a++) {
      if (areas[a].bossId === enemyId || (areas[a].enemyPool || []).indexOf(enemyId) !== -1) {
        return areas[a].name + ' 出現';
      }
    }
    var bounties = HS.Data.BOUNTIES || [];
    for (var b = 0; b < bounties.length; b++) {
      if (bounties[b].intruderId === enemyId) {
        return '乱入指名手配（' + bounties[b].name.replace('手配：', '') + '）';
      }
    }
    var sbs = HS.Data.SUPERBOSSES || [];
    for (var sb = 0; sb < sbs.length; sb++) {
      if (sbs[sb].enemyId === enemyId) return '超ボス計測戦 登場';
    }
    return '異界混線タワー / 総力戦 登場';
  }

  // =========================================================================
  // UPPER 50% (100% READ-ONLY HIGH-DENSITY APPRECIATION SHOWCASE — ZERO BONUS!)
  // =========================================================================

  function renderUpperChars(s, sorted) {
    var ch = (ui.selectedCharId && HS.Data.CHAR_BY_ID[ui.selectedCharId]) || sorted.find(function (c) { return s.codex.chars[c.id]; }) || sorted[0];
    if (!ch) return;
    ui.selectedCharId = ch.id;
    setWorld(ch.world);

    var discovered = Boolean(s.codex.chars[ch.id]);
    var wm = getWorldMeta(ch.world);

    if (!discovered) {
      dom.upper.appendChild(el('div', { class: 'codex-showcase' }, [
        el('div', { class: 'inspector-head' }, [
          el('div', { class: 'inspector-ident' }, [
            el('span', { class: 'world-emblem' }, '？'),
            el('div', { class: 'col', style: { gap: '0px' } }, [
              el('div', { class: 'inspector-title' }, '未発見の仲間（' + wm.name + '）'),
              el('div', { class: 'inspector-name' }, '？？？')
            ])
          ]),
          el('div', { class: 'row', style: { gap: '3px' } }, [
            makeElBadge(ch.element),
            makeRoleBadge(ch.role)
          ])
        ]),
        el('div', { class: 'upper-section is-grow' }, [
          el('div', { class: 'upper-section-head' }, [
            el('span', {}, '出会いの手がかり'),
            el('span', {}, getRaceText(ch.races))
          ]),
          el('div', { class: 'lore-box' }, (ch.unlock && ch.unlock.label) ? ch.unlock.label : '異界を冒険すると出会える'),
          el('div', { class: 'card-note' }, '出身世界：' + wm.name + '（' + wm.subtitle + '）')
        ])
      ]));
      return;
    }

    var bs = ch.baseStats;
    var skillRows = (ch.skills || []).map(makeTwoRowSkill);

    dom.upper.appendChild(el('div', { class: 'codex-showcase' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, ch.title + '・' + getRaceText(ch.races)),
            el('div', { class: 'inspector-name' }, ch.name)
          ])
        ]),
        el('div', { class: 'row', style: { gap: '3px' } }, [
          makeElBadge(ch.element),
          makeRoleBadge(ch.role)
        ])
      ]),
      el('div', { class: 'stat-grid' }, [
        buildStatCell('HP', fmt(bs.hp)),
        buildStatCell('攻撃', fmt(bs.atk)),
        buildStatCell('防御', fmt(bs.def)),
        buildStatCell('速度', fmt(bs.spd))
      ]),
      el('div', { class: 'skill-preview-list' }, skillRows),
      el('div', { class: 'lore-box' }, ch.lore)
    ]));
  }

  function renderUpperEnemies(s, filtered) {
    var en = filtered.find(function (e) { return e.id === ui.selectedEnemyId; })
      || filtered.find(function (e) { return s.codex.enemies[e.id]; })
      || filtered[0];
    if (!en) return;
    ui.selectedEnemyId = en.id;
    setWorld(en.world);

    var discovered = Boolean(s.codex.enemies[en.id]);
    var wm = getWorldMeta(en.world);
    var kindLabel = ENEMY_KIND_LABELS[en.kind] || '敵';

    if (!discovered) {
      dom.upper.appendChild(el('div', { class: 'codex-showcase' }, [
        el('div', { class: 'inspector-head' }, [
          el('div', { class: 'inspector-ident' }, [
            el('span', { class: 'world-emblem' }, '？'),
            el('div', { class: 'col', style: { gap: '0px' } }, [
              el('div', { class: 'inspector-title' }, '未遭遇の' + kindLabel + '（' + wm.name + '）'),
              el('div', { class: 'inspector-name' }, '？？？')
            ])
          ]),
          el('div', { class: 'row', style: { gap: '3px' } }, [
            makeElBadge(en.element),
            makeRoleBadge(en.role)
          ])
        ]),
        el('div', { class: 'upper-section is-grow' }, [
          el('div', { class: 'upper-section-head' }, [
            el('span', {}, '生息・出現情報'),
            el('span', {}, getRaceText(en.races))
          ]),
          el('div', { class: 'lore-box' }, getEnemyDropHint(en.id) + '。戦闘で遭遇すると敵図鑑に詳細が記録されます。')
        ])
      ]));
      return;
    }

    var bs = en.baseStats;
    var skillRows = (en.skills || []).slice(0, 3).map(makeTwoRowSkill);

    dom.upper.appendChild(el('div', { class: 'codex-showcase' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, kindLabel + '・' + getRaceText(en.races)),
            el('div', { class: 'inspector-name' }, en.name)
          ])
        ]),
        el('div', { class: 'row', style: { gap: '3px' } }, [
          makeElBadge(en.element),
          makeRoleBadge(en.role)
        ])
      ]),
      el('div', { class: 'stat-grid' }, [
        buildStatCell('HP', fmt(bs.hp)),
        buildStatCell('攻撃', fmt(bs.atk)),
        buildStatCell('防御', fmt(bs.def)),
        buildStatCell('速度', fmt(bs.spd))
      ]),
      el('div', { class: 'skill-preview-list' }, skillRows),
      el('div', { class: 'lore-box' }, en.lore)
    ]));
  }

  function renderUpperEquips(s, sorted) {
    var def = (ui.selectedEquipId && HS.Data.EQUIP_DEF_BY_ID[ui.selectedEquipId]) || sorted.find(function (d) { return s.codex.equips[d.id]; }) || sorted[0];
    if (!def) return;
    ui.selectedEquipId = def.id;

    var setObj = HS.Data.EQUIP_SET_BY_ID[def.setId];
    var world = (setObj && setObj.world) || 'frontier';
    setWorld(world);

    var discovered = Boolean(s.codex.equips[def.id]);
    var wm = getWorldMeta(world);

    if (!discovered) {
      dom.upper.appendChild(el('div', { class: 'codex-showcase' }, [
        el('div', { class: 'inspector-head' }, [
          el('div', { class: 'inspector-ident' }, [
            el('span', { class: 'world-emblem' }, '？'),
            el('div', { class: 'col', style: { gap: '0px' } }, [
              el('div', { class: 'inspector-title' }, (setObj ? setObj.name + 'セット' : '未発見の装備')),
              el('div', { class: 'inspector-name' }, '？？？')
            ])
          ]),
          el('span', { class: 'tag' }, HS.CONST.SLOT_ICONS[def.slot] + HS.CONST.SLOT_NAMES[def.slot])
        ]),
        el('div', { class: 'upper-section is-grow' }, [
          el('div', { class: 'lore-box' }, '冒険・指名手配・別働隊で獲得すると装備図鑑に記録されます。'),
          setObj ? el('div', { class: 'card-note' }, '所属セット：' + setObj.name + '（' + setObj.desc + '）') : null
        ])
      ]));
      return;
    }

    dom.upper.appendChild(el('div', { class: 'codex-showcase' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, setObj ? setObj.icon : wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, (setObj ? setObj.name + 'セット' : '') + ' ／ ' + HS.CONST.SLOT_NAMES[def.slot]),
            el('div', { class: 'inspector-name' }, def.name)
          ])
        ]),
        el('div', { class: 'row', style: { gap: '3px' } }, [
          makeElBadge(def.element),
          el('span', { class: 'q-pill q-max' }, '👑極あり')
        ])
      ]),
      el('div', { class: 'stat-grid stat-grid-2' }, [
        buildStatCell('品質1(並) → 品質50(良)', summarizeEquipStats(def.id, 1) + ' → ' + summarizeEquipStats(def.id, 50)),
        buildStatCell('品質99(秀) → 👑極(100)', summarizeEquipStats(def.id, 99) + ' → ' + summarizeEquipStats(def.id, 100))
      ]),
      setObj ? el('div', { class: 'upper-section' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, setObj.icon + ' ' + setObj.name + ' セット効果'),
          el('span', {}, getRaceText(def.races))
        ]),
        el('div', { class: 'skill-preview-list' }, [
          el('div', { class: 'skill-preview-row' }, [
            el('div', { class: 'skill-preview-head' }, [el('span', { class: 'tag tag-accent' }, '2部位セット効果')]),
            el('div', { class: 'skill-preview-desc' }, setObj.bonus2.desc)
          ]),
          el('div', { class: 'skill-preview-row' }, [
            el('div', { class: 'skill-preview-head' }, [el('span', { class: 'tag tag-gold' }, '4部位セット効果')]),
            el('div', { class: 'skill-preview-desc' }, setObj.bonus4.desc)
          ])
        ])
      ]) : null,
      el('div', { class: 'lore-box' }, def.lore)
    ]));
  }

  function renderUpperAbilities(s, filtered) {
    var ab = filtered.find(function (a) { return a.id === ui.selectedAbilityId; })
      || filtered.find(function (a) { return s.codex.abilities[a.id]; })
      || filtered[0];
    if (!ab) return;
    ui.selectedAbilityId = ab.id;

    var roleWorld = { tank: 'mechcity', dealer: 'dragonpeak', supporter: 'fairyvale', healer: 'sanctum' };
    setWorld(roleWorld[ab.role] || 'frontier');

    var discovered = Boolean(s.codex.abilities[ab.id]);
    var rm = getRoleMeta(ab.role);

    // Same-tier 5 choices comparison panel (eliminates 292px empty void!)
    var siblings = (HS.Data.ABILITIES || []).filter(function (x) {
      return x.role === ab.role && x.tier === ab.tier;
    }).sort(function (a, b) { return (a.idx || 0) - (b.idx || 0); });

    var sibNodes = siblings.map(function (sb) {
      var ok = Boolean(s.codex.abilities[sb.id]);
      var isSel = (sb.id === ab.id);
      return el('div', {
        class: 'row-between',
        style: {
          padding: '2px 5px',
          borderRadius: '5px',
          background: isSel ? 'var(--accent-soft)' : 'rgba(255,255,255,0.03)',
          border: isSel ? '1px solid var(--accent)' : '1px solid transparent'
        }
      }, [
        el('span', { class: 'card-note', style: { color: isSel ? 'var(--text-bright)' : 'var(--text-main)', fontWeight: isSel ? '800' : '600' } },
          sb.icon + '【' + sb.styleTag + '】' + (ok ? (sb.name + '：' + sb.desc) : '？？？')
        )
      ]);
    });

    dom.upper.appendChild(el('div', { class: 'codex-showcase' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, discovered ? ab.icon : '？'),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, rm.name + ' 第' + ab.tier + '段階 ／ ' + ab.styleTag),
            el('div', { class: 'inspector-name' }, discovered ? ab.name : '？？？')
          ])
        ]),
        makeRoleBadge(ab.role)
      ]),
      el('div', { class: 'lore-box' }, [
        el('div', { style: { fontWeight: '800', color: 'var(--text-bright)' } },
          discovered ? ab.desc : (rm.name + 'の第' + ab.tier + '段階アビリティを解放すると詳細が記録されます。')
        )
      ]),
      el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, rm.name + ' 第' + ab.tier + '段階の5択一覧'),
          el('span', {}, '育成から自由切替可')
        ]),
        el('div', { class: 'col', style: { gap: '2px' } }, sibNodes)
      ])
    ]));
  }

  function renderUpperSettings(s) {
    setWorld('frontier');
    var clearedStages = Object.keys(s.progress.clearedStages || {}).length;
    var ownedChars = (s.ownedChars || []).length;
    var discEnemies = Object.keys(s.codex.enemies || {}).length;
    var discEquips = Object.keys(s.codex.equips || {}).length;
    var discAb = Object.keys(s.codex.abilities || {}).length;
    var expTotal = (s.expeditions || []).reduce(function (acc, ex) { return acc + (ex.completions || 0); }, 0);

    dom.upper.appendChild(el('div', { class: 'codex-showcase' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, '⚜️'),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, 'はちゃめちゃ世界 v' + (HS.VERSION || '1.0.0')),
            el('div', { class: 'inspector-name' }, '冒険記録 ＆ データ管理')
          ])
        ]),
        el('span', { class: 'tag tag-accent' }, '端末内自動保存')
      ]),
      el('div', { class: 'stat-grid' }, [
        buildStatCell('累計勝利', fmt(s.progress.totalBattlesWon || 0)),
        buildStatCell('仲間加入', ownedChars + '/' + HS.Data.CHARACTERS.length),
        buildStatCell('冒険踏破', clearedStages + '/40'),
        buildStatCell('混線タワー', (s.progress.towerHighest || 0) + '/20階'),
        buildStatCell('遭遇敵', discEnemies + '/' + HS.Data.ALL_ENEMIES.length),
        buildStatCell('発見装備', discEquips + '/' + HS.Data.EQUIP_DEFS.length),
        buildStatCell('解放アビ', discAb + '/' + HS.Data.ABILITIES.length),
        buildStatCell('世界遺物', s.relics.unlocked.length + '/' + HS.Data.RELICS.length)
      ]),
      el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, '周回・別働隊のあしあと'),
          el('span', { class: 'tnum' }, '別働隊帰還 ' + fmt(expTotal) + '回 ／ 自動売却 ' + fmt(s.progress.totalAutoSold || 0) + '個')
        ]),
        el('div', { class: 'lore-box' }, 'セーブデータはオフラインで端末内に自動保存されます。機種変更や大切なデータの保管には、下の「バックアップ書き出し」から文字列コピーやファイル保存をご利用ください。')
      ])
    ]));
  }

  // =========================================================================
  // LOWER 50% (FILTERS FOR ENEMIES & ABILITIES, COMPACT 2x2 SETTINGS PANEL!)
  // =========================================================================

  function renderLowerCodexList(title, discoveredCount, totalCount, rowNodes, filterBarNode) {
    dom.lower.appendChild(el('div', { class: 'codex-progress-bar' }, [
      el('span', {}, title + '（観賞用）'),
      el('span', { class: 'tnum' }, '発見 ' + discoveredCount + ' / ' + totalCount)
    ]));
    if (filterBarNode) dom.lower.appendChild(filterBarNode);
    dom.lower.appendChild(el('div', { class: 'scroll-frame' }, [
      el('div', { class: 'scroll-body' }, [
        el('div', { class: 'scroll-inner' }, [
          el('div', { class: 'list-stack' }, rowNodes)
        ])
      ])
    ]));
  }

  function renderLowerChars(s, sorted) {
    var disc = 0;
    var rows = sorted.map(function (ch) {
      var ok = Boolean(s.codex.chars[ch.id]);
      if (ok) disc++;
      var isSel = (ui.selectedCharId === ch.id);
      return el('button', {
        type: 'button',
        class: 'list-card' + (isSel ? ' is-selected' : '') + (!ok ? ' is-undiscovered' : ''),
        onClick: function () { ui.selectedCharId = ch.id; render(); }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, [
            makeElBadge(ch.element),
            el('span', {}, ok ? ch.name : '？？？'),
            makeRoleBadge(ch.role)
          ]),
          el('div', { class: 'list-card-sub' }, getRaceText(ch.races) + ' ／ ' + (ok ? ch.title : ((ch.unlock && ch.unlock.label) || '未発見')))
        ]),
        el('div', { class: 'list-card-right' }, [
          el('span', { class: ok ? 'tag tag-good' : 'tag' }, ok ? '発見' : '未')
        ])
      ]);
    });
    renderLowerCodexList('キャラクター図鑑', disc, sorted.length, rows, null);
  }

  function filterEnemies(sorted) {
    if (ui.enemyFilter === 'all') return sorted;
    return sorted.filter(function (en) {
      if (ui.enemyFilter === 'high') return en.kind === 'superboss' || en.kind === 'elite';
      return en.kind === ui.enemyFilter;
    });
  }

  function renderLowerEnemies(s, allSorted, filtered) {
    var totalDisc = allSorted.filter(function (e) { return s.codex.enemies[e.id]; }).length;
    var filterBar = el('div', { class: 'filter-bar' }, ENEMY_FILTERS.map(function (f) {
      return el('button', {
        type: 'button',
        class: 'filter-btn' + (ui.enemyFilter === f.id ? ' is-active' : ''),
        onClick: function () {
          ui.enemyFilter = f.id;
          render();
        }
      }, f.label);
    }));

    var rows = filtered.map(function (en) {
      var ok = Boolean(s.codex.enemies[en.id]);
      var isSel = (ui.selectedEnemyId === en.id);
      return el('button', {
        type: 'button',
        class: 'list-card' + (isSel ? ' is-selected' : '') + (!ok ? ' is-undiscovered' : ''),
        onClick: function () { ui.selectedEnemyId = en.id; render(); }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, [
            makeElBadge(en.element),
            el('span', {}, ok ? en.name : '？？？'),
            makeRoleBadge(en.role)
          ]),
          el('div', { class: 'list-card-sub' }, getRaceText(en.races) + ' ／ ' + (ENEMY_KIND_LABELS[en.kind] || '敵'))
        ]),
        el('div', { class: 'list-card-right' }, [
          el('span', { class: ok ? 'tag tag-good' : 'tag' }, ok ? '遭遇' : '未')
        ])
      ]);
    });
    renderLowerCodexList('敵図鑑', totalDisc, allSorted.length, rows, filterBar);
  }

  function renderLowerEquips(s, sorted) {
    var disc = 0;
    var rows = sorted.map(function (def) {
      var ok = Boolean(s.codex.equips[def.id]);
      if (ok) disc++;
      var setObj = HS.Data.EQUIP_SET_BY_ID[def.setId];
      var isSel = (ui.selectedEquipId === def.id);
      return el('button', {
        type: 'button',
        class: 'list-card' + (isSel ? ' is-selected' : '') + (!ok ? ' is-undiscovered' : ''),
        onClick: function () { ui.selectedEquipId = def.id; render(); }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, [
            makeElBadge(def.element),
            el('span', {}, ok ? def.name : '？？？'),
            el('span', { class: 'tag' }, HS.CONST.SLOT_NAMES[def.slot])
          ]),
          el('div', { class: 'list-card-sub' }, (setObj ? setObj.name + 'セット' : '') + ' ／ ' + getRaceText(def.races))
        ]),
        el('div', { class: 'list-card-right' }, [
          el('span', { class: ok ? 'tag tag-good' : 'tag' }, ok ? '記録' : '未')
        ])
      ]);
    });
    renderLowerCodexList('装備図鑑', disc, sorted.length, rows, null);
  }

  function filterAbilities(sorted) {
    if (ui.abilityFilter === 'all') return sorted;
    return sorted.filter(function (ab) { return ab.role === ui.abilityFilter; });
  }

  function renderLowerAbilities(s, allSorted, filtered) {
    var totalDisc = allSorted.filter(function (a) { return s.codex.abilities[a.id]; }).length;
    var filterBar = el('div', { class: 'filter-bar' }, ABILITY_FILTERS.map(function (f) {
      return el('button', {
        type: 'button',
        class: 'filter-btn' + (ui.abilityFilter === f.id ? ' is-active' : ''),
        onClick: function () {
          ui.abilityFilter = f.id;
          render();
        }
      }, f.label);
    }));

    var rows = filtered.map(function (ab) {
      var ok = Boolean(s.codex.abilities[ab.id]);
      var isSel = (ui.selectedAbilityId === ab.id);
      return el('button', {
        type: 'button',
        class: 'list-card' + (isSel ? ' is-selected' : '') + (!ok ? ' is-undiscovered' : ''),
        onClick: function () { ui.selectedAbilityId = ab.id; render(); }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, [
            makeRoleBadge(ab.role),
            el('span', { class: 'tag tnum' }, ab.tier + '段'),
            el('span', {}, ok ? (ab.icon + ' ' + ab.name) : '？？？')
          ]),
          el('div', { class: 'list-card-sub' }, ab.styleTag + (ok ? (' ／ ' + ab.desc) : ' ／ 未解放'))
        ]),
        el('div', { class: 'list-card-right' }, [
          el('span', { class: ok ? 'tag tag-good' : 'tag' }, ok ? '解放' : '未')
        ])
      ]);
    });
    renderLowerCodexList('アビリティ図鑑', totalDisc, allSorted.length, rows, filterBar);
  }

  // --- Save Export / Import / 2-Step Reset Sheets (Strictly lower 50%!) ---

  function openExportSheet() {
    var code = HS.State.exportSave();
    var taRef = null;
    HS.UI.App.openSheet({
      title: 'バックアップ書き出し',
      subtitle: '文字列コピー・ファイル保存',
      renderBody: function (body) {
        taRef = el('textarea', {
          class: 'save-textarea',
          readonly: true,
          'aria-label': 'バックアップ文字列'
        });
        taRef.value = code;
        body.appendChild(taRef);
      },
      renderActions: function (actions) {
        actions.appendChild(el('button', {
          type: 'button',
          class: 'btn btn-primary btn-compact',
          onClick: function () {
            if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(code).then(function () {
                toast('バックアップ文字列をコピーしました！', 'good');
              }).catch(function () {
                if (taRef) { taRef.focus(); taRef.select(); }
                toast('文字列を選択しました。コピーしてください', 'info');
              });
            } else {
              if (taRef) { taRef.focus(); taRef.select(); }
              try { document.execCommand('copy'); toast('バックアップ文字列をコピーしました！', 'good'); }
              catch (e) { toast('文字列を選択しました。コピーしてください', 'info'); }
            }
          }
        }, '📋コピー'));

        actions.appendChild(el('button', {
          type: 'button',
          class: 'btn btn-accent btn-compact',
          onClick: function () {
            try {
              var jsonStr = JSON.stringify(HS.State.get(), null, 2);
              var blob = new Blob([jsonStr], { type: 'application/json' });
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url;
              a.download = 'hachamecha-save.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
              toast('バックアップファイルを保存しました', 'good');
            } catch (err) {
              toast('ファイル保存に失敗しました。文字列コピーをご利用ください', 'warn');
            }
          }
        }, '💾ファイル保存'));

        actions.appendChild(el('button', {
          type: 'button',
          class: 'btn btn-ghost btn-compact',
          onClick: function () { HS.UI.App.closeSheet(); }
        }, '閉じる'));
      }
    });
  }

  function openImportSheet() {
    var taRef = null;
    HS.UI.App.openSheet({
      title: 'バックアップ読み込み',
      subtitle: '保存した文字列を貼り付け',
      renderBody: function (body) {
        taRef = el('textarea', {
          class: 'save-textarea',
          placeholder: '書き出したバックアップ文字列を貼り付けてください',
          'aria-label': '読み込みバックアップ文字列'
        });
        body.appendChild(taRef);
      },
      renderActions: function (actions) {
        actions.appendChild(el('button', {
          type: 'button',
          class: 'btn btn-primary',
          onClick: function () {
            var val = taRef ? taRef.value : '';
            var res = HS.State.importSave(val);
            if (!res.ok) {
              toast(res.error || '読み込みに失敗しました', 'error');
              return;
            }
            HS.UI.App.closeSheet();
            render();
          }
        }, '読み込む'));
        actions.appendChild(el('button', {
          type: 'button',
          class: 'btn btn-ghost',
          onClick: function () { HS.UI.App.closeSheet(); }
        }, '閉じる'));
      }
    });
  }

  function openResetConfirmSheet() {
    var step = 1;
    function renderStep() {
      HS.UI.App.openSheet({
        title: step === 1 ? 'データ初期化の確認 (1/2)' : '最終確認 (2/2)',
        subtitle: 'この操作は取り消せません',
        renderBody: function (body) {
          body.appendChild(el('div', { class: 'lore-box' },
            step === 1
              ? '仲間・装備・育成状況・進行度がすべて最初の状態に戻ります。必要なら先に「書き出し」でバックアップを保存してください。'
              : '本当にすべての冒険データを初期化しますか？「初期化を実行」を押すと即座にリセットされます。'
          ));
        },
        renderActions: function (actions) {
          if (step === 1) {
            actions.appendChild(el('button', {
              type: 'button',
              class: 'btn btn-warn',
              onClick: function () {
                step = 2;
                renderStep();
              }
            }, '確認へ進む'));
          } else {
            actions.appendChild(el('button', {
              type: 'button',
              class: 'btn btn-danger',
              onClick: function () {
                HS.UI.App.closeSheet();
                HS.State.reset();
              }
            }, '初期化を実行'));
          }
          actions.appendChild(el('button', {
            type: 'button',
            class: 'btn btn-ghost',
            onClick: function () { HS.UI.App.closeSheet(); }
          }, 'キャンセル'));
        }
      });
    }
    renderStep();
  }

  function renderLowerSettings(s) {
    var st = s.settings || {};

    // Compact 2-tier layout: Row 1 (Backup) + 2x2 Grid (3 Toggles + Reset)
    // Fits with ZERO vertical clipping even on iPhone SE (375x667) + Safe Area!
    dom.lower.appendChild(el('div', { class: 'settings-panel' }, [
      el('div', { class: 'setting-row', style: { flex: '0 0 auto' } }, [
        el('div', { class: 'setting-label' }, [
          el('span', { class: 'setting-title' }, 'バックアップ管理'),
          el('span', { class: 'setting-desc' }, 'バックアップ文字列・ファイル保存・復元')
        ]),
        el('div', { class: 'row', style: { gap: '4px' } }, [
          el('button', { type: 'button', class: 'btn btn-accent btn-compact', onClick: openExportSheet }, '書き出し'),
          el('button', { type: 'button', class: 'btn btn-ghost btn-compact', onClick: openImportSheet }, '読み込み')
        ])
      ]),
      el('div', { class: 'settings-grid' }, [
        el('div', { class: 'setting-row' }, [
          el('div', { class: 'setting-label' }, [
            el('span', { class: 'setting-title' }, 'スリープ防止'),
            el('span', { class: 'setting-desc' }, '周回中の消灯防止')
          ]),
          el('button', {
            type: 'button',
            class: 'toggle-btn' + (st.wakeLock ? ' is-on' : ''),
            onClick: function () {
              if (HS.UI.App && HS.UI.App.toggleWakeLock) {
                HS.UI.App.toggleWakeLock().then(function () { render(); });
              }
            }
          }, st.wakeLock ? 'ON' : 'OFF')
        ]),
        el('div', { class: 'setting-row' }, [
          el('div', { class: 'setting-label' }, [
            el('span', { class: 'setting-title' }, 'カットイン'),
            el('span', { class: 'setting-desc' }, '強技の演出帯')
          ]),
          el('button', {
            type: 'button',
            class: 'toggle-btn' + (st.showCutin ? ' is-on' : ''),
            onClick: function () {
              HS.State.updateSettings({ showCutin: !st.showCutin });
            }
          }, st.showCutin ? 'ON' : 'OFF')
        ]),
        el('div', { class: 'setting-row' }, [
          el('div', { class: 'setting-label' }, [
            el('span', { class: 'setting-title' }, '演出軽量化'),
            el('span', { class: 'setting-desc' }, '省電力モード')
          ]),
          el('button', {
            type: 'button',
            class: 'toggle-btn' + (st.compactFx ? ' is-on' : ''),
            onClick: function () {
              HS.State.updateSettings({ compactFx: !st.compactFx });
            }
          }, st.compactFx ? 'ON' : 'OFF')
        ]),
        el('div', { class: 'setting-row' }, [
          el('div', { class: 'setting-label' }, [
            el('span', { class: 'setting-title' }, 'データ初期化'),
            el('span', { class: 'setting-desc' }, '最初から遊ぶ')
          ]),
          el('button', {
            type: 'button',
            class: 'btn btn-danger btn-compact',
            onClick: openResetConfirmSheet
          }, '初期化')
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

    if (ui.mode === 'chars') {
      var sortedChars = HS.Utils.sortCharacters(HS.Data.CHARACTERS);
      renderUpperChars(s, sortedChars);
      renderLowerChars(s, sortedChars);
    } else if (ui.mode === 'enemies') {
      var sortedEnemies = HS.Utils.sortEnemies(HS.Data.ALL_ENEMIES);
      var filteredEnemies = filterEnemies(sortedEnemies);
      renderUpperEnemies(s, filteredEnemies);
      renderLowerEnemies(s, sortedEnemies, filteredEnemies);
    } else if (ui.mode === 'equips') {
      var sortedEquips = HS.Utils.sortEquipDefs(HS.Data.EQUIP_DEFS);
      renderUpperEquips(s, sortedEquips);
      renderLowerEquips(s, sortedEquips);
    } else if (ui.mode === 'abilities') {
      var sortedAb = HS.Utils.sortAbilities(HS.Data.ABILITIES);
      var filteredAb = filterAbilities(sortedAb);
      renderUpperAbilities(s, filteredAb);
      renderLowerAbilities(s, sortedAb, filteredAb);
    } else if (ui.mode === 'settings') {
      renderUpperSettings(s);
      renderLowerSettings(s);
    }

    renderContextBar();
    restoreScrollTop(scrollPos);
  }

  var CodexView = {
    mount: function (upperEl, lowerEl, ctxEl) {
      dom.upper = upperEl;
      dom.lower = lowerEl;
      dom.ctx = ctxEl;

      if (HS.State && typeof HS.State.subscribe === 'function') {
        unsubs.push(HS.State.subscribe('codex:change', render));
        unsubs.push(HS.State.subscribe('settings:change', render));
        unsubs.push(HS.State.subscribe('state:reset', render));
        unsubs.push(HS.State.subscribe('state:import', render));
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

  HS.UI.CodexView = CodexView;
})(typeof window !== 'undefined' ? window : globalThis);
