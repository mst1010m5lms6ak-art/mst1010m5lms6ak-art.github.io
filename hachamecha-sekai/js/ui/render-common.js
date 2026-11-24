(function () {
  'use strict';

  const Hacha = window.Hacha;
  const U = Hacha.util;
  const C = Hacha.consts;

  function elementBadge(elId) {
    const e = C.ELEMENT_MAP[elId] || C.ELEMENT_MAP.none;
    return `<span class="badge ${e.cls}">${e.icon}${e.name}</span>`;
  }

  function roleBadge(roleId) {
    const r = C.ROLE_MAP[roleId] || C.ROLE_MAP.dealer;
    return `<span class="badge ${r.cls}">${r.icon}${r.name}</span>`;
  }

  function roleShortBadge(roleId) {
    const r = C.ROLE_MAP[roleId] || C.ROLE_MAP.dealer;
    return `<span class="badge ${r.cls}">${r.icon}${r.short}</span>`;
  }

  function raceBadges(races) {
    return (races || []).map((rid) => {
      const r = C.RACE_MAP[rid];
      return r ? `<span class="badge race-badge">${r.name}</span>` : '';
    }).join('');
  }

  function scopeBadge(scopeId) {
    const s = C.SCOPE_META[scopeId] || C.SCOPE_META.single;
    return `<span class="badge ${s.cls}">${s.label}</span>`;
  }

  function qualityBadge(quality) {
    const q = U.getQualityInfo(quality);
    const crown = q.key === 'perfect' ? '👑' : '';
    return `<span class="badge ${q.badgeClass}">${crown}${q.label} ${q.q}%</span>`;
  }

  function renderViewHeader(title) {
    const res = Hacha.state.resources;
    return `
      <div class="view-header">
        <div class="view-title">${U.escapeHtml(title)}</div>
        <div class="resource-strip">
          <span class="res-pill">🪙${U.formatNum(res.coins)}</span>
          <span class="res-pill">📜${U.formatNum(res.scrolls)}</span>
          <span class="res-pill">🔮${U.formatNum(res.fragments)}</span>
        </div>
      </div>
    `;
  }

  function renderEquipStatsLine(itemInstance) {
    const st = Hacha.engine.stats.getEquipEffectiveStats(itemInstance);
    const parts = [];
    if (st.hp) parts.push(`HP+${st.hp}`);
    if (st.atk) parts.push(`攻+${st.atk}`);
    if (st.def) parts.push(`防+${st.def}`);
    if (st.spd) parts.push(`速+${st.spd}`);
    if (st.crit) parts.push(`会+${Math.round(st.crit * 100)}%`);
    return parts.join(' / ');
  }

  function showToast(text, tone) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = `toast-item ${tone || ''}`;
    el.textContent = text;
    root.appendChild(el);
    while (root.children.length > 3) root.removeChild(root.firstChild);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2250);
  }

  function openBottomOverlay(topHtml, bottomHtml, onBind, opts) {
    const root = document.getElementById('overlay-root');
    if (!root) return;
    const compactCls = (opts && opts.compact) ? 'compact-anchor' : '';
    root.classList.remove('hidden');
    root.setAttribute('aria-hidden', 'false');
    root.innerHTML = `
      <div class="overlay-shell">
        <div class="overlay-top-view ${compactCls}">${topHtml}</div>
        <div class="overlay-bottom-sheet">${bottomHtml}</div>
      </div>
    `;
    if (onBind) onBind(root);
  }

  function closeOverlay() {
    const root = document.getElementById('overlay-root');
    if (!root) return;
    root.classList.add('hidden');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '';
  }

  function getAutoSellLabel(threshold) {
    const opt = C.AUTO_SELL_OPTIONS.find((o) => o.value === threshold);
    return opt ? opt.label : '自動売却OFF';
  }

  function cycleAutoSellSetting() {
    const opts = C.AUTO_SELL_OPTIONS;
    const cur = Hacha.state.settings.autoSellBelow || 0;
    const idx = opts.findIndex((o) => o.value === cur);
    const next = opts[(idx + 1) % opts.length];
    Hacha.state.settings.autoSellBelow = next.value;
    Hacha.storage.saveState(true);
    Hacha.audio.play('tap');
    showToast(next.label);
    return next;
  }

  Hacha.ui.common = {
    elementBadge,
    roleBadge,
    roleShortBadge,
    raceBadges,
    scopeBadge,
    qualityBadge,
    renderViewHeader,
    renderEquipStatsLine,
    showToast,
    openBottomOverlay,
    closeOverlay,
    getAutoSellLabel,
    cycleAutoSellSetting
  };
})();
