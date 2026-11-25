(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  const partyUi = {
    sub: 'main', // 'main' | 'links' | 'formation' | 'raid'
    raidIdx: 0,
    previewFormId: null
  };

  function getAggroMeta(aggro) {
    if (aggro >= 1.8) return { label: '狙われ:高', cls: 'high', hi: true };
    if (aggro >= 1.1) return { label: '狙われ:中', cls: 'mid', hi: false };
    return { label: '狙われ:低', cls: 'low', hi: false };
  }

  function openCharPicker(title, currentId, excludedIds, allowClear, onPick) {
    const sd = HW.State.data;
    const unlocked = HW.CHARACTERS_SORTED.filter((c) => sd.chars[c.id].unlocked);

    const tiles = unlocked.map((c) => {
      const cs = sd.chars[c.id];
      const st = HW.computeCharStats(c.id);
      const isUsed = excludedIds.includes(c.id);
      const isCur = currentId === c.id;
      return (
        '<button type="button" class="char-tile' + (isCur ? ' selected' : '') + '" data-pick-char="' + c.id + '"' + (isUsed ? ' disabled' : '') + '>' +
        '<div class="char-tile-top">' +
        '<span class="char-tile-name">' + HW.esc(c.name) + '</span>' +
        '<span class="char-stars">' + HW.starsText(cs.star) + '</span>' +
        '</div>' +
        '<div class="tag-row">' + HW.badgeElement(c.element) + HW.badgeRole(c.role, true) + HW.badgeRaces(c.races) + '</div>' +
        '<div class="char-tile-sub"><span class="num">戦力 ' + HW.formatNum(st.power) + '</span><span>' + (isUsed ? '編成中' : 'R-' + HW.RANK_NAMES[cs.rank - 1]) + '</span></div>' +
        '</button>'
      );
    }).join('');

    const actions =
      (allowClear ? '<button type="button" class="btn btn-danger" id="pick-clear">外す</button>' : '') +
      '<button type="button" class="btn" data-sheet-close="1">閉じる</button>';

    HW.DOM.openSheet(title, '<div class="char-grid">' + tiles + '</div>', actions, (panel) => {
      panel.querySelectorAll('[data-pick-char]').forEach((btn) => {
        btn.addEventListener('click', () => {
          HW.Audio.tap();
          const cid = btn.getAttribute('data-pick-char');
          HW.DOM.closeSheet();
          onPick(cid);
        });
      });
      const clr = panel.querySelector('#pick-clear');
      if (clr) {
        clr.addEventListener('click', () => {
          HW.Audio.tap();
          HW.DOM.closeSheet();
          onPick(null);
        });
      }
    });
  }

  HW.RenderParty = {
    render: function (topEl, bottomEl) {
      const sd = HW.State.data;
      const party = sd.party;
      const built = HW.buildTeamCombatants(party.main, party.links, party.formationId);
      const totalPower = built.units.reduce((s, u) => s + u.stats.power, 0);
      const form = built.formation;

      const synHtml = built.synergies.length
        ? built.synergies.slice(0, 3).map((s) => '<span class="syn-chip">' + HW.esc(s.name) + ': ' + HW.esc(s.desc) + '</span>').join('') +
          (built.synergies.length > 3 ? '<span class="syn-chip">他+' + (built.synergies.length - 3) + '</span>' : '')
        : '<span style="font-size:9.5px;color:var(--txt-muted)">属性・種族・ロール・リンク一致で編成シナジー発動</span>';

      let topBodyHtml = '';
      if (partyUi.sub === 'formation') {
        const viewFormId = partyUi.previewFormId || party.formationId;
        const viewForm = HW.getFormation(viewFormId);
        const viewUnlocked = sd.unlockedFormations.includes(viewForm.id);
        const isEquipped = party.formationId === viewForm.id;
        const mapCells = viewForm.slots.map((sl, i) => {
          const cid = party.main[i];
          const c = cid ? HW.getCharDef(cid) : null;
          const ag = getAggroMeta(sl.aggro);
          const mods = HW.formatModTags(sl.mod);
          const rowTag = i < 2 ? '前衛' : '後衛';
          return (
            '<div class="form-slot-box ' + (i < 2 ? 'front' : 'back') + (ag.hi ? ' high-aggro' : '') + '">' +
            '<div class="tag-row" style="justify-content:space-between;flex-wrap:nowrap">' +
            '<span style="font-size:10px;font-weight:900;color:#fff;white-space:nowrap">' + (i + 1) + '.' + HW.esc(sl.label) + ' <span style="color:var(--txt-muted);font-size:8.5px">(' + rowTag + ')</span></span>' +
            '<span class="aggro-pill ' + ag.cls + '">' + ag.label + '</span>' +
            '</div>' +
            '<div style="font-size:10px;color:var(--acc-gold);font-weight:800;white-space:nowrap">' + (c ? HW.esc(c.name) : '空き枠') + '</div>' +
            '<div class="form-mod-line">' + HW.esc(mods.join(' / ') || '補正なし') + '</div>' +
            '</div>'
          );
        }).join('');

        topBodyHtml =
          '<div class="preview-box">' +
          '<div class="preview-head">' +
          '<span class="preview-name">' + HW.esc(viewForm.name) + '</span>' +
          '<span class="b-pill' + (!viewUnlocked ? ' boss' : isEquipped ? ' intruder' : '') + '">' + (isEquipped ? '適用中' : viewUnlocked ? '選択可' : viewForm.unlockDesc) + '</span>' +
          '</div>' +
          '<div style="font-size:10px;color:var(--txt-sub)">' + HW.esc(viewForm.summary) + '</div>' +
          '<div class="form-map-grid">' + mapCells + '</div>' +
          '</div>';
      } else {
        const slotSummary = [0, 1, 2, 3].map((i) => {
          const cid = party.main[i];
          const lid = party.links[i];
          const c = cid ? HW.getCharDef(cid) : null;
          const l = lid ? HW.getCharDef(lid) : null;
          const pos = form.slots[i];
          return (
            '<div class="result-box" style="padding:3px 6px">' +
            '<div class="tag-row" style="justify-content:space-between;flex-wrap:nowrap">' +
            '<span style="font-size:9px;color:var(--acc-cyan);font-weight:900;white-space:nowrap">' + (i + 1) + '.' + HW.esc(pos.label) + '</span>' +
            (c ? '<span class="tag-row" style="gap:2px;flex-wrap:nowrap">' + HW.badgeElement(c.element) + HW.badgeRole(c.role, true) + '</span>' : '') +
            '</div>' +
            '<div style="font-size:11px;font-weight:900;margin-top:1px;white-space:nowrap">' + (c ? HW.esc(c.name) : '空き') + '</div>' +
            '<div style="font-size:9px;color:#d8b4fe;white-space:nowrap;overflow:hidden">裏: ' + (l ? HW.esc(l.name) + ' (' + HW.esc(l.linkBonus.name) + ')' : '未設定') + '</div>' +
            '</div>'
          );
        }).join('');

        topBodyHtml =
          '<div class="preview-box">' +
          '<div class="preview-head">' +
          '<span class="preview-name num">総戦力 ' + HW.formatNum(totalPower) + '</span>' +
          '<span class="b-pill">陣形: ' + HW.esc(form.name) + '</span>' +
          '</div>' +
          '<div class="party-slots-4">' + slotSummary + '</div>' +
          '<div class="synergy-list">' + synHtml + '</div>' +
          '</div>';
      }

      topEl.innerHTML = HW.renderStageHeader('パーティ編成') + topBodyHtml;

      const tabs = [
        { id: 'main', label: '主力4枠' },
        { id: 'links', label: 'バディリンク' },
        { id: 'formation', label: '陣形' },
        { id: 'raid', label: '総力3部隊' }
      ];

      let contentHtml = '';
      if (partyUi.sub === 'main') {
        contentHtml =
          '<div class="fixed-area" style="justify-content:space-between">' +
          '<div class="party-slots-4" style="flex:1;align-content:stretch">' +
          [0, 1, 2, 3].map((i) => {
            const cid = party.main[i];
            const c = cid ? HW.getCharDef(cid) : null;
            const cs = cid ? sd.chars[cid] : null;
            const unitBuilt = built.units.find((u) => u.slotIndex === i);
            const st = unitBuilt ? unitBuilt.stats : null;
            const pos = form.slots[i];
            const setTxt = st && st.activeSets.length ? st.activeSets[0].name + (st.activeSets.length > 1 ? ' 他' : '') : 'セットなし';
            return (
              '<button type="button" class="party-slot-card active-slot" data-edit-main="' + i + '">' +
              '<div class="tag-row" style="justify-content:space-between">' +
              '<span style="font-size:10px;color:var(--acc-cyan);font-weight:900">' + (i + 1) + '. ' + HW.esc(pos.label) + '</span>' +
              (c ? HW.badgeElement(c.element) + HW.badgeRole(c.role, true) : '') +
              '</div>' +
              '<div class="tag-row" style="justify-content:space-between">' +
              '<span style="font-size:13px;font-weight:900;color:#fff">' + (c ? HW.esc(c.name) : 'タップして編成') + '</span>' +
              (cs ? '<span class="char-stars">' + HW.starsText(cs.star) + '</span>' : '') +
              '</div>' +
              (st
                ? '<div style="font-size:10px;color:#dbe4ff" class="num">HP ' + HW.formatCompact(st.hp) + ' / 攻 ' + HW.formatCompact(st.atk) + '</div>' +
                  '<div style="font-size:9.5px;color:var(--txt-sub);display:flex;justify-content:space-between;gap:4px"><span>' + HW.esc(setTxt) + '</span><span class="num" style="color:var(--acc-gold);white-space:nowrap">戦力' + HW.formatCompact(st.power) + '</span></div>'
                : '<div style="font-size:10px;color:var(--txt-sub)">空きスロット</div>') +
              '</button>'
            );
          }).join('') +
          '</div>' +
          '<button type="button" id="btn-party-auto" class="btn btn-gold" style="margin-top:6px">戦力最強おすすめ自動編成</button>' +
          '</div>';
      } else if (partyUi.sub === 'links') {
        contentHtml =
          '<div class="fixed-area" style="justify-content:space-between">' +
          '<div class="party-slots-4" style="flex:1;align-content:stretch">' +
          [0, 1, 2, 3].map((i) => {
            const mid = party.main[i];
            const lid = party.links[i];
            const m = mid ? HW.getCharDef(mid) : null;
            const l = lid ? HW.getCharDef(lid) : null;
            const ls = lid ? sd.chars[lid] : null;
            const matchText = m && l && (m.element === l.element || m.races.some((r) => l.races.includes(r))) ? '共鳴発動!' : '基礎ステ15%継承';
            return (
              '<button type="button" class="party-slot-card link-card" data-edit-link="' + i + '">' +
              '<div class="tag-row" style="justify-content:space-between">' +
              '<span style="font-size:10px;color:#d8b4fe;font-weight:900">主力: ' + (m ? HW.esc(m.name) : 'なし') + '</span>' +
              (l ? HW.badgeElement(l.element) : '') +
              '</div>' +
              '<div class="tag-row" style="justify-content:space-between">' +
              '<span style="font-size:13px;font-weight:900;color:#fff">' + (l ? HW.esc(l.name) : '裏枠を選択') + '</span>' +
              (ls ? '<span class="char-stars">' + HW.starsText(ls.star) + '</span>' : '') +
              '</div>' +
              '<div style="font-size:10px;color:var(--txt-sub)">' + (l ? HW.esc(l.linkBonus.desc) : '控えキャラをリンク') + '</div>' +
              '<div style="font-size:9.5px;color:var(--acc-gold)">' + (l ? matchText : '同属性・同種族でバディ共鳴') + '</div>' +
              '</button>'
            );
          }).join('') +
          '</div>' +
          '<button type="button" id="btn-link-auto" class="btn btn-primary" style="margin-top:6px">控えキャラ自動リンク</button>' +
          '</div>';
      } else if (partyUi.sub === 'formation') {
        const viewId = partyUi.previewFormId || party.formationId;
        contentHtml =
          '<div class="formation-grid">' +
          HW.FORMATIONS.map((f) => {
            const unlocked = sd.unlockedFormations.includes(f.id);
            const isActive = party.formationId === f.id;
            const isViewing = viewId === f.id;
            return (
              '<button type="button" class="form-card' + (isActive ? ' selected' : '') + (!unlocked ? ' locked' : '') + '" style="' + (isViewing && !isActive ? 'border-color:var(--acc-cyan)' : '') + '" data-form-id="' + f.id + '">' +
              '<div class="tag-row" style="justify-content:space-between;flex-wrap:nowrap">' +
              '<span style="font-size:11px;font-weight:900;color:#fff;white-space:nowrap">' + HW.esc(f.name) + '</span>' +
              (isActive ? '<span class="b-pill intruder" style="font-size:8.5px;padding:0 4px">使用</span>' : !unlocked ? '<span class="b-pill boss" style="font-size:8px;padding:0 4px">未解放</span>' : '') +
              '</div>' +
              '<div style="font-size:9px;color:var(--txt-sub)">' + HW.esc(unlocked ? f.summary : f.unlockDesc) + '</div>' +
              '</button>'
            );
          }).join('') +
          '</div>';
      } else {
        const teamTabs = [0, 1, 2].map((ti) =>
          '<button type="button" class="subtab' + (partyUi.raidIdx === ti ? ' active' : '') + '" data-raid-tab="' + ti + '">第' + (ti + 1) + '部隊</button>'
        ).join('');
        const curTeam = sd.raidTeams[partyUi.raidIdx] || [null, null, null, null];
        contentHtml =
          '<div class="subtabs">' + teamTabs + '</div>' +
          '<div class="fixed-area" style="justify-content:space-between">' +
          '<div class="party-slots-4" style="flex:1;align-content:stretch">' +
          [0, 1, 2, 3].map((i) => {
            const cid = curTeam[i];
            const c = cid ? HW.getCharDef(cid) : null;
            const st = cid ? HW.computeCharStats(cid) : null;
            return (
              '<button type="button" class="party-slot-card" data-edit-raid="' + i + '">' +
              '<div class="tag-row" style="justify-content:space-between">' +
              '<span style="font-size:10px;color:var(--acc-gold);font-weight:900">第' + (partyUi.raidIdx + 1) + '部隊 - ' + (i + 1) + '</span>' +
              (c ? HW.badgeElement(c.element) + HW.badgeRole(c.role, true) : '') +
              '</div>' +
              '<div style="font-size:13px;font-weight:900;color:#fff">' + (c ? HW.esc(c.name) : '空き') + '</div>' +
              '<div style="font-size:10px;color:var(--txt-sub)" class="num">' + (st ? '戦力 ' + HW.formatNum(st.power) + ' / 攻 ' + HW.formatNum(st.atk) : 'タップして選択') + '</div>' +
              '</button>'
            );
          }).join('') +
          '</div>' +
          '<button type="button" id="btn-raid-auto" class="btn btn-gold" style="margin-top:6px">全所持キャラで3部隊自動配分</button>' +
          '</div>';
      }

      bottomEl.innerHTML =
        '<div class="subtabs">' +
        tabs.map((t) => '<button type="button" class="subtab' + (partyUi.sub === t.id ? ' active' : '') + '" data-psub="' + t.id + '">' + t.label + '</button>').join('') +
        '</div>' +
        contentHtml;

      bottomEl.querySelectorAll('[data-psub]').forEach((btn) => {
        btn.addEventListener('click', () => {
          partyUi.sub = btn.getAttribute('data-psub');
          if (partyUi.sub === 'formation') partyUi.previewFormId = party.formationId;
          HW.Audio.tap();
          HW.App.render();
        });
      });

      bottomEl.querySelectorAll('[data-edit-main]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-edit-main'));
          const excluded = party.main.concat(party.links).filter((id, k) => id && !(k === idx));
          openCharPicker('主力枠 ' + (idx + 1) + ' を選択', party.main[idx], excluded, false, (cid) => {
            party.main[idx] = cid;
            HW.State.save();
            HW.App.render();
          });
        });
      });

      bottomEl.querySelectorAll('[data-edit-link]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-edit-link'));
          const excluded = party.main.concat(party.links.filter((id, k) => k !== idx)).filter(Boolean);
          openCharPicker('バディリンク ' + (idx + 1) + ' を選択', party.links[idx], excluded, true, (cid) => {
            party.links[idx] = cid;
            HW.State.save();
            HW.App.render();
          });
        });
      });

      bottomEl.querySelectorAll('[data-form-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const fid = btn.getAttribute('data-form-id');
          partyUi.previewFormId = fid;
          HW.Audio.tap();
          if (sd.unlockedFormations.includes(fid)) {
            party.formationId = fid;
            HW.State.save();
          } else {
            const f = HW.getFormation(fid);
            HW.DOM.toast(f.name + '（' + f.unlockDesc + '）の詳細を表示中');
          }
          HW.App.render();
        });
      });

      bottomEl.querySelectorAll('[data-raid-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          partyUi.raidIdx = Number(btn.getAttribute('data-raid-tab'));
          HW.Audio.tap();
          HW.App.render();
        });
      });

      bottomEl.querySelectorAll('[data-edit-raid]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-edit-raid'));
          const allUsed = [];
          sd.raidTeams.forEach((tm, ti) => {
            tm.forEach((cid, si) => {
              if (cid && !(ti === partyUi.raidIdx && si === idx)) allUsed.push(cid);
            });
          });
          openCharPicker('第' + (partyUi.raidIdx + 1) + '部隊 枠' + (idx + 1), sd.raidTeams[partyUi.raidIdx][idx], allUsed, true, (cid) => {
            sd.raidTeams[partyUi.raidIdx][idx] = cid;
            HW.State.save();
            HW.App.render();
          });
        });
      });

      const autoMain = document.getElementById('btn-party-auto');
      if (autoMain) {
        autoMain.addEventListener('click', () => {
          const unlocked = HW.CHARACTERS_SORTED
            .filter((c) => sd.chars[c.id].unlocked)
            .sort((a, b) => HW.computeCharStats(b.id).power - HW.computeCharStats(a.id).power);
          const pick = [];
          ['tank', 'dealer', 'supporter', 'healer'].forEach((r) => {
            const best = unlocked.find((c) => c.role === r && !pick.includes(c.id));
            if (best) pick.push(best.id);
          });
          unlocked.forEach((c) => {
            if (pick.length < 4 && !pick.includes(c.id)) pick.push(c.id);
          });
          party.main = [pick[0] || null, pick[1] || null, pick[2] || null, pick[3] || null];
          party.links = party.links.map((id) => (party.main.includes(id) ? null : id));
          HW.Audio.rankUp();
          HW.State.save();
          HW.DOM.toast('バランス最強パーティを編成しました', 'gold');
          HW.App.render();
        });
      }

      const autoLink = document.getElementById('btn-link-auto');
      if (autoLink) {
        autoLink.addEventListener('click', () => {
          const bench = HW.CHARACTERS_SORTED
            .filter((c) => sd.chars[c.id].unlocked && !party.main.includes(c.id))
            .sort((a, b) => HW.computeCharStats(b.id).power - HW.computeCharStats(a.id).power);
          party.links = [0, 1, 2, 3].map((i) => (bench[i] ? bench[i].id : null));
          HW.Audio.rankUp();
          HW.State.save();
          HW.DOM.toast('控えキャラをバディリンクへ配置しました');
          HW.App.render();
        });
      }

      const autoRaid = document.getElementById('btn-raid-auto');
      if (autoRaid) {
        autoRaid.addEventListener('click', () => {
          const unlocked = HW.CHARACTERS_SORTED
            .filter((c) => sd.chars[c.id].unlocked)
            .sort((a, b) => HW.computeCharStats(b.id).power - HW.computeCharStats(a.id).power)
            .map((c) => c.id);
          sd.raidTeams = [
            [unlocked[0] || null, unlocked[1] || null, unlocked[2] || null, unlocked[3] || null],
            [unlocked[4] || null, unlocked[5] || null, unlocked[6] || null, unlocked[7] || null],
            [unlocked[8] || null, unlocked[9] || null, unlocked[10] || null, unlocked[11] || null]
          ];
          HW.Audio.rankUp();
          HW.State.save();
          HW.DOM.toast('総力戦3部隊を自動配分しました', 'gold');
          HW.App.render();
        });
      }
    }
  };
})();
