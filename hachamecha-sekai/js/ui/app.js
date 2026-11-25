(function () {
  'use strict';

  const HS = window.HS;
  const { el, clear, formatNum } = HS.DOM;

  let activeTab = 'deploy'; // 'deploy' | 'party' | 'growth' | 'equip' | 'archive'
  let expTickTimer = null;

  const NAV_ITEMS = [
    { id: 'deploy',  icon: '⚔️', label: '出撃' },
    { id: 'party',   icon: '🛡️', label: '編成' },
    { id: 'growth',  icon: '✦',  label: '育成' },
    { id: 'equip',   icon: '💍', label: '装備' },
    { id: 'archive', icon: '📖', label: '図鑑' }
  ];

  function renderTopBar() {
    const bar = document.getElementById('top-bar');
    const state = HS.Engine.State.getState();
    if (!bar || !state) return;
    clear(bar);

    bar.appendChild(el(
      'div',
      { className: 'top-brand' },
      el('div', { className: 'top-emblem', text: '✦' }),
      el(
        'div',
        { className: 'top-title-wrap' },
        el('div', { className: 'top-title', text: 'はちゃめちゃ世界' }),
        el('div', { className: 'top-subtitle', text: HS.UI.BattleView.getStatusLabel() || `仲間 ${state.unlockedChars.length}/${HS.Data.CHARACTERS.length}` })
      )
    ));

    bar.appendChild(el(
      'div',
      { className: 'top-resources' },
      el('span', { className: 'res-pill gold num', text: `🪙${formatNum(state.resources.gold)}` }),
      el('span', { className: 'res-pill crystal num', text: `💎${formatNum(state.resources.crystal)}` }),
      el('span', { className: 'res-pill shard num', text: `🔮${formatNum(state.resources.shard)}` })
    ));
  }

  function renderBottomNav() {
    const nav = document.getElementById('bottom-nav');
    if (!nav) return;
    const inBattle = HS.UI.BattleView.isActive();
    nav.classList.toggle('hidden-in-battle', inBattle);
    if (inBattle) return;

    clear(nav);
    for (const item of NAV_ITEMS) {
      nav.appendChild(el(
        'button',
        {
          type: 'button',
          className: `nav-btn${activeTab === item.id ? ' active' : ''}`,
          on: {
            click: () => {
              if (HS.UI.BattleView.isActive()) return;
              activeTab = item.id;
              render();
            }
          }
        },
        el('span', { className: 'nav-ico', text: item.icon }),
        el('span', { text: item.label })
      ));
    }
  }

  function render() {
    const root = document.getElementById('screen-root');
    if (!root) return;

    renderTopBar();
    renderBottomNav();

    if (HS.UI.BattleView.isActive()) {
      HS.UI.BattleView.render(root);
      return;
    }

    if (activeTab === 'deploy') HS.UI.DeployView.render(root);
    else if (activeTab === 'party') HS.UI.PartyView.render(root);
    else if (activeTab === 'growth') HS.UI.GrowthView.render(root);
    else if (activeTab === 'equip') HS.UI.EquipView.render(root);
    else HS.UI.ArchiveView.render(root);
  }

  function openSheet(title, bodyNodes, footerButtons) {
    const backdrop = document.getElementById('sheet-backdrop');
    const panel = document.getElementById('sheet-panel');
    if (!backdrop || !panel) return;
    clear(panel);

    panel.appendChild(el('div', { className: 'sheet-handle' }));
    panel.appendChild(el('div', { className: 'sheet-title', text: title }));
    panel.appendChild(el('div', { className: 'sheet-body' }, ...(bodyNodes || [])));
    panel.appendChild(el('div', { className: 'sheet-footer' }, ...(footerButtons || [])));

    backdrop.hidden = false;
  }

  function closeSheet() {
    const backdrop = document.getElementById('sheet-backdrop');
    if (backdrop) backdrop.hidden = true;
  }

  async function boot() {
    HS.PWA.init();
    await HS.Engine.State.init();

    // Backdrop tap closes sheet smoothly
    const backdrop = document.getElementById('sheet-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeSheet();
      });
    }

    HS.Engine.State.subscribe(() => {
      renderTopBar();
    });

    // Lightweight 1s expedition timer refresh only when on Party tab & not in battle
    expTickTimer = setInterval(() => {
      if (activeTab === 'party' && !HS.UI.BattleView.isActive()) {
        const state = HS.Engine.State.getState();
        if (state && state.expeditions.some(Boolean)) {
          const sheetOpen = !document.getElementById('sheet-backdrop')?.hidden;
          if (!sheetOpen) render();
        }
      }
    }, 1000);

    render();
  }

  HS.UI.App = {
    render,
    openSheet,
    closeSheet,
    setTab: (tab) => {
      if (HS.UI.BattleView.isActive()) return;
      activeTab = tab;
      render();
    }
  };

  document.addEventListener('DOMContentLoaded', boot);
})();
