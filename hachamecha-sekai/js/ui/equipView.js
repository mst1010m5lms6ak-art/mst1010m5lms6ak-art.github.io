(function () {
  'use strict';

  const HS = window.HS;
  const { el, clear, formatNum, makeElBadge, makeRoleBadge, showToast } = HS.DOM;

  let subTab = 'equip'; // 'equip' | 'bag' | 'autosell'
  let selectedCharId = null;
  let selectedSlot = 'weapon';
  let bagFilterSlot = 'all';
  let inspectedUid = null;

  function formatItemStatsText(stats) {
    const parts = [];
    if (stats.hp) parts.push(`HP+${formatNum(stats.hp)}`);
    if (stats.atk) parts.push(`攻+${formatNum(stats.atk)}`);
    if (stats.def) parts.push(`防+${formatNum(stats.def)}`);
    if (stats.spd) parts.push(`速+${stats.spd}`);
    if (stats.critRate) parts.push(`会心+${Math.round(stats.critRate * 100)}%`);
    if (stats.critDmg) parts.push(`会ダメ+${Math.round(stats.critDmg * 100)}%`);
    return parts.join(' ');
  }

  function qualityClass(q) {
    if (q === 100) return 'quality-perfect';
    if (q >= 85) return 'quality-high';
    if (q >= 60) return 'quality-mid';
    return '';
  }

  function qualityChip(q) {
    return q === 100
      ? el('span', { className: 'chip perfect-badge', text: '✦極100%' })
      : el('span', { className: `chip${q >= 85 ? ' gold' : ''}`, text: `品質${q}%` });
  }

  function ensureChar(state) {
    if (!selectedCharId || !HS.Engine.State.isUnlocked(selectedCharId)) {
      selectedCharId = state.frontParty.find(Boolean) || state.unlockedChars[0];
    }
    return HS.Data.CHAR_MAP[selectedCharId];
  }

  function openCharPicker(state) {
    const unlocked = HS.Data.CHARACTERS.filter((c) => HS.Engine.State.isUnlocked(c.id));
    const list = el(
      'div',
      { className: 'list-col scroll-zone', style: { maxHeight: '52vh' } },
      unlocked.map((c) => el(
        'button',
        {
          type: 'button',
          className: `item-row${c.id === selectedCharId ? ' selected' : ''}`,
          on: {
            click: () => {
              selectedCharId = c.id;
              HS.UI.App.closeSheet();
              HS.UI.App.render();
            }
          }
        },
        el('div', { className: 'item-top' }, el('span', { className: 'item-name', text: c.name })),
        el('div', { className: 'item-meta' }, makeElBadge(c.element), el('span', { className: 'chip', text: HS.CONST.formatRaces(c.races) }), makeRoleBadge(c.role))
      ))
    );
    HS.UI.App.openSheet('装備キャラを選択', [list], [
      el('button', { type: 'button', className: 'btn full', text: '閉じる', on: { click: () => HS.UI.App.closeSheet() } })
    ]);
  }

  function renderEquipSub(upper, lower, state) {
    const charDef = ensureChar(state);
    const prog = HS.Engine.State.getCharProgress(charDef.id);
    const { activeSets } = HS.Engine.Stats.getEquippedSets(state, charDef.id);
    const owners = HS.Engine.State.getEquipOwnerMap();

    // Upper display: 4 equipped slots + active sets
    const slotCards = el(
      'div',
      { className: 'grid-2' },
      HS.CONST.EQUIP_SLOTS.map((sl) => {
        const uid = prog.equips[sl.id];
        const inst = uid ? state.inventory.find((x) => x.uid === uid) : null;
        const def = inst ? HS.Data.EQUIP_ITEM_MAP[inst.itemId] : null;
        const stats = inst ? HS.Data.calcItemStats(inst.itemId, inst.quality) : null;
        const isCurrent = sl.id === selectedSlot;

        return el(
          'div',
          {
            className: `panel-card${inst ? ' ' + qualityClass(inst.quality) : ''}${isCurrent ? ' accent' : ''}`,
            style: { padding: '5px 7px' }
          },
          el(
            'div',
            { className: 'item-top' },
            el('span', { style: { fontSize: '10.5px', fontWeight: '800', color: isCurrent ? '#38d9f5' : '#a8b7d4' }, text: `${sl.icon}${sl.name}` }),
            inst ? qualityChip(inst.quality) : el('span', { className: 'section-sub', text: '未装着' })
          ),
          el('div', { style: { fontSize: '11px', fontWeight: '800', marginTop: '2px' }, text: def ? def.name : '—' }),
          el('div', { style: { fontSize: '9.5px', color: '#a8b7d4', marginTop: '2px' }, text: stats ? formatItemStatsText(stats) : '装備なし' })
        );
      })
    );

    const setPanel = el(
      'div',
      { className: 'panel-card', style: { padding: '6px 8px' } },
      el('div', { className: 'item-top' }, el('span', { className: 'section-title', text: `${charDef.name} のセット効果` }), el('span', { className: 'section-sub', text: `所持装備 ${state.inventory.length}` })),
      activeSets.length > 0
        ? el(
            'div',
            { className: 'list-col', style: { marginTop: '3px', gap: '2px' } },
            activeSets.map((as) => el('div', {
              className: 'section-sub',
              style: { color: '#a9f8d0' },
              text: `【${as.setDef.name}(${as.count})】${as.tier2 ? '②' + as.setDef.bonus2.desc : ''}${as.tier4 ? ' ／ ④' + as.setDef.bonus4.desc : ''}`
            }))
          )
        : el('div', { className: 'section-sub', style: { marginTop: '2px' }, text: '同セット装備を2部位・4部位揃えると発動します' })
    );

    upper.appendChild(slotCards);
    upper.appendChild(setPanel);

    // Lower thumb zone: Character picker + Slot selector + Matching gear list
    lower.appendChild(el('button', {
      type: 'button',
      className: 'btn sm full active-toggle',
      text: `対象キャラ変更：${charDef.name} ▾`,
      on: { click: () => openCharPicker(state) }
    }));

    lower.appendChild(el(
      'div',
      { className: 'grid-4' },
      HS.CONST.EQUIP_SLOTS.map((sl) => el('button', {
        type: 'button',
        className: `btn sm${sl.id === selectedSlot ? ' primary' : ''}`,
        text: `${sl.icon}${sl.name}`,
        on: {
          click: () => {
            selectedSlot = sl.id;
            HS.UI.App.render();
          }
        }
      }))
    ));

    const list = el('div', { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } });

    if (prog.equips[selectedSlot]) {
      list.appendChild(el('button', {
        type: 'button',
        className: 'btn sm',
        text: `現在の${HS.CONST.SLOT_MAP[selectedSlot].name}を外す`,
        on: {
          click: () => {
            HS.Engine.State.unequipSlot(charDef.id, selectedSlot);
            HS.UI.App.render();
          }
        }
      }));
    }

    const candidates = state.inventory
      .filter((item) => HS.Data.EQUIP_ITEM_MAP[item.itemId]?.slot === selectedSlot)
      .sort((a, b) => b.quality - a.quality || a.itemId.localeCompare(b.itemId));

    if (candidates.length === 0) {
      list.appendChild(el('div', { className: 'panel-card section-sub', text: 'この部位の装備をまだ所持していません。' }));
    } else {
      for (const item of candidates) {
        const def = HS.Data.EQUIP_ITEM_MAP[item.itemId];
        const setDef = HS.Data.EQUIP_SET_MAP[def.setId];
        const stats = HS.Data.calcItemStats(item.itemId, item.quality);
        const ownerId = owners[item.uid];
        const isHere = ownerId === charDef.id;
        const ownerName = ownerId ? HS.Data.CHAR_MAP[ownerId]?.name : '';

        list.appendChild(el(
          'button',
          {
            type: 'button',
            className: `item-row ${qualityClass(item.quality)}${isHere ? ' selected' : ''}`,
            on: {
              click: () => {
                HS.Engine.State.equipItem(charDef.id, item.uid);
                showToast(`${def.name}を装着しました`);
                HS.UI.App.render();
              }
            }
          },
          el(
            'div',
            { className: 'item-top' },
            el('span', { className: 'item-name', text: `${item.locked ? '🔒' : ''}${def.name}` }),
            el('div', { className: 'item-meta' }, setDef.raidOnly ? el('span', { className: 'chip raid', text: 'レイド' }) : null, qualityChip(item.quality))
          ),
          el('div', { className: 'section-sub', text: `${formatItemStatsText(stats)} ／ ${setDef.name}` }),
          ownerId ? el('div', { className: 'section-sub', style: { color: isHere ? '#38d9f5' : '#f6c453' }, text: isHere ? '装着中' : `${ownerName}が装着中（タップで付け替え）` }) : null
        ));
      }
    }

    lower.appendChild(list);
  }

  function renderBagSub(upper, lower, state) {
    const owners = HS.Engine.State.getEquipOwnerMap();
    const filtered = state.inventory
      .filter((item) => bagFilterSlot === 'all' || HS.Data.EQUIP_ITEM_MAP[item.itemId]?.slot === bagFilterSlot)
      .sort((a, b) => b.quality - a.quality || a.itemId.localeCompare(b.itemId));

    let cur = filtered.find((x) => x.uid === inspectedUid) || filtered[0] || null;
    inspectedUid = cur ? cur.uid : null;

    if (cur) {
      const def = HS.Data.EQUIP_ITEM_MAP[cur.itemId];
      const setDef = HS.Data.EQUIP_SET_MAP[def.setId];
      const stats = HS.Data.calcItemStats(cur.itemId, cur.quality);
      const ownerId = owners[cur.uid];
      upper.appendChild(el(
        'div',
        { className: `panel-card ${qualityClass(cur.quality)}` },
        el(
          'div',
          { className: 'item-top' },
          el('span', { className: 'section-title', text: `${cur.locked ? '🔒' : ''}${def.name}` }),
          el('div', { className: 'item-meta' }, setDef.raidOnly ? el('span', { className: 'chip raid', text: 'レイド限定' }) : null, qualityChip(cur.quality))
        ),
        el('div', { className: 'section-sub', style: { marginTop: '4px', color: '#f1f5ff' }, text: formatItemStatsText(stats) }),
        el('div', { className: 'section-sub', style: { marginTop: '3px' }, text: `セット【${setDef.name}】 ②${setDef.bonus2.desc} ／ ④${setDef.bonus4.desc}` }),
        el('div', { className: 'lore-box', style: { marginTop: '5px' }, text: def.lore }),
        ownerId ? el('div', { className: 'section-sub', style: { marginTop: '3px', color: '#38d9f5' }, text: `装着者：${HS.Data.CHAR_MAP[ownerId]?.name}` }) : null
      ));
    } else {
      upper.appendChild(el('div', { className: 'panel-card section-sub', text: '該当する装備がありません。' }));
    }

    // Lower: Slot filter + Selected actions (Lock / Sell) + Bag list
    lower.appendChild(el(
      'div',
      { className: 'grid-5' },
      [{ id: 'all', label: '全て' }, ...HS.CONST.EQUIP_SLOTS.map((s) => ({ id: s.id, label: s.name }))].map((f) => el('button', {
        type: 'button',
        className: `btn sm${bagFilterSlot === f.id ? ' primary' : ''}`,
        text: f.label,
        on: {
          click: () => {
            bagFilterSlot = f.id;
            HS.UI.App.render();
          }
        }
      }))
    ));

    if (cur) {
      const sellVal = HS.Data.getSellValue(cur.itemId, cur.quality);
      const isEquipped = Boolean(owners[cur.uid]);
      lower.appendChild(el(
        'div',
        { className: 'grid-2' },
        el('button', {
          type: 'button',
          className: `btn sm${cur.locked ? ' gold' : ''}`,
          text: cur.locked ? '🔒 保護を解除' : '🔓 保護ロック',
          on: {
            click: () => {
              HS.Engine.State.toggleLockEquip(cur.uid);
              HS.UI.App.render();
            }
          }
        }),
        el('button', {
          type: 'button',
          className: 'btn sm danger',
          disabled: isEquipped || cur.locked,
          text: isEquipped ? '装着中' : cur.locked ? '保護中' : `売却 (+🪙${sellVal})`,
          on: {
            click: () => {
              const res = HS.Engine.State.sellEquip(cur.uid);
              if (res.ok) {
                showToast(`世界貨+${res.gold}で売却しました`);
                HS.UI.App.render();
              } else {
                showToast(res.reason, 'warn');
              }
            }
          }
        })
      ));
    }

    const list = el('div', { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } });
    for (const item of filtered) {
      const def = HS.Data.EQUIP_ITEM_MAP[item.itemId];
      const setDef = HS.Data.EQUIP_SET_MAP[def.setId];
      const ownerId = owners[item.uid];
      list.appendChild(el(
        'button',
        {
          type: 'button',
          className: `item-row ${qualityClass(item.quality)}${item.uid === inspectedUid ? ' selected' : ''}`,
          on: {
            click: () => {
              inspectedUid = item.uid;
              HS.UI.App.render();
            }
          }
        },
        el('div', { className: 'item-top' }, el('span', { className: 'item-name', text: `${item.locked ? '🔒' : ''}${def.name}` }), qualityChip(item.quality)),
        el('div', { className: 'section-sub', text: `${HS.CONST.SLOT_MAP[def.slot].name} ／ ${setDef.name}${ownerId ? ` ／ ${HS.Data.CHAR_MAP[ownerId]?.name}装着中` : ''}` })
      ));
    }
    lower.appendChild(list);
  }

  function renderAutoSellSub(upper, lower, state) {
    const threshold = state.settings.autoSellBelow || 0;
    const perfectCount = state.inventory.filter((x) => x.quality === 100).length;
    const lockedCount = state.inventory.filter((x) => x.locked).length;
    const raidCount = state.inventory.filter((x) => {
      const d = HS.Data.EQUIP_ITEM_MAP[x.itemId];
      return d && HS.Data.EQUIP_SET_MAP[d.setId]?.raidOnly;
    }).length;
    const slotCounts = { weapon: 0, armor: 0, accessory: 0, core: 0 };
    for (const x of state.inventory) {
      const d = HS.Data.EQUIP_ITEM_MAP[x.itemId];
      if (d && slotCounts[d.slot] !== undefined) slotCounts[d.slot]++;
    }

    upper.appendChild(el(
      'div',
      { className: 'panel-card accent' },
      el('div', { className: 'section-title', text: '自動売却＆一括整理' }),
      el('div', {
        className: 'section-sub',
        style: { marginTop: '4px' },
        text: threshold === 0
          ? '現在設定：自動売却 OFF（全ドロップ装備を保持）'
          : threshold === 100
            ? '現在設定：最大品質100%以外を自動で世界貨へ換金'
            : `現在設定：品質 ${threshold}% 未満を自動で世界貨へ換金`
      }),
      el('div', {
        className: 'section-sub',
        style: { marginTop: '4px', color: '#f6c453' },
        text: '最大品質100%装備および保護ロック済み装備は自動保護されます。'
      })
    ));
    upper.appendChild(el(
      'div',
      { className: 'panel-card' },
      el('div', { className: 'section-title', text: '所持バッグ統計' }),
      el(
        'div',
        { className: 'stat-grid', style: { marginTop: '5px' } },
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '総所持' }), el('span', { className: 'stat-v', text: `${state.inventory.length}` })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '✦極100%' }), el('span', { className: 'stat-v', text: `${perfectCount}` })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: 'レイド' }), el('span', { className: 'stat-v', text: `${raidCount}` })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '保護中' }), el('span', { className: 'stat-v', text: `${lockedCount}` })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '武器/防' }), el('span', { className: 'stat-v', text: `${slotCounts.weapon}/${slotCounts.armor}` })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '装飾/核' }), el('span', { className: 'stat-v', text: `${slotCounts.accessory}/${slotCounts.core}` }))
      )
    ));

    // Threshold buttons in lower thumb zone
    lower.appendChild(el('div', { className: 'section-title', text: 'ドロップ時の自動売却ライン' }));
    lower.appendChild(el(
      'div',
      { className: 'grid-4' },
      HS.CONST.AUTO_SELL_OPTIONS.map((opt) => el('button', {
        type: 'button',
        className: `btn sm${threshold === opt ? ' primary' : ''}`,
        text: opt === 0 ? 'OFF' : opt === 100 ? '100%以外' : `${opt}%未満`,
        on: {
          click: () => {
            HS.Engine.State.updateSetting('autoSellBelow', opt);
            HS.UI.App.render();
          }
        }
      }))
    ));

    lower.appendChild(el('button', {
      type: 'button',
      className: `btn full${state.settings.protectRaid ? ' active-toggle' : ''}`,
      text: state.settings.protectRaid ? 'レイド限定装備の自動保護：ON' : 'レイド限定装備の自動保護：OFF',
      on: {
        click: () => {
          HS.Engine.State.updateSetting('protectRaid', !state.settings.protectRaid);
          HS.UI.App.render();
        }
      }
    }));

    lower.appendChild(el('div', { className: 'section-title', style: { marginTop: '4px' }, text: '所持バッグの即時一括売却（未装着・未保護のみ）' }));
    lower.appendChild(el(
      'div',
      { className: 'grid-2' },
      [70, 85, 95, 100].map((cut) => el('button', {
        type: 'button',
        className: 'btn danger sm full',
        text: cut === 100 ? '100%未満を一括売却' : `品質${cut}%未満を一括売却`,
        on: {
          click: () => {
            const res = HS.Engine.State.bulkSellEquips(cut);
            if (res.count > 0) {
              showToast(`${res.count}個を売却（世界貨+${formatNum(res.gold)}）`, 'gold');
              HS.UI.App.render();
            } else {
              showToast('売却対象の装備はありませんでした');
            }
          }
        }
      }))
    ));
    lower.appendChild(el('div', { style: { flex: '1 1 auto' } }));
  }

  function render(container) {
    const state = HS.Engine.State.getState();
    const upper = el('div', { className: 'upper-display' });
    const lower = el('div', { className: 'lower-thumb' });

    if (subTab === 'equip') renderEquipSub(upper, lower, state);
    else if (subTab === 'bag') renderBagSub(upper, lower, state);
    else renderAutoSellSub(upper, lower, state);

    const tabs = el(
      'div',
      { className: 'subtab-bar' },
      [
        { id: 'equip', label: '装備装着' },
        { id: 'bag', label: `バッグ(${state.inventory.length})` },
        { id: 'autosell', label: '自動売却' }
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

  HS.UI.EquipView = { render };
})();
