(function () {
  'use strict';

  const Hacha = window.Hacha;
  const U = Hacha.util;
  const C = Hacha.consts;

  const uiState = {
    tab: 'chars',          // chars | enemies | equips | abilities
    abilityRole: 'tank',
    selectedId: null,
    listScrollTop: 0
  };

  function getSortedEnemies() {
    return Hacha.data.ENEMIES.slice().sort(U.compareRosterEntities);
  }

  function getSortedEquips() {
    const order = { weapon: 0, armor: 1, charm: 2 };
    return Hacha.data.EQUIPMENT.slice().sort((a, b) => {
      if (order[a.slot] !== order[b.slot]) return order[a.slot] - order[b.slot];
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.kana.localeCompare(b.kana, 'ja');
    });
  }

  function getEnemyOriginLabel(e) {
    if (e.category === 'raid') return '異界レイド討伐・異界塔5階節目';
    if (e.category === 'intruder') return 'はちゃめちゃ大陸（通常WAVE 0.3%乱入）';
    if (e.category === 'boss') {
      const m = e.id.match(/^e_a(\d)_boss$/);
      return m ? `はちゃめちゃ大陸 エリア${m[1]}-10 ボス` : 'エリアボス';
    }
    const m = e.id.match(/^e_a(\d)_/);
    return m ? `はちゃめちゃ大陸 エリア${m[1]} 出現` : '各地の戦場に出現';
  }

  function render(topEl, bottomEl, app) {
    const state = Hacha.state;
    const cm = Hacha.ui.common;

    let topContent = '';
    let bottomBody = '';

    if (uiState.tab === 'chars') {
      const list = Hacha.data.CHARACTERS.slice().sort(U.compareRosterEntities);
      const sel = list.find((c) => c.id === uiState.selectedId) || list[0];
      uiState.selectedId = sel.id;
      const seen = state.codex.chars.includes(sel.id) || (state.chars[sel.id] && state.chars[sel.id].unlocked);

      const skillsHtml = sel.skills.map((sk) => `
        <div class="skill-mini-row">
          <div class="meta-row">${cm.scopeBadge(sk.scope)}<span class="unit-name-full">${U.escapeHtml(sk.name)}</span></div>
          <span class="skill-desc-line">${U.escapeHtml(sk.desc)}</span>
        </div>
      `).join('');

      /* キャラ紹介文を敵・装備図鑑と同じ最下部位置に統一し、加入条件はその上部へ配置 */
      topContent = `
        ${cm.renderViewHeader(`図鑑：キャラ ${state.codex.chars.length}/${list.length}`)}
        <div class="panel panel-fill">
          <div class="meta-row-nowrap">
            <div class="meta-row">
              <span style="font-size:16px;">${seen ? sel.icon : '❓'}</span>
              <span class="view-title">${U.escapeHtml(sel.name)}</span>
              ${cm.elementBadge(sel.element)}
              ${cm.raceBadges(sel.races)}
              ${cm.roleShortBadge(sel.role)}
            </div>
            <span class="badge ${seen ? 'scope-passive' : 'el-none'}">${seen ? '加入済' : '未加入'}</span>
          </div>
          <div class="skill-mini-row">
            <span class="bu-hp-text" style="color:#ffd15c;">加入条件</span>
            <span class="unit-name-full" style="color:${seen ? '#6effb8' : '#ffe08a'};">${U.escapeHtml(sel.unlockDesc)}</span>
          </div>
          <div class="detail-grid-stats">
            <div class="stat-chip"><span class="stat-chip-lbl">基礎HP</span><span class="stat-chip-val">${sel.base.hp}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">基礎攻撃</span><span class="stat-chip-val">${sel.base.atk}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">基礎防御</span><span class="stat-chip-val">${sel.base.def}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">基礎速度</span><span class="stat-chip-val">${sel.base.spd}</span></div>
          </div>
          <div class="skill-mini-list">${skillsHtml}</div>
          <div class="flavor-box" style="margin-top:auto;">${U.escapeHtml(sel.desc)}</div>
        </div>
      `;

      const tiles = list.map((c) => {
        const own = state.codex.chars.includes(c.id);
        return `
          <button class="item-tile ${c.id === sel.id ? 'selected' : ''} ${own ? '' : 'locked-tile'}" data-cdx-id="${c.id}">
            <div class="meta-row-nowrap">
              <span class="unit-name-full">${own ? c.icon : '🔒'}${U.escapeHtml(c.name)}</span>
              ${cm.roleShortBadge(c.role)}
            </div>
            <div class="meta-row">${cm.elementBadge(c.element)}${cm.raceBadges(c.races)}</div>
          </button>
        `;
      }).join('');

      bottomBody = `<div class="scroll-list-v scroll-grid-2" id="cdx-list">${tiles}</div>`;
    } else if (uiState.tab === 'enemies') {
      const list = getSortedEnemies();
      const sel = list.find((e) => e.id === uiState.selectedId) || list[0];
      uiState.selectedId = sel.id;
      const seen = state.codex.enemies.includes(sel.id);
      const catLabel = { normal: '通常敵', boss: 'エリアボス', intruder: '乱入敵', raid: 'レイドボス' }[sel.category] || '敵';

      const skillsHtml = sel.skills.map((sk) => `
        <div class="skill-mini-row">
          <div class="meta-row">${cm.scopeBadge(sk.scope)}<span class="unit-name-full">${U.escapeHtml(sk.name)}</span></div>
          <span class="bu-hp-text">${sk.cd > 0 ? `間隔${sk.cd}ターン` : '基本技'}</span>
        </div>
      `).join('');

      topContent = `
        ${cm.renderViewHeader(`図鑑：敵 ${state.codex.enemies.length}/${list.length}`)}
        <div class="panel panel-fill">
          <div class="meta-row-nowrap">
            <div class="meta-row">
              <span style="font-size:16px;">${seen ? sel.icon : '❓'}</span>
              <span class="view-title">${seen ? U.escapeHtml(sel.name) : '未遭遇の敵'}</span>
              ${cm.elementBadge(sel.element)}
              ${cm.raceBadges(sel.races)}
            </div>
            <span class="badge ${sel.category === 'intruder' ? 'scope-all' : 'scope-area'}">${catLabel}</span>
          </div>
          <div class="skill-mini-row">
            <span class="bu-hp-text" style="color:#7be3ff;">出現場所</span>
            <span class="unit-name-full">${U.escapeHtml(getEnemyOriginLabel(sel))}</span>
          </div>
          <div class="detail-grid-stats">
            <div class="stat-chip"><span class="stat-chip-lbl">基礎HP</span><span class="stat-chip-val">${seen ? sel.base.hp : '???'}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">基礎攻撃</span><span class="stat-chip-val">${seen ? sel.base.atk : '???'}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">基礎防御</span><span class="stat-chip-val">${seen ? sel.base.def : '???'}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">基礎速度</span><span class="stat-chip-val">${seen ? sel.base.spd : '???'}</span></div>
          </div>
          <div class="skill-mini-list">${seen ? skillsHtml : '<div class="skill-mini-row"><span class="bu-hp-text">戦闘で遭遇すると使用技が記録されます</span></div>'}</div>
          <div class="flavor-box" style="margin-top:auto;">${seen ? U.escapeHtml(sel.desc) : 'まだ遭遇していない異界の存在。各地への出撃や大陸での乱入で記録されます。'}</div>
        </div>
      `;

      const tiles = list.map((e) => {
        const s = state.codex.enemies.includes(e.id);
        return `
          <button class="item-tile ${e.id === sel.id ? 'selected' : ''} ${s ? '' : 'locked-tile'}" data-cdx-id="${e.id}">
            <div class="meta-row-nowrap">
              <span class="unit-name-full">${s ? e.icon : '❓'}${s ? U.escapeHtml(e.name) : '未遭遇'}</span>
              <span class="bu-hp-text">${e.category === 'intruder' ? '🚨' : (e.category === 'raid' ? '👹' : '')}</span>
            </div>
            <div class="meta-row">${cm.elementBadge(e.element)}${cm.raceBadges(e.races)}</div>
          </button>
        `;
      }).join('');

      bottomBody = `<div class="scroll-list-v scroll-grid-2" id="cdx-list">${tiles}</div>`;
    } else if (uiState.tab === 'equips') {
      const list = getSortedEquips();
      const sel = list.find((e) => e.id === uiState.selectedId) || list[0];
      uiState.selectedId = sel.id;
      const seen = state.codex.equips.includes(sel.id);
      const midStats = Hacha.engine.stats.getEquipEffectiveStats({ templateId: sel.id, quality: 50 });
      const hiStats = Hacha.engine.stats.getEquipEffectiveStats({ templateId: sel.id, quality: 80 });
      const maxStats = Hacha.engine.stats.getEquipEffectiveStats({ templateId: sel.id, quality: 100 });
      const ownedCount = state.inventory.filter((it) => it.templateId === sel.id).length;

      topContent = `
        ${cm.renderViewHeader(`図鑑：装備 ${state.codex.equips.length}/${list.length}`)}
        <div class="panel panel-fill">
          <div class="meta-row-nowrap">
            <div class="meta-row">
              <span style="font-size:16px;">${seen ? sel.icon : '❓'}</span>
              <span class="view-title">${seen ? U.escapeHtml(sel.name) : '未入手の装備'}</span>
              <span class="badge race-badge">${C.SLOT_MAP[sel.slot].name}</span>
            </div>
            <span class="badge q-perfect">格位${sel.tier}｜所持${ownedCount}</span>
          </div>
          <div class="detail-grid-stats-5">
            <div class="stat-chip"><span class="stat-chip-lbl">極HP</span><span class="stat-chip-val">${seen ? `+${maxStats.hp}` : '???'}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">極攻撃</span><span class="stat-chip-val">${seen ? `+${maxStats.atk}` : '???'}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">極防御</span><span class="stat-chip-val">${seen ? `+${maxStats.def}` : '???'}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">極速度</span><span class="stat-chip-val">${seen ? `+${maxStats.spd}` : '???'}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">極会心</span><span class="stat-chip-val">${seen ? `+${Math.round(maxStats.crit * 100)}%` : '???'}</span></div>
          </div>
          <div class="skill-mini-list">
            <div class="skill-mini-row">
              <span class="badge q-normal">並 50%</span>
              <span class="bu-hp-text">${seen ? `HP+${midStats.hp} / 攻+${midStats.atk} / 防+${midStats.def} / 速+${midStats.spd}` : '未入手'}</span>
            </div>
            <div class="skill-mini-row">
              <span class="badge q-great">名 80%</span>
              <span class="bu-hp-text">${seen ? `HP+${hiStats.hp} / 攻+${hiStats.atk} / 防+${hiStats.def} / 速+${hiStats.spd}` : '未入手'}</span>
            </div>
            <div class="skill-mini-row">
              <span class="badge q-perfect">👑極100%</span>
              <span class="bu-hp-text" style="color:#ffe066;">${seen ? `HP+${maxStats.hp} / 攻+${maxStats.atk} / 防+${maxStats.def} / 速+${maxStats.spd}` : '未入手'}</span>
            </div>
          </div>
          <div class="flavor-box" style="margin-top:auto;">${seen ? U.escapeHtml(sel.desc) : '各地の戦闘や派遣で獲得すると詳細が記録されます。'}</div>
        </div>
      `;

      const tiles = list.map((e) => {
        const s = state.codex.equips.includes(e.id);
        return `
          <button class="item-tile ${e.id === sel.id ? 'selected' : ''} ${s ? '' : 'locked-tile'}" data-cdx-id="${e.id}">
            <div class="unit-name-full">${s ? e.icon : '❓'}${s ? U.escapeHtml(e.name) : '未入手'}</div>
            <div class="meta-row-nowrap">
              <span class="badge race-badge">${C.SLOT_MAP[e.slot].name}</span>
              <span class="bu-hp-text">格位 ${e.tier}</span>
            </div>
          </button>
        `;
      }).join('');

      bottomBody = `<div class="scroll-list-v scroll-grid-2" id="cdx-list">${tiles}</div>`;
    } else {
      const list = Hacha.data.ABILITY_LIST.filter((a) => a.role === uiState.abilityRole);
      const sel = list.find((a) => a.id === uiState.selectedId) || list[0];
      uiState.selectedId = sel.id;
      const roleMeta = C.ROLE_MAP[sel.role];
      const cost = Hacha.data.ABILITY_UNLOCK_COSTS[sel.tier];
      const roleChars = Hacha.data.CHARACTERS
        .filter((c) => c.role === sel.role)
        .map((c) => `<span class="badge race-badge">${c.icon}${U.escapeHtml(c.name)}</span>`)
        .join('');

      topContent = `
        ${cm.renderViewHeader('図鑑：アビリティ 全100種')}
        <div class="panel panel-fill">
          <div class="meta-row-nowrap">
            <div class="meta-row">
              ${cm.roleBadge(sel.role)}
              <span class="view-title">${U.escapeHtml(sel.name)}</span>
            </div>
            <span class="badge scope-area">段階${sel.tier}｜${sel.choiceIndex + 1}/5</span>
          </div>
          <div class="skill-mini-row">
            <span class="bu-hp-text" style="color:#ffd15c;">段階${sel.tier}解放コスト</span>
            <span class="unit-name-full">${cost ? `${roleMeta.icon}${roleMeta.crystalName}×${cost.crystals}・🪙${U.formatNum(cost.coins)}` : '初期解放'}</span>
          </div>
          <div class="skill-mini-list">
            <div class="bu-hp-text" style="color:#7be3ff;">対象ロールの仲間（編成画面で自由切替可）</div>
            <div class="meta-row">${roleChars}</div>
          </div>
          <div class="flavor-box" style="margin-top:auto;">${U.escapeHtml(sel.desc)}</div>
        </div>
      `;

      const roleTabs = C.ROLES.map((r) => `
        <button class="sub-tab ${uiState.abilityRole === r.id ? 'active' : ''}" data-ab-role="${r.id}">${r.icon}${r.short}</button>
      `).join('');

      const tiles = list.map((a) => `
        <button class="ability-tile ${a.id === sel.id ? 'selected' : ''}" data-cdx-id="${a.id}">
          <div class="meta-row-nowrap">
            <span class="unit-name-full">${U.escapeHtml(a.name)}</span>
            <span class="bu-hp-text">段階${a.tier} (${a.choiceIndex + 1}/5)</span>
          </div>
          <div class="skill-desc-line">${U.escapeHtml(a.desc)}</div>
        </button>
      `).join('');

      bottomBody = `
        <div class="sub-tabs">${roleTabs}</div>
        <div class="scroll-list-v scroll-list-1" id="cdx-list">${tiles}</div>
      `;
    }

    topEl.innerHTML = topContent;
    bottomEl.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab ${uiState.tab === 'chars' ? 'active' : ''}" data-cdx-tab="chars">🧑 キャラ</button>
        <button class="sub-tab ${uiState.tab === 'enemies' ? 'active' : ''}" data-cdx-tab="enemies">👹 敵</button>
        <button class="sub-tab ${uiState.tab === 'equips' ? 'active' : ''}" data-cdx-tab="equips">🎒 装備</button>
        <button class="sub-tab ${uiState.tab === 'abilities' ? 'active' : ''}" data-cdx-tab="abilities">🔷 アビ</button>
      </div>
      ${bottomBody}
    `;

    const listEl = bottomEl.querySelector('#cdx-list');
    cm.bindVerticalScrollState(listEl, () => uiState.listScrollTop, (v) => { uiState.listScrollTop = v; });

    bottomEl.querySelectorAll('[data-cdx-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.tab = b.getAttribute('data-cdx-tab');
        uiState.selectedId = null;
        uiState.listScrollTop = 0;
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-cdx-id]').forEach((b) => {
      b.addEventListener('click', () => {
        Hacha.audio.play('tap');
        if (listEl) uiState.listScrollTop = listEl.scrollTop;
        uiState.selectedId = b.getAttribute('data-cdx-id');
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-ab-role]').forEach((b) => {
      b.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.abilityRole = b.getAttribute('data-ab-role');
        uiState.selectedId = null;
        uiState.listScrollTop = 0;
        app.renderCurrent();
      });
    });
  }

  function resetToMainTab() {
    uiState.tab = 'chars';
    uiState.selectedId = null;
    uiState.listScrollTop = 0;
  }

  Hacha.ui.screenCodex = { render, resetToMainTab };
})();
