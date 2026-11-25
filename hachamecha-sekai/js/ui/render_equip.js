(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  const eqUi = {
    slotFilter: 'all',
    selectedId: null,
    bulkThreshold: 75,
    bulkOnlyFilter: false
  };

  function openBulkSellSheet() {
    const renderSheet = () => {
      const scope = eqUi.bulkOnlyFilter ? eqUi.slotFilter : 'all';
      const cands = HW.State.getBulkSellCandidates(eqUi.bulkThreshold, scope);
      const totalGold = cands.reduce((s, it) => s + HW.getEquipSellValue(it), 0);
      const presets = [
        { val: 55, label: '55%未満' },
        { val: 75, label: '75%未満' },
        { val: 90, label: '90%未満' },
        { val: 95, label: '95%未満' },
        { val: 99, label: '99%未満' },
        { val: 100, label: '極100%以外' }
      ];
      const slotName = eqUi.slotFilter === 'all'
        ? '全部位'
        : (HW.EQUIP_SLOTS.find((s) => s.id === eqUi.slotFilter) || { name: '全部位' }).name;

      const sampleHtml = cands.length
        ? '<div class="result-box" style="font-size:10px;color:var(--txt-sub)">対象例: ' +
          cands.slice(0, 6).map((it) => HW.esc(HW.getEquipTemplate(it.tplId).name) + '(' + it.quality + '%)').join(' / ') +
          (cands.length > 6 ? ' ほか' + (cands.length - 6) + '件' : '') +
          '</div>'
        : '';

      const body =
        '<div style="font-size:10.5px;color:var(--txt-sub)">装備中・保護中・品質100%「極」は自動で除外されます。</div>' +
        '<div class="bulk-preset-grid">' +
        presets.map((p) =>
          '<button type="button" class="bulk-preset-btn' + (eqUi.bulkThreshold === p.val ? ' active' : '') + '" data-bulk-q="' + p.val + '">' + p.label + '</button>'
        ).join('') +
        '</div>' +
        (eqUi.slotFilter !== 'all'
          ? '<div class="subtabs">' +
            '<button type="button" class="subtab' + (!eqUi.bulkOnlyFilter ? ' active' : '') + '" data-bulk-scope="all">全部位を対象</button>' +
            '<button type="button" class="subtab' + (eqUi.bulkOnlyFilter ? ' active' : '') + '" data-bulk-scope="cur">' + HW.esc(slotName) + 'のみ</button>' +
            '</div>'
          : '') +
        '<div class="result-grid">' +
        '<div class="result-box"><div class="stat-k">売却対象</div><div class="stat-v num" style="color:var(--acc-cyan)">' + cands.length + ' 件</div></div>' +
        '<div class="result-box"><div class="stat-k">合計獲得ゴールド</div><div class="stat-v num" style="color:var(--acc-gold)">+' + HW.formatNum(totalGold) + ' G</div></div>' +
        '</div>' +
        sampleHtml;

      const actions =
        '<button type="button" class="btn" data-sheet-close="1">キャンセル</button>' +
        '<button type="button" class="btn btn-danger" id="bulk-sell-exec"' + (!cands.length ? ' disabled' : '') + '>' +
        (cands.length ? cands.length + '件を一括売却' : '対象なし') +
        '</button>';

      HW.DOM.openSheet('装備の一括売却', body, actions, (panel) => {
        panel.querySelectorAll('[data-bulk-q]').forEach((btn) => {
          btn.addEventListener('click', () => {
            eqUi.bulkThreshold = Number(btn.getAttribute('data-bulk-q'));
            HW.Audio.tap();
            renderSheet();
          });
        });
        panel.querySelectorAll('[data-bulk-scope]').forEach((btn) => {
          btn.addEventListener('click', () => {
            eqUi.bulkOnlyFilter = btn.getAttribute('data-bulk-scope') === 'cur';
            HW.Audio.tap();
            renderSheet();
          });
        });
        const execBtn = panel.querySelector('#bulk-sell-exec');
        if (execBtn) {
          execBtn.addEventListener('click', () => {
            const res = HW.State.bulkSellEquips(eqUi.bulkThreshold, scope);
            if (res.ok) {
              HW.Audio.rankUp();
              HW.DOM.closeSheet();
              HW.DOM.toast(res.count + '件を一括売却 (+' + HW.formatNum(res.gold) + 'G)', 'gold');
              HW.App.render();
            }
          });
        }
      });
    };
    renderSheet();
  }

  HW.RenderEquip = {
    render: function (topEl, bottomEl) {
      const sd = HW.State.data;
      const list = sd.inventory
        .filter((it) => eqUi.slotFilter === 'all' || HW.getEquipTemplate(it.tplId).slot === eqUi.slotFilter)
        .sort((a, b) => b.quality - a.quality);

      if (!eqUi.selectedId || !list.some((x) => x.id === eqUi.selectedId)) {
        eqUi.selectedId = list.length ? list[0].id : null;
      }

      const selItem = HW.State.getEquipById(eqUi.selectedId);
      const selOwnerId = selItem ? HW.State.getEquipOwner(selItem.id) : null;
      let topPreview = '<div class="preview-box" style="justify-content:center;align-items:center;color:var(--txt-sub)">装備を所持していません</div>';
      if (selItem) {
        const tpl = HW.getEquipTemplate(selItem.tplId);
        const set = HW.getEquipSet(tpl.setId);
        const st = HW.calcEquipStats(selItem);
        const qm = HW.getQualityMeta(selItem.quality);
        const ownerName = selOwnerId ? HW.getCharDef(selOwnerId).name + ' 装備中' : '未装着';
        topPreview =
          '<div class="preview-box' + (qm.isMax ? ' quality-max-border' : '') + '">' +
          '<div class="preview-head">' +
          '<div class="tag-row"><span class="preview-name">' + HW.esc(tpl.name) + '</span>' + HW.badgeQuality(selItem.quality) + '</div>' +
          '<span class="b-pill">' + HW.esc(tpl.slotName) + ' / ' + HW.esc(ownerName) + '</span>' +
          '</div>' +
          '<div class="q-bar"><div class="q-bar-fill" style="width:' + selItem.quality + '%;background:' + qm.color + '"></div></div>' +
          '<div class="stat-grid-4">' +
          '<div class="stat-cell"><span class="stat-k">HP</span><span class="stat-v num">+' + HW.formatNum(st.hp) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">攻撃</span><span class="stat-v num">+' + HW.formatNum(st.atk) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">防御</span><span class="stat-v num">+' + HW.formatNum(st.def) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">速度</span><span class="stat-v num">+' + st.spd + '</span></div>' +
          '</div>' +
          '<div class="result-box" style="font-size:10.5px;line-height:1.45">' +
          '<div style="color:var(--acc-cyan);font-weight:900">' + HW.esc(set.name) + 'セット' + (set.arenaOnly ? '（闘技場限定）' : '') + '</div>' +
          '<div>2部位: ' + HW.esc(set.bonus2.desc) + '</div>' +
          '<div>4部位: ' + HW.esc(set.bonus4.desc) + '</div>' +
          '</div>' +
          '</div>';
      }

      topEl.innerHTML = HW.renderStageHeader('装備倉庫 (' + sd.inventory.length + '/260)') + topPreview;

      const filters = [
        { id: 'all', label: '全て' },
        { id: 'weapon', label: '武器' },
        { id: 'armor', label: '防具' },
        { id: 'accessory', label: '装飾' },
        { id: 'core', label: 'コア' }
      ];

      const autoSellVal = sd.settings.autoSellBelow || 0;
      const autoLabel = autoSellVal === 0 ? '自動売却 OFF' : '自動 ' + autoSellVal + '%未満';

      const gridHtml = list.length
        ? '<div class="inv-grid">' +
          list.map((it) => {
            const tpl = HW.getEquipTemplate(it.tplId);
            const qm = HW.getQualityMeta(it.quality);
            const owner = HW.State.getEquipOwner(it.id);
            const sel = eqUi.selectedId === it.id;
            return (
              '<button type="button" class="inv-card' + (qm.isMax ? ' quality-max-border' : '') + (sel ? ' selected' : '') + '" data-inv-id="' + it.id + '">' +
              '<div class="tag-row" style="justify-content:space-between">' +
              '<span style="font-size:11.5px;font-weight:900;color:#fff">' + HW.esc(tpl.name) + '</span>' +
              HW.badgeQuality(it.quality) +
              '</div>' +
              '<div class="tag-row" style="justify-content:space-between;font-size:10px;color:var(--txt-sub)">' +
              '<span>' + HW.esc(tpl.setName) + '</span>' +
              '<span>' + (it.locked ? '保護 ' : '') + (owner ? HW.esc(HW.getCharDef(owner).name) : '空き') + '</span>' +
              '</div>' +
              '</button>'
            );
          }).join('') +
          '</div>'
        : '<div class="result-box" style="text-align:center;color:var(--txt-sub)">該当する装備がありません</div>';

      const canSellSel = Boolean(selItem && !selItem.locked && !selOwnerId);
      const sellVal = selItem ? HW.getEquipSellValue(selItem) : 0;
      const sellLabel = !selItem
        ? '売却'
        : selOwnerId
          ? '装備中'
          : selItem.locked
            ? '保護中'
            : '売却 ' + sellVal + 'G';

      bottomEl.innerHTML =
        '<div class="subtabs">' +
        filters.map((f) => '<button type="button" class="subtab' + (eqUi.slotFilter === f.id ? ' active' : '') + '" data-eq-f="' + f.id + '">' + f.label + '</button>').join('') +
        '</div>' +
        '<div class="scroll-list" data-scroll-key="equip_' + eqUi.slotFilter + '">' + gridHtml + '</div>' +
        '<div class="equip-action-bar">' +
        '<button type="button" id="eq-lock-btn" class="btn btn-sm"' + (!selItem ? ' disabled' : '') + '>' + HW.icon('lock', 11) + ' ' + (selItem && selItem.locked ? '解除' : '保護') + '</button>' +
        '<button type="button" id="eq-sell-btn" class="btn btn-sm btn-danger"' + (!canSellSel ? ' disabled' : '') + '>' + sellLabel + '</button>' +
        '<button type="button" id="eq-bulk-btn" class="btn btn-sm btn-primary">一括売却</button>' +
        '<button type="button" id="eq-autosell-btn" class="btn btn-sm btn-gold">' + autoLabel + '</button>' +
        '</div>';

      bottomEl.querySelectorAll('[data-eq-f]').forEach((btn) => {
        btn.addEventListener('click', () => {
          eqUi.slotFilter = btn.getAttribute('data-eq-f');
          HW.Audio.tap();
          HW.App.render({ resetScroll: true });
        });
      });

      bottomEl.querySelectorAll('[data-inv-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          eqUi.selectedId = btn.getAttribute('data-inv-id');
          HW.Audio.tap();
          HW.App.render();
        });
      });

      const lockBtn = document.getElementById('eq-lock-btn');
      if (lockBtn && selItem) {
        lockBtn.addEventListener('click', () => {
          HW.State.toggleEquipLock(selItem.id);
          HW.App.render();
        });
      }

      const sellBtn = document.getElementById('eq-sell-btn');
      if (sellBtn && canSellSel) {
        sellBtn.addEventListener('click', () => {
          const r = HW.State.sellEquip(selItem.id);
          if (r.ok) {
            HW.Audio.tap();
            HW.DOM.toast('+' + r.gold + 'G で売却しました');
            eqUi.selectedId = null;
            HW.App.render();
          }
        });
      }

      const bulkBtn = document.getElementById('eq-bulk-btn');
      if (bulkBtn) {
        bulkBtn.addEventListener('click', () => {
          HW.Audio.tap();
          openBulkSellSheet();
        });
      }

      const autoBtn = document.getElementById('eq-autosell-btn');
      if (autoBtn) {
        autoBtn.addEventListener('click', () => {
          const steps = [0, 55, 75, 90, 99];
          const curIdx = steps.indexOf(sd.settings.autoSellBelow || 0);
          const next = steps[(curIdx + 1) % steps.length];
          sd.settings.autoSellBelow = next;
          HW.State.save();
          HW.Audio.tap();
          HW.DOM.toast(next === 0 ? '自動売却をOFFにしました' : '品質' + next + '%未満を自動売却（極100%は保護）', 'gold');
          HW.App.render();
        });
      }
    }
  };
})();
