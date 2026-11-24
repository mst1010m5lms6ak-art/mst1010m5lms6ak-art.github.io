(function () {
  'use strict';

  const Hacha = window.Hacha;
  const U = Hacha.util;

  const uiState = {
    resetArmed: false
  };

  function render(topEl, bottomEl, app) {
    const state = Hacha.state;
    const cm = Hacha.ui.common;
    const p = state.progress;
    const sellLabel = cm.getAutoSellPrefixedLabel(state.settings.autoSellBelow);
    const arenaClearedCount = Object.keys(p.arenaCleared || {}).length;
    const raidClearedCount = Object.keys(p.bossCleared || {}).length;
    const stageClearedCount = Object.keys(p.clearedStages || {}).length;
    const partyPower = state.party.reduce((sum, cid) => {
      if (!cid) return sum;
      return sum + Hacha.engine.stats.computeSingleCharStats(state, cid, true).power;
    }, 0);

    /* ==================== 上半分：閲覧専用 戦績＆設定ステータス ==================== */
    topEl.innerHTML = `
      ${cm.renderViewHeader('はちゃめちゃ世界｜設定')}
      <div class="panel panel-fill" style="justify-content:space-between;">
        <div class="meta-row-nowrap">
          <span class="view-title">冒険の記録</span>
          <span class="badge q-master">主力総戦力 ${U.formatNum(partyPower)}</span>
        </div>

        <div class="detail-grid-stats">
          <div class="stat-chip"><span class="stat-chip-lbl">総戦闘数</span><span class="stat-chip-val">${p.totalBattles}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">総勝利数</span><span class="stat-chip-val">${p.totalWins}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">異界塔最高</span><span class="stat-chip-val">${p.bestTowerFloor}F</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">乱入撃破</span><span class="stat-chip-val">${p.intruderKills}</span></div>
        </div>

        <div class="detail-grid-stats">
          <div class="stat-chip"><span class="stat-chip-lbl">制覇大陸</span><span class="stat-chip-val">${stageClearedCount}/50</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">闘技場制覇</span><span class="stat-chip-val">${arenaClearedCount}/${Hacha.data.ARENA_STAGES.length}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">レイド討伐</span><span class="stat-chip-val">${raidClearedCount}/${Hacha.data.RAID_BOSSES.length}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">図鑑キャラ</span><span class="stat-chip-val">${state.codex.chars.length}/${Hacha.data.CHARACTERS.length}</span></div>
        </div>

        <div class="detail-grid-stats">
          <div class="stat-chip"><span class="stat-chip-lbl">図鑑敵</span><span class="stat-chip-val">${state.codex.enemies.length}/${Hacha.data.ENEMIES.length}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">図鑑装備</span><span class="stat-chip-val">${state.codex.equips.length}/${Hacha.data.EQUIPMENT.length}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">所持装備</span><span class="stat-chip-val">${state.inventory.length}個</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">戦闘速度</span><span class="stat-chip-val">${state.settings.battleSpeed}倍速</span></div>
        </div>

        <div class="skill-mini-list">
          <div class="skill-mini-row">
            <span class="bu-hp-text">自動売却設定</span>
            <span class="unit-name-full" style="color:${state.settings.autoSellBelow > 0 ? '#ffd15c' : '#a8b9dc'};">${U.escapeHtml(sellLabel)}</span>
          </div>
          <div class="skill-mini-row">
            <span class="bu-hp-text">初入手装備の売却保護</span>
            <span class="unit-name-full" style="color:${state.settings.keepNewCodexGear ? '#6effb8' : '#ff9eb2'};">${state.settings.keepNewCodexGear ? 'ON（図鑑未登録を自動保護）' : 'OFF'}</span>
          </div>
        </div>
      </div>
    `;

    /* ==================== 下半分：親指ゾーン設定操作（セクション整理） ==================== */
    bottomEl.innerHTML = `
      <div class="panel panel-fill" style="justify-content:space-between;gap:5px;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div class="section-micro-lbl">ゲーム設定</div>
          <div class="action-row">
            <button class="btn ${state.settings.seEnabled ? 'btn-toggle-on' : ''}" id="btn-set-se">
              🔊 効果音：${state.settings.seEnabled ? 'ON' : 'OFF'}
            </button>
            <button class="btn" id="btn-set-speed">
              ⏩ 戦闘速度：${state.settings.battleSpeed}倍速
            </button>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;">
          <div class="section-micro-lbl">装備・自動売却</div>
          <div class="action-row">
            <button class="btn ${state.settings.keepNewCodexGear ? 'btn-toggle-on' : ''}" id="btn-set-keep-new">
              📖 初入手保護：${state.settings.keepNewCodexGear ? 'ON' : 'OFF'}
            </button>
            <button class="btn ${state.settings.autoSellBelow > 0 ? 'btn-toggle-warn' : ''}" id="btn-set-autosell">
              💰 ${U.escapeHtml(sellLabel)}
            </button>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;">
          <div class="section-micro-lbl">セーブデータ管理（端末内自動保存）</div>
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
      </div>
    `;

    bottomEl.querySelector('#btn-set-se').addEventListener('click', () => {
      state.settings.seEnabled = !state.settings.seEnabled;
      Hacha.storage.saveState(true);
      if (state.settings.seEnabled) Hacha.audio.play('tap');
      uiState.resetArmed = false;
      app.renderCurrent();
    });

    bottomEl.querySelector('#btn-set-speed').addEventListener('click', () => {
      Hacha.audio.play('tap');
      state.settings.battleSpeed = state.settings.battleSpeed === 1 ? 2 : (state.settings.battleSpeed === 2 ? 3 : 1);
      Hacha.storage.saveState(true);
      uiState.resetArmed = false;
      app.renderCurrent();
    });

    bottomEl.querySelector('#btn-set-keep-new').addEventListener('click', () => {
      Hacha.audio.play('tap');
      state.settings.keepNewCodexGear = !state.settings.keepNewCodexGear;
      Hacha.storage.saveState(true);
      uiState.resetArmed = false;
      cm.showToast(state.settings.keepNewCodexGear ? '初入手装備の売却保護をONにしました' : '初入手装備の売却保護をOFFにしました');
      app.renderCurrent();
    });

    bottomEl.querySelector('#btn-set-autosell').addEventListener('click', () => {
      uiState.resetArmed = false;
      cm.cycleAutoSellSetting();
      app.renderCurrent();
    });

    bottomEl.querySelector('#btn-save-export').addEventListener('click', () => {
      Hacha.audio.play('tap');
      uiState.resetArmed = false;
      const dataStr = Hacha.storage.exportSaveString();
      cm.openBottomOverlay(
        `<div class="panel"><div class="view-title">セーブデータの書き出し</div><div class="note-text" style="margin-top:4px;">下の文字列をコピーしてメモ帳などへ保管できます。</div></div>`,
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

    bottomEl.querySelector('#btn-save-import').addEventListener('click', () => {
      Hacha.audio.play('tap');
      uiState.resetArmed = false;
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

    bottomEl.querySelector('#btn-save-reset').addEventListener('click', () => {
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

  function resetState() {
    uiState.resetArmed = false;
  }

  Hacha.ui.screenSettings = { render, resetState };
})();
