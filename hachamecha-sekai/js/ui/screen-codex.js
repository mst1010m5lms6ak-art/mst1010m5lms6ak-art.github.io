(function () {
  'use strict';

  const Hacha = window.Hacha;
  const U = Hacha.util;
  const C = Hacha.consts;

  const uiState = {
    tab: 'chars',     // chars | enemies | equips | abilities | settings
    page: 0,
    selectedId: null,
    abilityRole: 'tank',
    resetArmed: false
  };

  function getSortedEnemies() {
    return Hacha.data.ENEMIES.slice().sort(U.compareRosterEntities);
  }

  function getSortedEquips() {
    return Hacha.data.EQUIPMENT.slice().sort((a, b) => {
      const sDiff = C.SLOT_INDEX[a.slot] - C.SLOT_INDEX[b.slot];
      if (sDiff !== 0) return sDiff;
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.kana.localeCompare(b.kana, 'ja');
    });
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

      topContent = `
        ${cm.renderViewHeader(`図鑑：キャラ ${state.codex.chars.length}/${list.length}`)}
        <div class="panel panel-fill">
          <div class="meta-row-nowrap">
            <div class="meta-row">
              <span style="font-size:16px;">${seen ? sel.icon : '❓'}</span>
              <span class="view-title">${U.escapeHtml(sel.name)}</span>
              ${cm.elementBadge(sel.element)}
              ${cm.raceBadges(sel.races)}
              ${cm.roleBadge(sel.role)}
            </div>
            <span class="badge ${seen ? 'scope-passive' : 'el-none'}">${seen ? '加入済' : '未加入'}</span>
          </div>
          <div class="detail-grid-stats">
            <div class="stat-chip"><span class="stat-chip-lbl">基礎HP</span><span class="stat-chip-val">${sel.base.hp}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">基礎攻撃</span><span class="stat-chip-val">${sel.base.atk}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">基礎防御</span><span class="stat-chip-val">${sel.base.def}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">基礎速度</span><span class="stat-chip-val">${sel.base.spd}</span></div>
          </div>
          <div class="skill-mini-list">${skillsHtml}</div>
          <div class="flavor-box">${U.escapeHtml(sel.desc)}</div>
          <div class="bu-hp-text" style="margin-top:auto;color:#ffd15c;">加入条件：${U.escapeHtml(sel.unlockDesc)}</div>
        </div>
      `;

      const pageSize = 6;
      const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
      uiState.page = U.clamp(uiState.page, 0, totalPages - 1);
      const slice = list.slice(uiState.page * pageSize, uiState.page * pageSize + pageSize);

      const tiles = slice.map((c) => {
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

      bottomBody = `
        <div class="select-grid-2" style="grid-template-rows:repeat(3,1fr);">${tiles}</div>
        <div class="pager-bar">
          <button class="btn btn-sm" id="btn-cdx-prev">◀ 前</button>
          <span class="pager-info">${uiState.page + 1} / ${totalPages}（全${list.length}体）</span>
          <button class="btn btn-sm" id="btn-cdx-next">次 ▶</button>
        </div>
      `;
    } else if (uiState.tab === 'enemies') {
      const list = getSortedEnemies();
      const sel = list.find((e) => e.id === uiState.selectedId) || list[0];
      uiState.selectedId = sel.id;
      const seen = state.codex.enemies.includes(sel.id);
      const catLabel = { normal: '通常敵', boss: 'エリアボス', intruder: '乱入敵', raid: '異界大ボス' }[sel.category] || '敵';

      const skillsHtml = sel.skills.map((sk) => `
        <div class="skill-mini-row">
          <div class="meta-row">${cm.scopeBadge(sk.scope)}<span class="unit-name-full">${U.escapeHtml(sk.name)}</span></div>
          <span class="bu-hp-text">${sk.cd > 0 ? `間隔${sk.cd}` : '基本'}</span>
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
          <div class="detail-grid-stats">
            <div class="stat-chip"><span class="stat-chip-lbl">基礎HP</span><span class="stat-chip-val">${seen ? sel.base.hp : '???'}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">基礎攻撃</span><span class="stat-chip-val">${seen ? sel.base.atk : '???'}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">基礎防御</span><span class="stat-chip-val">${seen ? sel.base.def : '???'}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">基礎速度</span><span class="stat-chip-val">${seen ? sel.base.spd : '???'}</span></div>
          </div>
          <div class="skill-mini-list">${seen ? skillsHtml : '<div class="skill-mini-row"><span class="bu-hp-text">戦闘で遭遇すると技情報が記録されます</span></div>'}</div>
          <div class="flavor-box" style="margin-top:auto;">${seen ? U.escapeHtml(sel.desc) : 'まだ遭遇していない異界の存在。各地への出撃や乱入で記録されます。'}</div>
        </div>
      `;

      const pageSize = 6;
      const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
      uiState.page = U.clamp(uiState.page, 0, totalPages - 1);
      const slice = list.slice(uiState.page * pageSize, uiState.page * pageSize + pageSize);

      const tiles = slice.map((e) => {
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

      bottomBody = `
        <div class="select-grid-2" style="grid-template-rows:repeat(3,1fr);">${tiles}</div>
        <div class="pager-bar">
          <button class="btn btn-sm" id="btn-cdx-prev">◀ 前</button>
          <span class="pager-info">${uiState.page + 1} / ${totalPages}（全${list.length}種）</span>
          <button class="btn btn-sm" id="btn-cdx-next">次 ▶</button>
        </div>
      `;
    } else if (uiState.tab === 'equips') {
      const list = getSortedEquips();
      const sel = list.find((e) => e.id === uiState.selectedId) || list[0];
      uiState.selectedId = sel.id;
      const seen = state.codex.equips.includes(sel.id);
      const maxStats = Hacha.engine.stats.getEquipEffectiveStats({ templateId: sel.id, quality: 100 });

      topContent = `
        ${cm.renderViewHeader(`図鑑：装備 ${state.codex.equips.length}/${list.length}`)}
        <div class="panel panel-fill">
          <div class="meta-row-nowrap">
            <div class="meta-row">
              <span style="font-size:16px;">${seen ? sel.icon : '❓'}</span>
              <span class="view-title">${seen ? U.escapeHtml(sel.name) : '未入手の装備'}</span>
              <span class="badge race-badge">${C.SLOT_MAP[sel.slot].name}</span>
            </div>
            <span class="badge q-perfect">極品質参考値</span>
          </div>
          <div class="detail-grid-stats">
            <div class="stat-chip"><span class="stat-chip-lbl">極HP</span><span class="stat-chip-val">${seen ? `+${maxStats.hp}` : '???'}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">極攻撃</span><span class="stat-chip-val">${seen ? `+${maxStats.atk}` : '???'}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">極防御</span><span class="stat-chip-val">${seen ? `+${maxStats.def}` : '???'}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">極速 / 会</span><span class="stat-chip-val">${seen ? `+${maxStats.spd}/${Math.round(maxStats.crit * 100)}%` : '???'}</span></div>
          </div>
          <div class="flavor-box" style="margin-top:auto;">${seen ? U.escapeHtml(sel.desc) : '各地の戦闘や派遣で獲得すると詳細が記録されます。'}</div>
        </div>
      `;

      const pageSize = 6;
      const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
      uiState.page = U.clamp(uiState.page, 0, totalPages - 1);
      const slice = list.slice(uiState.page * pageSize, uiState.page * pageSize + pageSize);

      const tiles = slice.map((e) => {
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

      bottomBody = `
        <div class="select-grid-2" style="grid-template-rows:repeat(3,1fr);">${tiles}</div>
        <div class="pager-bar">
          <button class="btn btn-sm" id="btn-cdx-prev">◀ 前</button>
          <span class="pager-info">${uiState.page + 1} / ${totalPages}（全${list.length}種）</span>
          <button class="btn btn-sm" id="btn-cdx-next">次 ▶</button>
        </div>
      `;
    } else if (uiState.tab === 'abilities') {
      const list = Hacha.data.ABILITY_LIST.filter((a) => a.role === uiState.abilityRole);
      const sel = list.find((a) => a.id === uiState.selectedId) || list[0];
      uiState.selectedId = sel.id;

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
          <div class="flavor-box">${U.escapeHtml(sel.desc)}</div>
          <div class="note-text" style="margin-top:auto;">
            各ロールごとに5段階×5種類のアビリティが存在し、編成画面から解放・自由切替が可能です。
          </div>
        </div>
      `;

      const roleTabs = C.ROLES.map((r) => `
        <button class="sub-tab ${uiState.abilityRole === r.id ? 'active' : ''}" data-ab-role="${r.id}">${r.icon}${r.short}</button>
      `).join('');

      const pageSize = 5;
      const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
      uiState.page = U.clamp(uiState.page, 0, totalPages - 1);
      const slice = list.slice(uiState.page * pageSize, uiState.page * pageSize + pageSize);

      const tiles = slice.map((a) => `
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
        <div class="select-list-fixed" style="grid-template-rows:repeat(5,1fr);">${tiles}</div>
        <div class="pager-bar">
          <button class="btn btn-sm" id="btn-cdx-prev">◀ 前</button>
          <span class="pager-info">段階${uiState.page + 1} / ${totalPages}</span>
          <button class="btn btn-sm" id="btn-cdx-next">次 ▶</button>
        </div>
      `;
    } else {
      /* 設定・戦績記録・オフラインセーブ入出力 */
      const p = state.progress;
      topContent = `
        ${cm.renderViewHeader('記録・設定')}
        <div class="panel panel-fill">
          <div class="detail-grid-stats">
            <div class="stat-chip"><span class="stat-chip-lbl">総戦闘数</span><span class="stat-chip-val">${p.totalBattles}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">総勝利数</span><span class="stat-chip-val">${p.totalWins}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">乱入撃破</span><span class="stat-chip-val">${p.intruderKills}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">無限塔最高</span><span class="stat-chip-val">${p.bestTowerFloor}F</span></div>
          </div>
          <div class="detail-grid-stats">
            <div class="stat-chip"><span class="stat-chip-lbl">キャラ</span><span class="stat-chip-val">${state.codex.chars.length}/${Hacha.data.CHARACTERS.length}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">敵記録</span><span class="stat-chip-val">${state.codex.enemies.length}/${Hacha.data.ENEMIES.length}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">装備記録</span><span class="stat-chip-val">${state.codex.equips.length}/${Hacha.data.EQUIPMENT.length}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">制覇大陸</span><span class="stat-chip-val">${Object.keys(p.clearedStages).length}/50</span></div>
          </div>
          <div class="flavor-box" style="margin-top:auto;">
            セーブデータは端末内へ自動保存され、電波のないオフライン環境でも引き続き遊べます。機種変更やバックアップには書き出し機能をご活用ください。
          </div>
        </div>
      `;

      bottomBody = `
        <div class="panel panel-fill" style="justify-content:space-between;">
          <div class="action-row">
            <button class="btn ${state.settings.seEnabled ? 'btn-toggle-on' : ''}" id="btn-set-se">
              🔊 効果音：${state.settings.seEnabled ? 'ON' : 'OFF'}
            </button>
            <button class="btn" id="btn-set-speed">
              ⏩ 戦闘速度：${state.settings.battleSpeed}倍速
            </button>
          </div>
          <div class="action-row">
            <button class="btn btn-primary" id="btn-save-export">📤 セーブ書き出し</button>
            <button class="btn btn-emerald" id="btn-save-import">📥 セーブ復元</button>
          </div>
          <div class="action-row">
            <button class="btn btn-danger" id="btn-save-reset">
              ${uiState.resetArmed ? '⚠️ もう一度押すと完全初期化' : '🗑️ データを最初からやり直す'}
            </button>
          </div>
        </div>
      `;
    }

    topEl.innerHTML = topContent;
    bottomEl.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab ${uiState.tab === 'chars' ? 'active' : ''}" data-cdx-tab="chars">🧑キャラ</button>
        <button class="sub-tab ${uiState.tab === 'enemies' ? 'active' : ''}" data-cdx-tab="enemies">👹敵</button>
        <button class="sub-tab ${uiState.tab === 'equips' ? 'active' : ''}" data-cdx-tab="equips">🎒装備</button>
        <button class="sub-tab ${uiState.tab === 'abilities' ? 'active' : ''}" data-cdx-tab="abilities">🔷技核</button>
        <button class="sub-tab ${uiState.tab === 'settings' ? 'active' : ''}" data-cdx-tab="settings">⚙️設定</button>
      </div>
      ${bottomBody}
    `;

    bottomEl.querySelectorAll('[data-cdx-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.tab = b.getAttribute('data-cdx-tab');
        uiState.page = 0;
        uiState.selectedId = null;
        uiState.resetArmed = false;
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-cdx-id]').forEach((b) => {
      b.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.selectedId = b.getAttribute('data-cdx-id');
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-ab-role]').forEach((b) => {
      b.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.abilityRole = b.getAttribute('data-ab-role');
        uiState.page = 0;
        uiState.selectedId = null;
        app.renderCurrent();
      });
    });

    const pr = bottomEl.querySelector('#btn-cdx-prev');
    const nx = bottomEl.querySelector('#btn-cdx-next');
    if (pr) pr.addEventListener('click', () => { Hacha.audio.play('tap'); uiState.page = Math.max(0, uiState.page - 1); app.renderCurrent(); });
    if (nx) nx.addEventListener('click', () => { Hacha.audio.play('tap'); uiState.page += 1; app.renderCurrent(); });

    const seBtn = bottomEl.querySelector('#btn-set-se');
    if (seBtn) seBtn.addEventListener('click', () => {
      state.settings.seEnabled = !state.settings.seEnabled;
      Hacha.storage.saveState(true);
      if (state.settings.seEnabled) Hacha.audio.play('tap');
      app.renderCurrent();
    });

    const spdBtn = bottomEl.querySelector('#btn-set-speed');
    if (spdBtn) spdBtn.addEventListener('click', () => {
      Hacha.audio.play('tap');
      state.settings.battleSpeed = state.settings.battleSpeed === 1 ? 2 : (state.settings.battleSpeed === 2 ? 3 : 1);
      Hacha.storage.saveState(true);
      app.renderCurrent();
    });

    const expBtn = bottomEl.querySelector('#btn-save-export');
    if (expBtn) expBtn.addEventListener('click', () => {
      Hacha.audio.play('tap');
      const dataStr = Hacha.storage.exportSaveString();
      cm.openBottomOverlay(
        `<div class="panel"><div class="view-title">セーブデータの書き出し</div><div class="note-text" style="margin-top:4px;">下のテキストをコピーしてメモ帳などへ保管できます。</div></div>`,
        `
          <textarea class="textarea-io" id="io-export-box" readonly>${U.escapeHtml(dataStr)}</textarea>
          <div class="action-row">
            <button class="btn btn-primary" id="io-copy">📋 コピー</button>
            <button class="btn" id="io-close">閉じる</button>
          </div>
        `,
        (root) => {
          root.querySelector('#io-copy').addEventListener('click', () => {
            const box = root.querySelector('#io-export-box');
            box.select();
            try { navigator.clipboard.writeText(box.value); } catch (e) {}
            cm.showToast('セーブ文字列をコピーしました！', 'gold');
          });
          root.querySelector('#io-close').addEventListener('click', () => { Hacha.audio.play('tap'); cm.closeOverlay(); });
        },
        { compact: true }
      );
    });

    const impBtn = bottomEl.querySelector('#btn-save-import');
    if (impBtn) impBtn.addEventListener('click', () => {
      Hacha.audio.play('tap');
      cm.openBottomOverlay(
        `<div class="panel"><div class="view-title">セーブデータの復元</div><div class="note-text" style="margin-top:4px;">書き出した文字列を貼り付けて復元を押してください。</div></div>`,
        `
          <textarea class="textarea-io" id="io-import-box" placeholder="ここにセーブ文字列を貼り付け"></textarea>
          <div class="action-row">
            <button class="btn btn-emerald" id="io-apply">📥 復元を実行</button>
            <button class="btn" id="io-close">キャンセル</button>
          </div>
        `,
        (root) => {
          root.querySelector('#io-apply').addEventListener('click', () => {
            try {
              Hacha.storage.importSaveString(root.querySelector('#io-import-box').value.trim());
              cm.closeOverlay();
              cm.showToast('セーブデータを復元しました！', 'gold');
              app.renderCurrent();
            } catch (e) {
              cm.showToast('形式エラー：復元できませんでした', 'danger');
            }
          });
          root.querySelector('#io-close').addEventListener('click', () => { Hacha.audio.play('tap'); cm.closeOverlay(); });
        },
        { compact: true }
      );
    });

    const rstBtn = bottomEl.querySelector('#btn-save-reset');
    if (rstBtn) rstBtn.addEventListener('click', () => {
      if (!uiState.resetArmed) {
        uiState.resetArmed = true;
        Hacha.audio.play('tap');
        cm.showToast('もう一度押すとデータが初期化されます', 'danger');
        app.renderCurrent();
        return;
      }
      uiState.resetArmed = false;
      Hacha.storage.resetSave();
      Hacha.audio.play('tap');
      cm.showToast('セーブデータを初期化しました');
      app.renderCurrent();
    });
  }

  function resetToMainTab() { uiState.tab = 'chars'; uiState.page = 0; uiState.selectedId = null; }

  Hacha.ui.screenCodex = { render, resetToMainTab };
})();
