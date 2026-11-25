(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  /*
   * 観賞用図鑑（キャラ・敵・装備・アビリティ）
   * ボーナス一切なし。キャラ/敵/装備の紹介文(lore)はこの図鑑画面にのみ表示。
   */
  const codexUi = {
    sub: 'char', // 'char' | 'enemy' | 'equip' | 'ability'
    selectedChar: 'c_kagura',
    selectedEnemy: 'e_slime_bot',
    selectedEquip: 'set_crimson_weapon',
    selectedAbility: 't1_1',
    abRoleFilter: 'all'
  };

  function openCharDetailSheet(c) {
    const cs = HW.State.data.chars[c.id];
    const b = c.base;
    const skillsHtml = c.skills.map((sk) => {
      const ctTxt = sk.target === 'passive' ? '常時発動' : sk.ct === 0 ? 'CT 0' : 'CT ' + sk.ct;
      return (
        '<div class="arena-detail-card">' +
        '<div class="tag-row" style="justify-content:space-between">' +
        '<span class="tag-row">' + HW.badgeTarget(sk.target) + '<strong style="font-size:11.5px;color:#fff">' + HW.esc(sk.name) + '</strong></span>' +
        '<span class="b-pill num">' + ctTxt + '</span>' +
        '</div>' +
        '<div style="font-size:10.5px;color:var(--txt-sub)">' + HW.esc(sk.desc) + '</div>' +
        '</div>'
      );
    }).join('');

    const favTags = HW.formatModTags(c.favorite && c.favorite.mod).join(' / ');
    const relTags = HW.formatModTags(c.relic && c.relic.mod).join(' / ');

    const body =
      '<div class="result-box">' +
      '<div class="tag-row" style="justify-content:space-between;margin-bottom:4px">' +
      '<div class="tag-row">' + HW.badgeElement(c.element) + HW.badgeRole(c.role, false) + HW.badgeRaces(c.races) + '</div>' +
      '<span class="b-pill">' + (cs.unlocked ? HW.starsText(cs.star) + ' R-' + HW.RANK_NAMES[cs.rank - 1] : c.arenaOnly ? '闘技場限定' : '未加入') + '</span>' +
      '</div>' +
      '<div style="font-size:11px;line-height:1.48;color:#dde5fa">' + HW.esc(c.lore) + '</div>' +
      '</div>' +
      '<div class="stat-grid-4">' +
      '<div class="stat-cell"><span class="stat-k">基礎HP</span><span class="stat-v num">' + HW.formatNum(b.hp) + '</span></div>' +
      '<div class="stat-cell"><span class="stat-k">基礎攻撃</span><span class="stat-v num">' + HW.formatNum(b.atk) + '</span></div>' +
      '<div class="stat-cell"><span class="stat-k">基礎防御</span><span class="stat-v num">' + HW.formatNum(b.def) + '</span></div>' +
      '<div class="stat-cell"><span class="stat-k">基礎速度</span><span class="stat-v num">' + b.spd + '</span></div>' +
      '</div>' +
      '<div class="stat-grid-4">' +
      '<div class="stat-cell"><span class="stat-k">会心率</span><span class="stat-v num">' + Math.round(b.crit * 100) + '%</span></div>' +
      '<div class="stat-cell"><span class="stat-k">会心倍</span><span class="stat-v num">' + Math.round(b.critDmg * 100) + '%</span></div>' +
      '<div class="stat-cell"><span class="stat-k">回避</span><span class="stat-v num">' + Math.round(b.eva * 100) + '%</span></div>' +
      '<div class="stat-cell"><span class="stat-k">耐性/命中</span><span class="stat-v num">' + Math.round(b.res * 100) + '/' + Math.round(b.effHit * 100) + '%</span></div>' +
      '</div>' +
      '<div style="font-size:10.5px;font-weight:900;color:var(--acc-cyan)">保有技</div>' +
      skillsHtml +
      '<div class="arena-detail-card" style="border-color:rgba(45,226,230,0.45)">' +
      '<div class="tag-row" style="justify-content:space-between"><strong style="font-size:11px;color:#fff">愛用品: ' + HW.esc(c.favorite.name) + '</strong><span class="b-pill">★4解放</span></div>' +
      '<div style="font-size:10.5px;color:#d6f9ff">' + HW.esc(c.favorite.desc) + '</div>' +
      (favTags ? '<div style="font-size:9.5px;color:var(--txt-sub)">補正: ' + HW.esc(favTags) + '</div>' : '') +
      '</div>' +
      '<div class="arena-detail-card" style="border-color:rgba(255,210,76,0.55)">' +
      '<div class="tag-row" style="justify-content:space-between"><strong style="font-size:11px;color:var(--acc-gold)">固有神器: ' + HW.esc(c.relic.name) + '</strong><span class="b-pill boss">★5解放</span></div>' +
      '<div style="font-size:10.5px;color:#fff0bd">' + HW.esc(c.relic.desc) + '</div>' +
      (relTags ? '<div style="font-size:9.5px;color:var(--txt-sub)">補正: ' + HW.esc(relTags) + '</div>' : '') +
      '</div>' +
      '<div class="arena-detail-card" style="border-color:rgba(168,107,255,0.5)">' +
      '<div class="tag-row" style="justify-content:space-between"><strong style="font-size:11px;color:#e4caff">バディ特性: ' + HW.esc(c.linkBonus.name) + '</strong><span class="syn-chip">裏枠リンク</span></div>' +
      '<div style="font-size:10.5px;color:var(--txt-sub)">' + HW.esc(c.linkBonus.desc) + '</div>' +
      '</div>';

    HW.DOM.openSheet(c.name + '（図鑑詳細）', body);
  }

  function openEnemyDetailSheet(e) {
    const b = e.base;
    const kindTag = e.kind === 'intruder' ? '希少乱入' : e.kind === 'raid' ? '総力ボス' : e.kind === 'boss' ? 'エリアボス' : '通常敵';
    const skillsHtml = e.skills.map((sk) => {
      const ctTxt = sk.ct === 0 ? 'CT 0' : 'CT ' + sk.ct;
      const multTxt = sk.mult ? '威力倍率 ' + Math.round(sk.mult * 100) + '%' : sk.healMult ? '回復系' : '補助系';
      return (
        '<div class="arena-detail-card">' +
        '<div class="tag-row" style="justify-content:space-between">' +
        '<span class="tag-row">' + HW.badgeTarget(sk.target) + '<strong style="font-size:11.5px;color:#fff">' + HW.esc(sk.name) + '</strong></span>' +
        '<span class="b-pill num">' + ctTxt + '</span>' +
        '</div>' +
        '<div style="font-size:10.5px;color:var(--txt-sub)">' + HW.esc(multTxt) + (sk.ailment ? ' / 異常付与あり' : '') + (sk.debuff ? ' / 弱体付与あり' : '') + '</div>' +
        '</div>'
      );
    }).join('');

    const body =
      '<div class="result-box">' +
      '<div class="tag-row" style="justify-content:space-between;margin-bottom:4px">' +
      '<div class="tag-row">' + HW.badgeElement(e.element) + HW.badgeRole(e.role, false) + HW.badgeRaces(e.races) + '</div>' +
      '<span class="b-pill' + (e.kind !== 'normal' ? ' boss' : '') + '">' + kindTag + '</span>' +
      '</div>' +
      '<div style="font-size:11px;line-height:1.48;color:#dde5fa">' + HW.esc(e.lore) + '</div>' +
      '</div>' +
      '<div class="stat-grid-4">' +
      '<div class="stat-cell"><span class="stat-k">基礎HP</span><span class="stat-v num">' + HW.formatNum(b.hp) + '</span></div>' +
      '<div class="stat-cell"><span class="stat-k">基礎攻撃</span><span class="stat-v num">' + HW.formatNum(b.atk) + '</span></div>' +
      '<div class="stat-cell"><span class="stat-k">基礎防御</span><span class="stat-v num">' + HW.formatNum(b.def) + '</span></div>' +
      '<div class="stat-cell"><span class="stat-k">基礎速度</span><span class="stat-v num">' + b.spd + '</span></div>' +
      '</div>' +
      '<div style="font-size:10.5px;font-weight:900;color:var(--acc-cyan)">使用技</div>' +
      skillsHtml;

    HW.DOM.openSheet(e.name + '（エネミー詳細）', body);
  }

  function openEquipDetailSheet(tpl) {
    const set = HW.getEquipSet(tpl.setId);
    const pieces = HW.EQUIP_TEMPLATES.filter((t) => t.setId === tpl.setId);
    const maxSt = HW.calcEquipStats({ tplId: tpl.id, quality: 100 });
    const minSt = HW.calcEquipStats({ tplId: tpl.id, quality: 1 });

    const body =
      '<div class="result-box">' +
      '<div class="tag-row" style="justify-content:space-between;margin-bottom:4px">' +
      '<strong style="font-size:12px;color:#fff">' + HW.esc(set.name) + 'セット</strong>' +
      '<span class="b-pill' + (set.arenaOnly ? ' boss' : '') + '">' + (set.arenaOnly ? '闘技場限定' : '通常ドロップ') + '</span>' +
      '</div>' +
      '<div style="font-size:11px;line-height:1.45;color:#dde5fa">' + HW.esc(set.lore) + '</div>' +
      '</div>' +
      '<div class="arena-detail-card" style="border-color:var(--acc-cyan)">' +
      '<div style="font-size:10.5px;font-weight:900;color:var(--acc-cyan)">セット効果</div>' +
      '<div style="font-size:11px;color:#fff">2部位: ' + HW.esc(set.bonus2.desc) + '</div>' +
      '<div style="font-size:11px;color:#ffe89e">4部位: ' + HW.esc(set.bonus4.desc) + '</div>' +
      '</div>' +
      '<div class="arena-detail-card">' +
      '<div style="font-size:10.5px;font-weight:900;color:var(--acc-gold)">' + HW.esc(tpl.name) + '（' + HW.esc(tpl.slotName) + '）品質別パラメータ</div>' +
      '<div style="font-size:10.5px;color:var(--txt-sub)" class="num">品質1%: HP+' + minSt.hp + ' / 攻+' + minSt.atk + ' / 防+' + minSt.def + ' / 速+' + minSt.spd + '</div>' +
      '<div style="font-size:10.5px;color:var(--acc-gold);font-weight:800" class="num">極100%: HP+' + maxSt.hp + ' / 攻+' + maxSt.atk + ' / 防+' + maxSt.def + ' / 速+' + maxSt.spd + ' / 会心+' + Math.round(maxSt.crit * 100) + '%</div>' +
      '</div>' +
      '<div class="arena-detail-card">' +
      '<div style="font-size:10.5px;font-weight:900;color:var(--txt-sub)">同セット4部位一覧</div>' +
      pieces.map((p) => '<div class="tag-row" style="justify-content:space-between;font-size:10.5px"><span>' + HW.esc(p.slotName) + '</span><strong style="color:#fff">' + HW.esc(p.name) + '</strong></div>').join('') +
      '</div>';

    HW.DOM.openSheet(tpl.name + '（装備詳細）', body);
  }

  HW.RenderCodex = {
    render: function (topEl, bottomEl) {
      const sd = HW.State.data;
      let topPreview = '';
      let listHtml = '';
      let detailBtnHtml = '';

      if (codexUi.sub === 'char') {
        const c = HW.getCharDef(codexUi.selectedChar) || HW.CHARACTERS_SORTED[0];
        const unlocked = sd.chars[c.id].unlocked;
        topPreview =
          '<div class="preview-box">' +
          '<div class="preview-head">' +
          '<div class="tag-row"><span class="preview-name">' + HW.esc(c.name) + '</span>' + HW.badgeElement(c.element) + HW.badgeRole(c.role, true) + HW.badgeRaces(c.races) + '</div>' +
          '<span class="b-pill">' + (unlocked ? '仲間' : '未加入') + '</span>' +
          '</div>' +
          '<div class="stat-grid-4">' +
          '<div class="stat-cell"><span class="stat-k">基礎HP</span><span class="stat-v num">' + HW.formatNum(c.base.hp) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">基礎攻</span><span class="stat-v num">' + HW.formatNum(c.base.atk) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">基礎防</span><span class="stat-v num">' + HW.formatNum(c.base.def) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">基礎速</span><span class="stat-v num">' + c.base.spd + '</span></div>' +
          '</div>' +
          '<div class="codex-lore">' + HW.esc(c.lore) + '</div>' +
          '<div style="font-size:9.5px;color:var(--acc-cyan);white-space:nowrap;overflow:hidden">愛用品: ' + HW.esc(c.favorite.name) + ' / 神器: ' + HW.esc(c.relic.name) + '</div>' +
          '</div>';

        listHtml =
          '<div class="scroll-list" data-scroll-key="codex_char"><div class="char-grid">' +
          HW.CHARACTERS_SORTED.map((ch) => {
            const sel = codexUi.selectedChar === ch.id;
            const own = sd.chars[ch.id].unlocked;
            return (
              '<button type="button" class="char-tile' + (sel ? ' selected' : '') + (!own ? ' locked-char' : '') + '" data-cx-c="' + ch.id + '">' +
              '<div class="char-tile-top"><span class="char-tile-name">' + HW.esc(ch.name) + '</span><span style="font-size:10px;color:var(--acc-cyan)">' + (own ? '加入' : '未加入') + '</span></div>' +
              '<div class="tag-row">' + HW.badgeElement(ch.element) + HW.badgeRole(ch.role, true) + HW.badgeRaces(ch.races) + '</div>' +
              '</button>'
            );
          }).join('') +
          '</div></div>';

        detailBtnHtml = '<button type="button" id="codex-detail-btn" class="btn btn-primary" style="flex-shrink:0">' + HW.esc(c.name) + ' の詳細（能力・技・愛用品・神器）</button>';
      } else if (codexUi.sub === 'enemy') {
        const e = HW.getEnemyDef(codexUi.selectedEnemy) || HW.ENEMIES[0];
        const seen = Boolean(sd.codex.enemiesSeen[e.id]);
        const kindTag = e.kind === 'intruder' ? '希少乱入' : e.kind === 'raid' ? '総力ボス' : e.kind === 'boss' ? 'エリアボス' : '通常敵';
        topPreview =
          '<div class="preview-box">' +
          '<div class="preview-head">' +
          '<div class="tag-row"><span class="preview-name">' + HW.esc(e.name) + '</span>' + HW.badgeElement(e.element) + HW.badgeRaces(e.races) + '</div>' +
          '<span class="b-pill' + (e.kind !== 'normal' ? ' boss' : '') + '">' + kindTag + '</span>' +
          '</div>' +
          '<div class="stat-grid-4">' +
          '<div class="stat-cell"><span class="stat-k">基礎HP</span><span class="stat-v num">' + HW.formatCompact(e.base.hp) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">基礎攻</span><span class="stat-v num">' + HW.formatCompact(e.base.atk) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">基礎防</span><span class="stat-v num">' + HW.formatCompact(e.base.def) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">基礎速</span><span class="stat-v num">' + e.base.spd + '</span></div>' +
          '</div>' +
          '<div class="codex-lore">' + HW.esc(e.lore) + '</div>' +
          '<div style="font-size:9.5px;color:var(--acc-cyan)">' + (seen ? '遭遇済' : '未遭遇') + ' / 技' + e.skills.length + '種保有</div>' +
          '</div>';

        listHtml =
          '<div class="scroll-list" data-scroll-key="codex_enemy"><div class="char-grid">' +
          HW.ENEMIES.map((en) => {
            const sel = codexUi.selectedEnemy === en.id;
            const s = Boolean(sd.codex.enemiesSeen[en.id]);
            return (
              '<button type="button" class="char-tile' + (sel ? ' selected' : '') + (!s ? ' locked-char' : '') + '" data-cx-e="' + en.id + '">' +
              '<div class="char-tile-top"><span class="char-tile-name">' + HW.esc(en.name) + '</span></div>' +
              '<div class="tag-row">' + HW.badgeElement(en.element) + HW.badgeRaces(en.races) + '</div>' +
              '</button>'
            );
          }).join('') +
          '</div></div>';

        detailBtnHtml = '<button type="button" id="codex-detail-btn" class="btn btn-primary" style="flex-shrink:0">' + HW.esc(e.name) + ' の詳細（能力・使用技）</button>';
      } else if (codexUi.sub === 'equip') {
        const tpl = HW.getEquipTemplate(codexUi.selectedEquip) || HW.EQUIP_TEMPLATES[0];
        const set = HW.getEquipSet(tpl.setId);
        const seen = Boolean(sd.codex.equipsSeen[tpl.id]);
        const maxSt = HW.calcEquipStats({ tplId: tpl.id, quality: 100 });
        topPreview =
          '<div class="preview-box">' +
          '<div class="preview-head">' +
          '<span class="preview-name">' + HW.esc(tpl.name) + '</span>' +
          '<span class="b-pill">' + HW.esc(tpl.setName) + '・' + HW.esc(tpl.slotName) + '</span>' +
          '</div>' +
          '<div class="stat-grid-4">' +
          '<div class="stat-cell"><span class="stat-k">極HP</span><span class="stat-v num">+' + HW.formatNum(maxSt.hp) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">極攻撃</span><span class="stat-v num">+' + HW.formatNum(maxSt.atk) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">極防御</span><span class="stat-v num">+' + HW.formatNum(maxSt.def) + '</span></div>' +
          '<div class="stat-cell"><span class="stat-k">極速度</span><span class="stat-v num">+' + maxSt.spd + '</span></div>' +
          '</div>' +
          '<div class="codex-lore">' + HW.esc(tpl.lore) + '</div>' +
          '<div style="font-size:9.5px;color:var(--acc-cyan)">2部位: ' + HW.esc(set.bonus2.desc) + ' (' + (seen ? '入手済' : '未入手') + ')</div>' +
          '</div>';

        listHtml =
          '<div class="scroll-list" data-scroll-key="codex_equip"><div class="inv-grid">' +
          HW.EQUIP_TEMPLATES.map((t) => {
            const sel = codexUi.selectedEquip === t.id;
            const s = Boolean(sd.codex.equipsSeen[t.id]);
            return (
              '<button type="button" class="inv-card' + (sel ? ' selected' : '') + (!s ? ' locked-char' : '') + '" data-cx-eq="' + t.id + '">' +
              '<span style="font-size:11.5px;font-weight:900;color:#fff">' + HW.esc(t.name) + '</span>' +
              '<span style="font-size:10px;color:var(--txt-sub)">' + HW.esc(t.setName) + ' / ' + HW.esc(t.slotName) + '</span>' +
              '</button>'
            );
          }).join('') +
          '</div></div>';

        detailBtnHtml = '<button type="button" id="codex-detail-btn" class="btn btn-primary" style="flex-shrink:0">' + HW.esc(tpl.setName) + 'セット詳細を見る</button>';
      } else {
        const allAb = HW.getAllAbilitiesFlat();
        const filteredAb = codexUi.abRoleFilter === 'all'
          ? allAb
          : allAb.filter((a) => a.role === codexUi.abRoleFilter);
        const ab = filteredAb.find((a) => a.id === codexUi.selectedAbility) || filteredAb[0] || allAb[0];
        codexUi.selectedAbility = ab.id;
        const req = HW.ABILITY_TIER_REQ[ab.tier - 1] || HW.ABILITY_TIER_REQ[0];

        topPreview =
          '<div class="preview-box">' +
          '<div class="preview-head">' +
          '<span class="preview-name">' + HW.esc(ab.name) + '</span>' +
          HW.badgeRole(ab.role, false) +
          '</div>' +
          '<div class="result-box" style="border-color:var(--acc-cyan)">' +
          '<div class="tag-row" style="justify-content:space-between;margin-bottom:3px">' +
          '<span style="font-size:10.5px;color:var(--acc-cyan);font-weight:900">第' + ab.tier + '段階 選択肢' + ab.col + '</span>' +
          '<span class="b-pill">解放: ' + HW.esc(req.label) + '</span>' +
          '</div>' +
          '<div style="font-size:12px;color:#ffffff;font-weight:800">' + HW.esc(ab.desc) + '</div>' +
          '</div>' +
          '</div>';

        const roleTabs = [
          { id: 'all', label: '全ロール' },
          { id: 'tank', label: 'タンク' },
          { id: 'dealer', label: 'ディーラー' },
          { id: 'supporter', label: 'サポ' },
          { id: 'healer', label: 'ヒーラー' }
        ];

        listHtml =
          '<div class="subtabs">' +
          roleTabs.map((rt) => '<button type="button" class="subtab' + (codexUi.abRoleFilter === rt.id ? ' active' : '') + '" data-cx-abrole="' + rt.id + '">' + rt.label + '</button>').join('') +
          '</div>' +
          '<div class="scroll-list" data-scroll-key="codex_ab_' + codexUi.abRoleFilter + '"><div class="inv-grid">' +
          filteredAb.map((a) => {
            const sel = codexUi.selectedAbility === a.id;
            return (
              '<button type="button" class="inv-card' + (sel ? ' selected' : '') + '" data-cx-ab="' + a.id + '">' +
              '<div class="tag-row" style="justify-content:space-between"><span style="font-size:11px;font-weight:900;color:#fff">' + HW.esc(a.name) + '</span>' + HW.badgeRole(a.role, true) + '</div>' +
              '<span style="font-size:9.5px;color:var(--txt-sub)">T' + a.tier + ': ' + HW.esc(a.desc) + '</span>' +
              '</button>'
            );
          }).join('') +
          '</div></div>';
      }

      topEl.innerHTML = HW.renderStageHeader('はちゃめちゃ図鑑') + topPreview;

      const tabs = [
        { id: 'char', label: 'キャラ' },
        { id: 'enemy', label: 'エネミー' },
        { id: 'equip', label: '装備' },
        { id: 'ability', label: 'アビリティ' }
      ];

      bottomEl.innerHTML =
        '<div class="subtabs">' +
        tabs.map((t) => '<button type="button" class="subtab' + (codexUi.sub === t.id ? ' active' : '') + '" data-cxsub="' + t.id + '">' + t.label + '</button>').join('') +
        '</div>' +
        listHtml +
        detailBtnHtml;

      bottomEl.querySelectorAll('[data-cxsub]').forEach((btn) => {
        btn.addEventListener('click', () => {
          codexUi.sub = btn.getAttribute('data-cxsub');
          HW.Audio.tap();
          HW.App.render({ resetScroll: true });
        });
      });
      bottomEl.querySelectorAll('[data-cx-abrole]').forEach((btn) => {
        btn.addEventListener('click', () => {
          codexUi.abRoleFilter = btn.getAttribute('data-cx-abrole');
          HW.Audio.tap();
          HW.App.render({ resetScroll: true });
        });
      });
      bottomEl.querySelectorAll('[data-cx-c]').forEach((btn) => {
        btn.addEventListener('click', () => {
          codexUi.selectedChar = btn.getAttribute('data-cx-c');
          HW.Audio.tap();
          HW.App.render();
        });
      });
      bottomEl.querySelectorAll('[data-cx-e]').forEach((btn) => {
        btn.addEventListener('click', () => {
          codexUi.selectedEnemy = btn.getAttribute('data-cx-e');
          HW.Audio.tap();
          HW.App.render();
        });
      });
      bottomEl.querySelectorAll('[data-cx-eq]').forEach((btn) => {
        btn.addEventListener('click', () => {
          codexUi.selectedEquip = btn.getAttribute('data-cx-eq');
          HW.Audio.tap();
          HW.App.render();
        });
      });
      bottomEl.querySelectorAll('[data-cx-ab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          codexUi.selectedAbility = btn.getAttribute('data-cx-ab');
          HW.Audio.tap();
          HW.App.render();
        });
      });

      const detBtn = document.getElementById('codex-detail-btn');
      if (detBtn) {
        detBtn.addEventListener('click', () => {
          HW.Audio.tap();
          if (codexUi.sub === 'char') {
            openCharDetailSheet(HW.getCharDef(codexUi.selectedChar) || HW.CHARACTERS_SORTED[0]);
          } else if (codexUi.sub === 'enemy') {
            openEnemyDetailSheet(HW.getEnemyDef(codexUi.selectedEnemy) || HW.ENEMIES[0]);
          } else if (codexUi.sub === 'equip') {
            openEquipDetailSheet(HW.getEquipTemplate(codexUi.selectedEquip) || HW.EQUIP_TEMPLATES[0]);
          }
        });
      }
    }
  };
})();
