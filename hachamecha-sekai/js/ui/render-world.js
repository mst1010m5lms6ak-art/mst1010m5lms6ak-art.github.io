/* ==========================================================================
   render-world.js - 記録画面（オフライン放置探索・戦績・セーブ管理/設定）
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  function getSubTab() {
    const sub = HS.STATE.ui.worldSubTab;
    return sub === 'system' ? 'system' : 'drift';
  }

  function renderUpper() {
    const st = HS.STATE.data;
    const sub = getSubTab();

    if (sub === 'drift') {
      const r = HS.STATE.getPendingOfflineRewards();
      const s = st.stats;
      const towerLabel = HS.STATE.isTowerClearedAll()
        ? '100F制覇'
        : `${st.towerFloor}F/100F`;
      return `
        <div class="panel" style="border-color:var(--accent-cyan);display:flex;flex-direction:column;gap:6px">
          <div class="row-between">
            <span style="font-size:13px;font-weight:900;color:var(--accent-cyan)">オフライン探索報酬</span>
            <span class="num" style="font-size:11px;color:var(--text-sub)">経過 ${Math.floor(r.minutes / 60)}時間${r.minutes % 60}分（最大12h）</span>
          </div>
          <div class="summary-grid">
            <div class="summary-cell"><span class="sk">蓄積ゴールド</span><span class="sv res-gold">+${HS.UTIL.fmtNum(r.gold)}G</span></div>
            <div class="summary-cell"><span class="sk">蓄積経験結晶</span><span class="sv res-shard">+${HS.UTIL.fmtNum(r.expCrystal)}</span></div>
            <div class="summary-cell"><span class="sk">蓄積 魂片</span><span class="sv">+${r.shards}</span></div>
            <div class="summary-cell"><span class="sk">装備ドロップ箱</span><span class="sv res-core">${r.gearCount}個</span></div>
          </div>
        </div>
        <div class="panel" style="flex:1 1 auto;display:flex;flex-direction:column;gap:5px;min-height:0">
          <div style="font-size:11px;font-weight:900;color:var(--accent-gold)">冒険戦績</div>
          <div class="stat-grid">
            <div class="stat-cell"><span class="k">総出撃</span><span class="v">${HS.UTIL.fmtNum(s.totalRuns)}</span></div>
            <div class="stat-cell"><span class="k">総勝利</span><span class="v">${HS.UTIL.fmtNum(s.totalWins)}</span></div>
            <div class="stat-cell"><span class="k">異変</span><span class="v">${HS.UTIL.fmtNum(s.totalAnomalies)}</span></div>
            <div class="stat-cell"><span class="k">最大撃</span><span class="v">${HS.UTIL.fmtNum(s.maxSingleHit)}</span></div>
            <div class="stat-cell"><span class="k">自動売</span><span class="v">${HS.UTIL.fmtNum(s.totalAutoSold)}</span></div>
            <div class="stat-cell"><span class="k">異界塔</span><span class="v">${towerLabel}</span></div>
          </div>
        </div>`;
    }

    return `
      <div class="panel" style="flex:1 1 auto;display:flex;flex-direction:column;gap:6px">
        <div style="font-size:13px;font-weight:900;color:var(--accent-gold)">システム・セーブ情報</div>
        <div style="font-size:11px;color:var(--text-sub);line-height:1.5">
          ・セーブデータは端末内ストレージへ自動保存されます。<br>
          ・オフライン状態でも全てのステージ・育成・自動周回をプレイできます。<br>
          ・端末変更時はセーブコードを書き出して保管してください。
        </div>
        <div class="summary-grid" style="margin-top:auto">
          <div class="summary-cell"><span class="sk">効果音</span><span class="sv">${st.settings.sound ? 'ON' : 'OFF'}</span></div>
          <div class="summary-cell"><span class="sk">最終保存</span><span class="sv" style="font-size:11px">${new Date(st.savedAt).toLocaleTimeString('ja-JP')}</span></div>
        </div>
      </div>`;
  }

  function renderLower() {
    const st = HS.STATE.data;
    const sub = getSubTab();

    let bodyHtml = '';
    if (sub === 'drift') {
      const r = HS.STATE.getPendingOfflineRewards();
      bodyHtml = `
        <div style="flex:1 1 auto;display:flex;flex-direction:column;justify-content:flex-end;gap:8px">
          <div class="panel" style="font-size:11px;color:var(--text-sub);line-height:1.45">
            到達済みステージの戦力に応じて、アプリを閉じている間もパーティが自動で探索を続けます。1分以上経過するといつでも回収できます。
          </div>
          <button class="btn btn-lg btn-cyan" style="width:100%" data-action="claim-offline" ${r.minutes >= 1 ? '' : 'disabled'}>
            ${r.minutes >= 1 ? `探索報酬を受け取る（${r.minutes}分分）` : '探索中（1分経過で受取可能）'}
          </button>
        </div>`;
    } else {
      bodyHtml = `
        <div style="flex:1 1 auto;display:flex;flex-direction:column;justify-content:flex-end;gap:7px">
          <button class="btn btn-toggle ${st.settings.sound ? 'on' : ''}" style="width:100%" data-action="toggle-sound">
            効果音：${st.settings.sound ? 'ON' : 'OFF'}
          </button>
          <div class="row-gap">
            <button class="btn btn-cyan" style="flex:1" data-action="open-save-export">セーブ書出</button>
            <button class="btn btn-gold" style="flex:1" data-action="open-save-import">セーブ読込</button>
          </div>
          <button class="btn btn-danger" style="width:100%" data-action="open-reset-confirm">セーブデータを初期化する</button>
        </div>`;
    }

    return `
      <div class="mode-tabs">
        <button class="btn btn-sm ${sub === 'drift' ? 'btn-primary' : ''}" data-action="world-sub" data-val="drift">放置探索</button>
        <button class="btn btn-sm ${sub === 'system' ? 'btn-primary' : ''}" data-action="world-sub" data-val="system">データ・設定</button>
      </div>
      ${bodyHtml}`;
  }

  function buildSaveSheet(mode) {
    if (mode === 'export') {
      const code = HS.STORAGE.exportCode(HS.STATE.data);
      return {
        title: 'セーブコード書き出し',
        body: `
          <div style="font-size:11px;color:var(--text-sub)">以下の文字列をコピーしてメモ帳などに保存してください。</div>
          <textarea id="save-code-box" readonly style="width:100%;height:130px;padding:8px;border-radius:8px;background:#0c091c;border:1px solid var(--border-dim);color:#fff;resize:none">${HS.UTIL.escHtml(code)}</textarea>`,
        foot: `
          <div class="sheet-foot-row">
            <button class="btn" data-action="close-sheet">閉じる</button>
            <button class="btn btn-cyan" data-action="copy-save-code">コピーする</button>
          </div>`
      };
    }
    if (mode === 'import') {
      return {
        title: 'セーブコード読み込み',
        body: `
          <div style="font-size:11px;color:var(--text-sub)">書き出したセーブコードを貼り付けて読み込みを実行してください。</div>
          <textarea id="save-code-box" placeholder="ここにセーブコードを貼り付け" style="width:100%;height:130px;padding:8px;border-radius:8px;background:#0c091c;border:1px solid var(--border-dim);color:#fff;resize:none"></textarea>`,
        foot: `
          <div class="sheet-foot-row">
            <button class="btn" data-action="close-sheet">キャンセル</button>
            <button class="btn btn-primary" data-action="exec-save-import">読み込んで復元</button>
          </div>`
      };
    }
    return {
      title: 'データ初期化の確認',
      body: `
        <div class="panel" style="border-color:var(--accent-danger);color:#ff99ac;font-size:12px;line-height:1.5">
          現在の進行データ・育成・装備・図鑑がすべて初期状態に戻ります。本当に初期化しますか？
        </div>`,
      foot: `
        <div class="sheet-foot-row">
          <button class="btn" data-action="close-sheet">やめる</button>
          <button class="btn btn-danger" data-action="exec-reset-save">初期化する</button>
        </div>`
    };
  }

  HS.UI_WORLD = { renderUpper, renderLower, buildSaveSheet };
})(window);
