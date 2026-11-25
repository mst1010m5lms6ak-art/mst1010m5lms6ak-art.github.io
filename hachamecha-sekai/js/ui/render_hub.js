(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  const hubUi = {
    sub: 'dispatch', // 'dispatch' | 'shop' | 'settings'
    selectedMission: 'disp_shard'
  };

  function formatSec(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + '分' + String(s).padStart(2, '0') + '秒';
  }

  function openDispatchPicker(mission) {
    const sd = HW.State.data;
    const busy = HW.State.getBusyDispatchChars();
    const partyMain = sd.party.main || [];
    const candidates = HW.CHARACTERS_SORTED.filter((c) => sd.chars[c.id].unlocked && !busy[c.id]);
    const selected = [];

    // 控えキャラを優先して自動初期選択
    candidates
      .slice()
      .sort((a, b) => (partyMain.includes(a.id) ? 1 : 0) - (partyMain.includes(b.id) ? 1 : 0))
      .slice(0, mission.slots)
      .forEach((c) => selected.push(c.id));

    const renderBody = () => {
      if (candidates.length === 0) {
        return '<div class="result-box" style="text-align:center;color:var(--txt-sub)">派遣可能なキャラがいません</div>';
      }
      return (
        '<div style="font-size:11px;color:var(--txt-sub)">最大' + mission.slots + '人まで選択可（人数が多いほど報酬UP・派遣中も通常戦闘は可能）</div>' +
        '<div class="char-grid">' +
        candidates.map((c) => {
          const isSel = selected.includes(c.id);
          const inMain = partyMain.includes(c.id);
          return (
            '<button type="button" class="char-tile' + (isSel ? ' selected' : '') + '" data-disp-c="' + c.id + '">' +
            '<div class="char-tile-top"><span class="char-tile-name">' + HW.esc(c.name) + '</span><span class="b-pill">' + (isSel ? '選択中' : inMain ? '主力' : '控え') + '</span></div>' +
            '<div class="tag-row">' + HW.badgeElement(c.element) + HW.badgeRole(c.role, true) + '</div>' +
            '</button>'
          );
        }).join('') +
        '</div>'
      );
    };

    const actions =
      '<button type="button" class="btn" data-sheet-close="1">閉じる</button>' +
      '<button type="button" class="btn btn-lime" id="disp-launch">派遣開始</button>';

    const open = (keepScroll) => {
      const prevBody = document.querySelector('#sheet-panel .sheet-body');
      const prevTop = keepScroll && prevBody ? prevBody.scrollTop : 0;
      HW.DOM.openSheet(mission.name + ' メンバー選択', renderBody(), actions, (panel) => {
        const sb = panel.querySelector('.sheet-body');
        if (sb && prevTop > 0) sb.scrollTop = prevTop;
        panel.querySelectorAll('[data-disp-c]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const cid = btn.getAttribute('data-disp-c');
            const idx = selected.indexOf(cid);
            if (idx >= 0) selected.splice(idx, 1);
            else if (selected.length < mission.slots) selected.push(cid);
            HW.Audio.tap();
            open(true);
          });
        });
        panel.querySelector('#disp-launch').addEventListener('click', () => {
          if (selected.length === 0) {
            HW.DOM.toast('1人以上選んでください');
            return;
          }
          HW.Dispatch.start(mission.id, selected);
          HW.DOM.closeSheet();
          HW.DOM.toast(mission.name + ' へ派遣しました！', 'gold');
          HW.App.render();
        });
      });
    };
    open();
  }

  function openBackupSheet() {
    const code = HW.Security.exportBackupCode(HW.State.data);
    const body =
      '<div style="font-size:11px;color:var(--txt-sub)">セーブデータ引き継ぎコード（改ざん検知署名つき）</div>' +
      '<textarea id="backup-box" style="width:100%;height:110px;background:#090c16;color:#9cf7ff;border:1px solid var(--line-mid);border-radius:8px;padding:7px;font-size:10px;user-select:text;-webkit-user-select:text">' +
      HW.esc(code) +
      '</textarea>';
    const actions =
      '<button type="button" class="btn" data-sheet-close="1">閉じる</button>' +
      '<button type="button" class="btn btn-primary" id="btn-copy-code">コピー</button>' +
      '<button type="button" class="btn btn-gold" id="btn-load-code">コード読込</button>';

    HW.DOM.openSheet('バックアップ出力 / 読込', body, actions, (panel) => {
      panel.querySelector('#btn-copy-code').addEventListener('click', () => {
        const box = panel.querySelector('#backup-box');
        if (navigator.clipboard) navigator.clipboard.writeText(box.value).catch(() => {});
        HW.DOM.toast('バックアップコードをコピーしました', 'gold');
      });
      panel.querySelector('#btn-load-code').addEventListener('click', () => {
        const box = panel.querySelector('#backup-box');
        const res = HW.Security.importBackupCode(box.value);
        if (!res.ok) {
          HW.DOM.toast('無効または破損したコードです', 'pink');
          return;
        }
        HW.State.data = res.data;
        HW.State.save(true);
        HW.DOM.closeSheet();
        HW.DOM.toast('セーブデータを復元しました！', 'gold');
        HW.App.render();
      });
    });
  }

  HW.RenderHub = {
    tickTimers: function () {
      if (hubUi.sub !== 'dispatch') return;
      const sd = HW.State.data;
      let becameComplete = false;
      HW.DISPATCH_MISSIONS.forEach((m) => {
        const active = sd.dispatches[m.id];
        if (!active) return;
        const done = HW.Dispatch.isComplete(m.id);
        const rem = HW.Dispatch.getRemainingSec(m.id);
        const pill = document.querySelector('[data-disp-timer="' + m.id + '"]');
        if (pill) {
          const prevDone = pill.getAttribute('data-disp-done') === '1';
          if (done && !prevDone) becameComplete = true;
          pill.textContent = done ? '受取!' : formatSec(rem);
        }
        if (m.id === hubUi.selectedMission) {
          const topRem = document.getElementById('hub-disp-top-rem');
          if (topRem) topRem.textContent = done ? '受取可' : formatSec(rem);
        }
      });
      if (becameComplete) HW.App.render();
    },

    render: function (topEl, bottomEl) {
      const sd = HW.State.data;
      let topHtml = '';

      if (hubUi.sub === 'dispatch') {
        const m = HW.DISPATCH_MISSIONS.find((x) => x.id === hubUi.selectedMission) || HW.DISPATCH_MISSIONS[0];
        const active = sd.dispatches[m.id];
        const rem = HW.Dispatch.getRemainingSec(m.id);
        const done = HW.Dispatch.isComplete(m.id);
        topHtml =
          '<div class="preview-box">' +
          '<div class="preview-head"><span class="preview-name">' + HW.esc(m.name) + '</span><span class="b-pill">' + (done ? '完了!' : active ? '探索中' : '待機') + '</span></div>' +
          '<div style="font-size:11px;color:var(--txt-sub)">' + HW.esc(m.sub) + '</div>' +
          '<div class="stat-grid-3">' +
          '<div class="stat-cell"><span class="stat-k">所要時間</span><span class="stat-v num">' + formatSec(m.durationSec) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">勝利短縮</span><span class="stat-v num" style="color:var(--acc-cyan)">-' + m.battleCutSec + '秒</span></div>' +
          '<div class="stat-cell"><span class="stat-k">残り時間</span><span id="hub-disp-top-rem" class="stat-v num" style="color:var(--acc-gold)">' + (active ? (done ? '受取可' : formatSec(rem)) : '--') + '</span></div>' +
          '</div>' +
          '<div class="result-box" style="font-size:10.5px;color:var(--txt-sub)">' +
          (active ? '派遣中: ' + active.charIds.map((id) => HW.esc(HW.getCharDef(id).name)).join('・') : '余剰キャラを派遣して欠片・素材・高品質装備を回収') +
          '</div>' +
          '</div>';
      } else if (hubUi.sub === 'shop') {
        const matsGrid = HW.RANK_MATERIALS.map((mat) =>
          '<div class="mat-mini-pill"><span style="color:' + mat.color + '">' + HW.esc(mat.name.slice(0, 2)) + '</span><span class="num">' + (sd.materials[mat.id] || 0) + '</span></div>'
        ).join('');
        topHtml =
          '<div class="preview-box">' +
          '<div class="preview-head"><span class="preview-name">異界交換所</span><span class="b-pill boss">闘技場限定あり</span></div>' +
          '<div style="font-size:10.5px;color:var(--txt-sub)">闘技場メダルで限定キャラの欠片や限定セット装備と交換可能</div>' +
          '<div class="stat-grid-3">' +
          '<div class="stat-cell"><span class="stat-k">ゴールド</span><span class="stat-v num" style="color:var(--acc-gold)">' + HW.formatNum(sd.gold) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">万能欠片</span><span class="stat-v num" style="color:var(--acc-cyan)">' + HW.formatNum(sd.omniShards) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">闘技場メダル</span><span class="stat-v num" style="color:var(--acc-pink)">' + HW.formatNum(sd.arenaMedals) + '</span></div>' +
          '</div>' +
          '<div class="mat-mini-grid">' + matsGrid + '</div>' +
          '</div>';
      } else {
        const unlockedCnt = HW.CHARACTERS.filter((c) => sd.chars[c.id].unlocked).length;
        const clearedCnt = Object.keys(sd.progress.clearedStages || {}).length;
        topHtml =
          '<div class="preview-box">' +
          '<div class="preview-head"><span class="preview-name">拠点設定・記録</span><span class="b-pill">オフライン保護済</span></div>' +
          '<div class="stat-grid-4">' +
          '<div class="stat-cell"><span class="stat-k">仲間</span><span class="stat-v num">' + unlockedCnt + '/24</span></div>' +
          '<div class="stat-cell"><span class="stat-k">通常制覇</span><span class="stat-v num">' + clearedCnt + '/50</span></div>' +
          '<div class="stat-cell"><span class="stat-k">塔Ⅰ到達</span><span class="stat-v num">' + (sd.progress.towerCleared.tower_1 || 0) + 'F</span></div>' +
          '<div class="stat-cell"><span class="stat-k">闘技場</span><span class="stat-v num">' + sd.progress.arenaRank + '位</span></div>' +
          '</div>' +
          '<div class="result-box" style="font-size:10.5px;color:var(--txt-sub)">セーブデータは端末内に二重保存され、オフラインでも維持されます</div>' +
          '</div>';
      }

      topEl.innerHTML = HW.renderStageHeader('拠点') + topHtml;

      const tabs = [
        { id: 'dispatch', label: '探索派遣' },
        { id: 'shop', label: '交換所' },
        { id: 'settings', label: '設定・保存' }
      ];

      let bodyHtml = '';
      if (hubUi.sub === 'dispatch') {
        const cards = HW.DISPATCH_MISSIONS.map((m) => {
          const active = sd.dispatches[m.id];
          const done = HW.Dispatch.isComplete(m.id);
          const rem = HW.Dispatch.getRemainingSec(m.id);
          const sel = hubUi.selectedMission === m.id;
          return (
            '<button type="button" class="stage-card' + (sel ? ' selected' : '') + '" data-disp-m="' + m.id + '">' +
            '<div class="stage-card-left">' +
            '<span class="stage-card-title">' + HW.esc(m.name) + '</span>' +
            '<span class="stage-card-sub">' + HW.esc(m.sub) + '</span>' +
            '</div>' +
            '<span class="b-pill' + (done ? ' intruder' : '') + ' num" data-disp-timer="' + m.id + '" data-disp-done="' + (done ? '1' : '0') + '">' + (done ? '受取!' : active ? formatSec(rem) : '待機') + '</span>' +
            '</button>'
          );
        }).join('');
        const curM = HW.DISPATCH_MISSIONS.find((x) => x.id === hubUi.selectedMission) || HW.DISPATCH_MISSIONS[0];
        const curActive = sd.dispatches[curM.id];
        const curDone = HW.Dispatch.isComplete(curM.id);
        bodyHtml =
          '<div class="fixed-area" style="gap:5px">' +
          '<div class="compact-card-stack">' + cards + '</div>' +
          '<button type="button" id="hub-disp-act" class="btn ' + (curDone ? 'btn-gold' : 'btn-lime') + '" style="min-height:38px;flex-shrink:0"' + (curActive && !curDone ? ' disabled' : '') + '>' +
          (curDone ? '探索報酬を受け取る！' : curActive ? '探索進行中（戦闘勝利で短縮）' : 'メンバーを選んで派遣') +
          '</button>' +
          '</div>';
      } else if (hubUi.sub === 'shop') {
        const cards = HW.SHOP_ITEMS.map((item) => {
          const curTxt = item.currency === 'medal' ? item.cost + ' 闘' : HW.formatNum(item.cost) + ' G';
          const afford = item.currency === 'medal' ? sd.arenaMedals >= item.cost : sd.gold >= item.cost;
          return (
            '<button type="button" class="stage-card" data-buy="' + item.id + '"' + (!afford ? ' disabled' : '') + '>' +
            '<div class="stage-card-left">' +
            '<span class="stage-card-title">' + HW.esc(item.name) + '</span>' +
            '<span class="stage-card-sub">' + HW.esc(item.tag) + '</span>' +
            '</div>' +
            '<span class="cur-pill ' + (item.currency === 'medal' ? 'medal' : 'gold') + ' num">' + curTxt + '</span>' +
            '</button>'
          );
        }).join('');
        bodyHtml = '<div class="scroll-list" data-scroll-key="hub_shop">' + cards + '</div>';
      } else {
        bodyHtml =
          '<div class="fixed-area" style="justify-content:flex-start;gap:9px;padding-top:4px">' +
          '<button type="button" id="set-se-btn" class="btn ' + (sd.settings.seEnabled ? 'btn-lime' : '') + '" style="min-height:44px">効果音 (SE): ' + (sd.settings.seEnabled ? 'ON' : 'OFF') + '</button>' +
          '<button type="button" id="set-spd-btn" class="btn btn-primary num" style="min-height:44px">デフォルト戦闘速度: ' + (sd.settings.battleSpeed || 3) + '倍速</button>' +
          '<button type="button" id="set-backup-btn" class="btn btn-gold" style="min-height:44px">バックアップコード出力 / 読込</button>' +
          '<button type="button" id="set-reset-btn" class="btn btn-danger" style="min-height:44px">セーブデータ初期化</button>' +
          '</div>';
      }

      bottomEl.innerHTML =
        '<div class="subtabs">' +
        tabs.map((t) => '<button type="button" class="subtab' + (hubUi.sub === t.id ? ' active' : '') + '" data-hsub="' + t.id + '">' + t.label + '</button>').join('') +
        '</div>' +
        bodyHtml;

      bottomEl.querySelectorAll('[data-hsub]').forEach((btn) => {
        btn.addEventListener('click', () => {
          hubUi.sub = btn.getAttribute('data-hsub');
          HW.Audio.tap();
          HW.App.render();
        });
      });

      bottomEl.querySelectorAll('[data-disp-m]').forEach((btn) => {
        btn.addEventListener('click', () => {
          hubUi.selectedMission = btn.getAttribute('data-disp-m');
          HW.Audio.tap();
          HW.App.render();
        });
      });

      const dispAct = document.getElementById('hub-disp-act');
      if (dispAct) {
        dispAct.addEventListener('click', () => {
          const curM = HW.DISPATCH_MISSIONS.find((x) => x.id === hubUi.selectedMission);
          if (HW.Dispatch.isComplete(curM.id)) {
            const res = HW.Dispatch.claim(curM.id);
            if (res.ok) HW.DOM.toast('獲得: ' + res.summary.join(' / '), 'gold');
            HW.App.render();
          } else {
            openDispatchPicker(curM);
          }
        });
      }

      bottomEl.querySelectorAll('[data-buy]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const r = HW.State.buyShopItem(btn.getAttribute('data-buy'));
          if (r.ok) HW.DOM.toast('交換完了: ' + r.detail, 'gold');
          HW.App.render();
        });
      });

      const seBtn = document.getElementById('set-se-btn');
      if (seBtn) {
        seBtn.addEventListener('click', () => {
          sd.settings.seEnabled = !sd.settings.seEnabled;
          HW.Audio.setEnabled(sd.settings.seEnabled);
          HW.State.save();
          HW.App.render();
        });
      }

      const spdBtn = document.getElementById('set-spd-btn');
      if (spdBtn) {
        spdBtn.addEventListener('click', () => {
          const cur = sd.settings.battleSpeed || 3;
          sd.settings.battleSpeed = cur === 1 ? 2 : cur === 2 ? 3 : 1;
          HW.Audio.tap();
          HW.State.save();
          HW.App.render();
        });
      }

      const bakBtn = document.getElementById('set-backup-btn');
      if (bakBtn) {
        bakBtn.addEventListener('click', () => {
          HW.Audio.tap();
          openBackupSheet();
        });
      }

      const rstBtn = document.getElementById('set-reset-btn');
      if (rstBtn) {
        rstBtn.addEventListener('click', () => {
          HW.DOM.openSheet(
            'データ初期化の確認',
            '<div class="result-box" style="color:#ffb0be">現在のセーブデータをすべて消去し、最初から始めます。元に戻せません。</div>',
            '<button type="button" class="btn" data-sheet-close="1">キャンセル</button><button type="button" class="btn btn-danger" id="confirm-reset">初期化する</button>',
            (panel) => {
              panel.querySelector('#confirm-reset').addEventListener('click', async () => {
                await HW.State.resetAll();
                HW.DOM.closeSheet();
                HW.DOM.toast('データを初期化しました');
                HW.App.render();
              });
            }
          );
        });
      }
    }
  };
})();
