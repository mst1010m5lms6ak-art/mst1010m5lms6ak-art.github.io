(function () {
  'use strict';

  const HS = window.HS;
  const { el, clear, formatNum, formatTime, makeElBadge, makeRoleBadge, showToast } = HS.DOM;

  let subTab = 'formation'; // 'formation' | 'expedition'
  let editTarget = { group: 'front', slot: 0 }; // currently editing slot
  let selectedRouteId = 'exp_gold';
  let selectedExpChars = [];

  function renderFormation(upper, lower, state) {
    const snap = HS.Engine.Stats.buildPartyCombatSnapshots(state);

    // Upper display: Current 4 Frontline + 4 Reserve Links overview + Active Synergies (non-interactive!)
    const pairGrid = el(
      'div',
      { className: 'grid-2' },
      [0, 1, 2, 3].map((i) => {
        const fid = state.frontParty[i];
        const rid = state.reserveLinks[i];
        const fc = fid ? HS.Data.CHAR_MAP[fid] : null;
        const rc = rid ? HS.Data.CHAR_MAP[rid] : null;
        const isEditingFront = editTarget.group === 'front' && editTarget.slot === i;
        const isEditingRes = editTarget.group === 'reserve' && editTarget.slot === i;
        const fUnit = snap.units.find((u) => u.slotIdx === i);

        return el(
          'div',
          {
            className: `panel-card${isEditingFront || isEditingRes ? ' accent' : ''}`,
            style: { padding: '5px 7px' }
          },
          el(
            'div',
            { className: 'item-top' },
            el('span', { style: { fontSize: '11px', fontWeight: '800', color: isEditingFront ? '#38d9f5' : '#f1f5ff' }, text: fc ? `${HS.CONST.EL_MAP[fc.element].icon}${fc.name}` : `前衛${i + 1}：空` }),
            fc ? el('span', { style: { fontSize: '10px' }, text: HS.CONST.ROLE_MAP[fc.role].icon }) : null
          ),
          el('div', {
            style: { fontSize: '9.5px', color: '#a8b7d4', marginTop: '2px' },
            text: fUnit ? `HP${formatNum(fUnit.stats.maxHp)} 攻${formatNum(fUnit.stats.atk)} 速${fUnit.stats.spd}` : '未配置'
          }),
          el('div', {
            style: { fontSize: '10px', marginTop: '3px', color: isEditingRes ? '#f6c453' : '#96a8ca' },
            text: rc ? `↳ 控え：${rc.name}` : '↳ 控え共鳴：未設定'
          })
        );
      })
    );

    const synBox = el(
      'div',
      { className: 'panel-card', style: { padding: '6px 8px' } },
      el('div', { className: 'section-heading' }, el('span', { className: 'section-title', text: `発動シナジー (${snap.synergies.length})` }), el('span', { className: 'section-sub', text: '前衛＋控え共鳴で合算' })),
      el(
        'div',
        { className: 'synergy-wrap' },
        snap.synergies.length > 0
          ? snap.synergies.map((s) => el('span', { className: 'syn-pill', text: `${s.label} ${s.desc}` }))
          : [el('span', { className: 'section-sub', text: '同属性2体・同種族2体・全4ロール揃い等で発動' })]
      )
    );

    upper.appendChild(pairGrid);
    upper.appendChild(synBox);

    // Lower thumb zone: Slot selector (Front 1..4 / Reserve 1..4) + Sorted Character Roster
    const slotRow1 = el(
      'div',
      { className: 'grid-4' },
      [0, 1, 2, 3].map((i) => el('button', {
        type: 'button',
        className: `btn sm${editTarget.group === 'front' && editTarget.slot === i ? ' primary' : ''}`,
        text: `前衛${i + 1}`,
        on: {
          click: () => {
            editTarget = { group: 'front', slot: i };
            HS.UI.App.render();
          }
        }
      }))
    );

    const slotRow2 = el(
      'div',
      { className: 'grid-4' },
      [0, 1, 2, 3].map((i) => el('button', {
        type: 'button',
        className: `btn sm${editTarget.group === 'reserve' && editTarget.slot === i ? ' gold' : ''}`,
        text: `控え${i + 1}`,
        on: {
          click: () => {
            editTarget = { group: 'reserve', slot: i };
            HS.UI.App.render();
          }
        }
      }))
    );

    const unlockedList = HS.Data.CHARACTERS.filter((c) => HS.Engine.State.isUnlocked(c.id));
    const rosterList = el('div', { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } });

    // Clear slot option
    const currentId = editTarget.group === 'front' ? state.frontParty[editTarget.slot] : state.reserveLinks[editTarget.slot];
    if (currentId) {
      rosterList.appendChild(el('button', {
        type: 'button',
        className: 'btn sm',
        text: `選択中の${editTarget.group === 'front' ? `前衛${editTarget.slot + 1}` : `控え${editTarget.slot + 1}`}を外す`,
        on: {
          click: () => {
            const ok = editTarget.group === 'front'
              ? HS.Engine.State.setFrontSlot(editTarget.slot, null)
              : HS.Engine.State.setReserveSlot(editTarget.slot, null);
            if (!ok) showToast('前衛には最低1人必要です', 'warn');
            HS.UI.App.render();
          }
        }
      }));
    }

    for (const c of unlockedList) {
      const assign = HS.Engine.State.getCharAssignment(c.id);
      const isSelectedHere = currentId === c.id;
      const statusLabel = assign.type === 'front'
        ? `前衛${assign.slot + 1}`
        : assign.type === 'reserve'
          ? `控え${assign.slot + 1}`
          : assign.type === 'expedition'
            ? `遠征中`
            : '待機';

      rosterList.appendChild(el(
        'button',
        {
          type: 'button',
          className: `item-row${isSelectedHere ? ' selected' : ''}${assign.type === 'expedition' ? ' locked-item' : ''}`,
          disabled: assign.type === 'expedition',
          on: {
            click: () => {
              const ok = editTarget.group === 'front'
                ? HS.Engine.State.setFrontSlot(editTarget.slot, c.id)
                : HS.Engine.State.setReserveSlot(editTarget.slot, c.id);
              if (!ok) showToast('配置を変更できませんでした', 'warn');
              HS.UI.App.render();
            }
          }
        },
        el(
          'div',
          { className: 'item-top' },
          el('span', { className: 'item-name', text: c.name }),
          el('span', { className: `chip${assign.type !== 'idle' ? ' gold' : ''}`, text: statusLabel })
        ),
        el(
          'div',
          { className: 'item-meta' },
          makeElBadge(c.element),
          el('span', { className: 'chip', text: HS.CONST.formatRaces(c.races) }),
          makeRoleBadge(c.role)
        ),
        editTarget.group === 'reserve'
          ? el('div', { className: 'section-sub', text: `共鳴【${c.resonance.name}】：${c.resonance.desc}` })
          : null
      ));
    }

    lower.appendChild(slotRow1);
    lower.appendChild(slotRow2);
    lower.appendChild(rosterList);
  }

  function renderExpedition(upper, lower, state) {
    // Upper display: Active 3 Expedition Squads status (pure display!)
    const activeWrap = el('div', { className: 'list-col' });
    for (let i = 0; i < 3; i++) {
      const exp = state.expeditions[i];
      if (!exp) {
        activeWrap.appendChild(el(
          'div',
          { className: 'panel-card' },
          el('div', { className: 'item-top' }, el('span', { className: 'section-title', text: `遠征部隊 ${i + 1}` }), el('span', { className: 'section-sub', text: '待機中' }))
        ));
      } else {
        const st = HS.Engine.State.getExpeditionStatus(exp);
        const names = exp.charIds.map((id) => HS.Data.CHAR_MAP[id]?.name || '').join('・');
        activeWrap.appendChild(el(
          'div',
          { className: `panel-card${st.done ? ' accent' : ''}` },
          el(
            'div',
            { className: 'item-top' },
            el('span', { className: 'section-title', text: `部隊${i + 1}：${st.route.name}` }),
            el('span', { className: `chip${st.done ? ' gold' : ''}`, text: st.done ? '帰還完了!' : `残り ${formatTime(st.remainSec * 1000)}` })
          ),
          el('div', { className: 'section-sub', style: { margin: '3px 0' }, text: `派遣：${names}` }),
          el('div', { className: 'exp-bar' }, el('div', { className: 'exp-bar-fill', style: { transform: `scaleX(${st.pct.toFixed(3)})` } }))
        ));
      }
    }
    const idleCount = HS.Engine.State.getIdleChars().length;
    const activeExpCount = state.expeditions.filter(Boolean).length;
    const dispatchedCount = state.expeditions.reduce((sum, e) => sum + (e ? e.charIds.length : 0), 0);
    upper.appendChild(el(
      'div',
      { className: 'panel-card accent' },
      el('div', { className: 'item-top' }, el('span', { className: 'section-title', text: '異界遠征隊 稼働状況' }), el('span', { className: 'chip gold num', text: `稼働 ${activeExpCount}/3部隊` })),
      el(
        'div',
        { className: 'stat-grid', style: { marginTop: '5px' } },
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '派遣中' }), el('span', { className: 'stat-v', text: `${dispatchedCount}人` })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '待機中' }), el('span', { className: 'stat-v', text: `${idleCount}人` })),
        el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '総仲間' }), el('span', { className: 'stat-v', text: `${state.unlockedChars.length}人` }))
      )
    ));
    upper.appendChild(activeWrap);

    // Lower thumb zone: Claim / Cancel buttons + Dispatch New Squad
    const actionArea = el('div', { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } });

    // Claim buttons for finished expeditions
    for (let i = 0; i < 3; i++) {
      const exp = state.expeditions[i];
      if (!exp) continue;
      const st = HS.Engine.State.getExpeditionStatus(exp);
      if (st.done) {
        actionArea.appendChild(el('button', {
          type: 'button',
          className: 'btn gold full',
          text: `遠征部隊${i + 1}（${st.route.name}）の報酬を受け取る`,
          on: {
            click: () => {
              const res = HS.Engine.State.claimExpedition(i);
              if (res.ok) {
                const extra = res.dropRes
                  ? (res.dropRes.kept ? `・装備入手` : `・装備自動売却+${res.dropRes.soldGold}`)
                  : '';
                showToast(`世界貨+${res.gold} 結晶+${res.crystal} 欠片+${res.shard}${extra}`, 'gold');
                HS.UI.App.render();
              }
            }
          }
        }));
      } else {
        actionArea.appendChild(el('button', {
          type: 'button',
          className: 'btn sm full',
          text: `遠征部隊${i + 1}を呼び戻す（中断）`,
          on: {
            click: () => {
              HS.Engine.State.cancelExpedition(i);
              showToast('遠征部隊を呼び戻しました');
              HS.UI.App.render();
            }
          }
        }));
      }
    }

    const emptySlot = state.expeditions.findIndex((x) => !x);
    const idleChars = HS.Engine.State.getIdleChars();
    selectedExpChars = selectedExpChars.filter((id) => idleChars.some((c) => c.id === id));

    if (emptySlot !== -1) {
      actionArea.appendChild(el('div', { className: 'section-title', text: '新規遠征の派遣先' }));
      actionArea.appendChild(el(
        'div',
        { className: 'grid-2' },
        HS.Data.EXPEDITIONS.map((r) => el('button', {
          type: 'button',
          className: `btn sm${r.id === selectedRouteId ? ' active-toggle' : ''}`,
          text: r.name,
          on: {
            click: () => {
              selectedRouteId = r.id;
              HS.UI.App.render();
            }
          }
        }))
      ));

      const route = HS.Data.EXPEDITIONS.find((r) => r.id === selectedRouteId) || HS.Data.EXPEDITIONS[0];
      actionArea.appendChild(el('div', { className: 'section-sub', text: `${route.desc}（戦闘勝利ごとに-${route.clearAccelSec}秒加速）` }));

      if (idleChars.length === 0) {
        actionArea.appendChild(el('div', { className: 'panel-card section-sub', text: '派遣できる待機キャラがいません。仲間を増やすと余剰キャラを遠征へ送り出せます。' }));
      } else {
        actionArea.appendChild(el('div', { className: 'section-title', text: `待機キャラ選択 (${selectedExpChars.length}/4)` }));
        for (const c of idleChars) {
          const picked = selectedExpChars.includes(c.id);
          actionArea.appendChild(el(
            'button',
            {
              type: 'button',
              className: `item-row${picked ? ' selected' : ''}`,
              on: {
                click: () => {
                  if (picked) {
                    selectedExpChars = selectedExpChars.filter((id) => id !== c.id);
                  } else if (selectedExpChars.length < 4) {
                    selectedExpChars.push(c.id);
                  }
                  HS.UI.App.render();
                }
              }
            },
            el('div', { className: 'item-top' }, el('span', { className: 'item-name', text: c.name }), el('span', { className: `chip${picked ? ' gold' : ''}`, text: picked ? '選択中' : '待機' })),
            el('div', { className: 'item-meta' }, makeElBadge(c.element), el('span', { className: 'chip', text: HS.CONST.formatRaces(c.races) }), makeRoleBadge(c.role))
          ));
        }
      }

      lower.appendChild(actionArea);
      lower.appendChild(el('button', {
        type: 'button',
        className: 'btn primary full',
        disabled: selectedExpChars.length === 0,
        text: `遠征部隊${emptySlot + 1}を出発させる (${selectedExpChars.length}人)`,
        on: {
          click: () => {
            const res = HS.Engine.State.startExpedition(emptySlot, selectedRouteId, selectedExpChars);
            if (res.ok) {
              selectedExpChars = [];
              showToast('異界遠征へ出発しました！', 'gold');
              HS.UI.App.render();
            } else {
              showToast(res.reason, 'warn');
            }
          }
        }
      }));
    } else {
      lower.appendChild(actionArea);
    }
  }

  function render(container) {
    const state = HS.Engine.State.getState();
    const upper = el('div', { className: 'upper-display' });
    const lower = el('div', { className: 'lower-thumb' });

    if (subTab === 'formation') {
      renderFormation(upper, lower, state);
    } else {
      renderExpedition(upper, lower, state);
    }

    const tabs = el(
      'div',
      { className: 'subtab-bar' },
      [
        { id: 'formation', label: '前衛・控え共鳴' },
        { id: 'expedition', label: '異界遠征隊' }
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

  HS.UI.PartyView = { render };
})();
