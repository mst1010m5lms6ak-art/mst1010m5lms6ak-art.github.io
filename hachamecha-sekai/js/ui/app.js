(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  const NAV_ITEMS = [
    { id: 'adventure', label: '冒険', icon: 'adventure' },
    { id: 'party', label: '編成', icon: 'party' },
    { id: 'roster', label: '育成', icon: 'roster' },
    { id: 'equip', label: '装備', icon: 'equip' },
    { id: 'hub', label: '拠点', icon: 'hub' },
    { id: 'codex', label: '図鑑', icon: 'codex' }
  ];

  HW.App = {
    screen: 'adventure', // 'adventure' | 'party' | 'roster' | 'equip' | 'hub' | 'codex' | 'battle'
    lastBattleConfig: null,
    dispatchTickTimer: null,
    scrollMemory: {},

    boot: async function () {
      HW.DOM.setupMobileGuard();
      const loadRes = await HW.State.init();
      if (loadRes && loadRes.tampered) {
        HW.DOM.toast('セーブデータの整合性異常を検知したため初期化しました', 'pink');
      }

      if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
          reg.update().catch(() => {});
        }).catch(() => {});
      }

      // 拠点画面の探索残り時間だけピンポイント更新（全DOM再描画によるタップ阻害・スクロール戻りを根絶）
      this.dispatchTickTimer = setInterval(() => {
        if (this.screen === 'hub' && !HW.Battle.active && HW.RenderHub && HW.RenderHub.tickTimers) {
          HW.RenderHub.tickTimers();
        }
      }, 1000);

      this.render();
    },

    go: function (screenId) {
      if (HW.Battle.active) {
        HW.DOM.toast('戦闘中は他の画面へ移動できません');
        return;
      }
      this.screen = screenId;
      HW.Audio.tap();
      this.render();
    },

    launchBattle: function (config) {
      this.lastBattleConfig = Object.assign({}, config);
      this.screen = 'battle';
      this.render();

      const topEl = document.getElementById('top-stage');
      const bottomEl = document.getElementById('bottom-dock');
      HW.RenderBattle.mount(topEl, bottomEl);

      HW.Battle.start(config, {
        onUpdate: (full) => {
          HW.RenderBattle.sync(full);
        },
        onFinish: (result) => {
          HW.RenderBattle.sync(true);
          HW.RenderBattle.showResultSheet(
            result,
            () => {
              this.screen = 'adventure';
              this.render();
            },
            () => {
              const replayCfg = Object.assign({}, this.lastBattleConfig);
              if (replayCfg.mode === 'tower') {
                const tower = HW.TOWERS.find((t) => t.id === replayCfg.towerId) || HW.TOWERS[0];
                replayCfg.floor = Math.min(tower.maxFloor, (HW.State.data.progress.towerCleared[tower.id] || 0) + 1);
              }
              this.launchBattle(replayCfg);
            }
          );
        }
      });
    },

    renderNav: function () {
      const nav = document.getElementById('bottom-nav');
      if (!nav) return;
      const inBattle = this.screen === 'battle' || HW.Battle.active;
      const hasDisp = HW.Dispatch.hasAnyComplete();
      const buttonsHtml = NAV_ITEMS.map((item) => {
        const active = this.screen === item.id;
        const dot = item.id === 'hub' && hasDisp ? '<span class="nav-dot"></span>' : '';
        return (
          '<button type="button" class="nav-btn' + (active ? ' active' : '') + (inBattle ? ' locked' : '') + '" data-nav="' + item.id + '"' + (inBattle ? ' aria-disabled="true"' : '') + '>' +
          HW.icon(item.icon, 18) +
          '<span>' + item.label + '</span>' +
          dot +
          '</button>'
        );
      }).join('');

      const lockRibbon = inBattle
        ? '<button type="button" id="nav-lock-ribbon" class="nav-lock-ribbon">' + HW.icon('lock', 13) + ' 戦闘中（完了まで画面移動ロック）</button>'
        : '';

      nav.innerHTML = buttonsHtml + lockRibbon;

      if (inBattle) {
        const rib = document.getElementById('nav-lock-ribbon');
        if (rib) {
          rib.addEventListener('click', () => {
            HW.DOM.toast('戦闘中は他の画面へ移動できません');
          });
        }
      } else {
        nav.querySelectorAll('[data-nav]').forEach((btn) => {
          btn.addEventListener('click', () => this.go(btn.getAttribute('data-nav')));
        });
      }
    },

    render: function (opts) {
      const frame = document.getElementById('app-frame');
      const topEl = document.getElementById('top-stage');
      const bottomEl = document.getElementById('bottom-dock');
      if (!frame || !topEl || !bottomEl) return;

      // 再描画前に現在のスクロール位置をキーごとに記憶（リストタップ時に先頭へ戻らないようにする）
      const prevScrolls = {};
      bottomEl.querySelectorAll('.scroll-list').forEach((el, idx) => {
        const key = el.getAttribute('data-scroll-key') || (this.screen + '_' + idx);
        prevScrolls[key] = el.scrollTop;
        this.scrollMemory[key] = el.scrollTop;
      });

      frame.classList.toggle('mode-battle', this.screen === 'battle');
      this.renderNav();

      if (this.screen === 'battle') return;
      if (this.screen === 'adventure') HW.RenderAdventure.render(topEl, bottomEl);
      else if (this.screen === 'party') HW.RenderParty.render(topEl, bottomEl);
      else if (this.screen === 'roster') HW.RenderRoster.render(topEl, bottomEl);
      else if (this.screen === 'equip') HW.RenderEquip.render(topEl, bottomEl);
      else if (this.screen === 'hub') HW.RenderHub.render(topEl, bottomEl);
      else if (this.screen === 'codex') HW.RenderCodex.render(topEl, bottomEl);

      // 同一リストキーのスクロール位置を復元（明示リセット時を除く）
      if (!(opts && opts.resetScroll)) {
        bottomEl.querySelectorAll('.scroll-list').forEach((el, idx) => {
          const key = el.getAttribute('data-scroll-key') || (this.screen + '_' + idx);
          const saved = Object.prototype.hasOwnProperty.call(prevScrolls, key)
            ? prevScrolls[key]
            : this.scrollMemory[key];
          if (typeof saved === 'number' && saved > 0) {
            el.scrollTop = saved;
          }
        });
      }
    }
  };

  window.addEventListener('DOMContentLoaded', () => {
    HW.App.boot();
  });
})();
