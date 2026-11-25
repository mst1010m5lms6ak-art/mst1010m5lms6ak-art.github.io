(function () {
  'use strict';

  const HS = window.HS;
  const { el, clear, formatNum, makeElBadge, makeRoleBadge, makeTargetBadge, showToast } = HS.DOM;

  let subTab = 'chars'; // 'chars' | 'enemies' | 'equips' | 'abilities' | 'settings'
  let selCharId = null;
  let selEnemyId = null;
  let selEquipId = null;
  let selAbilityRole = 'tank';
  let selAbilityId = 't1_0';

  function renderCharsDex(upper, lower, state) {
    const all = HS.Data.CHARACTERS;
    if (!selCharId || !HS.Data.CHAR_MAP[selCharId]) selCharId = all[0].id;
    const c = HS.Data.CHAR_MAP[selCharId];
    const owned = HS.Engine.State.isUnlocked(c.id);

    upper.appendChild(el(
      'div',
      { className: 'panel-card accent', style: { flex: '1 1 auto', minHeight: '0', display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' } },
      el(
        'div',
        { className: 'item-top' },
        el('span', { className: 'section-title', text: c.name }),
        el('div', { className: 'item-meta' }, makeElBadge(c.element), el('span', { className: 'chip', text: HS.CONST.formatRaces(c.races) }), makeRoleBadge(c.role))
      ),
      el('div', { className: 'lore-box', text: c.lore }),
      el(
        'div',
        { className: 'stat-grid' },
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '基礎HP' }), el('span', { className: 'stat-v', text: formatNum(c.base.hp) })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '基礎攻' }), el('span', { className: 'stat-v', text: formatNum(c.base.atk) })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '基礎防' }), el('span', { className: 'stat-v', text: formatNum(c.base.def) }))
      ),
      el(
        'div',
        { className: 'list-col', style: { gap: '3px' } },
        c.skills.map((sk, idx) => el(
          'div',
          { style: { fontSize: '10.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' } },
          el('span', { text: sk.passive ? `【常時】${sk.name}` : `技${idx + 1}：${sk.name}` }),
          sk.passive ? el('span', { className: 'chip passive-badge', text: 'パッシブ' }) : makeTargetBadge(sk.target)
        ))
      ),
      el('div', { className: 'section-sub', text: owned ? `加入済 ／ 控え共鳴【${c.resonance.name}】：${c.resonance.desc}` : `入手先：${c.unlock.type === 'shop' ? `世界貨交換(${formatNum(c.unlock.cost)})` : c.unlock.type === 'area' ? `エリア${c.unlock.areaId}制覇` : `異界塔${c.unlock.towerId === 1 ? 'Ⅰ' : 'Ⅱ'} 100F踏破`}` })
    ));

    const list = el('div', { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } });
    for (const ch of all) {
      const has = HS.Engine.State.isUnlocked(ch.id);
      list.appendChild(el(
        'button',
        {
          type: 'button',
          className: `item-row${ch.id === selCharId ? ' selected' : ''}${has ? '' : ' locked-item'}`,
          on: {
            click: () => {
              selCharId = ch.id;
              HS.UI.App.render();
            }
          }
        },
        el('div', { className: 'item-top' }, el('span', { className: 'item-name', text: ch.name }), el('span', { className: `chip${has ? ' gold' : ''}`, text: has ? '加入済' : '未加入' })),
        el('div', { className: 'item-meta' }, makeElBadge(ch.element), el('span', { className: 'chip', text: HS.CONST.formatRaces(ch.races) }), makeRoleBadge(ch.role))
      ));
    }
    lower.appendChild(list);
  }

  function renderEnemiesDex(upper, lower, state) {
    const all = HS.Data.ENEMIES;
    if (!selEnemyId || !HS.Data.ENEMY_MAP[selEnemyId]) selEnemyId = all[0].id;
    const e = HS.Data.ENEMY_MAP[selEnemyId];
    const catLabels = { normal: '通常', intruder: '乱入敵', boss: 'エリアボス', tower: '異界塔', raid: 'レイド', constraint: '制約' };

    upper.appendChild(el(
      'div',
      { className: 'panel-card accent', style: { flex: '1 1 auto', minHeight: '0', display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' } },
      el(
        'div',
        { className: 'item-top' },
        el('span', { className: 'section-title', text: e.name }),
        el('span', { className: `chip${e.category === 'raid' ? ' raid' : e.category === 'intruder' ? ' gold' : ''}`, text: catLabels[e.category] || '敵' })
      ),
      el('div', { className: 'item-meta' }, makeElBadge(e.element), el('span', { className: 'chip', text: HS.CONST.formatRaces(e.races) }), makeRoleBadge(e.role)),
      el('div', { className: 'lore-box', text: e.lore }),
      el(
        'div',
        { className: 'list-col', style: { gap: '3px' } },
        e.skills.map((sk, idx) => el(
          'div',
          { style: { fontSize: '10.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
          el('span', { text: `技${idx + 1}：${sk.name}${sk.ct > 0 ? ` (CT${sk.ct})` : ''}` }),
          makeTargetBadge(sk.target)
        ))
      )
    ));

    const list = el('div', { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } });
    for (const en of all) {
      const seen = Boolean(state.discoveredEnemies[en.id]);
      list.appendChild(el(
        'button',
        {
          type: 'button',
          className: `item-row${en.id === selEnemyId ? ' selected' : ''}`,
          on: {
            click: () => {
              selEnemyId = en.id;
              HS.UI.App.render();
            }
          }
        },
        el('div', { className: 'item-top' }, el('span', { className: 'item-name', text: en.name }), el('span', { className: `chip${seen ? ' gold' : ''}`, text: seen ? `${catLabels[en.category]}・遭遇済` : catLabels[en.category] })),
        el('div', { className: 'item-meta' }, makeElBadge(en.element), el('span', { className: 'chip', text: HS.CONST.formatRaces(en.races) }), makeRoleBadge(en.role))
      ));
    }
    lower.appendChild(list);
  }

  function renderEquipsDex(upper, lower) {
    const all = HS.Data.EQUIP_ITEMS;
    if (!selEquipId || !HS.Data.EQUIP_ITEM_MAP[selEquipId]) selEquipId = all[0].id;
    const item = HS.Data.EQUIP_ITEM_MAP[selEquipId];
    const setDef = HS.Data.EQUIP_SET_MAP[item.setId];
    const stats100 = HS.Data.calcItemStats(item.id, 100);
    const statParts = [];
    if (stats100.hp) statParts.push(`HP+${formatNum(stats100.hp)}`);
    if (stats100.atk) statParts.push(`攻+${formatNum(stats100.atk)}`);
    if (stats100.def) statParts.push(`防+${formatNum(stats100.def)}`);
    if (stats100.spd) statParts.push(`速+${stats100.spd}`);
    if (stats100.critRate) statParts.push(`会心+${Math.round(stats100.critRate * 100)}%`);
    if (stats100.critDmg) statParts.push(`会ダメ+${Math.round(stats100.critDmg * 100)}%`);

    upper.appendChild(el(
      'div',
      { className: 'panel-card quality-perfect', style: { flex: '1 1 auto', minHeight: '0', display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' } },
      el('div', { className: 'item-top' }, el('span', { className: 'section-title', text: item.name }), el('span', { className: 'chip perfect-badge', text: '最大品質100%時' })),
      el('div', { className: 'section-sub', style: { color: '#ffffff' }, text: statParts.join(' ') }),
      el('div', { className: 'section-sub', text: `部位：${HS.CONST.SLOT_MAP[item.slot].name} ／ 入手：${setDef.sourceLabel}` }),
      el('div', { className: 'section-sub', style: { color: '#a9f8d0' }, text: `【${setDef.name}】 ②${setDef.bonus2.desc} ／ ④${setDef.bonus4.desc}` }),
      el('div', { className: 'lore-box', text: item.lore })
    ));

    const list = el('div', { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } });
    for (const eq of all) {
      const sd = HS.Data.EQUIP_SET_MAP[eq.setId];
      list.appendChild(el(
        'button',
        {
          type: 'button',
          className: `item-row${eq.id === selEquipId ? ' selected' : ''}`,
          on: {
            click: () => {
              selEquipId = eq.id;
              HS.UI.App.render();
            }
          }
        },
        el('div', { className: 'item-top' }, el('span', { className: 'item-name', text: eq.name }), sd.raidOnly ? el('span', { className: 'chip raid', text: 'レイド限定' }) : el('span', { className: 'chip', text: HS.CONST.SLOT_MAP[eq.slot].name })),
        el('div', { className: 'section-sub', text: `${sd.name}セット（${sd.sourceLabel}）` })
      ));
    }
    lower.appendChild(list);
  }

  function renderAbilitiesDex(upper, lower) {
    const tiers = HS.Data.ROLE_ABILITIES[selAbilityRole];
    const cur = HS.Data.ABILITY_BY_ID[selAbilityId] || tiers[0][0];
    if (cur.role !== selAbilityRole) selAbilityId = tiers[0][0].id;
    const shown = HS.Data.ABILITY_BY_ID[selAbilityId];

    upper.appendChild(el(
      'div',
      { className: 'panel-card accent' },
      el('div', { className: 'item-top' }, el('span', { className: 'section-title', text: shown.name }), makeRoleBadge(shown.role)),
      el('div', { className: 'section-sub', style: { marginTop: '4px', color: '#f6c453' }, text: `第${shown.tier}段階 ／ 型候補 ${shown.slot + 1}番` }),
      el('div', { className: 'lore-box', style: { marginTop: '6px' }, text: shown.desc })
    ));

    // Role filter in lower thumb zone
    lower.appendChild(el(
      'div',
      { className: 'grid-4' },
      HS.CONST.ROLES.map((r) => el('button', {
        type: 'button',
        className: `btn sm${selAbilityRole === r.id ? ' primary' : ''}`,
        text: `${r.icon}${r.short}`,
        on: {
          click: () => {
            selAbilityRole = r.id;
            selAbilityId = HS.Data.ROLE_ABILITIES[r.id][0][0].id;
            HS.UI.App.render();
          }
        }
      }))
    ));

    const list = el('div', { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } });
    tiers.forEach((choices, tIdx) => {
      list.appendChild(el('div', { className: 'section-title', text: `第${tIdx + 1}段階` }));
      choices.forEach((ab) => {
        list.appendChild(el(
          'button',
          {
            type: 'button',
            className: `item-row${ab.id === selAbilityId ? ' selected' : ''}`,
            on: {
              click: () => {
                selAbilityId = ab.id;
                HS.UI.App.render();
              }
            }
          },
          el('div', { className: 'item-top' }, el('span', { className: 'item-name', text: ab.name }), el('span', { className: 'chip', text: `案${ab.slot + 1}` })),
          el('div', { className: 'section-sub', text: ab.desc })
        ));
      });
    });
    lower.appendChild(list);
  }

  function renderSettings(upper, lower, state) {
    const clearedNormal = Object.keys(state.progress.normalCleared).length;
    const t1 = state.progress.towerCleared[1] || 0;
    const t2 = state.progress.towerCleared[2] || 0;
    const raidBest = Object.values(state.progress.raidCleared || {}).reduce((m, v) => Math.max(m, v), 0);
    const conCleared = Object.keys(state.progress.constraintCleared || {}).length;
    const seenEnemies = Object.keys(state.discoveredEnemies || {}).length;
    const perfectCount = state.inventory.filter((x) => x.quality === 100).length;

    upper.appendChild(el(
      'div',
      { className: 'panel-card accent' },
      el('div', { className: 'section-title', text: 'はちゃめちゃ世界 記録概要' }),
      el(
        'div',
        { className: 'stat-grid', style: { marginTop: '6px' } },
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '加入仲間' }), el('span', { className: 'stat-v', text: `${state.unlockedChars.length}/${HS.Data.CHARACTERS.length}` })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '通常踏破' }), el('span', { className: 'stat-v', text: `${clearedNormal}/60` })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '異界塔' }), el('span', { className: 'stat-v', text: `${t1}F/${t2}F` })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: 'レイド' }), el('span', { className: 'stat-v', text: `最高Lv.${raidBest}` })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '制約制覇' }), el('span', { className: 'stat-v', text: `${conCleared}/8` })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '✦極100%' }), el('span', { className: 'stat-v', text: `${perfectCount}個` }))
      )
    ));
    upper.appendChild(el(
      'div',
      { className: 'panel-card' },
      el('div', { className: 'item-top' }, el('span', { className: 'section-title', text: 'データ保全状態' }), el('span', { className: 'chip gold', text: `遭遇敵 ${seenEnemies}/${HS.Data.ENEMIES.length}` })),
      el('div', { className: 'section-sub', style: { marginTop: '4px' }, text: 'セーブデータは端末内に二重保存され、オフラインでも続きから遊べます。バックアップコードで別端末へ引き継ぐこともできます。' })
    ));

    const speed = state.settings.battleSpeed || 1;
    lower.appendChild(el('div', { className: 'section-title', text: '基本戦闘速度' }));
    lower.appendChild(el(
      'div',
      { className: 'grid-3' },
      [1, 2, 3].map((sp) => el('button', {
        type: 'button',
        className: `btn sm${speed === sp ? ' primary' : ''}`,
        text: `${sp}倍速`,
        on: {
          click: () => {
            HS.Engine.State.updateSetting('battleSpeed', sp);
            HS.UI.App.render();
          }
        }
      }))
    ));

    lower.appendChild(el('div', { className: 'section-title', style: { marginTop: '4px' }, text: 'データ引継ぎ・バックアップ' }));
    lower.appendChild(el(
      'div',
      { className: 'grid-2' },
      el('button', {
        type: 'button',
        className: 'btn sm full',
        text: 'バックアップ出力',
        on: {
          click: () => {
            const code = HS.Storage.exportCode(HS.Engine.State.getState());
            const ta = el('textarea', { className: 'backup-textarea selectable-text', readOnly: true, value: code });
            HS.UI.App.openSheet('バックアップコード出力', [
              el('div', { className: 'section-sub', text: '下のコードをコピーして安全な場所へ保管してください。' }),
              ta
            ], [
              el('button', { type: 'button', className: 'btn full', text: '閉じる', on: { click: () => HS.UI.App.closeSheet() } }),
              el('button', {
                type: 'button',
                className: 'btn primary full',
                text: 'コピーする',
                on: {
                  click: () => {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(code).then(() => showToast('コードをコピーしました', 'gold')).catch(() => {
                        ta.select();
                        showToast('テキストを選択しました');
                      });
                    } else {
                      ta.select();
                      showToast('テキストを選択しました');
                    }
                  }
                }
              })
            ]);
          }
        }
      }),
      el('button', {
        type: 'button',
        className: 'btn sm full',
        text: 'バックアップ復元',
        on: {
          click: () => {
            const ta = el('textarea', { className: 'backup-textarea selectable-text', placeholder: 'HS1: で始まるコードを貼り付け' });
            HS.UI.App.openSheet('バックアップから復元', [
              el('div', { className: 'section-sub', text: '有効なバックアップコードを貼り付けて復元します。' }),
              ta
            ], [
              el('button', { type: 'button', className: 'btn full', text: 'キャンセル', on: { click: () => HS.UI.App.closeSheet() } }),
              el('button', {
                type: 'button',
                className: 'btn gold full',
                text: '復元を実行',
                on: {
                  click: async () => {
                    const ok = await HS.Engine.State.importBackup(ta.value);
                    if (ok) {
                      HS.UI.App.closeSheet();
                      showToast('セーブデータを復元しました！', 'gold');
                      HS.UI.App.render();
                    } else {
                      showToast('コードが不正または破損しています', 'warn');
                    }
                  }
                }
              })
            ]);
          }
        }
      })
    ));

    lower.appendChild(el('div', { style: { flex: '1 1 auto' } }));
    lower.appendChild(el('button', {
      type: 'button',
      className: 'btn danger sm full',
      text: 'セーブデータを初期化',
      on: {
        click: () => {
          HS.UI.App.openSheet('セーブデータを初期化しますか？', [
            el('div', { className: 'section-sub', text: 'すべての進行状況・仲間・装備が初期状態へ戻ります。この操作は取り消せません。' })
          ], [
            el('button', { type: 'button', className: 'btn full', text: 'やめる', on: { click: () => HS.UI.App.closeSheet() } }),
            el('button', {
              type: 'button',
              className: 'btn danger full',
              text: '初期化する',
              on: {
                click: async () => {
                  await HS.Engine.State.resetSave();
                  HS.UI.App.closeSheet();
                  showToast('データを初期化しました');
                  HS.UI.App.render();
                }
              }
            })
          ]);
        }
      }
    }));
  }

  function render(container) {
    const state = HS.Engine.State.getState();
    const upper = el('div', { className: 'upper-display' });
    const lower = el('div', { className: 'lower-thumb' });

    if (subTab === 'chars') renderCharsDex(upper, lower, state);
    else if (subTab === 'enemies') renderEnemiesDex(upper, lower, state);
    else if (subTab === 'equips') renderEquipsDex(upper, lower);
    else if (subTab === 'abilities') renderAbilitiesDex(upper, lower);
    else renderSettings(upper, lower, state);

    const tabs = el(
      'div',
      { className: 'subtab-bar' },
      [
        { id: 'chars', label: 'キャラ' },
        { id: 'enemies', label: '敵図鑑' },
        { id: 'equips', label: '装備' },
        { id: 'abilities', label: 'アビ' },
        { id: 'settings', label: '設定' }
      ].map((t) => el('button', {
        type: 'button',
        className: `subtab-btn${subTab === t.id ? ' active' : ''}`,
        text: t.label,
        on: {
          click: () => {
            subTab = t.id;
            HS.UI.App.render();
          }
        }
      }))
    );
    lower.appendChild(tabs);

    clear(container);
    container.appendChild(el('div', { className: 'split-screen' }, upper, lower));
  }

  HS.UI.ArchiveView = { render };
})();
