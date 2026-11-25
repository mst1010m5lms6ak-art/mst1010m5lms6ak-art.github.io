(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  HS.UI = HS.UI || {};

  var dom = { upper: null, lower: null, ctx: null };
  var unsubs = [];

  var ui = {
    mode: 'ability', // 'ability' | 'awaken' | 'resonance' | 'tavern'
    selectedRole: 'tank',
    selectedTier: 1,
    previewAbilityId: null,
    selectedCharId: null,
    selectedSkillIdx: 0,
    previewResNode: null, // null -> auto-defaults to min(5, curRes + 1), i.e. 5 if already stage 5!
    selectedTavernId: null
  };

  var MODE_TABS = [
    { id: 'ability',   label: 'ロールアビ' },
    { id: 'awaken',    label: 'スキル覚醒' },
    { id: 'resonance', label: '異界共鳴' },
    { id: 'tavern',    label: '酒場加入' }
  ];

  var ROMAN = ['未', 'I', 'II', 'III'];

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

  function fmtDiffVal(delta, isPct, isCritDmg) {
    var d = Number(delta) || 0;
    if (isPct) {
      if (Math.abs(d) < 0.004) return null;
      var sc = isCritDmg ? (Math.abs(d) <= 5 ? d * 100 : d) : (Math.abs(d) <= 1.5 ? d * 100 : d);
      var r = Math.round(sc);
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

  function getAbility(id) {
    return (id && HS.Data && HS.Data.ABILITY_BY_ID) ? HS.Data.ABILITY_BY_ID[id] || null : null;
  }

  function getRoleAbilities(role, tier) {
    var all = (HS.Data && HS.Data.ABILITIES) || [];
    return all.filter(function (a) { return a.role === role && a.tier === tier; })
      .sort(function (a, b) { return (a.idx || 0) - (b.idx || 0); });
  }

  function getElementMeta(elId) {
    return (HS.Data && HS.Data.ELEMENTS_META && HS.Data.ELEMENTS_META[elId]) || { name: '無', icon: '❖' };
  }

  function getRoleMeta(roleId) {
    return (HS.Data && HS.Data.ROLES_META && HS.Data.ROLES_META[roleId]) || { name: roleId, icon: '⚔️', short: '前' };
  }

  function getRaceText(races) {
    return (Array.isArray(races) ? races : []).map(function (r) {
      var m = HS.Data.RACES_META && HS.Data.RACES_META[r];
      return m ? (m.icon + m.name) : r;
    }).join('・');
  }

  function getWorldMeta(wId) {
    return (HS.Data && HS.Data.WORLDS_META && HS.Data.WORLDS_META[wId]) || { name: '境界平原', emblem: '⚜️' };
  }

  function getMatMeta(matId) {
    return (HS.Data && HS.Data.MATERIALS && HS.Data.MATERIALS[matId]) || { name: matId, icon: '◆' };
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

  function makeElBadge(elId) {
    var m = getElementMeta(elId);
    return el('span', { class: 'el-badge el-' + (elId || 'none') }, m.icon + m.name);
  }

  function makeRoleBadge(roleId) {
    var m = getRoleMeta(roleId);
    return el('span', { class: 'role-badge role-' + (roleId || 'dealer') }, m.icon + m.name);
  }

  function makeCostBadges(cost, showOwned) {
    var norm = HS.State.normalizeCost(cost);
    var keys = Object.keys(norm);
    if (keys.length === 0) return [el('span', { class: 'tag tag-good' }, '解放済')];
    return keys.map(function (k) {
      var need = norm[k];
      var have = HS.State.getMaterial(k);
      var meta = getMatMeta(k);
      var ok = have >= need;
      var txt = meta.icon + (showOwned ? (fmt(have) + '/' + fmt(need)) : fmt(need));
      return el('span', { class: 'tag tnum ' + (ok ? 'tag-good' : 'tag-danger') }, txt);
    });
  }

  function buildStatCell(label, valText, diffVal, isPct, isCritDmg) {
    var diffText = diffVal !== undefined ? fmtDiffVal(diffVal, isPct, isCritDmg) : null;
    var diffSpan = diffText ? el('span', { class: 'stat-diff ' + (Number(diffVal) > 0 ? 'stat-pos' : 'stat-neg') }, diffText) : null;
    return el('div', { class: 'stat-cell' }, [
      el('span', { class: 'stat-label' }, label),
      el('div', { class: 'stat-val' }, [valText, diffSpan])
    ]);
  }

  function makeTwoRowSkill(sk, extraBadge) {
    var scope = sk.type === 'passive' ? '固有' : (HS.CONST.TARGET_NAMES[sk.target] || '単体');
    return el('div', { class: 'skill-preview-row' }, [
      el('div', { class: 'skill-preview-head' }, [
        el('span', { class: 'skill-preview-name' }, sk.name),
        el('div', { class: 'row', style: { gap: '3px' } }, [
          el('span', { class: 'tag tag-accent' }, '[' + scope + ']'),
          extraBadge || null
        ])
      ]),
      el('div', { class: 'skill-preview-desc' }, sk.desc)
    ]);
  }

  function ensureSelectedChar(s) {
    if (ui.selectedCharId && HS.State.isCharOwned(ui.selectedCharId)) return ui.selectedCharId;
    ui.selectedCharId = s.party.find(Boolean) || s.ownedChars[0] || null;
    return ui.selectedCharId;
  }

  function defaultResFocus(charId) {
    var cp = charId ? HS.State.getCharProgress(charId) : null;
    var cur = cp ? (cp.resonance || 0) : 0;
    return cur >= 5 ? 5 : (cur + 1);
  }

  function getTavernChars() {
    var all = (HS.Data && HS.Data.CHARACTERS) || [];
    var tavern = all.filter(function (c) { return c.unlock && c.unlock.type === 'tavern'; });
    return HS.Utils.sortCharacters(tavern);
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

  function openCharPickerSheet(title, onPick) {
    if (!HS.UI.App || typeof HS.UI.App.openSheet !== 'function') return;
    var owned = HS.State.getOwnedChars();
    var s = HS.State.get();

    HS.UI.App.openSheet({
      title: title || 'キャラクター選択',
      subtitle: '所持 ' + owned.length + '名',
      renderBody: function (body) {
        var nodes = owned.map(function (ch) {
          var cp = HS.State.getCharProgress(ch.id);
          var awSum = (cp.skillAwaken[0] || 0) + (cp.skillAwaken[1] || 0) + (cp.skillAwaken[2] || 0);
          var isCur = (ch.id === ui.selectedCharId);
          return el('button', {
            type: 'button',
            class: 'list-card' + (isCur ? ' is-selected' : ''),
            onClick: function () {
              HS.UI.App.closeSheet();
              onPick(ch.id);
            }
          }, [
            el('div', { class: 'list-card-main' }, [
              el('div', { class: 'list-card-title' }, [
                makeElBadge(ch.element),
                el('span', {}, ch.name),
                makeRoleBadge(ch.role)
              ]),
              el('div', { class: 'list-card-sub' }, getRaceText(ch.races) + ' ／ 覚醒 ' + awSum + '/9 ／ 共鳴 ' + (cp.resonance || 0) + '/5')
            ]),
            el('div', { class: 'list-card-right' }, [
              s.party.indexOf(ch.id) !== -1 ? el('span', { class: 'tag tag-accent' }, '出撃中') : null
            ])
          ]);
        });
        body.appendChild(el('div', { class: 'scroll-frame' }, [
          el('div', { class: 'scroll-body' }, [
            el('div', { class: 'scroll-inner' }, [
              el('div', { class: 'list-stack' }, nodes)
            ])
          ])
        ]));
      },
      renderActions: function (actions) {
        actions.appendChild(el('button', {
          type: 'button',
          class: 'btn btn-ghost',
          onClick: function () { HS.UI.App.closeSheet(); }
        }, '閉じる'));
      }
    });
  }

  function openExtraAbilitySheet(charId, tier) {
    if (!HS.UI.App || typeof HS.UI.App.openSheet !== 'function') return;
    var ch = getChar(charId);
    if (!ch) return;
    var s = HS.State.get();
    var mainId = s.abilities.equipped[ch.role][tier];
    var extraMap = s.abilities.extraEquipped[charId] || {};
    var curExtra = extraMap[tier] || null;
    var choices = getRoleAbilities(ch.role, tier);

    HS.UI.App.openSheet({
      title: ch.name + ' 第' + tier + '段階 追加アビ枠',
      subtitle: '異界極鳴・同時装備',
      renderBody: function (body) {
        var rows = choices.map(function (ab) {
          var isMain = (ab.id === mainId);
          var isSel = (ab.id === curExtra);
          return el('button', {
            type: 'button',
            class: 'list-card' + (isSel ? ' is-selected' : '') + (isMain ? ' is-busy' : ''),
            disabled: isMain,
            onClick: function () {
              var res = HS.State.equipExtraAbility(charId, tier, isSel ? null : ab.id);
              if (!res.ok) toast(res.error, 'warn');
              else {
                toast(isSel ? '追加枠を解除しました' : (ab.name + 'を追加装備しました！'), 'good');
                HS.UI.App.closeSheet();
              }
            }
          }, [
            el('div', { class: 'list-card-main' }, [
              el('div', { class: 'list-card-title' }, [
                el('span', {}, ab.icon + ' ' + ab.name),
                el('span', { class: 'tag' }, ab.styleTag)
              ]),
              el('div', { class: 'list-card-sub' }, ab.desc)
            ]),
            el('div', { class: 'list-card-right' }, [
              isMain ? el('span', { class: 'tag' }, '基本枠') :
              (isSel ? el('span', { class: 'tag tag-good' }, '追加中') : el('span', { class: 'tag tag-accent' }, '選択'))
            ])
          ]);
        });
        body.appendChild(el('div', { class: 'scroll-frame' }, [
          el('div', { class: 'scroll-body' }, [
            el('div', { class: 'scroll-inner' }, [
              el('div', { class: 'list-stack' }, rows)
            ])
          ])
        ]));
      },
      renderActions: function (actions) {
        actions.appendChild(el('button', {
          type: 'button',
          class: 'btn btn-ghost',
          onClick: function () { HS.UI.App.closeSheet(); }
        }, '閉じる'));
      }
    });
  }

  // 5-column Quick Bar: ALL 4 frontline heroes (1-tap!) + 5th button "全仲間"
  function renderCharQuickBar(s, onSelect) {
    var curId = ensureSelectedChar(s);
    var cells = [];
    for (var i = 0; i < 4; i++) {
      (function (cid, idx) {
        var c = getChar(cid);
        cells.push(el('button', {
          type: 'button',
          class: 'slot-btn' + (curId === cid ? ' is-active' : ''),
          disabled: !c,
          onClick: function () { if (c) onSelect(c.id); }
        }, c ? c.name : ('枠' + (idx + 1))));
      })(s.party[i] || null, i);
    }
    var curCh = getChar(curId);
    var inParty = s.party.indexOf(curId) !== -1;
    cells.push(el('button', {
      type: 'button',
      class: 'slot-btn' + (!inParty && curCh ? ' is-active' : ''),
      onClick: function () {
        openCharPickerSheet('育成キャラクター選択', onSelect);
      }
    }, [
      el('span', {}, !inParty && curCh ? curCh.name : '全仲間'),
      el('span', { class: 'slot-sub' }, s.ownedChars.length + '名')
    ]));
    return el('div', { class: 'slot-bar slot-bar-5' }, cells);
  }

  // =========================================================================
  // UPPER 50% (100% READ-ONLY HIGH-DENSITY LIVE PREVIEW — ZERO DEAD SPACE!)
  // =========================================================================

  function renderUpperAbility(s) {
    var role = ui.selectedRole;
    var tier = ui.selectedTier;
    var roleMeta = getRoleMeta(role);
    var unlocked = s.abilities.unlockedTiers[role] || 1;
    var equippedMap = s.abilities.equipped[role] || {};

    var roleWorldMap = { tank: 'mechcity', dealer: 'dragonpeak', supporter: 'fairyvale', healer: 'sanctum' };
    setWorld(roleWorldMap[role] || 'frontier');

    var choices = getRoleAbilities(role, tier);
    var focusAb = getAbility(ui.previewAbilityId);
    if (!focusAb || focusAb.role !== role || focusAb.tier !== tier) {
      focusAb = getAbility(equippedMap[tier]) || choices[0] || null;
    }

    // 1. 5-tier Matrix
    var matrixCells = [1, 2, 3, 4, 5].map(function (t) {
      var eqAb = getAbility(equippedMap[t]);
      var isUnlocked = t <= unlocked;
      var isCur = (t === tier);
      return el('div', { class: 'ability-matrix-cell' + (isCur ? ' is-current' : '') }, [
        el('div', { style: { fontWeight: '800', color: isUnlocked ? 'var(--accent)' : 'var(--text-dim)' } }, t + '段'),
        el('div', { style: { fontSize: '12px', lineHeight: '1.1' } }, isUnlocked && eqAb ? eqAb.icon : '🔒'),
        el('div', { style: { fontWeight: '700', color: isUnlocked ? 'var(--text-bright)' : 'var(--text-dim)', lineHeight: '1.15' } },
          isUnlocked && eqAb ? eqAb.name : '未解放'
        )
      ]);
    });

    // 2. Active Unlocked Build Summary across Tiers 1..unlocked
    var activeSummaryLines = [];
    for (var t = 1; t <= unlocked; t++) {
      var activeAb = getAbility(equippedMap[t]);
      if (activeAb) {
        activeSummaryLines.push(el('div', { class: 'card-note' },
          '第' + t + '段【' + activeAb.styleTag + '】' + activeAb.name + '：' + activeAb.desc
        ));
      }
    }

    // 3. Owned Heroes of this Role with live power & ±Δ preview
    var roleHeroes = HS.State.getOwnedChars().filter(function (c) { return c.role === role; });
    var heroBadges = roleHeroes.slice(0, 6).map(function (c) {
      var curSt = HS.Calc.calcUnitStats(c.id);
      var diffEl = null;
      if (focusAb && tier <= unlocked && focusAb.id !== equippedMap[tier]) {
        var ovAb = {};
        ovAb[tier] = focusAb.id;
        var nxSt = HS.Calc.calcUnitStats(c.id, { overrideAbilities: ovAb });
        var pD = nxSt.power - curSt.power;
        var pTxt = fmtDiffVal(pD, false, false);
        if (pTxt) diffEl = el('span', { class: 'stat-diff ' + (pD > 0 ? 'stat-pos' : 'stat-neg') }, pTxt);
      }
      return el('span', { class: 'tag tnum' }, [
        getElementMeta(c.element).icon + c.name + ' ' + fmt(curSt.power),
        diffEl
      ]);
    });

    var isTierUnlocked = tier <= unlocked;
    var costNode = !isTierUnlocked ? el('div', { class: 'row-wrap', style: { marginTop: '2px' } }, [
      el('span', { class: 'card-note' }, '解放コスト：')
    ].concat(makeCostBadges(HS.State.getAbilityTierUnlockCost(role, tier), true))) : null;

    dom.upper.appendChild(el('div', { class: 'inspector-card' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, roleMeta.icon),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, 'ロール共有アビリティ（5段階 × 5択自由切替）'),
            el('div', { class: 'inspector-name' }, roleMeta.name + ' ビルド構成')
          ])
        ]),
        el('span', { class: 'tag tag-accent tnum' }, '解放 ' + unlocked + '/5')
      ]),
      el('div', { class: 'ability-matrix' }, matrixCells),
      focusAb ? el('div', { class: 'lore-box', style: { display: 'flex', flexDirection: 'column', gap: '3px' } }, [
        el('div', { class: 'row-between' }, [
          el('span', { style: { fontWeight: '900', color: 'var(--text-bright)', fontSize: '12px' } }, focusAb.icon + ' ' + focusAb.name),
          el('span', { class: 'tag tag-accent' }, focusAb.styleTag + '・第' + tier + '段階')
        ]),
        el('div', {}, focusAb.desc),
        costNode
      ]) : null,
      el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, '発動中の合計ビルド効果'),
          el('span', {}, '適用中 ' + roleHeroes.length + '名')
        ]),
        el('div', { class: 'col', style: { gap: '2px' } }, activeSummaryLines),
        el('div', { class: 'row-wrap', style: { marginTop: '2px' } },
          heroBadges.length ? heroBadges : [el('span', { class: 'card-note' }, 'このロールの仲間はまだ未加入です')]
        )
      ])
    ]));
  }

  function renderUpperAwaken(s) {
    var charId = ensureSelectedChar(s);
    var ch = getChar(charId);
    if (!ch) return;
    setWorld(ch.world);

    var cp = HS.State.getCharProgress(charId);
    var skIdx = Math.min(ui.selectedSkillIdx, (ch.skills || []).length - 1);
    var sk = ch.skills[skIdx];
    var curLv = (cp.skillAwaken && cp.skillAwaken[skIdx]) || 0;
    var wm = getWorldMeta(ch.world);
    var scopeLabel = sk.type === 'passive' ? '固有パッシブ' : (HS.CONST.TARGET_NAMES[sk.target] || '単体');

    // 2-row awakening steps (ZERO 1-char orphan wrap!)
    var awRows = (sk.awakenings || []).map(function (aw, idx) {
      var stage = idx + 1;
      var done = curLv >= stage;
      var isNext = (curLv + 1 === stage);
      var statusCls = done ? 'tag tag-good' : (isNext ? 'tag tag-gold' : 'tag');
      var statusTxt = done ? '覚醒済' : (isNext ? '次段階' : '未解放');
      return el('div', { class: 'skill-preview-row' }, [
        el('div', { class: 'skill-preview-head' }, [
          el('span', { class: 'skill-preview-name' }, '覚醒 ' + ROMAN[stage]),
          el('span', { class: statusCls }, statusTxt)
        ]),
        el('div', { class: 'skill-preview-desc', style: { color: done ? 'var(--text-bright)' : 'var(--text-main)' } }, aw.desc)
      ]);
    });

    var nextCostRow;
    if (curLv < 3) {
      nextCostRow = el('div', { class: 'row-wrap' }, [
        el('span', { class: 'card-note' }, '覚醒' + ROMAN[curLv + 1] + ' 必要：')
      ].concat(makeCostBadges(HS.State.getSkillAwakenCost(charId, skIdx, curLv + 1), true)));
    } else {
      nextCostRow = el('div', { class: 'row' }, [
        el('span', { class: 'tag tag-gold' }, '★ このスキルは最大覚醒(III)に到達しています')
      ]);
    }

    var allSkillsBar = (ch.skills || []).map(function (sObj, idx) {
      var lv = (cp.skillAwaken && cp.skillAwaken[idx]) || 0;
      return el('span', { class: 'tag' + (idx === skIdx ? ' tag-accent' : '') },
        (sObj.type === 'passive' ? '固有' : ('技' + (idx + 1))) + ':' + sObj.name + ' 覚' + ROMAN[lv]
      );
    });

    dom.upper.appendChild(el('div', { class: 'inspector-card' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, ch.title),
            el('div', { class: 'inspector-name' }, ch.name)
          ])
        ]),
        el('div', { class: 'row', style: { gap: '3px' } }, [
          makeElBadge(ch.element),
          makeRoleBadge(ch.role)
        ])
      ]),
      el('div', { class: 'lore-box' }, [
        el('div', { class: 'row-between', style: { marginBottom: '2px' } }, [
          el('span', { style: { fontWeight: '900', color: 'var(--text-bright)', fontSize: '12.5px' } }, sk.name),
          el('div', { class: 'row', style: { gap: '4px' } }, [
            el('span', { class: 'tag tag-accent' }, '[' + scopeLabel + ']'),
            sk.type === 'active' ? el('span', { class: 'tag tnum' }, sk.cd > 0 ? ('CT ' + sk.cd) : '基本技') : null,
            el('span', { class: 'tag tag-gold' }, '覚' + ROMAN[curLv])
          ])
        ]),
        el('div', {}, sk.desc)
      ]),
      el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'skill-preview-list' }, awRows),
        nextCostRow,
        el('div', { class: 'row-wrap', style: { marginTop: '2px' } }, allSkillsBar)
      ])
    ]));
  }

  function renderUpperResonance(s) {
    var charId = ensureSelectedChar(s);
    var ch = getChar(charId);
    if (!ch) return;
    setWorld(ch.world);

    var cp = HS.State.getCharProgress(charId);
    var curRes = cp.resonance || 0;
    var inspectStage = ui.previewResNode || defaultResFocus(charId);

    var curStats = HS.Calc.calcUnitStats(charId);
    var simStage = curRes < 5 ? Math.max(curRes + 1, inspectStage) : 5;
    var simStats = curRes < 5 ? HS.Calc.calcUnitStats(charId, { overrideResonance: simStage }) : curStats;
    var diff = curRes < 5 ? HS.Calc.calcStatDiff(curStats, simStats) : {};
    var wm = getWorldMeta(ch.world);

    var extraMap = (s.abilities.extraEquipped && s.abilities.extraEquipped[charId]) || {};
    var extraAb1 = getAbility(extraMap[1]);
    var extraAb3 = getAbility(extraMap[3]);

    // All 5 Resonance Tiers displayed cleanly (eliminates empty void!)
    var tierRows = (Array.isArray(ch.resonance) ? ch.resonance : []).map(function (nd, idx) {
      var st = idx + 1;
      var done = curRes >= st;
      var isFocus = (st === inspectStage);
      var mark = done ? '✓' : (st === curRes + 1 ? '▶' : '・');
      return el('div', {
        class: 'row-between',
        style: {
          padding: '2px 5px',
          borderRadius: '5px',
          background: isFocus ? 'var(--accent-soft)' : 'rgba(255,255,255,0.03)',
          border: isFocus ? '1px solid var(--accent)' : '1px solid transparent'
        }
      }, [
        el('span', {
          class: 'card-note',
          style: { color: done ? '#a6f7cf' : (st === 5 ? '#ffe599' : 'var(--text-main)'), fontWeight: isFocus ? '800' : '600' }
        }, mark + (st === 5 ? '第5段★極鳴' : ('第' + st + '段')) + '：' + nd.desc)
      ]);
    });

    var footerNode;
    if (curRes >= 5) {
      footerNode = el('div', { class: 'row-wrap' }, [
        el('span', { class: 'tag tag-gold' }, '★異界極鳴 解放済'),
        el('span', { class: 'tag tag-good' }, '1段追加: ' + (extraAb1 ? extraAb1.name : '未設定')),
        el('span', { class: 'tag tag-good' }, '3段追加: ' + (extraAb3 ? extraAb3.name : '未設定'))
      ]);
    } else {
      footerNode = el('div', { class: 'row-wrap' }, [
        el('span', { class: 'card-note' }, '第' + inspectStage + '段 必要：')
      ].concat(makeCostBadges(HS.State.getResonanceCost(charId, inspectStage), true)));
    }

    dom.upper.appendChild(el('div', { class: 'inspector-card' }, [
      el('div', { class: 'inspector-head' }, [
        el('div', { class: 'inspector-ident' }, [
          el('span', { class: 'world-emblem' }, wm.emblem),
          el('div', { class: 'col', style: { gap: '0px' } }, [
            el('div', { class: 'inspector-title' }, ch.title + ' — 異界共鳴'),
            el('div', { class: 'inspector-name' }, ch.name)
          ])
        ]),
        el('span', { class: 'tag tag-gold tnum' }, '共鳴 ' + curRes + ' / 5')
      ]),
      el('div', { class: 'stat-grid' }, [
        buildStatCell('HP', fmt(simStats.hp), diff.hp, false, false),
        buildStatCell('攻撃', fmt(simStats.atk), diff.atk, false, false),
        buildStatCell('防御', fmt(simStats.def), diff.def, false, false),
        buildStatCell('速度', fmt(simStats.spd), diff.spd, false, false)
      ]),
      el('div', { class: 'upper-section is-grow' }, [
        el('div', { class: 'upper-section-head' }, [
          el('span', {}, '共鳴ボーナス一覧（全5段階）'),
          el('span', { class: 'tnum' }, '戦力 ' + fmt(simStats.power))
        ]),
        el('div', { class: 'col', style: { gap: '2px' } }, tierRows),
        footerNode
      ])
    ]));
  }

  function renderUpperTavern(s) {
    var list = getTavernChars();
    var ch = getChar(ui.selectedTavernId);
    if (!ch || !(ch.unlock && ch.unlock.type === 'tavern')) {
      ch = list.find(function (c) { return !HS.State.isCharOwned(c.id); }) || list[0] || null;
      if (ch) ui.selectedTavernId = ch.id;
    }
    if (!ch) return;
    setWorld(ch.world);

    var owned = HS.State.isCharOwned(ch.id);
    var wm = getWorldMeta(ch.world);
    var bs = ch.baseStats;
    var skillRows = (ch.skills || []).map(function (sk) { return makeTwoRowSkill(sk); });

    dom.upper.appendChild(el('div', { class: 'inspector-card' }, [
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
          makeRoleBadge(ch.role),
          owned ? el('span', { class: 'tag tag-good' }, '加入済') : el('span', { class: 'tag tag-gold' }, '確定加入')
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

  // =========================================================================
  // LOWER 50% (FULL ROLE NAMES, 5-COL QUICK BAR, ZERO NESTED BUTTONS!)
  // =========================================================================

  function renderLowerAbility(s) {
    // 1. Fixed Role Selector — FULL ROLE NAMES (ZERO .slice(0,4) truncation!)
    dom.lower.appendChild(el('div', { class: 'role-bar' }, HS.CONST.ROLES.map(function (r) {
      var m = getRoleMeta(r);
      return el('button', {
        type: 'button',
        class: 'role-btn' + (ui.selectedRole === r ? ' is-active' : ''),
        onClick: function () {
          ui.selectedRole = r;
          ui.previewAbilityId = null;
          render();
        }
      }, m.icon + m.name);
    })));

    // 2. Fixed Tier Selector (1..5)
    var unlocked = s.abilities.unlockedTiers[ui.selectedRole] || 1;
    dom.lower.appendChild(el('div', { class: 'tier-bar' }, [1, 2, 3, 4, 5].map(function (t) {
      var isLocked = t > unlocked;
      return el('button', {
        type: 'button',
        class: 'tier-btn' + (ui.selectedTier === t ? ' is-active' : '') + (isLocked ? ' is-locked' : ''),
        onClick: function () {
          ui.selectedTier = t;
          ui.previewAbilityId = null;
          render();
        }
      }, (isLocked ? '🔒' : '') + t + '段階');
    })));

    // 3. Fixed 5 Choice Cards + 1 Action/Status Cell (2x3 bento grid, ZERO scroll & ZERO overlap on SE!)
    var choices = getRoleAbilities(ui.selectedRole, ui.selectedTier);
    var equippedId = s.abilities.equipped[ui.selectedRole][ui.selectedTier];
    var isTierUnlocked = ui.selectedTier <= unlocked;

    var gridCells = choices.map(function (ab) {
      var isEq = isTierUnlocked && (ab.id === equippedId);
      var isPrev = (ui.previewAbilityId === ab.id);
      return el('button', {
        type: 'button',
        class: 'ability-choice-btn' + (isEq ? ' is-equipped' : (isPrev ? ' is-extra' : '')),
        onClick: function () {
          ui.previewAbilityId = ab.id;
          if (isTierUnlocked) {
            if (ab.id !== equippedId) {
              var res = HS.State.equipAbility(ui.selectedRole, ui.selectedTier, ab.id);
              if (!res.ok) toast(res.error, 'warn');
              else toast(ab.name + 'に切り替えました', 'good');
            } else {
              render();
            }
          } else {
            render();
          }
        }
      }, [
        el('div', { class: 'row-between' }, [
          el('span', { class: 'ability-choice-tag' }, ab.icon + ' ' + ab.styleTag),
          isEq ? el('span', { class: 'tag tag-accent', style: { padding: '0 4px' } }, '装備中') : null
        ]),
        el('div', { class: 'ability-choice-name' }, ab.name)
      ]);
    });

    if (!isTierUnlocked && ui.selectedTier === unlocked + 1) {
      var cost = HS.State.getAbilityTierUnlockCost(ui.selectedRole, ui.selectedTier);
      var afford = HS.State.canAfford(cost);
      gridCells.push(el('button', {
        type: 'button',
        class: 'ability-choice-btn ' + (afford ? 'btn-primary' : ''),
        style: afford ? { borderColor: 'var(--accent)', background: 'linear-gradient(180deg, var(--accent), var(--accent-deep))', color: 'var(--accent-ink)' } : { borderStyle: 'dashed' },
        disabled: !afford,
        onClick: function () {
          var res = HS.State.unlockAbilityTier(ui.selectedRole, ui.selectedTier);
          if (!res.ok) toast(res.error, 'warn');
          else toast(getRoleMeta(ui.selectedRole).name + ' 第' + ui.selectedTier + '段階を解放しました！', 'good');
        }
      }, [
        el('div', { style: { fontWeight: '900', fontSize: '11.5px', textAlign: 'center' } }, '🔓 第' + ui.selectedTier + '段階を解放'),
        el('div', { style: { fontSize: '10px', textAlign: 'center', opacity: '0.92' } }, afford ? 'タップで5択すべて解禁' : '素材またはゴールド不足')
      ]));
    } else if (!isTierUnlocked) {
      gridCells.push(el('div', { class: 'ability-choice-btn', style: { borderStyle: 'dashed', opacity: '0.62' } }, [
        el('div', { class: 'ability-choice-name', style: { fontSize: '10.5px', textAlign: 'center' } }, '🔒 第' + (ui.selectedTier - 1) + '段階解放後'),
        el('div', { class: 'card-note', style: { textAlign: 'center' } }, '順に解放できます')
      ]));
    } else {
      var roleCount = s.ownedChars.filter(function (cid) {
        var c = getChar(cid);
        return c && c.role === ui.selectedRole;
      }).length;
      gridCells.push(el('div', { class: 'ability-choice-btn', style: { background: 'rgba(255,255,255,0.03)' } }, [
        el('div', { class: 'ability-choice-tag', style: { textAlign: 'center' } }, '✦ 解放済・切替無料'),
        el('div', { class: 'card-note', style: { textAlign: 'center' } }, getRoleMeta(ui.selectedRole).name + ' ' + roleCount + '名に適用')
      ]));
    }

    dom.lower.appendChild(el('div', { class: 'ability-choices' }, gridCells));
  }

  function renderLowerAwaken(s) {
    var charId = ensureSelectedChar(s);
    var ch = getChar(charId);
    if (!ch) return;
    var cp = HS.State.getCharProgress(charId);

    // 1. 5-Column Quick Char Picker Row (all 4 frontline heroes + 全仲間)
    dom.lower.appendChild(renderCharQuickBar(s, function (nextId) {
      ui.selectedCharId = nextId;
      ui.selectedSkillIdx = 0;
      ui.previewResNode = defaultResFocus(nextId);
      render();
    }));

    // 2. Fixed 3 Skill Awakening Rows (Sibling buttons — ZERO nested buttons!)
    var rows = (ch.skills || []).slice(0, 3).map(function (sk, idx) {
      var curLv = (cp.skillAwaken && cp.skillAwaken[idx]) || 0;
      var isMax = curLv >= 3;
      var nextCost = !isMax ? HS.State.getSkillAwakenCost(charId, idx, curLv + 1) : null;
      var afford = !isMax && HS.State.canAfford(nextCost);
      var scope = sk.type === 'passive' ? '固有' : (HS.CONST.TARGET_NAMES[sk.target] || '単体');
      var isSel = (ui.selectedSkillIdx === idx);

      var cardBtn = el('button', {
        type: 'button',
        class: 'awaken-card' + (isSel ? ' is-selected' : ''),
        style: Object.assign({ flex: '1 1 auto', minWidth: '0', textAlign: 'left' },
          isSel ? { borderColor: 'var(--accent)', background: 'linear-gradient(90deg, var(--accent-soft), var(--card-bg))' } : {}
        ),
        onClick: function () {
          ui.selectedSkillIdx = idx;
          render();
        }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, [
            el('span', { class: 'tag' }, sk.type === 'passive' ? '固有' : ('技' + (idx + 1))),
            el('span', {}, sk.name),
            el('span', { class: 'tag tag-accent' }, '[' + scope + ']'),
            el('span', { class: 'tag tag-gold' }, '覚' + ROMAN[curLv])
          ]),
          el('div', { class: 'list-card-sub' }, isMax ? '最大覚醒(III) 達成済' : ('次：' + (sk.awakenings && sk.awakenings[curLv] ? sk.awakenings[curLv].desc : '')))
        ]),
        isMax ? el('span', { class: 'tag tag-gold' }, 'MAX') : null
      ]);

      if (!isMax) {
        return el('div', { class: 'list-item-wrap', style: { minHeight: '0' } }, [
          cardBtn,
          el('div', { class: 'list-item-actions' }, [
            el('button', {
              type: 'button',
              class: 'btn ' + (afford ? 'btn-primary' : 'btn-ghost'),
              disabled: !afford,
              onClick: function () {
                ui.selectedSkillIdx = idx;
                var res = HS.State.awakenSkill(charId, idx);
                if (!res.ok) toast(res.error, 'warn');
                else toast(sk.name + 'が覚醒' + ROMAN[res.level] + 'に到達しました！', 'good');
              }
            }, '覚醒' + ROMAN[curLv + 1])
          ])
        ]);
      }
      return cardBtn;
    });

    dom.lower.appendChild(el('div', { class: 'awaken-grid' }, rows));
  }

  function renderLowerResonance(s) {
    var charId = ensureSelectedChar(s);
    var ch = getChar(charId);
    if (!ch) return;
    var cp = HS.State.getCharProgress(charId);
    var curRes = cp.resonance || 0;
    if (ui.previewResNode === null) {
      ui.previewResNode = defaultResFocus(charId);
    }

    dom.lower.appendChild(renderCharQuickBar(s, function (nextId) {
      ui.selectedCharId = nextId;
      ui.previewResNode = defaultResFocus(nextId);
      render();
    }));

    var nodes = [1, 2, 3, 4, 5].map(function (st) {
      var done = curRes >= st;
      var isSel = (ui.previewResNode === st);
      return el('button', {
        type: 'button',
        class: 'resonance-node' + (done ? ' is-done' : '') + (st === 5 ? ' is-stage5' : ''),
        style: isSel ? { outline: '2px solid var(--accent)', outlineOffset: '-1px' } : null,
        onClick: function () {
          ui.previewResNode = st;
          render();
        }
      }, [
        el('span', {}, st === 5 ? '★極鳴' : ('共鳴' + st)),
        el('span', { class: 'slot-sub' }, done ? '済' : (st === curRes + 1 ? '次' : '未'))
      ]);
    });
    dom.lower.appendChild(el('div', { class: 'resonance-nodes' }, nodes));

    if (curRes < 5) {
      var nextSt = curRes + 1;
      var cost = HS.State.getResonanceCost(charId, nextSt);
      var afford = HS.State.canAfford(cost);
      var nextData = Array.isArray(ch.resonance) ? ch.resonance[nextSt - 1] : null;
      dom.lower.appendChild(el('div', { class: 'col grow', style: { justifyContent: 'space-between', gap: '4px' } }, [
        el('div', { class: 'setting-row', style: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '3px' } }, [
          el('div', { class: 'setting-title' }, '次段階（第' + nextSt + '段階）：' + (nextData ? nextData.desc : '')),
          el('div', { class: 'row-wrap' }, makeCostBadges(cost, true))
        ]),
        el('button', {
          type: 'button',
          class: 'btn btn-block ' + (afford ? 'btn-primary' : 'btn-ghost'),
          disabled: !afford,
          onClick: function () {
            var res = HS.State.advanceResonance(charId);
            if (!res.ok) toast(res.error, 'warn');
            else {
              ui.previewResNode = res.stage >= 5 ? 5 : (res.stage + 1);
              toast(ch.name + 'の異界共鳴が第' + res.stage + '段階に到達！', 'good');
            }
          }
        }, afford ? ('✦ 異界共鳴 第' + nextSt + '段階を解放') : '必要素材またはゴールドが不足しています')
      ]));
    } else {
      var extraMap = (s.abilities.extraEquipped && s.abilities.extraEquipped[charId]) || {};
      var ab1 = getAbility(extraMap[1]);
      var ab3 = getAbility(extraMap[3]);
      var roleUnlocked = s.abilities.unlockedTiers[ch.role] || 1;
      dom.lower.appendChild(el('div', { class: 'col grow', style: { justifyContent: 'space-between', gap: '4px' } }, [
        el('div', { class: 'setting-row' }, [
          el('div', { class: 'setting-label' }, [
            el('span', { class: 'setting-title' }, '第1段階 追加同時装備アビ'),
            el('span', { class: 'setting-desc' }, ab1 ? (ab1.icon + ' ' + ab1.name + '（' + ab1.styleTag + '）') : '未設定')
          ]),
          el('button', {
            type: 'button',
            class: 'btn btn-accent',
            onClick: function () { openExtraAbilitySheet(charId, 1); }
          }, '選択')
        ]),
        el('div', { class: 'setting-row' }, [
          el('div', { class: 'setting-label' }, [
            el('span', { class: 'setting-title' }, '第3段階 追加同時装備アビ'),
            el('span', { class: 'setting-desc' }, roleUnlocked < 3 ? 'ロールアビ第3段階解放後に設定可能' : (ab3 ? (ab3.icon + ' ' + ab3.name + '（' + ab3.styleTag + '）') : '未設定'))
          ]),
          el('button', {
            type: 'button',
            class: 'btn btn-accent',
            disabled: roleUnlocked < 3,
            onClick: function () { openExtraAbilitySheet(charId, 3); }
          }, roleUnlocked < 3 ? '未解放' : '選択')
        ])
      ]));
    }
  }

  function renderLowerTavern(s) {
    var list = getTavernChars();
    var unownedCount = list.filter(function (c) { return !HS.State.isCharOwned(c.id); }).length;

    dom.lower.appendChild(el('div', { class: 'codex-progress-bar' }, [
      el('span', {}, '異界の酒場 — 素材で確定加入'),
      el('span', { class: 'tnum' }, '未加入 ' + unownedCount + ' / ' + list.length)
    ]));

    // Sibling buttons (ZERO nested buttons inside clickable divs!)
    var rows = list.map(function (ch) {
      var owned = HS.State.isCharOwned(ch.id);
      var cost = HS.State.getTavernCost(ch);
      var afford = !owned && HS.State.canAfford(cost);
      var isSel = (ui.selectedTavernId === ch.id);

      var mainBtn = el('button', {
        type: 'button',
        class: 'list-card' + (isSel ? ' is-selected' : '') + (owned ? ' is-equipped' : ''),
        onClick: function () {
          ui.selectedTavernId = ch.id;
          render();
        }
      }, [
        el('div', { class: 'list-card-main' }, [
          el('div', { class: 'list-card-title' }, [
            makeElBadge(ch.element),
            el('span', {}, ch.name),
            makeRoleBadge(ch.role)
          ]),
          el('div', { class: 'row-wrap', style: { marginTop: '2px' } },
            owned ? [el('span', { class: 'card-note' }, getRaceText(ch.races) + ' ／ ' + ch.title)] : makeCostBadges(cost, false)
          )
        ]),
        owned ? el('span', { class: 'tag tag-good' }, '加入済') : null
      ]);

      if (!owned) {
        return el('div', { class: 'list-item-wrap' }, [
          mainBtn,
          el('div', { class: 'list-item-actions' }, [
            el('button', {
              type: 'button',
              class: 'btn ' + (afford ? 'btn-primary' : 'btn-ghost'),
              disabled: !afford,
              onClick: function () {
                ui.selectedTavernId = ch.id;
                var res = HS.State.recruitTavernChar(ch.id);
                if (!res.ok) toast(res.error, 'warn');
                else toast(ch.name + 'が仲間に加わりました！', 'good');
              }
            }, afford ? '加入' : '不足')
          ])
        ]);
      }
      return mainBtn;
    });

    dom.lower.appendChild(el('div', { class: 'scroll-frame' }, [
      el('div', { class: 'scroll-body' }, [
        el('div', { class: 'scroll-inner' }, [
          el('div', { class: 'list-stack' }, rows)
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
            if (tab.id === 'resonance') {
              ui.previewResNode = defaultResFocus(ensureSelectedChar(HS.State.get()));
            }
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

    if (ui.mode === 'ability') {
      renderUpperAbility(s);
      renderLowerAbility(s);
    } else if (ui.mode === 'awaken') {
      renderUpperAwaken(s);
      renderLowerAwaken(s);
    } else if (ui.mode === 'resonance') {
      renderUpperResonance(s);
      renderLowerResonance(s);
    } else if (ui.mode === 'tavern') {
      renderUpperTavern(s);
      renderLowerTavern(s);
    }

    renderContextBar();
    restoreScrollTop(scrollPos);
  }

  var GrowthView = {
    mount: function (upperEl, lowerEl, ctxEl) {
      dom.upper = upperEl;
      dom.lower = lowerEl;
      dom.ctx = ctxEl;
      ui.previewResNode = null;

      if (HS.State && typeof HS.State.subscribe === 'function') {
        unsubs.push(HS.State.subscribe('ability:change', render));
        unsubs.push(HS.State.subscribe('growth:change', render));
        unsubs.push(HS.State.subscribe('char:unlock', render));
        unsubs.push(HS.State.subscribe('materials:change', render));
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

  HS.UI.GrowthView = GrowthView;
})(typeof window !== 'undefined' ? window : globalThis);
