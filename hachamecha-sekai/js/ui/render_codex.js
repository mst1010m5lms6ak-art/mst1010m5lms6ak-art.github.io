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
    selectedAbility: 't1_1'
  };

  HW.RenderCodex = {
    render: function (topEl, bottomEl) {
      const sd = HW.State.data;
      let topPreview = '';
      let listHtml = '';

      if (codexUi.sub === 'char') {
        const c = HW.getCharDef(codexUi.selectedChar) || HW.CHARACTERS_SORTED[0];
        const unlocked = sd.chars[c.id].unlocked;
        topPreview =
          '<div class="preview-box">' +
          '<div class="preview-head">' +
          '<div class="tag-row"><span class="preview-name">' + HW.esc(c.name) + '</span>' + HW.badgeElement(c.element) + HW.badgeRole(c.role, true) + HW.badgeRaces(c.races) + '</div>' +
          '<span class="b-pill">' + (unlocked ? '仲間' : '未加入') + '</span>' +
          '</div>' +
          '<div class="codex-lore">' + HW.esc(c.lore) + '</div>' +
          '<div style="font-size:10px;color:var(--txt-sub)">愛用品: ' + HW.esc(c.favorite.name) + ' / 固有神器: ' + HW.esc(c.relic.name) + '</div>' +
          '</div>';

        listHtml =
          '<div class="scroll-list"><div class="char-grid">' +
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
      } else if (codexUi.sub === 'enemy') {
        const e = HW.getEnemyDef(codexUi.selectedEnemy) || HW.ENEMIES[0];
        const seen = Boolean(sd.codex.enemiesSeen[e.id]);
        const kindTag = e.kind === 'intruder' ? '希少乱入' : e.kind === 'raid' ? '総力ボス' : e.kind === 'boss' ? 'エリアボス' : '通常敵';
        const skTxt = e.skills.map((s) => s.name + '[' + (HW.TARGET_LABELS[s.target] || HW.TARGET_LABELS.single).text + ']').join(' / ');
        topPreview =
          '<div class="preview-box">' +
          '<div class="preview-head">' +
          '<div class="tag-row"><span class="preview-name">' + HW.esc(e.name) + '</span>' + HW.badgeElement(e.element) + HW.badgeRaces(e.races) + '</div>' +
          '<span class="b-pill' + (e.kind !== 'normal' ? ' boss' : '') + '">' + kindTag + '</span>' +
          '</div>' +
          '<div class="codex-lore">' + HW.esc(e.lore) + '</div>' +
          '<div style="font-size:10px;color:var(--acc-cyan)">使用技: ' + HW.esc(skTxt) + ' / ' + (seen ? '遭遇済' : '未遭遇') + '</div>' +
          '</div>';

        listHtml =
          '<div class="scroll-list"><div class="char-grid">' +
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
      } else if (codexUi.sub === 'equip') {
        const tpl = HW.getEquipTemplate(codexUi.selectedEquip) || HW.EQUIP_TEMPLATES[0];
        const set = HW.getEquipSet(tpl.setId);
        const seen = Boolean(sd.codex.equipsSeen[tpl.id]);
        topPreview =
          '<div class="preview-box">' +
          '<div class="preview-head">' +
          '<span class="preview-name">' + HW.esc(tpl.name) + '</span>' +
          '<span class="b-pill">' + HW.esc(tpl.setName) + '・' + HW.esc(tpl.slotName) + '</span>' +
          '</div>' +
          '<div class="codex-lore">' + HW.esc(tpl.lore) + '</div>' +
          '<div style="font-size:10px;color:var(--acc-cyan)">2部位: ' + HW.esc(set.bonus2.desc) + ' / 4部位: ' + HW.esc(set.bonus4.desc) + ' (' + (seen ? '入手済' : '未入手') + ')</div>' +
          '</div>';

        listHtml =
          '<div class="scroll-list"><div class="inv-grid">' +
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
      } else {
        const allAb = HW.getAllAbilitiesFlat();
        const ab = allAb.find((a) => a.id === codexUi.selectedAbility) || allAb[0];
        topPreview =
          '<div class="preview-box">' +
          '<div class="preview-head">' +
          '<span class="preview-name">' + HW.esc(ab.name) + '</span>' +
          HW.badgeRole(ab.role, false) +
          '</div>' +
          '<div class="result-box" style="border-color:var(--acc-cyan)">' +
          '<div style="font-size:10.5px;color:var(--acc-cyan);font-weight:900;margin-bottom:3px">第' + ab.tier + '段階 選択肢' + ab.col + '</div>' +
          '<div style="font-size:12px;color:#ffffff;font-weight:800">' + HW.esc(ab.desc) + '</div>' +
          '</div>' +
          '</div>';

        listHtml =
          '<div class="scroll-list"><div class="inv-grid">' +
          allAb.map((a) => {
            const sel = codexUi.selectedAbility === a.id;
            return (
              '<button type="button" class="inv-card' + (sel ? ' selected' : '') + '" data-cx-ab="' + a.id + '">' +
              '<div class="tag-row" style="justify-content:space-between"><span style="font-size:11px;font-weight:900;color:#fff">' + HW.esc(a.name) + '</span>' + HW.badgeRole(a.role, true) + '</div>' +
              '<span style="font-size:9.5px;color:var(--txt-sub)">第' + a.tier + '段階: ' + HW.esc(a.desc) + '</span>' +
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
        listHtml;

      bottomEl.querySelectorAll('[data-cxsub]').forEach((btn) => {
        btn.addEventListener('click', () => {
          codexUi.sub = btn.getAttribute('data-cxsub');
          HW.Audio.tap();
          HW.App.render();
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
    }
  };
})();
