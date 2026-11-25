(function () {
  'use strict';

  const HS = window.HS;
  const { el, clear, makeElBadge, makeRoleBadge, showToast } = HS.DOM;

  function render(container) {
    const state = HS.Engine.State.getState();
    const sel = state.uiSelections;
    const mode = sel.deployMode || 'normal';

    const upper = el('div', { className: 'upper-display' });
    const lower = el('div', { className: 'lower-thumb' });

    // Current Frontline Preview Strip in Upper Display (non-interactive)
    const snap = HS.Engine.Stats.buildPartyCombatSnapshots(state);
    const partyRow = el(
      'div',
      { className: 'grid-4' },
      [0, 1, 2, 3].map((i) => {
        const cid = state.frontParty[i];
        if (!cid) {
          return el('div', { className: 'panel-card', style: { padding: '5px', textAlign: 'center' } }, el('span', { className: 'section-sub', text: '空枠' }));
        }
        const c = HS.Data.CHAR_MAP[cid];
        const em = HS.CONST.EL_MAP[c.element];
        const rm = HS.CONST.ROLE_MAP[c.role];
        return el(
          'div',
          { className: `panel-card ${em.cls}`, style: { padding: '4px 5px', borderColor: `color-mix(in srgb, ${em.color} 45%, transparent)` } },
          el('div', { style: { fontSize: '10px', fontWeight: '800', whiteSpace: 'nowrap' }, text: `${em.icon}${rm.icon}` }),
          el('div', { style: { fontSize: '10.5px', fontWeight: '800', marginTop: '2px', lineHeight: '1.2' }, text: c.name })
        );
      })
    );

    const synBar = el(
      'div',
      { className: 'synergy-wrap' },
      snap.synergies.length > 0
        ? snap.synergies.slice(0, 4).map((s) => el('span', { className: 'syn-pill', text: s.label }))
        : [el('span', { className: 'section-sub', text: 'シナジー未発動（同属性・同種族・4ロール揃えで発動）' })]
    );

    // Mode-specific upper preview & lower thumb controls
    if (mode === 'normal') {
      const area = HS.Data.NORMAL_AREAS.find((a) => a.id === sel.areaId) || HS.Data.NORMAL_AREAS[0];
      const stageNum = Math.max(1, Math.min(10, sel.stageNum || 1));
      const unlocked = HS.Engine.State.isNormalStageUnlocked(area.id, stageNum);
      const setDef = HS.Data.EQUIP_SET_MAP[area.setId];
      const bossDef = HS.Data.ENEMY_MAP[area.bossId];
      const clearChar = area.clearUnlockChar ? HS.Data.CHAR_MAP[area.clearUnlockChar] : null;
      const clearCharNote = clearChar && !HS.Engine.State.isUnlocked(clearChar.id)
        ? ` ／ 10話初クリアで【${clearChar.name}】加入`
        : '';

      upper.appendChild(el(
        'div',
        { className: 'panel-card accent' },
        el('div', { className: 'item-top' }, el('span', { className: 'section-title', text: `${area.id}. ${area.name} ${area.id}-${stageNum}` }), makeElBadge(area.element)),
        el('div', { className: 'section-sub', style: { marginTop: '3px' }, text: `${area.theme} ／ 5WAVE（非ボスWAVEで乱入敵出現）` }),
        el('div', { className: 'section-sub', style: { marginTop: '2px' }, text: `ボス：${bossDef.name}${clearCharNote}` })
      ));
      upper.appendChild(el(
        'div',
        { className: 'panel-card', style: { padding: '6px 8px' } },
        el('div', { className: 'item-top' }, el('span', { className: 'section-title', text: `獲得セット【${setDef.name}】` }), el('span', { className: 'chip', text: `最低品質 ${Math.min(55, 1 + (area.id - 1) * 8 + stageNum)}%+` })),
        el('div', { className: 'section-sub', style: { marginTop: '2px' }, text: `②${setDef.bonus2.desc} ／ ④${setDef.bonus4.desc}` })
      ));
      upper.appendChild(partyRow);
      upper.appendChild(synBar);

      // Area Selector (6 areas in clean 2x3 grid displaying FULL area names!)
      const areaGrid = el(
        'div',
        { className: 'grid-2' },
        HS.Data.NORMAL_AREAS.map((a) => {
          const areaOpen = HS.Engine.State.isNormalStageUnlocked(a.id, 1);
          return el('button', {
            type: 'button',
            className: `btn sm${a.id === area.id ? ' active-toggle' : ''}`,
            disabled: !areaOpen,
            text: `${a.id}. ${a.name}`,
            on: {
              click: () => {
                // Jump to highest unlocked stage in that area
                let best = 1;
                for (let s = 1; s <= 10; s++) {
                  if (HS.Engine.State.isNormalStageUnlocked(a.id, s)) best = s;
                }
                HS.Engine.State.updateUiSelection({ areaId: a.id, stageNum: best });
                HS.UI.App.render();
              }
            }
          });
        })
      );

      // Stage 1..10 Grid (fixed 5x2 grid, zero scrolling needed!)
      const stageGrid = el(
        'div',
        { className: 'grid-5' },
        Array.from({ length: 10 }, (_, idx) => {
          const s = idx + 1;
          const open = HS.Engine.State.isNormalStageUnlocked(area.id, s);
          const cleared = Boolean(state.progress.normalCleared[`${area.id}-${s}`]);
          return el('button', {
            type: 'button',
            className: `btn sm num${s === stageNum ? ' primary' : cleared ? ' active-toggle' : ''}`,
            disabled: !open,
            text: s === 10 ? `${s}★` : `${s}${cleared ? '✓' : ''}`,
            on: {
              click: () => {
                HS.Engine.State.updateUiSelection({ stageNum: s });
                HS.UI.App.render();
              }
            }
          });
        })
      );

      const autoSellCur = state.settings.autoSellBelow || 0;
      const autoSellBtn = el('button', {
        type: 'button',
        className: 'btn sm full',
        text: autoSellCur === 0 ? '自動売却：OFF' : autoSellCur === 100 ? '自動売却：100%以外売却' : `自動売却：品質${autoSellCur}%未満`,
        on: {
          click: () => {
            const opts = HS.CONST.AUTO_SELL_OPTIONS;
            const next = opts[(opts.indexOf(autoSellCur) + 1) % opts.length];
            HS.Engine.State.updateSetting('autoSellBelow', next);
            HS.UI.App.render();
          }
        }
      });

      const launchRow = el(
        'div',
        { className: 'grid-2' },
        el('button', {
          type: 'button',
          className: 'btn primary full',
          disabled: !unlocked,
          text: '通常出撃',
          on: { click: () => HS.UI.BattleView.startBattle({ mode: 'normal', areaId: area.id, stageNum }, false) }
        }),
        el('button', {
          type: 'button',
          className: 'btn gold full',
          disabled: !unlocked,
          text: '∞ 自動周回開始',
          on: { click: () => HS.UI.BattleView.startBattle({ mode: 'normal', areaId: area.id, stageNum }, true) }
        })
      );

      lower.appendChild(areaGrid);
      lower.appendChild(stageGrid);
      lower.appendChild(autoSellBtn);
      lower.appendChild(el('div', { style: { flex: '1 1 auto' } }));
      lower.appendChild(launchRow);
    } else if (mode === 'tower') {
      const tower = HS.Data.TOWERS.find((t) => t.id === sel.towerId) || HS.Data.TOWERS[0];
      const towerUnlocked = HS.Engine.State.isTowerUnlocked(tower.id);
      const cleared = state.progress.towerCleared[tower.id] || 0;
      const nextFloor = Math.min(100, cleared + 1);
      const rewardChar = HS.Data.CHAR_MAP[tower.rewardCharId];

      upper.appendChild(el(
        'div',
        { className: 'panel-card accent' },
        el('div', { className: 'item-top' }, el('span', { className: 'section-title', text: tower.name }), el('span', { className: 'chip gold num', text: `到達 ${cleared} / 100F` })),
        el('div', { className: 'section-sub', style: { marginTop: '3px' }, text: `次の挑戦階層：${nextFloor}F ／ 各階初回踏破報酬あり` }),
        el('div', { className: 'section-sub', style: { marginTop: '2px' }, text: `100F踏破限定仲間：【${rewardChar.name}】（${HS.CONST.formatRaces(rewardChar.races)}）` })
      ));
      upper.appendChild(el(
        'div',
        { className: 'panel-card', style: { padding: '6px 8px' } },
        el('div', { className: 'section-title', text: `階層報酬目安（${nextFloor}F 初回勝利）` }),
        el('div', {
          className: 'section-sub num',
          style: { marginTop: '2px' },
          text: `🪙世界貨+${Math.round((320 + nextFloor * 48) * (tower.id === 2 ? 2.4 : 1))} ／ 💎結晶+${Math.round((6 + Math.floor(nextFloor * 0.7)) * (tower.id === 2 ? 2 : 1))} ／ 🔮欠片+${Math.round((3 + Math.floor(nextFloor * 0.35)) * (tower.id === 2 ? 2 : 1))}`
        })
      ));
      upper.appendChild(partyRow);
      upper.appendChild(synBar);

      const towerTabs = el(
        'div',
        { className: 'grid-2' },
        HS.Data.TOWERS.map((t) => {
          const open = HS.Engine.State.isTowerUnlocked(t.id);
          const prog = state.progress.towerCleared[t.id] || 0;
          return el('button', {
            type: 'button',
            className: `btn${t.id === tower.id ? ' active-toggle' : ''}`,
            disabled: !open,
            text: open ? `${t.shortName} (${prog}F)` : `${t.shortName} 🔒`,
            on: {
              click: () => {
                HS.Engine.State.updateUiSelection({ towerId: t.id });
                HS.UI.App.render();
              }
            }
          });
        })
      );

      // Selectable floor milestone info
      const milestone = el(
        'div',
        { className: 'panel-card' },
        el('div', { className: 'section-title', text: `次なる試練：${tower.shortName} ${nextFloor}F` }),
        el('div', {
          className: 'section-sub',
          style: { marginTop: '3px' },
          text: nextFloor === 100
            ? `頂上決戦！勝利すると【${rewardChar.name}】が仲間になります。`
            : nextFloor % 10 === 0
              ? '10階ごとの巨神・魔竜守護階層。装備ドロップ確定。'
              : nextFloor % 5 === 0
                ? '5階ごとの中ボス階層。装備ドロップ確定。'
                : '精鋭異界軍との2WAVE決戦。勝利で初回報酬を獲得。'
        })
      );

      const launchBtn = el('button', {
        type: 'button',
        className: 'btn primary full',
        disabled: !towerUnlocked,
        text: `${tower.shortName} ${nextFloor}F へ挑む`,
        on: {
          click: () => HS.UI.BattleView.startBattle({ mode: 'tower', towerId: tower.id, floor: nextFloor }, false)
        }
      });

      lower.appendChild(towerTabs);
      lower.appendChild(milestone);
      lower.appendChild(el('div', { style: { flex: '1 1 auto' } }));
      lower.appendChild(launchBtn);
    } else if (mode === 'raid') {
      const raid = HS.Data.RAIDS.find((r) => r.id === sel.raidId) || HS.Data.RAIDS[0];
      const raidLv = Math.max(1, Math.min(10, sel.raidLv || 1));
      const maxCleared = state.progress.raidCleared[raid.id] || 0;
      const bossDef = HS.Data.ENEMY_MAP[raid.bossId];
      const setDef = HS.Data.EQUIP_SET_MAP[raid.setId];

      upper.appendChild(el(
        'div',
        { className: 'panel-card accent' },
        el('div', { className: 'item-top' }, el('span', { className: 'section-title', text: `${raid.name} Lv.${raidLv}` }), makeElBadge(raid.element)),
        el('div', { className: 'section-sub', style: { marginTop: '3px' }, text: `討伐対象：${bossDef.name} ／ 最高討伐 Lv.${maxCleared}` }),
        el('div', { className: 'section-sub', style: { marginTop: '2px' }, text: `限定セット【${setDef.name}】 ②${setDef.bonus2.desc}` })
      ));
      upper.appendChild(el(
        'div',
        { className: 'panel-card', style: { padding: '6px 8px' } },
        el('div', { className: 'section-sub', style: { color: '#ffc4f0' }, text: `④セット効果：${setDef.bonus4.desc}` }),
        el('div', { className: 'section-sub', style: { marginTop: '2px' }, text: `ボス使用技：${bossDef.skills.map((s) => s.name).join(' ／ ')}` })
      ));
      upper.appendChild(partyRow);
      upper.appendChild(synBar);

      // 6 Element Raid Selector
      const raidGrid = el(
        'div',
        { className: 'grid-3' },
        HS.Data.RAIDS.map((r) => {
          const em = HS.CONST.EL_MAP[r.element];
          return el('button', {
            type: 'button',
            className: `btn sm${r.id === raid.id ? ' active-toggle' : ''}`,
            text: `${em.icon}${em.name}レイド`,
            on: {
              click: () => {
                HS.Engine.State.updateUiSelection({ raidId: r.id });
                HS.UI.App.render();
              }
            }
          });
        })
      );

      // Selectable Raid Level 1..10 (5x2 grid)
      const lvGrid = el(
        'div',
        { className: 'grid-5' },
        Array.from({ length: 10 }, (_, idx) => {
          const lv = idx + 1;
          return el('button', {
            type: 'button',
            className: `btn sm num${lv === raidLv ? ' primary' : lv <= maxCleared ? ' active-toggle' : ''}`,
            text: `Lv.${lv}`,
            on: {
              click: () => {
                HS.Engine.State.updateUiSelection({ raidLv: lv });
                HS.UI.App.render();
              }
            }
          });
        })
      );

      const launchBtn = el('button', {
        type: 'button',
        className: 'btn primary full',
        text: `${raid.name} Lv.${raidLv} へ挑む`,
        on: {
          click: () => HS.UI.BattleView.startBattle({ mode: 'raid', raidId: raid.id, raidLv }, false)
        }
      });

      lower.appendChild(raidGrid);
      lower.appendChild(lvGrid);
      lower.appendChild(el('div', { style: { flex: '1 1 auto' } }));
      lower.appendChild(launchBtn);
    } else {
      // Constraint Realm
      const con = HS.Data.CONSTRAINTS.find((c) => c.id === sel.constraintId) || HS.Data.CONSTRAINTS[0];
      const frontChars = state.frontParty.map((id) => HS.Data.CHAR_MAP[id]).filter(Boolean);
      const passes = con.check(frontChars);

      upper.appendChild(el(
        'div',
        { className: 'panel-card accent' },
        el('div', { className: 'item-top' }, el('span', { className: 'section-title', text: `制約異界・${con.name}` }), el('span', { className: `chip ${passes ? 'gold' : ''}`, text: passes ? '条件達成' : '条件未達' })),
        el('div', { className: 'section-sub', style: { marginTop: '3px' }, text: `制約条件：${con.ruleText}` }),
        el('div', { className: 'section-sub', style: { marginTop: '2px' }, text: `報酬：世界貨+${con.gold}・結晶+${con.crystal}・高品質装備2枠` })
      ));
      upper.appendChild(partyRow);
      upper.appendChild(synBar);

      const conList = el(
        'div',
        { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } },
        HS.Data.CONSTRAINTS.map((c) => {
          const ok = c.check(frontChars);
          const clearedCount = state.progress.constraintCleared[c.id] || 0;
          return el(
            'button',
            {
              type: 'button',
              className: `item-row${c.id === con.id ? ' selected' : ''}`,
              on: {
                click: () => {
                  HS.Engine.State.updateUiSelection({ constraintId: c.id });
                  HS.UI.App.render();
                }
              }
            },
            el('div', { className: 'item-top' }, el('span', { className: 'item-name', text: c.name }), el('span', { className: 'chip', text: clearedCount > 0 ? `制覇${clearedCount}` : ok ? '出撃可' : '未達' })),
            el('div', { className: 'section-sub', text: c.ruleText })
          );
        })
      );

      const launchBtn = el('button', {
        type: 'button',
        className: 'btn primary full',
        disabled: !passes,
        text: passes ? `制約異界・${con.name} へ挑む` : '編成条件を満たしていません',
        on: {
          click: () => {
            if (!passes) {
              showToast('編成画面で制約条件を満たす前衛を組んでください', 'warn');
              return;
            }
            HS.UI.BattleView.startBattle({ mode: 'constraint', constraintId: con.id }, false);
          }
        }
      });

      lower.appendChild(conList);
      lower.appendChild(launchBtn);
    }

    // Mode sub-tab bar placed at the bottom of the lower thumb zone (right above bottom nav!)
    const modeTabs = el(
      'div',
      { className: 'subtab-bar' },
      [
        { id: 'normal', label: '通常異界' },
        { id: 'tower', label: '異界塔' },
        { id: 'raid', label: '異界レイド' },
        { id: 'constraint', label: '制約異界' }
      ].map((m) => el('button', {
        type: 'button',
        className: `subtab-btn${mode === m.id ? ' active' : ''}`,
        text: m.label,
        on: {
          click: () => {
            HS.Engine.State.updateUiSelection({ deployMode: m.id });
            HS.UI.App.render();
          }
        }
      }))
    );
    lower.appendChild(modeTabs);

    clear(container);
    container.appendChild(el('div', { className: 'split-screen' }, upper, lower));
  }

  HS.UI.DeployView = { render };
})();
