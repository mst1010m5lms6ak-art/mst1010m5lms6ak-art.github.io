/* ==========================================================================
   render-gear.js - 装備画面（横スクロールキャラ選択・D&D装着・強化・保護・レアリティ一括売却）
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  function getUnlockedUnits() {
    return HS.UNITS.filter((u) => HS.STATE.data.units[u.id]?.unlocked);
  }

  function ensureGearTarget() {
    const unlocked = getUnlockedUnits();
    let tid = HS.STATE.ui.gearTargetUnitId;
    if (!unlocked.some((u) => u.id === tid)) {
      tid = unlocked[0]?.id || 'kagura';
      HS.STATE.ui.gearTargetUnitId = tid;
    }
    return tid;
  }

  function renderUpper() {
    const st = HS.STATE.data;
    const targetUid = ensureGearTarget();
    const targetU = HS.UNITS_MAP[targetUid];
    const targetUs = st.units[targetUid];
    const eqMap = HS.STATE.getEquipMap();

    const item = st.equipment.find((e) => e.id === HS.STATE.ui.selectedGearId) || st.equipment[0] || null;
    if (item && HS.STATE.ui.selectedGearId !== item.id) HS.STATE.ui.selectedGearId = item.id;

    let itemHtml = '';
    if (!item) {
      itemHtml = `<div class="panel" style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-mute)">所持装備がありません。戦闘で装備を獲得しましょう。</div>`;
    } else {
      const enhMult = 1 + (item.enhance || 0) * 0.12;
      const mVal = Math.round(item.mainVal * enhMult);
      const sLabel = HS.EQUIP.SLOT_BASES[item.slot]?.mainLabel || 'ATK';
      const ownerName = item.equippedBy ? HS.UNITS_MAP[item.equippedBy]?.name : null;

      // 対象キャラの同スロット現装備との比較
      const curId = targetUs.equips[item.slot];
      const curItem = curId ? eqMap[curId] : null;
      const diff = curItem ? item.score - curItem.score : item.score;
      const diffStr = curItem && curItem.id === item.id
        ? '装備中'
        : diff >= 0 ? `評点 +${diff}` : `評点 ${diff}`;
      const diffCol = curItem && curItem.id === item.id
        ? 'var(--accent-cyan)'
        : diff >= 0 ? 'var(--accent-lime)' : 'var(--accent-danger)';

      const affixesHtml = (item.affixes || []).map((af) => `
        <span class="tag tag-race">${HS.UTIL.escHtml(HS.EQUIP.formatAffix(af, item.enhance))}</span>`).join('');

      itemHtml = `
        <div class="panel rar-${item.rarity}" style="flex:1 1 auto;min-height:0;border-color:var(--rar-col);display:flex;flex-direction:column;gap:5px;overflow:hidden">
          <div class="row-between">
            <div class="row-gap">
              <span class="tag tag-rar">${item.rarity}</span>
              <span class="ellipsis" style="font-size:13px;font-weight:900">${HS.UTIL.escHtml(item.name)}${item.enhance > 0 ? ` +${item.enhance}` : ''}</span>
            </div>
            <span style="font-size:11px;font-weight:900;color:${diffCol};flex-shrink:0" class="num">${diffStr}</span>
          </div>
          <div class="row-between" style="font-size:11px">
            <span class="num">主能力: <strong style="color:#fff">${sLabel} +${HS.UTIL.fmtNum(mVal)}</strong></span>
            <span class="num" style="color:var(--text-sub)">評点 <strong style="color:var(--accent-gold)">${item.score}</strong> ${item.locked ? '🔒' : ''}</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">${affixesHtml}</div>
          <div class="row-between" style="margin-top:auto;font-size:10px;color:var(--text-sub)">
            <span>${ownerName ? `装着中: ${HS.UTIL.escHtml(ownerName)}` : '未装備'}</span>
            <span class="num">所持数 ${st.equipment.length}/160・魔粉 ${HS.UTIL.fmtNum(st.resources.dust)}</span>
          </div>
        </div>`;
    }

    const stats = HS.STATE.getUnitStats(targetUid, false);

    return `
      <div class="panel attr-${targetU.attr}" style="border-color:var(--attr-col);display:flex;align-items:center;justify-content:space-between;gap:6px">
        <div class="row-gap">
          ${HS.CONST.renderUnitCrest(targetU)}
          <div style="min-width:0">
            <div class="ellipsis" style="font-size:12px;font-weight:900">${HS.UTIL.escHtml(targetU.name)} の装備</div>
            <div class="num" style="font-size:10px;color:var(--text-sub)">HP ${HS.UTIL.fmtNum(stats.hp)} / ATK ${HS.UTIL.fmtNum(stats.atk)} / SPD ${stats.spd}</div>
          </div>
        </div>
        <span class="num" style="font-size:11px;font-weight:900;color:var(--accent-cyan);flex-shrink:0">戦力 ${HS.UTIL.fmtNum(stats.power)}</span>
      </div>
      ${itemHtml}
      <div class="row-between" style="font-size:10px;color:var(--text-sub);padding:0 2px">
        <span>横スクロールで対象キャラを切替</span>
        <span>長押し/⠿ドラッグで枠へ装着</span>
      </div>`;
  }

  function renderLower() {
    const st = HS.STATE.data;
    const targetUid = ensureGearTarget();
    const targetUs = st.units[targetUid];
    const eqMap = HS.STATE.getEquipMap();
    const fltSlot = HS.STATE.ui.gearFilterSlot;
    const unlockedUnits = getUnlockedUnits();

    const item = st.equipment.find((e) => e.id === HS.STATE.ui.selectedGearId) || st.equipment[0] || null;

    // 横スクロール式キャラ選択バー
    const unitStripHtml = unlockedUnits.map((u) => {
      const sel = u.id === targetUid;
      const inParty = st.party.includes(u.id);
      return `
        <button class="gear-unit-pill attr-${u.attr} ${sel ? 'selected' : ''} ${inParty ? 'in-party' : ''}"
                data-action="select-gear-unit" data-val="${u.id}">
          ${HS.CONST.renderUnitCrest(u, 'xs')}
          <span class="ellipsis gear-unit-name">${HS.UTIL.escHtml(u.name)}</span>
        </button>`;
    }).join('');

    const slotsHtml = HS.CONST.EQUIP_SLOTS.map((sl) => {
      const eqId = targetUs.equips[sl.id];
      const eq = eqId ? eqMap[eqId] : null;
      if (!eq) {
        return `
          <button class="gear-slot-box" data-action="gear-filter" data-val="${sl.id}"
                  data-drop-kind="gear-slot" data-drop-value="${sl.id}">
            <span class="gear-slot-ico">${HS.CONST.renderSlotIcon(sl.id)}</span>
            <span style="font-size:9.5px;color:var(--text-mute)">${sl.name}空</span>
          </button>`;
      }
      return `
        <button class="gear-slot-box filled rar-${eq.rarity}" data-action="unequip-slot" data-val="${targetUid}:${sl.id}"
                data-drop-kind="gear-slot" data-drop-value="${sl.id}">
          <span style="font-size:9px;font-weight:900;color:var(--rar-col)">${eq.rarity}${eq.enhance > 0 ? ` +${eq.enhance}` : ''}</span>
          <span class="ellipsis" style="font-size:10px;font-weight:800;max-width:100%">${HS.UTIL.escHtml(eq.name)}</span>
          <span style="font-size:8.5px;color:var(--text-sub)">タップで外す</span>
        </button>`;
    }).join('');

    const filtered = st.equipment
      .filter((e) => fltSlot === 'all' || e.slot === fltSlot)
      .sort((a, b) => b.score - a.score);

    const gridHtml = filtered.map((e) => {
      const sel = item && item.id === e.id;
      const slIco = HS.CONST.renderSlotIcon(e.slot, 'gear-card-ico');
      const owner = e.equippedBy ? HS.UNITS_MAP[e.equippedBy]?.name : '';
      return `
        <div class="gear-card rar-${e.rarity} ${sel ? 'selected' : ''}"
             data-action="select-gear" data-val="${e.id}"
             data-drag-kind="gear-item" data-drag-value="${e.id}" data-drag-label="${HS.UTIL.escHtml(e.name)}"
             data-drag-accept="gear-slot">
          <div class="row-between">
            <span class="row-gap" style="font-size:9.5px;font-weight:900;color:var(--rar-col);gap:3px">${slIco}<span>${e.rarity}${e.enhance > 0 ? `+${e.enhance}` : ''}</span></span>
            <div class="row-gap">
              <span class="num" style="font-size:9.5px;color:var(--accent-gold)">${e.score}</span>
              <span data-drag-handle="1" style="font-size:12px;color:var(--text-mute);touch-action:none">⠿</span>
            </div>
          </div>
          <div class="ellipsis" style="font-size:10.5px;font-weight:800">${e.locked ? '🔒' : ''}${HS.UTIL.escHtml(e.name)}</div>
          <div class="ellipsis" style="font-size:9px;color:var(--text-sub)">${owner ? `装着:${owner}` : '未装備'}</div>
        </div>`;
    }).join('');

    const enhCost = item ? HS.EQUIP.getEnhanceCost(item) : null;

    return `
      <div class="gear-unit-strip h-scroll-box" id="gear-unit-strip">${unitStripHtml}</div>

      <div class="gear-drop-row">${slotsHtml}</div>

      <div class="row-gap" style="flex:0 0 28px">
        <button class="btn btn-sm btn-primary" style="flex:1.05" data-action="gear-equip" data-val="${item ? item.id : ''}" ${item ? '' : 'disabled'}>装備</button>
        <button class="btn btn-sm btn-gold" style="flex:1.25" data-action="gear-enhance" data-val="${item ? item.id : ''}" ${item ? '' : 'disabled'}>
          強化${enhCost ? `(${HS.UTIL.fmtNum(enhCost.gold)}G)` : ''}
        </button>
        <button class="btn btn-sm" style="flex:0.75" data-action="gear-lock" data-val="${item ? item.id : ''}" ${item ? '' : 'disabled'}>
          ${item?.locked ? '🔓解除' : '🔒保護'}
        </button>
        <button class="btn btn-sm btn-cyan" style="flex:0.7" data-action="gear-auto-equip" data-val="${targetUid}">最適</button>
        <button class="btn btn-sm btn-danger" style="flex:0.85" data-action="open-bulksell">一括売</button>
      </div>

      <div class="pill-bar">
        <button class="pill-btn ${fltSlot === 'all' ? 'active' : ''}" data-action="gear-filter" data-val="all">全て</button>
        ${HS.CONST.EQUIP_SLOTS.map((sl) => `
          <button class="pill-btn ${fltSlot === sl.id ? 'active' : ''}" data-action="gear-filter" data-val="${sl.id}">${HS.CONST.renderSlotIcon(sl.id)} ${sl.name}</button>`).join('')}
      </div>

      <div class="gear-grid scroll-box">${gridHtml}</div>`;
  }

  // レアリティ指定 一括売却シート（装備タブ専用）
  function buildBulkSellSheet() {
    const selected = HS.STATE.ui.bulkSellRarities || ['N'];
    const rarities = ['N', 'R', 'SR', 'SSR'];
    const preview = HS.STATE.previewBulkSellByRarities(selected);

    return {
      title: 'レアリティ別 一括売却',
      body: `
        <div class="panel" style="display:flex;flex-direction:column;gap:8px;font-size:11.5px">
          <div style="font-weight:800">売却対象レアリティを選択してください</div>
          <div style="font-size:10.5px;color:var(--text-sub)">
            未装備・ロック解除状態の該当装備をまとめて売却します。装備中・🔒保護中・CHAOSレアは安全のため除外されます。
          </div>
          <div class="summary-grid">
            <div class="summary-cell"><span class="sk">売却対象数</span><span class="sv">${preview.count} 件</span></div>
            <div class="summary-cell"><span class="sk">獲得ゴールド</span><span class="sv res-gold">+${HS.UTIL.fmtNum(preview.gold)}G</span></div>
            <div class="summary-cell"><span class="sk">獲得強化魔粉</span><span class="sv res-core">+${HS.UTIL.fmtNum(preview.dust)}</span></div>
            <div class="summary-cell"><span class="sk">選択レア</span><span class="sv">${selected.length ? selected.join('・') : '未選択'}</span></div>
          </div>
        </div>`,
      foot: `
        <div class="sheet-foot-row">
          ${rarities.map((r) => {
            const on = selected.includes(r);
            return `<button class="btn btn-sm rar-${r} ${on ? 'btn-gold' : ''}" data-action="bulksell-toggle-rar" data-val="${r}">${on ? '✓ ' : ''}${r}</button>`;
          }).join('')}
        </div>
        <div class="sheet-foot-row">
          <button class="btn btn-sm" data-action="bulksell-preset" data-val="N">Nのみ</button>
          <button class="btn btn-sm" data-action="bulksell-preset" data-val="R">R以下</button>
          <button class="btn btn-sm" data-action="bulksell-preset" data-val="SR">SR以下</button>
          <button class="btn btn-sm" data-action="bulksell-preset" data-val="SSR">SSR以下</button>
        </div>
        <div class="sheet-foot-row">
          <button class="btn" data-action="close-sheet">閉じる</button>
          <button class="btn btn-danger" data-action="exec-bulksell" ${preview.count > 0 ? '' : 'disabled'}>${preview.count}件を一括売却する</button>
        </div>`
    };
  }

  // 自動売却フィルタ設定シート（出撃画面からのみ開く）
  function buildAutoSellSheet() {
    const rule = HS.STATE.data.autoSell;
    const rarities = ['N', 'R', 'SR', 'SSR'];
    return {
      title: '自動売却フィルタ設定',
      body: `
        <div class="panel" style="display:flex;flex-direction:column;gap:8px;font-size:11.5px">
          <div class="row-between">
            <span style="font-weight:800">ドロップ時の自動売却</span>
            <span style="font-weight:900;color:${rule.enabled ? 'var(--accent-lime)' : 'var(--text-mute)'}">${rule.enabled ? '有効' : '無効'}</span>
          </div>
          <div style="font-size:10.5px;color:var(--text-sub)">
            指定レアリティ以下の未ロック装備をドロップ時に自動でゴールド＆強化魔粉へ変換します。CHAOSレアは常に保護されます。
          </div>
          <div style="font-weight:800;margin-top:2px">自動売却する上限レアリティ：現在 <span style="color:var(--accent-gold)">${rule.maxRarity}以下</span></div>
          <div style="font-weight:800;margin-top:2px">高評点保護（評点${rule.keepScoreThreshold}以上は売らない）：<span style="color:${rule.keepHighScore ? 'var(--accent-cyan)' : 'var(--text-mute)'}">${rule.keepHighScore ? 'ON' : 'OFF'}</span></div>
        </div>`,
      foot: `
        <div class="sheet-foot-row">
          ${rarities.map((r) => `
            <button class="btn btn-sm ${rule.maxRarity === r ? 'btn-gold' : ''}" data-action="autosell-rarity" data-val="${r}">${r}以下</button>`).join('')}
        </div>
        <div class="sheet-foot-row">
          <button class="btn btn-toggle ${rule.enabled ? 'on' : ''}" data-action="autosell-toggle">自動売却 ${rule.enabled ? 'ON' : 'OFF'}</button>
          <button class="btn btn-toggle ${rule.keepHighScore ? 'on' : ''}" data-action="autosell-highscore">高評点保護 ${rule.keepHighScore ? 'ON' : 'OFF'}</button>
        </div>
        <div class="sheet-foot-row">
          <button class="btn btn-primary" data-action="close-sheet">設定を完了して閉じる</button>
        </div>`
    };
  }

  HS.UI_GEAR = { renderUpper, renderLower, buildBulkSellSheet, buildAutoSellSheet };
})(window);
