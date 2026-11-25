(function () {
  'use strict';

  const HS = window.HS;
  const { el, clear, formatNum, makeElBadge, makeRoleBadge, makeTargetBadge, showToast } = HS.DOM;

  let subTab = 'ability'; // 'ability' | 'mastery' | 'awaken' | 'recruit'
  let selectedCharId = null;
  let selectedShopCharId = null;
  let activeAbilityTier = 0; // 0..4

  function ensureSelectedChar(state) {
    if (!selectedCharId || !HS.Engine.State.isUnlocked(selectedCharId)) {
      selectedCharId = state.frontParty.find(Boolean) || state.unlockedChars[0];
    }
    return HS.Data.CHAR_MAP[selectedCharId];
  }

  function renderUpperCharSummary(upper, state, charDef) {
    const prog = HS.Engine.State.getCharProgress(charDef.id);
    const assign = HS.Engine.State.getCharAssignment(charDef.id);
    const reserveId = assign.type === 'front' ? state.reserveLinks[assign.slot] : null;
    const stats = HS.Engine.Stats.computeUnitStats(state, charDef.id, reserveId, {}, {});

    upper.appendChild(el(
      'div',
      { className: 'panel-card accent' },
      el(
        'div',
        { className: 'item-top' },
        el('span', { className: 'section-title', text: charDef.name }),
        el('div', { className: 'item-meta' }, makeElBadge(charDef.element), el('span', { className: 'chip', text: HS.CONST.formatRaces(charDef.races) }), makeRoleBadge(charDef.role))
      ),
      el(
        'div',
        { className: 'stat-grid', style: { marginTop: '6px' } },
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: 'HP' }), el('span', { className: 'stat-v', text: formatNum(stats.maxHp) })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '攻撃' }), el('span', { className: 'stat-v', text: formatNum(stats.atk) })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '防御' }), el('span', { className: 'stat-v', text: formatNum(stats.def) })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '速度' }), el('span', { className: 'stat-v', text: String(stats.spd) })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '会心率' }), el('span', { className: 'stat-v', text: `${Math.round(stats.critRate * 100)}%` })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '会心倍' }), el('span', { className: 'stat-v', text: `${Math.round(stats.critDmg * 100)}%` }))
      ),
      el('div', {
        className: 'section-sub',
        style: { marginTop: '5px' },
        text: `アビリティ解放 ${prog.abilityTier}/5段階 ／ 刻印覚醒 ${prog.awakening}/3 ／ 控え共鳴【${charDef.resonance.name}】`
      })
    ));

    if (subTab === 'ability') {
      const roleTiers = HS.Data.ROLE_ABILITIES[charDef.role];
      const curSlot = prog.abilityChoices[activeAbilityTier] || 0;
      const ab = roleTiers[activeAbilityTier][curSlot];
      const unlocked = activeAbilityTier < prog.abilityTier;
      upper.appendChild(el(
        'div',
        { className: 'panel-card' },
        el('div', { className: 'item-top' }, el('span', { className: 'section-title', text: `第${activeAbilityTier + 1}段階：${ab.name}` }), el('span', { className: `chip${unlocked ? ' gold' : ''}`, text: unlocked ? '選択中' : '未解放' })),
        el('div', { className: 'section-sub', style: { marginTop: '3px' }, text: ab.desc })
      ));
    } else if (subTab === 'mastery') {
      upper.appendChild(el(
        'div',
        { className: 'lore-box', text: charDef.lore }
      ));
    } else if (subTab === 'awaken') {
      upper.appendChild(el(
        'div',
        { className: 'panel-card' },
        el('div', { className: 'section-title', text: `控え共鳴【${charDef.resonance.name}】` }),
        el('div', { className: 'section-sub', style: { marginTop: '3px' }, text: `${charDef.resonance.desc}（覚醒ごとに能力還元率も上昇）` })
      ));
    }
  }

  function openCharPickerSheet(state) {
    const unlocked = HS.Data.CHARACTERS.filter((c) => HS.Engine.State.isUnlocked(c.id));
    const list = el(
      'div',
      { className: 'list-col scroll-zone', style: { maxHeight: '52vh' } },
      unlocked.map((c) => {
        const prog = HS.Engine.State.getCharProgress(c.id);
        return el(
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
          el('div', { className: 'item-top' }, el('span', { className: 'item-name', text: c.name }), el('span', { className: 'chip', text: `アビ${prog.abilityTier}/5・覚${prog.awakening}/3` })),
          el('div', { className: 'item-meta' }, makeElBadge(c.element), el('span', { className: 'chip', text: HS.CONST.formatRaces(c.races) }), makeRoleBadge(c.role))
        );
      })
    );

    HS.UI.App.openSheet('育成キャラを選択', [list], [
      el('button', { type: 'button', className: 'btn full', text: '閉じる', on: { click: () => HS.UI.App.closeSheet() } })
    ]);
  }

  function render(container) {
    const state = HS.Engine.State.getState();
    const upper = el('div', { className: 'upper-display' });
    const lower = el('div', { className: 'lower-thumb' });

    if (subTab === 'recruit') {
      const shopChars = HS.Data.CHARACTERS.filter((c) => c.unlock && c.unlock.type === 'shop');
      if (!selectedShopCharId || !shopChars.some((c) => c.id === selectedShopCharId)) {
        selectedShopCharId = (shopChars.find((c) => !HS.Engine.State.isUnlocked(c.id)) || shopChars[0]).id;
      }
      const preview = HS.Data.CHAR_MAP[selectedShopCharId];
      const previewOwned = HS.Engine.State.isUnlocked(preview.id);
      const canAfford = state.resources.gold >= preview.unlock.cost;
      const unlockedCount = state.unlockedChars.length;

      upper.appendChild(el(
        'div',
        { className: 'panel-card accent', style: { flex: '1 1 auto', minHeight: '0', display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' } },
        el(
          'div',
          { className: 'item-top' },
          el('span', { className: 'section-title', text: preview.name }),
          el('span', { className: 'chip gold num', text: `加入 ${unlockedCount}/${HS.Data.CHARACTERS.length}` })
        ),
        el('div', { className: 'item-meta' }, makeElBadge(preview.element), el('span', { className: 'chip', text: HS.CONST.formatRaces(preview.races) }), makeRoleBadge(preview.role)),
        el(
          'div',
          { className: 'stat-grid' },
          el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: 'HP' }), el('span', { className: 'stat-v', text: formatNum(preview.base.hp) })),
          el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '攻撃' }), el('span', { className: 'stat-v', text: formatNum(preview.base.atk) })),
          el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '速度' }), el('span', { className: 'stat-v', text: String(preview.base.spd) }))
        ),
        el(
          'div',
          { className: 'list-col', style: { gap: '2px' } },
          preview.skills.map((sk, idx) => el(
            'div',
            { style: { fontSize: '10.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            el('span', { text: sk.passive ? `【常時】${sk.name}` : `技${idx + 1}：${sk.name}` }),
            sk.passive ? el('span', { className: 'chip passive-badge', text: 'パッシブ' }) : makeTargetBadge(sk.target)
          ))
        ),
        el('div', { className: 'section-sub', text: `控え共鳴【${preview.resonance.name}】：${preview.resonance.desc}` }),
        el('div', { className: 'lore-box', text: preview.lore })
      ));

      const recruitList = el('div', { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } });
      for (const c of shopChars) {
        const owned = HS.Engine.State.isUnlocked(c.id);
        recruitList.appendChild(el(
          'button',
          {
            type: 'button',
            className: `item-row${c.id === selectedShopCharId ? ' selected' : ''}${owned ? ' locked-item' : ''}`,
            on: {
              click: () => {
                selectedShopCharId = c.id;
                HS.UI.App.render();
              }
            }
          },
          el(
            'div',
            { className: 'item-top' },
            el('span', { className: 'item-name', text: c.name }),
            el('span', { className: `chip${owned ? ' gold' : ''}`, text: owned ? '加入済' : `🪙${formatNum(c.unlock.cost)}` })
          ),
          el('div', { className: 'item-meta' }, makeElBadge(c.element), el('span', { className: 'chip', text: HS.CONST.formatRaces(c.races) }), makeRoleBadge(c.role))
        ));
      }
      lower.appendChild(recruitList);
      lower.appendChild(el('button', {
        type: 'button',
        className: `btn full${!previewOwned && canAfford ? ' gold' : ''}`,
        disabled: previewOwned || !canAfford,
        text: previewOwned ? `${preview.name}は加入済み` : `🪙${formatNum(preview.unlock.cost)} で【${preview.name}】を仲間に迎える`,
        on: {
          click: () => {
            const res = HS.Engine.State.buyShopCharacter(preview.id);
            if (res.ok) {
              showToast(`【${preview.name}】が仲間になりました！`, 'gold');
              HS.UI.App.render();
            } else {
              showToast(res.reason, 'warn');
            }
          }
        }
      }));
    } else {
      const charDef = ensureSelectedChar(state);
      const prog = HS.Engine.State.getCharProgress(charDef.id);
      renderUpperCharSummary(upper, state, charDef);

      // Character selector button in lower thumb zone
      const pickBtn = el('button', {
        type: 'button',
        className: 'btn sm full active-toggle',
        text: `対象キャラ変更：${charDef.name} ▾`,
        on: { click: () => openCharPickerSheet(state) }
      });
      lower.appendChild(pickBtn);

      if (subTab === 'ability') {
        const roleTiers = HS.Data.ROLE_ABILITIES[charDef.role];

        // Tier 1..5 selector bar
        const tierRow = el(
          'div',
          { className: 'grid-5' },
          [0, 1, 2, 3, 4].map((t) => {
            const unlocked = t < prog.abilityTier;
            return el('button', {
              type: 'button',
              className: `btn sm${t === activeAbilityTier ? ' primary' : unlocked ? ' active-toggle' : ''}`,
              text: unlocked ? `第${t + 1}✓` : `第${t + 1}🔒`,
              on: {
                click: () => {
                  activeAbilityTier = t;
                  HS.UI.App.render();
                }
              }
            });
          })
        );
        lower.appendChild(tierRow);

        const isTierUnlocked = activeAbilityTier < prog.abilityTier;
        const chosenIdx = prog.abilityChoices[activeAbilityTier] || 0;
        const choicesList = el(
          'div',
          { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } },
          roleTiers[activeAbilityTier].map((ab, idx) => el(
            'button',
            {
              type: 'button',
              className: `item-row${isTierUnlocked && idx === chosenIdx ? ' selected' : ''}`,
              on: {
                click: () => {
                  if (!isTierUnlocked) {
                    showToast('先にこの段階を解放すると切り替えられます', 'warn');
                    return;
                  }
                  HS.Engine.State.selectAbilityChoice(charDef.id, activeAbilityTier, idx);
                  showToast(`【${ab.name}】へ切替完了`);
                  HS.UI.App.render();
                }
              }
            },
            el('div', { className: 'item-top' }, el('span', { className: 'item-name', text: `${idx + 1}. ${ab.name}` }), isTierUnlocked && idx === chosenIdx ? el('span', { className: 'chip gold', text: '装着中' }) : null),
            el('div', { className: 'section-sub', text: ab.desc })
          ))
        );
        lower.appendChild(choicesList);

        if (prog.abilityTier < 5) {
          const cost = HS.CONST.ABILITY_COSTS[prog.abilityTier];
          const canUnlock = state.resources.gold >= cost.gold && state.resources.crystal >= cost.crystal;
          lower.appendChild(el('button', {
            type: 'button',
            className: `btn full${canUnlock ? ' gold' : ''}`,
            disabled: !canUnlock,
            text: `第${prog.abilityTier + 1}段階を解放（🪙${formatNum(cost.gold)}・💎${cost.crystal}）`,
            on: {
              click: () => {
                const res = HS.Engine.State.unlockAbilityTier(charDef.id);
                if (res.ok) {
                  activeAbilityTier = res.tier - 1;
                  showToast(`第${res.tier}段階アビリティを解放しました！`, 'gold');
                  HS.UI.App.render();
                } else {
                  showToast(res.reason, 'warn');
                }
              }
            }
          }));
        }
      } else if (subTab === 'mastery') {
        const list = el('div', { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } });
        charDef.skills.forEach((sk, idx) => {
          if (sk.passive) {
            list.appendChild(el(
              'div',
              { className: 'skill-card' },
              el('div', { className: 'skill-card-head' }, el('span', { className: 'skill-card-name', text: `【固有】${sk.name}` }), el('span', { className: 'chip passive-badge', text: '常時発動' })),
              el('div', { className: 'skill-card-desc', text: sk.desc })
            ));
            return;
          }
          const xp = prog.masteryXp[idx] || 0;
          const rank = HS.Engine.State.getMasteryRank(xp);
          const romans = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];
          const nextReq = rank < 5 ? HS.CONST.MASTERY_XP_TABLE[rank] : xp;
          const need = Math.max(0, nextReq - xp);
          const gCost = need * 16;
          const cCost = Math.max(1, Math.ceil(need / 6));

          list.appendChild(el(
            'div',
            { className: 'skill-card' },
            el(
              'div',
              { className: 'skill-card-head' },
              el('span', { className: 'skill-card-name', text: `技${idx + 1}：${sk.name}（熟練${romans[rank - 1]}）` }),
              el('div', { className: 'item-meta' }, makeTargetBadge(sk.target), el('span', { className: 'chip', text: sk.ct > 0 ? `CT${sk.ct}` : '基本' }))
            ),
            el('div', { className: 'skill-card-desc', text: sk.desc }),
            rank < 5
              ? el('button', {
                  type: 'button',
                  className: 'btn sm full',
                  style: { marginTop: '4px' },
                  text: `熟練${romans[rank]}へ鍛錬（🪙${formatNum(gCost)}・💎${cCost} ／ 熟練値 ${xp}/${nextReq}）`,
                  on: {
                    click: () => {
                      const res = HS.Engine.State.trainMastery(charDef.id, idx);
                      if (res.ok) {
                        showToast(`【${sk.name}】が熟練${romans[res.newRank - 1]}に到達！`, 'gold');
                        HS.UI.App.render();
                      } else {
                        showToast(res.reason, 'warn');
                      }
                    }
                  }
                })
              : el('div', { className: 'section-sub', style: { color: '#f6c453', marginTop: '3px' }, text: '✦ 熟練最大（威力極大・高CT技の回転短縮発動）' })
          ));
        });
        lower.appendChild(list);
      } else {
        // Awakening (3 Engraving stages)
        const list = el('div', { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } });
        charDef.awakenings.forEach((aw, idx) => {
          const done = idx < prog.awakening;
          list.appendChild(el(
            'div',
            { className: `panel-card${done ? ' accent' : ''}` },
            el('div', { className: 'item-top' }, el('span', { className: 'item-name', text: aw.name }), el('span', { className: `chip${done ? ' gold' : ''}`, text: done ? '刻印済' : '未解放' })),
            el('div', { className: 'section-sub', style: { marginTop: '3px' }, text: aw.desc })
          ));
        });
        lower.appendChild(list);

        if (prog.awakening < 3) {
          const cost = HS.CONST.AWAKEN_COSTS[prog.awakening];
          const canUnlock = state.resources.gold >= cost.gold && state.resources.shard >= cost.shard;
          lower.appendChild(el('button', {
            type: 'button',
            className: `btn full${canUnlock ? ' gold' : ''}`,
            disabled: !canUnlock,
            text: `第${prog.awakening + 1}刻印を解放（🪙${formatNum(cost.gold)}・🔮${cost.shard}）`,
            on: {
              click: () => {
                const res = HS.Engine.State.unlockAwakening(charDef.id);
                if (res.ok) {
                  showToast(`${charDef.name}の第${res.awakening}刻印を解放！`, 'gold');
                  HS.UI.App.render();
                } else {
                  showToast(res.reason, 'warn');
                }
              }
            }
          }));
        }
      }
    }

    const tabs = el(
      'div',
      { className: 'subtab-bar' },
      [
        { id: 'ability', label: 'アビリティ' },
        { id: 'mastery', label: '技熟練' },
        { id: 'awaken', label: '刻印覚醒' },
        { id: 'recruit', label: '仲間交換' }
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

  HS.UI.GrowthView = { render };
})();
