/* ==========================================================================
   render-codex.js - 図鑑画面（キャラ・敵・装備・アビリティ・異変の5カテゴリ図鑑）
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  const CODEX_TABS = [
    { id: 'unit',    label: 'キャラ' },
    { id: 'enemy',   label: '敵' },
    { id: 'gear',    label: '装備' },
    { id: 'ability', label: 'アビ' },
    { id: 'anomaly', label: '異変' }
  ];

  const SYNERGY_ENTRIES = [
    { id: 'syn:human',   kind: 'synergy', name: '種族シナジー：人間', cond: '人間2体 / 3体以上', desc: '2体で全ステ+8%、3体以上で全ステ+16%。2種族持ちは両種族へ同時カウント。' },
    { id: 'syn:dragon',  kind: 'synergy', name: '種族シナジー：竜',   cond: '竜2体 / 3体以上',   desc: '2体でATK+12%、3体以上でATK+24%・会心ダメ+20%。' },
    { id: 'syn:monster', kind: 'synergy', name: '種族シナジー：魔物', cond: '魔物2体 / 3体以上', desc: '2体で会心率+10%、3体以上で会心率+18%・吸血+6%。' },
    { id: 'syn:fairy',   kind: 'synergy', name: '種族シナジー：妖精', cond: '妖精2体 / 3体以上', desc: '2体で回復量+15%、3体以上で回復量+30%・開幕行動ゲージ+25。' },
    { id: 'syn:machine', kind: 'synergy', name: '種族シナジー：機械', cond: '機械2体 / 3体以上', desc: '2体でSPD+10%、3体以上でSPD+18%・開幕障壁(最大HP15%)。' },
    { id: 'syn:attr',    kind: 'synergy', name: '属性共鳴',          cond: '同属性2体 / 3体以上', desc: '2体でATK+7%・HP+6%、3体以上でATK+16%・HP+12%。' },
    { id: 'syn:rainbow', kind: 'synergy', name: '虹色混沌',          cond: '4属性すべて別属性',  desc: 'ATK+12%・混沌ゲージ蓄積速度+22%。' },
    { id: 'syn:null',    kind: 'synergy', name: '無属性共鳴',        cond: '無属性を1体以上編成', desc: '編成1体につき混沌ゲージ蓄積速度+15%。相性不利なし。' },
    { id: 'syn:roles',   kind: 'synergy', name: '4ロール制覇',       cond: '盾・剣・奏・癒の全編成', desc: 'HP+10%・ATK+10%・DEF+10%・SPD+6%の全能力強化。' }
  ];

  const AFFIX_DESC = {
    atkPct: '最終攻撃力を割合で引き上げる。',
    hpPct: '最大HPを割合で引き上げ耐久と障壁基準を強化する。',
    defPct: '防御力を割合で引き上げ被ダメージを抑える。',
    spd: '行動速度を加算しATB行動順を早める。',
    crit: '会心発生率を引き上げる。',
    cdmg: '会心発生時のダメージ倍率を引き上げる。',
    healPct: '回復スキルの回復量を引き上げる。',
    dmgRed: '受けるダメージを割合で軽減する。',
    lifesteal: '攻撃で与えたダメージの一部を自身のHPとして吸収する。',
    chaosGain: '行動や被弾による混沌ゲージ蓄積量を増やす。',
    attrDmg: '自身の属性攻撃ダメージを引き上げる。'
  };

  function getGearCatalog() {
    const list = [];
    for (const sl of HS.CONST.EQUIP_SLOTS) {
      const base = HS.EQUIP.SLOT_BASES[sl.id];
      for (const name of base.names) {
        list.push({
          id: `base:${sl.id}:${name}`,
          cat: sl.id,
          slot: sl.id,
          slotName: sl.name,
          name,
          mainLabel: base.mainLabel
        });
      }
    }
    for (const af of HS.EQUIP.AFFIX_POOL) {
      list.push({
        id: `affix:${af.type}`,
        cat: 'affix',
        type: af.type,
        name: `${af.label}強化`,
        label: af.label,
        unit: af.unit,
        min: af.min,
        max: af.max,
        desc: AFFIX_DESC[af.type] || '戦闘能力を強化する付加効果。'
      });
    }
    for (const u of HS.UNITS) {
      list.push({
        id: `ex:${u.id}`,
        cat: 'ex',
        unit: u,
        name: u.exWeapon.name,
        desc: u.exWeapon.desc,
        stats: u.exWeapon.stats
      });
    }
    return list;
  }

  function getAbilityCatalog() {
    const list = [];
    for (const r of HS.CONST.ROLES) {
      list.push({
        id: `role:${r.id}`,
        cat: 'role',
        roleId: r.id,
        name: r.ability.name,
        sub: `${r.name}固有アビリティ`,
        cond: `${r.name}ロールのキャラに常時発動`,
        desc: r.ability.desc,
        owners: HS.UNITS.filter((u) => u.role === r.id).map((u) => u.name)
      });
    }
    for (const s of SYNERGY_ENTRIES) {
      list.push({
        id: s.id,
        cat: 'synergy',
        name: s.name,
        sub: 'パーティシナジー',
        cond: s.cond,
        desc: s.desc,
        owners: []
      });
    }
    for (const u of HS.UNITS) {
      list.push({
        id: `exab:${u.id}`,
        cat: 'ex',
        unit: u,
        name: u.exWeapon.name,
        sub: `${u.name} 専用武器アビリティ`,
        cond: `${u.name}の専用武器を解放(Lv.1以上)`,
        desc: u.exWeapon.desc,
        owners: [u.name]
      });
    }
    return list;
  }

  function getFilteredItems(tab, flt) {
    if (tab === 'unit') {
      return HS.UNITS.filter((u) => flt === 'all' || u.attr === flt);
    }
    if (tab === 'enemy') {
      const cat = HS.STAGES.getEnemyCatalog();
      return cat.filter((e) => flt === 'all' || (flt === 'boss' ? e.isBoss : !e.isBoss));
    }
    if (tab === 'gear') {
      const cat = getGearCatalog();
      return cat.filter((g) => flt === 'all' || g.cat === flt);
    }
    if (tab === 'ability') {
      const cat = getAbilityCatalog();
      return cat.filter((a) => flt === 'all' || a.cat === flt);
    }
    return HS.CONST.CHAOS_ANOMALIES;
  }

  function getItemId(tab, item) {
    if (!item) return null;
    if (tab === 'enemy') return item.name;
    return item.id;
  }

  function resolveSelected(tab, list) {
    const cur = HS.STATE.ui.codexSelectedId;
    const hit = list.find((it) => getItemId(tab, it) === cur);
    if (hit) return hit;
    const first = list[0] || null;
    HS.STATE.ui.codexSelectedId = getItemId(tab, first);
    return first;
  }

  // ==================== 上部詳細ビュー ====================
  function renderUpper() {
    const st = HS.STATE.data;
    const codex = st.codex || { enemiesSeen: {}, anomaliesSeen: {}, gearBasesSeen: {}, gearRaritiesSeen: {} };
    const tab = HS.STATE.ui.codexTab || 'unit';
    const flt = HS.STATE.ui.codexFilter || 'all';
    const list = getFilteredItems(tab, flt);
    const sel = resolveSelected(tab, list);
    const e = HS.UTIL.escHtml;

    if (tab === 'unit') {
      const unlockedCnt = HS.UNITS.filter((u) => st.units[u.id]?.unlocked).length;
      const exCnt = HS.UNITS.filter((u) => st.units[u.id]?.exWeaponLv > 0).length;
      const u = sel || HS.UNITS[0];
      const us = st.units[u.id];
      const a = HS.CONST.ATTR_MAP[u.attr];
      const r = HS.CONST.ROLE_MAP[u.role];
      const skillsHtml = u.skills.map((sk, i) => `
        <div class="skill-preview-row">
          <span style="color:var(--attr-col);font-weight:900;flex-shrink:0">技${i + 1}</span>
          <span style="font-weight:800;flex-shrink:0">${e(sk.name)}</span>
          <span class="ellipsis" style="color:var(--text-sub);flex:1">${e(sk.desc)}</span>
        </div>`).join('');

      return `
        <div class="codex-head-bar">
          <span style="font-weight:900;color:var(--accent-cyan)">キャラ図鑑</span>
          <span class="num" style="color:var(--text-sub)">加入 <strong style="color:#fff">${unlockedCnt}/${HS.UNITS.length}</strong>・専用 <strong style="color:var(--accent-pink)">${exCnt}/${HS.UNITS.length}</strong></span>
        </div>
        <div class="panel attr-${u.attr}" style="flex:1 1 auto;min-height:0;border-color:var(--attr-col);display:flex;flex-direction:column;gap:4px;overflow:hidden">
          <div class="row-gap">
            ${HS.CONST.renderUnitCrest(u, 'lg')}
            <div style="min-width:0;flex:1">
              <div class="row-between">
                <span class="ellipsis" style="font-size:13.5px;font-weight:900">${e(u.name)} <span style="font-size:10px;color:var(--text-sub)">${e(u.title)}</span></span>
                <span style="font-size:10.5px;font-weight:900;color:${us.unlocked ? 'var(--accent-lime)' : 'var(--text-mute)'};flex-shrink:0">${us.unlocked ? `加入済 Lv.${us.level}` : '未加入'}</span>
              </div>
              <div class="row-gap" style="margin-top:2px">
                <span class="tag tag-attr">${a.name}</span>
                <span class="tag tag-race">${HS.CONST.formatRacesLabel(u.races)}</span>
                <span class="tag tag-role">${r.name}</span>
              </div>
            </div>
          </div>
          <div class="stat-grid">
            <div class="stat-cell"><span class="k">基礎HP</span><span class="v">${u.base.hp}</span></div>
            <div class="stat-cell"><span class="k">基礎ATK</span><span class="v">${u.base.atk}</span></div>
            <div class="stat-cell"><span class="k">基礎DEF</span><span class="v">${u.base.def}</span></div>
            <div class="stat-cell"><span class="k">基礎SPD</span><span class="v">${u.base.spd}</span></div>
            <div class="stat-cell"><span class="k">基礎会心</span><span class="v">${Math.round(u.base.crit * 100)}%</span></div>
            <div class="stat-cell"><span class="k">解放</span><span class="v ellipsis" style="font-size:9.5px">${e(u.unlock.label)}</span></div>
          </div>
          <div class="skill-preview-list">${skillsHtml}</div>
          <div style="font-size:10px;color:var(--text-sub);margin-top:auto" class="clamp-2">
            <strong style="color:var(--accent-pink)">専用[${e(u.exWeapon.name)}]</strong> ${e(u.exWeapon.desc)}
          </div>
        </div>`;
    }

    if (tab === 'enemy') {
      const catalog = HS.STAGES.getEnemyCatalog();
      const seenCount = catalog.filter((en) => codex.enemiesSeen[en.name]).length;
      const en = sel || catalog[0];
      const rec = en ? codex.enemiesSeen[en.name] : null;
      const a = HS.CONST.ATTR_MAP[en.attr];
      const r = HS.CONST.ROLE_MAP[en.role];

      return `
        <div class="codex-head-bar">
          <span style="font-weight:900;color:var(--accent-pink)">敵図鑑</span>
          <span class="num" style="color:var(--text-sub)">発見 <strong style="color:#fff">${seenCount}/${catalog.length}</strong></span>
        </div>
        <div class="panel attr-${en.attr}" style="flex:1 1 auto;min-height:0;border-color:${rec ? 'var(--attr-col)' : 'var(--border-dim)'};display:flex;flex-direction:column;gap:6px;overflow:hidden">
          <div class="row-gap">
            ${HS.CONST.renderUnitCrest(en, 'lg')}
            <div style="min-width:0;flex:1">
              <div class="row-between">
                <span class="ellipsis" style="font-size:14px;font-weight:900">${rec ? e(en.name) : '？？？'}</span>
                <span class="tag ${en.isBoss ? 'tag-rar rar-CHAOS' : 'tag-race'}">${en.isBoss ? 'BOSS' : '通常'}</span>
              </div>
              <div class="row-gap" style="margin-top:3px">
                <span class="tag tag-attr">${a.name}属性</span>
                <span class="tag tag-role">${r.name}</span>
                <span class="num" style="margin-left:auto;font-size:10.5px;color:var(--text-sub)">${rec ? `討伐 ${HS.UTIL.fmtNum(rec.defeated)}体` : '未遭遇'}</span>
              </div>
            </div>
          </div>
          ${rec ? `
            <div class="stat-grid">
              <div class="stat-cell"><span class="k">目安HP</span><span class="v">${HS.UTIL.fmtNum(en.hp)}</span></div>
              <div class="stat-cell"><span class="k">目安ATK</span><span class="v">${HS.UTIL.fmtNum(en.atk)}</span></div>
              <div class="stat-cell"><span class="k">目安DEF</span><span class="v">${HS.UTIL.fmtNum(en.def)}</span></div>
              <div class="stat-cell"><span class="k">目安SPD</span><span class="v">${en.spd}</span></div>
              <div class="stat-cell"><span class="k">遭遇回数</span><span class="v">${HS.UTIL.fmtNum(rec.seen)}</span></div>
              <div class="stat-cell"><span class="k">討伐数</span><span class="v">${HS.UTIL.fmtNum(rec.defeated)}</span></div>
            </div>
          ` : `
            <div class="panel" style="font-size:11px;color:var(--text-mute);text-align:center">
              まだ遭遇していません。出現エリアに出撃すると詳細が記録されます。
            </div>`}
          <div style="font-size:10.5px;color:var(--text-sub);margin-top:auto" class="clamp-2">
            <strong style="color:var(--accent-gold)">出現エリア:</strong> ${e(en.sources.join(' / '))}
          </div>
        </div>`;
    }

    if (tab === 'gear') {
      const totalBases = 15;
      const seenBases = Object.keys(codex.gearBasesSeen || {}).length;
      const rBadges = HS.CONST.RARITIES.map((r) => {
        const hit = (codex.gearRaritiesSeen?.[r.id] || 0) > 0;
        return `<span class="tag tag-rar rar-${r.id}" style="opacity:${hit ? 1 : 0.3}">${r.name}</span>`;
      }).join('');

      let detailHtml = '';
      if (sel && sel.cat === 'affix') {
        detailHtml = `
          <div class="panel" style="flex:1 1 auto;min-height:0;border-color:var(--accent-cyan);display:flex;flex-direction:column;gap:6px;overflow:hidden">
            <div class="row-between">
              <span style="font-size:14px;font-weight:900;color:var(--accent-cyan)">${e(sel.name)}</span>
              <span class="tag tag-race">付加効果</span>
            </div>
            <div class="stat-grid">
              <div class="stat-cell"><span class="k">基礎最小</span><span class="v">+${sel.min}${sel.unit}</span></div>
              <div class="stat-cell"><span class="k">基礎最大</span><span class="v">+${sel.max}${sel.unit}</span></div>
              <div class="stat-cell"><span class="k">強化成長</span><span class="v">+5%/Lv</span></div>
            </div>
            <div style="font-size:11px;color:var(--text-sub);line-height:1.45">${e(sel.desc)}</div>
            <div style="font-size:10px;color:var(--text-mute);margin-top:auto">※高レアリティ装備ほど付与枠が増え、数値倍率も上昇します。</div>
          </div>`;
      } else if (sel && sel.cat === 'ex') {
        const u = sel.unit;
        const us = st.units[u.id];
        const lv = us?.exWeaponLv || 0;
        detailHtml = `
          <div class="panel attr-${u.attr}" style="flex:1 1 auto;min-height:0;border-color:var(--accent-pink);display:flex;flex-direction:column;gap:5px;overflow:hidden">
            <div class="row-between">
              <span class="ellipsis" style="font-size:13.5px;font-weight:900;color:var(--accent-pink)">${e(sel.name)}</span>
              <span class="num" style="font-size:11px;font-weight:900;color:${lv > 0 ? 'var(--accent-gold)' : 'var(--text-mute)'};flex-shrink:0">${lv > 0 ? `解放済 Lv.${lv}` : '未解放'}</span>
            </div>
            <div class="row-gap" style="font-size:10.5px;color:var(--text-sub)">
              ${HS.CONST.renderUnitCrest(u, 'xs')}
              <span>専用装備者: <strong style="color:#fff">${e(u.name)}</strong></span>
            </div>
            <div class="stat-grid">
              <div class="stat-cell"><span class="k">HP</span><span class="v">+${sel.stats.hp || 0}</span></div>
              <div class="stat-cell"><span class="k">ATK</span><span class="v">+${sel.stats.atk || 0}</span></div>
              <div class="stat-cell"><span class="k">DEF</span><span class="v">+${sel.stats.def || 0}</span></div>
              <div class="stat-cell"><span class="k">SPD</span><span class="v">+${sel.stats.spd || 0}</span></div>
              <div class="stat-cell"><span class="k">会心</span><span class="v">+${sel.stats.crit || 0}%</span></div>
              <div class="stat-cell"><span class="k">最大覚醒</span><span class="v">Lv.5</span></div>
            </div>
            <div style="font-size:10.5px;color:#fff;margin-top:auto" class="clamp-2">${e(sel.desc)}</div>
          </div>`;
      } else if (sel) {
        const key = `${sel.slot}:${sel.name}`;
        const cnt = codex.gearBasesSeen?.[key] || 0;
        const prefixes = HS.CONST.RARITIES.map((r) => `${r.name}: ${(HS.EQUIP.PREFIXES[r.id] || []).join('・')}`).join(' / ');
        detailHtml = `
          <div class="panel" style="flex:1 1 auto;min-height:0;border-color:var(--accent-gold);display:flex;flex-direction:column;gap:5px;overflow:hidden">
            <div class="row-between">
              <div class="row-gap">
                <span style="font-size:16px;color:var(--accent-gold);display:inline-flex">${HS.CONST.renderSlotIcon(sel.slot)}</span>
                <span style="font-size:14px;font-weight:900">${e(sel.name)}</span>
              </div>
              <span class="tag tag-role">${sel.slotName}</span>
            </div>
            <div class="stat-grid">
              <div class="stat-cell"><span class="k">主能力</span><span class="v">${sel.mainLabel}</span></div>
              <div class="stat-cell"><span class="k">強化上限</span><span class="v">+15</span></div>
              <div class="stat-cell"><span class="k">累計発見</span><span class="v">${HS.UTIL.fmtNum(cnt)}個</span></div>
            </div>
            <div style="font-size:10px;color:var(--text-sub);line-height:1.4" class="clamp-2">
              <strong style="color:var(--accent-gold)">レア接頭辞:</strong> ${e(prefixes)}
            </div>
            <div style="font-size:10px;color:var(--text-mute);margin-top:auto">※自動売却されたドロップ装備も発見数として図鑑に記録されます。</div>
          </div>`;
      }

      return `
        <div class="codex-head-bar">
          <span style="font-weight:900;color:var(--accent-gold)">装備図鑑</span>
          <div class="row-gap" style="gap:3px">${rBadges}<span class="num" style="font-size:10px;color:var(--text-sub);margin-left:2px">${seenBases}/${totalBases}</span></div>
        </div>
        ${detailHtml}`;
    }

    if (tab === 'ability') {
      const ab = sel || getAbilityCatalog()[0];
      const badgeCol = ab.cat === 'role' ? 'var(--accent-gold)' : ab.cat === 'synergy' ? 'var(--accent-lime)' : 'var(--accent-pink)';
      return `
        <div class="codex-head-bar">
          <span style="font-weight:900;color:var(--accent-lime)">アビリティ図鑑</span>
          <span class="num" style="color:var(--text-sub)">収録 <strong style="color:#fff">${getAbilityCatalog().length}種</strong></span>
        </div>
        <div class="panel" style="flex:1 1 auto;min-height:0;border-color:${badgeCol};display:flex;flex-direction:column;gap:6px;overflow:hidden">
          <div class="row-between">
            <div class="row-gap">
              ${ab.roleId ? `<span style="font-size:16px;color:var(--accent-gold);display:inline-flex">${HS.CONST.renderRoleIcon(ab.roleId)}</span>` : ab.unit ? HS.CONST.renderUnitCrest(ab.unit, 'xs') : ''}
              <span class="ellipsis" style="font-size:14px;font-weight:900;color:${badgeCol}">${e(ab.name)}</span>
            </div>
            <span class="tag tag-role">${e(ab.sub)}</span>
          </div>
          <div style="font-size:11px;color:var(--accent-cyan);font-weight:800">発動条件：${e(ab.cond)}</div>
          <div style="font-size:11.5px;color:#fff;line-height:1.5">${e(ab.desc)}</div>
          ${ab.owners && ab.owners.length ? `
            <div style="font-size:10px;color:var(--text-sub);margin-top:auto" class="clamp-2">
              <strong style="color:var(--accent-gold)">該当キャラ:</strong> ${e(ab.owners.join('・'))}
            </div>` : `
            <div style="font-size:10px;color:var(--text-mute);margin-top:auto">編成画面のパーティ構成に応じて自動で適用されます。</div>`}
        </div>`;
    }

    // 異変図鑑 (anomaly)
    const an = sel || HS.CONST.CHAOS_ANOMALIES[0];
    const seenAnomTypes = HS.CONST.CHAOS_ANOMALIES.filter((x) => (codex.anomaliesSeen?.[x.id] || 0) > 0).length;
    const count = codex.anomaliesSeen?.[an.id] || 0;
    return `
      <div class="codex-head-bar">
        <span style="font-weight:900;color:var(--accent-pink)">異変図鑑</span>
        <span class="num" style="color:var(--text-sub)">体験 <strong style="color:#fff">${seenAnomTypes}/${HS.CONST.CHAOS_ANOMALIES.length}</strong>・累計 <strong style="color:var(--accent-gold)">${HS.UTIL.fmtNum(st.stats.totalAnomalies)}回</strong></span>
      </div>
      <div class="panel" style="flex:1 1 auto;min-height:0;border-color:${an.color};display:flex;flex-direction:column;gap:6px;overflow:hidden">
        <div class="row-between">
          <span style="font-size:14.5px;font-weight:900;color:${an.color}">${e(an.name)}</span>
          <span class="tag tag-role">持続 ${an.duration}秒</span>
        </div>
        <div style="font-size:12px;color:#fff;line-height:1.5">${e(an.desc)}</div>
        <div class="summary-grid" style="margin-top:auto">
          <div class="summary-cell"><span class="sk">この異変の発動回数</span><span class="sv" style="color:${an.color}">${HS.UTIL.fmtNum(count)}回</span></div>
          <div class="summary-cell"><span class="sk">発動条件</span><span class="sv" style="font-size:11px">混沌ゲージ100%で自動発動</span></div>
        </div>
        <div style="font-size:10px;color:var(--text-sub)">※無属性キャラの編成やタンクの被弾で混沌ゲージが素早く溜まります。</div>
      </div>`;
  }

  // ==================== 下部カテゴリ・一覧ビュー ====================
  function renderLower() {
    const st = HS.STATE.data;
    const codex = st.codex || { enemiesSeen: {}, anomaliesSeen: {}, gearBasesSeen: {}, gearRaritiesSeen: {} };
    const tab = HS.STATE.ui.codexTab || 'unit';
    const flt = HS.STATE.ui.codexFilter || 'all';
    const list = getFilteredItems(tab, flt);
    const sel = resolveSelected(tab, list);
    const selId = getItemId(tab, sel);
    const e = HS.UTIL.escHtml;

    let filterHtml = '';
    if (tab === 'unit') {
      filterHtml = `
        <div class="pill-bar">
          <button class="pill-btn ${flt === 'all' ? 'active' : ''}" data-action="codex-filter" data-val="all">全属性</button>
          ${HS.CONST.ATTRIBUTES.map((a) => `
            <button class="pill-btn ${flt === a.id ? 'active' : ''}" data-action="codex-filter" data-val="${a.id}">${a.name}</button>`).join('')}
        </div>`;
    } else if (tab === 'enemy') {
      filterHtml = `
        <div class="pill-bar">
          <button class="pill-btn ${flt === 'all' ? 'active' : ''}" data-action="codex-filter" data-val="all">全て</button>
          <button class="pill-btn ${flt === 'normal' ? 'active' : ''}" data-action="codex-filter" data-val="normal">通常エネミー</button>
          <button class="pill-btn ${flt === 'boss' ? 'active' : ''}" data-action="codex-filter" data-val="boss">ボス・層主</button>
        </div>`;
    } else if (tab === 'gear') {
      const gFlts = [
        { id: 'all', label: '全て' },
        { id: 'weapon', label: '武器' },
        { id: 'armor', label: '防具' },
        { id: 'accessory', label: '装飾' },
        { id: 'affix', label: '付加効果' },
        { id: 'ex', label: '専用武器' }
      ];
      filterHtml = `
        <div class="pill-bar">
          ${gFlts.map((f) => `<button class="pill-btn ${flt === f.id ? 'active' : ''}" data-action="codex-filter" data-val="${f.id}">${f.label}</button>`).join('')}
        </div>`;
    } else if (tab === 'ability') {
      const aFlts = [
        { id: 'all', label: '全て' },
        { id: 'role', label: 'ロール固有' },
        { id: 'synergy', label: 'シナジー' },
        { id: 'ex', label: '専用パッシブ' }
      ];
      filterHtml = `
        <div class="pill-bar">
          ${aFlts.map((f) => `<button class="pill-btn ${flt === f.id ? 'active' : ''}" data-action="codex-filter" data-val="${f.id}">${f.label}</button>`).join('')}
        </div>`;
    }

    let listHtml = '';
    if (tab === 'unit') {
      listHtml = `<div class="roster-grid scroll-box">${list.map((u) => {
        const us = st.units[u.id];
        const r = HS.CONST.ROLE_MAP[u.role];
        return `
          <button class="unit-chip attr-${u.attr} ${u.id === selId ? 'selected' : ''} ${us.unlocked ? '' : 'locked'}"
                  data-action="codex-select" data-val="${u.id}">
            ${HS.CONST.renderUnitCrest(u)}
            <div style="min-width:0;flex:1">
              <div class="row-between">
                <span class="ellipsis" style="font-size:11px;font-weight:900">${e(u.name)}</span>
                <span class="num" style="font-size:9.5px;color:${us.unlocked ? 'var(--accent-lime)' : 'var(--text-mute)'}">${us.unlocked ? `Lv.${us.level}` : '未加入'}</span>
              </div>
              <div class="ellipsis" style="font-size:9.5px;color:var(--text-sub)">${HS.CONST.formatRacesLabel(u.races)}・${r.name}</div>
            </div>
          </button>`;
      }).join('')}</div>`;
    } else if (tab === 'enemy') {
      listHtml = `<div class="roster-grid scroll-box">${list.map((en) => {
        const rec = codex.enemiesSeen[en.name];
        const r = HS.CONST.ROLE_MAP[en.role];
        return `
          <button class="unit-chip attr-${en.attr} ${en.name === selId ? 'selected' : ''} ${rec ? '' : 'locked'}"
                  data-action="codex-select" data-val="${e(en.name)}">
            ${HS.CONST.renderUnitCrest(en)}
            <div style="min-width:0;flex:1">
              <div class="row-between">
                <span class="ellipsis" style="font-size:10.5px;font-weight:900">${rec ? e(en.name) : '？？？'}</span>
                <span style="font-size:9px;font-weight:800;color:${en.isBoss ? 'var(--accent-pink)' : 'var(--text-sub)'};flex-shrink:0">${en.isBoss ? 'BOSS' : r.short}</span>
              </div>
              <div class="ellipsis num" style="font-size:9px;color:var(--text-sub)">${rec ? `討伐 ${rec.defeated}` : e(en.sources[0] || '')}</div>
            </div>
          </button>`;
      }).join('')}</div>`;
    } else if (tab === 'gear') {
      listHtml = `<div class="codex-list scroll-box">${list.map((g) => {
        const isSel = g.id === selId;
        if (g.cat === 'affix') {
          return `
            <button class="codex-row ${isSel ? 'selected' : ''}" data-action="codex-select" data-val="${e(g.id)}">
              <span class="tag tag-race">効果</span>
              <span class="ellipsis" style="font-weight:800;flex:1">${e(g.name)}</span>
              <span class="num" style="font-size:10px;color:var(--accent-cyan);flex-shrink:0">+${g.min}〜${g.max}${g.unit}</span>
            </button>`;
        }
        if (g.cat === 'ex') {
          const lv = st.units[g.unit.id]?.exWeaponLv || 0;
          return `
            <button class="codex-row attr-${g.unit.attr} ${isSel ? 'selected' : ''}" data-action="codex-select" data-val="${e(g.id)}">
              ${HS.CONST.renderUnitCrest(g.unit, 'xs')}
              <span class="ellipsis" style="font-weight:800;flex:1">${e(g.name)}</span>
              <span class="num" style="font-size:10px;color:${lv > 0 ? 'var(--accent-pink)' : 'var(--text-mute)'};flex-shrink:0">${lv > 0 ? `Lv.${lv}` : '未解放'}</span>
            </button>`;
        }
        const cnt = codex.gearBasesSeen?.[`${g.slot}:${g.name}`] || 0;
        return `
          <button class="codex-row ${isSel ? 'selected' : ''} ${cnt > 0 ? '' : 'locked'}" data-action="codex-select" data-val="${e(g.id)}">
            <span style="display:inline-flex;color:var(--accent-gold);font-size:13px">${HS.CONST.renderSlotIcon(g.slot)}</span>
            <span class="ellipsis" style="font-weight:800;flex:1">${e(g.name)} <span style="font-size:9.5px;color:var(--text-sub)">(${g.mainLabel})</span></span>
            <span class="num" style="font-size:10px;color:${cnt > 0 ? 'var(--accent-lime)' : 'var(--text-mute)'};flex-shrink:0">${cnt > 0 ? `発見${cnt}` : '未発見'}</span>
          </button>`;
      }).join('')}</div>`;
    } else if (tab === 'ability') {
      listHtml = `<div class="codex-list scroll-box">${list.map((ab) => {
        const isSel = ab.id === selId;
        const badge = ab.cat === 'role' ? 'ロール' : ab.cat === 'synergy' ? 'シナジー' : '専用';
        return `
          <button class="codex-row ${isSel ? 'selected' : ''}" data-action="codex-select" data-val="${e(ab.id)}">
            <span class="tag ${ab.cat === 'role' ? 'tag-role' : ab.cat === 'synergy' ? 'tag-attr attr-wind' : 'tag-rar rar-CHAOS'}">${badge}</span>
            <span class="ellipsis" style="font-weight:800;flex:1">${e(ab.name)}</span>
            <span class="ellipsis" style="font-size:9.5px;color:var(--text-sub);max-width:92px">${e(ab.sub.replace('専用武器アビリティ', '').replace('固有アビリティ', ''))}</span>
          </button>`;
      }).join('')}</div>`;
    } else {
      listHtml = `<div class="codex-list scroll-box">${HS.CONST.CHAOS_ANOMALIES.map((an) => {
        const isSel = an.id === selId;
        const cnt = codex.anomaliesSeen?.[an.id] || 0;
        return `
          <button class="codex-row ${isSel ? 'selected' : ''}" style="border-left:3px solid ${an.color}" data-action="codex-select" data-val="${an.id}">
            <span class="ellipsis" style="font-weight:900;color:${an.color};flex:1">${e(an.name)}</span>
            <span class="num" style="font-size:10px;color:${cnt > 0 ? '#fff' : 'var(--text-mute)'};flex-shrink:0">${cnt > 0 ? `${cnt}回発動` : '未発動'}</span>
          </button>`;
      }).join('')}</div>`;
    }

    return `
      <div class="mode-tabs">
        ${CODEX_TABS.map((t) => `
          <button class="btn btn-sm ${tab === t.id ? 'btn-primary' : ''}" data-action="codex-tab" data-val="${t.id}">${t.label}</button>`).join('')}
      </div>
      ${filterHtml}
      ${listHtml}`;
  }

  HS.UI_CODEX = { renderUpper, renderLower };
})(window);
