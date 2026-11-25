(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  const rosterUi = {
    selectedId: 'c_kagura',
    sub: 'list', // 'list' | 'star' | 'rank' | 'ability' | 'equip' | 'special'
    previewAb: null
  };

  function openEquipPicker(charId, slotId) {
    const sd = HW.State.data;
    const slotMeta = HW.EQUIP_SLOTS.find((s) => s.id === slotId);
    const items = sd.inventory
      .filter((it) => HW.getEquipTemplate(it.tplId).slot === slotId)
      .sort((a, b) => b.quality - a.quality);
    const curId = sd.chars[charId].equips[slotId];

    const listHtml = items.length
      ? '<div class="inv-grid">' +
        items.map((it) => {
          const tpl = HW.getEquipTemplate(it.tplId);
          const owner = HW.State.getEquipOwner(it.id);
          const ownerName = owner ? HW.getCharDef(owner).name : '';
          const st = HW.calcEquipStats(it);
          const qm = HW.getQualityMeta(it.quality);
          return (
            '<button type="button" class="inv-card' + (qm.isMax ? ' quality-max-border' : '') + (curId === it.id ? ' selected' : '') + '" data-pick-eq="' + it.id + '">' +
            '<div class="tag-row" style="justify-content:space-between"><span style="font-size:11.5px;font-weight:900;color:#fff">' + HW.esc(tpl.name) + '</span>' + HW.badgeQuality(it.quality) + '</div>' +
            '<div style="font-size:10px;color:var(--acc-cyan)">' + HW.esc(tpl.setName) + (ownerName ? ' [' + HW.esc(ownerName) + ']' : '') + '</div>' +
            '<div style="font-size:10px;color:var(--txt-sub)" class="num">攻+' + st.atk + ' HP+' + st.hp + ' 防+' + st.def + '</div>' +
            '</button>'
          );
        }).join('') +
        '</div>'
      : '<div class="result-box" style="text-align:center;color:var(--txt-sub)">この部位の所持装備がありません</div>';

    const actions =
      (curId ? '<button type="button" class="btn btn-danger" id="eq-unequip">外す</button>' : '') +
      '<button type="button" class="btn" data-sheet-close="1">閉じる</button>';

    HW.DOM.openSheet(slotMeta.name + ' を選択', listHtml, actions, (panel) => {
      panel.querySelectorAll('[data-pick-eq]').forEach((btn) => {
        btn.addEventListener('click', () => {
          HW.State.equipItem(charId, btn.getAttribute('data-pick-eq'));
          HW.DOM.closeSheet();
          HW.App.render();
        });
      });
      const un = panel.querySelector('#eq-unequip');
      if (un) {
        un.addEventListener('click', () => {
          HW.State.unequipSlot(charId, slotId);
          HW.DOM.closeSheet();
          HW.App.render();
        });
      }
    });
  }

  function renderTopCharacterPreview() {
    const def = HW.getCharDef(rosterUi.selectedId) || HW.CHARACTERS_SORTED[0];
    const cs = HW.State.data.chars[def.id];
    const calc = HW.computeCharStats(def.id);

    if (rosterUi.sub === 'ability' && rosterUi.previewAb) {
      const ab = rosterUi.previewAb;
      return (
        '<div class="preview-box">' +
        '<div class="preview-head">' +
        '<span class="preview-name">' + HW.esc(def.name) + ' — 能力ビルド</span>' +
        HW.badgeRole(def.role, false) +
        '</div>' +
        '<div class="result-box" style="border-color:var(--acc-cyan)">' +
        '<div class="tag-row" style="justify-content:space-between;margin-bottom:3px">' +
        '<span style="font-size:13px;font-weight:900;color:#fff">' + HW.esc(ab.name) + '</span>' +
        '<span class="b-pill">第' + ab.tier + '段階</span>' +
        '</div>' +
        '<div style="font-size:11.5px;color:#d6f9ff">' + HW.esc(ab.desc) + '</div>' +
        '</div>' +
        '<div class="stat-grid-4">' +
        '<div class="stat-cell"><span class="stat-k">HP</span><span class="stat-v num">' + HW.formatNum(calc.hp) + '</span></div>' +
        '<div class="stat-cell"><span class="stat-k">攻撃</span><span class="stat-v num">' + HW.formatNum(calc.atk) + '</span></div>' +
        '<div class="stat-cell"><span class="stat-k">防御</span><span class="stat-v num">' + HW.formatNum(calc.def) + '</span></div>' +
        '<div class="stat-cell"><span class="stat-k">速度</span><span class="stat-v num">' + calc.spd + '</span></div>' +
        '</div>' +
        '<div class="stat-grid-4">' +
        '<div class="stat-cell"><span class="stat-k">会心</span><span class="stat-v num">' + Math.round(calc.crit * 100) + '%</span></div>' +
        '<div class="stat-cell"><span class="stat-k">会心倍</span><span class="stat-v num">' + Math.round(calc.critDmg * 100) + '%</span></div>' +
        '<div class="stat-cell"><span class="stat-k">回避</span><span class="stat-v num">' + Math.round(calc.eva * 100) + '%</span></div>' +
        '<div class="stat-cell"><span class="stat-k">耐性</span><span class="stat-v num">' + Math.round(calc.res * 100) + '%</span></div>' +
        '</div>' +
        '</div>'
      );
    }

    // 技一覧（2段表示で長い説明も一切見切れない）
    const skillsHtml = def.skills.map((sk) => {
      const ctTxt = sk.target === 'passive' ? '常時発動' : sk.ct === 0 ? 'CT 0' : 'CT ' + sk.ct;
      return (
        '<div class="skill-mini-item">' +
        '<div class="skill-mini-top">' +
        '<div class="skill-mini-left">' + HW.badgeTarget(sk.target) + '<span class="skill-mini-name">' + HW.esc(sk.name) + (sk.slot === 3 && cs.relicUnlocked ? '+' : '') + '</span></div>' +
        '<span class="skill-mini-ct num">' + ctTxt + '</span>' +
        '</div>' +
        '<div class="skill-mini-desc">' + HW.esc(sk.desc) + '</div>' +
        '</div>'
      );
    }).join('');

    const setChips = calc.activeSets.map((s) => '<span class="syn-chip">' + HW.esc(s.name) + '</span>').join('');

    return (
      '<div class="preview-box">' +
      '<div class="preview-head">' +
      '<div class="tag-row"><span class="preview-name">' + HW.esc(def.name) + '</span>' + HW.badgeElement(def.element) + HW.badgeRole(def.role, true) + HW.badgeRaces(def.races) + '</div>' +
      '<span class="char-stars">' + (cs.unlocked ? HW.starsText(cs.star) + ' R-' + HW.RANK_NAMES[cs.rank - 1] : '未解放') + '</span>' +
      '</div>' +
      '<div class="stat-grid-4">' +
      '<div class="stat-cell"><span class="stat-k">HP</span><span class="stat-v num">' + HW.formatNum(calc.hp) + '</span></div>' +
      '<div class="stat-cell"><span class="stat-k">攻撃</span><span class="stat-v num">' + HW.formatNum(calc.atk) + '</span></div>' +
      '<div class="stat-cell"><span class="stat-k">防御</span><span class="stat-v num">' + HW.formatNum(calc.def) + '</span></div>' +
      '<div class="stat-cell"><span class="stat-k">速度</span><span class="stat-v num">' + calc.spd + '</span></div>' +
      '</div>' +
      '<div class="skill-mini-list">' + skillsHtml + '</div>' +
      '<div class="tag-row" style="justify-content:space-between">' +
      '<div class="tag-row">' + (setChips || '<span style="font-size:10px;color:var(--txt-sub)">極意 ' + cs.masteryCount + ' / 会心 ' + Math.round(calc.crit * 100) + '% / 回避 ' + Math.round(calc.eva * 100) + '%</span>') + '</div>' +
      '<span style="font-size:10.5px;font-weight:900;color:var(--acc-gold)" class="num">戦力 ' + HW.formatNum(calc.power) + '</span>' +
      '</div>' +
      '</div>'
    );
  }

  HW.RenderRoster = {
    render: function (topEl, bottomEl) {
      const sd = HW.State.data;
      const def = HW.getCharDef(rosterUi.selectedId) || HW.CHARACTERS_SORTED[0];
      const cs = sd.chars[def.id];

      topEl.innerHTML = HW.renderStageHeader('キャラ育成') + renderTopCharacterPreview();

      const tabs = [
        { id: 'list', label: '一覧' },
        { id: 'star', label: '覚醒' },
        { id: 'rank', label: '階位' },
        { id: 'ability', label: '能力' },
        { id: 'equip', label: '装備' },
        { id: 'special', label: '固有' }
      ];

      let bodyHtml = '';

      if (rosterUi.sub === 'list') {
        const tiles = HW.CHARACTERS_SORTED.map((c) => {
          const st = sd.chars[c.id];
          const sel = rosterUi.selectedId === c.id;
          const canUnlock = !st.unlocked && (st.shards + (c.arenaOnly ? 0 : sd.omniShards)) >= HW.STAR_SHARD_COST.unlock;
          return (
            '<button type="button" class="char-tile' + (sel ? ' selected' : '') + (!st.unlocked ? ' locked-char' : '') + '" data-sel-char="' + c.id + '">' +
            '<div class="char-tile-top">' +
            '<span class="char-tile-name">' + HW.esc(c.name) + '</span>' +
            '<span class="char-stars">' + (st.unlocked ? HW.starsText(st.star) : canUnlock ? '解放可!' : st.shards + '/' + HW.STAR_SHARD_COST.unlock) + '</span>' +
            '</div>' +
            '<div class="tag-row">' + HW.badgeElement(c.element) + HW.badgeRole(c.role, true) + HW.badgeRaces(c.races) + '</div>' +
            '<div class="char-tile-sub">' +
            '<span>' + (st.unlocked ? 'RANK ' + HW.RANK_NAMES[st.rank - 1] : c.arenaOnly ? '闘技場交換' : '欠片収集') + '</span>' +
            '<span class="num">欠片 ' + st.shards + '</span>' +
            '</div>' +
            '</button>'
          );
        }).join('');
        bodyHtml = '<div class="scroll-list"><div class="char-grid">' + tiles + '</div></div>';
      } else if (rosterUi.sub === 'star') {
        const need = !cs.unlocked ? HW.STAR_SHARD_COST.unlock : cs.star >= 6 ? 0 : HW.STAR_SHARD_COST[cs.star + 1];
        const canDirect = need > 0 && cs.shards >= need;
        const allowOmni = cs.unlocked || !def.arenaOnly;
        const canWithOmni = need > 0 && allowOmni && (cs.shards + sd.omniShards) >= need;
        bodyHtml =
          '<div class="fixed-area" style="justify-content:space-between;gap:6px">' +
          '<div class="result-box">' +
          '<div class="tag-row" style="justify-content:space-between;margin-bottom:4px">' +
          '<span style="font-weight:900;font-size:12px">' + (!cs.unlocked ? '仲間解放（欠片' + need + '個）' : cs.star >= 6 ? '★6 極覚醒 達成済み！' : '覚醒 ' + HW.starsText(cs.star) + ' → ' + HW.starsText(cs.star + 1)) + '</span>' +
          '<span class="cur-pill shard num">所持 ' + cs.shards + ' / 必要 ' + need + '</span>' +
          '</div>' +
          '<div style="font-size:10.5px;color:var(--txt-sub);line-height:1.45">' +
          '★2〜★5で能力段階が順次解放 ／ ★4で<strong>愛用品</strong>解放 ／ ★5で<strong>固有神器</strong>解放 ／ ★6極で究極覚醒' +
          '</div>' +
          '</div>' +
          '<div class="result-box" style="font-size:11px;color:var(--txt-sub)">' +
          '万能欠片の所持数: <strong style="color:var(--acc-cyan)" class="num">' + sd.omniShards + '</strong>' +
          (!allowOmni ? '（闘技場限定キャラの初回解放は専用欠片のみ）' : '') +
          '</div>' +
          '<div class="battle-ctrl-row">' +
          '<button type="button" id="btn-star-own" class="btn btn-primary"' + (!canDirect ? ' disabled' : '') + '>' + (!cs.unlocked ? '専用欠片で解放' : '専用欠片で覚醒') + '</button>' +
          '<button type="button" id="btn-star-omni" class="btn btn-gold"' + (!canWithOmni ? ' disabled' : '') + '>万能欠片併用で実行</button>' +
          '</div>' +
          '</div>';
      } else if (rosterUi.sub === 'rank') {
        if (!cs.unlocked) {
          bodyHtml = '<div class="fixed-area" style="justify-content:center;align-items:center;color:var(--txt-sub)">先に覚醒タブから仲間を解放してください</div>';
        } else {
          const isMax = cs.rank >= 10;
          const allFilled = cs.rankSlots.every(Boolean);
          const costAmt = HW.State.getRankSlotCost(def.id);
          const promoGold = cs.rank * 350;
          const slotsHtml = [0, 1, 2, 3, 4, 5].map((si) => {
            const filled = cs.rankSlots[si];
            const matId = HW.State.getRankSlotMaterialId(def.id, si);
            const mat = HW.RANK_MATERIALS.find((m) => m.id === matId);
            const have = sd.materials[matId] || 0;
            const can = !isMax && !filled && have >= costAmt;
            return (
              '<button type="button" class="rank-slot' + (filled ? ' filled' : can ? ' can-fill' : '') + '" data-rslot="' + si + '"' + (filled || isMax ? ' disabled' : '') + '>' +
              '<span style="font-size:10.5px;font-weight:900;color:' + (filled ? 'var(--acc-lime)' : mat.color) + '">' + HW.esc(mat.name) + '</span>' +
              '<span style="font-size:10px" class="num">' + (filled ? '装着済' : have + ' / ' + costAmt) + '</span>' +
              '</button>'
            );
          }).join('');
          bodyHtml =
            '<div class="fixed-area" style="gap:6px">' +
            '<div class="rank-board">' + slotsHtml + '</div>' +
            '<div class="battle-ctrl-row">' +
            '<button type="button" id="btn-rank-fill-all" class="btn btn-primary"' + (isMax || allFilled ? ' disabled' : '') + '>一括装着</button>' +
            '<button type="button" id="btn-rank-up" class="btn btn-gold"' + (isMax || !allFilled || sd.gold < promoGold ? ' disabled' : '') + '>' + (isMax ? 'RANK MAX' : 'RANK ' + HW.RANK_NAMES[cs.rank] + ' 昇格 (' + promoGold + 'G)') + '</button>' +
            '</div>' +
            '</div>';
        }
      } else if (rosterUi.sub === 'ability') {
        if (!cs.unlocked) {
          bodyHtml = '<div class="fixed-area" style="justify-content:center;align-items:center;color:var(--txt-sub)">先に仲間を解放してください</div>';
        } else {
          const roleAbs = HW.ABILITIES[def.role] || [];
          const unlockedTiers = HW.State.getUnlockedAbilityTiers(def.id);
          const rows = roleAbs.map((row, ti) => {
            const locked = ti >= unlockedTiers;
            const cells = row.map((ab, ci) => {
              const active = !locked && cs.abilities[ti] === ci;
              return (
                '<button type="button" class="ab-cell' + (active ? ' active' : '') + (locked ? ' locked' : '') + '" data-ab-t="' + ti + '" data-ab-c="' + ci + '">' +
                HW.esc(ab.short) +
                '</button>'
              );
            }).join('');
            return '<div class="ab-tier-row"><div class="ab-tier-tag">T' + (ti + 1) + '</div>' + cells + '</div>';
          }).join('');
          bodyHtml = '<div class="ab-matrix">' + rows + '</div>';
        }
      } else if (rosterUi.sub === 'equip') {
        if (!cs.unlocked) {
          bodyHtml = '<div class="fixed-area" style="justify-content:center;align-items:center;color:var(--txt-sub)">先に仲間を解放してください</div>';
        } else {
          const cards = HW.EQUIP_SLOTS.map((sl) => {
            const eq = HW.State.getEquipById(cs.equips[sl.id]);
            const tpl = eq ? HW.getEquipTemplate(eq.tplId) : null;
            const qm = eq ? HW.getQualityMeta(eq.quality) : null;
            return (
              '<button type="button" class="equip-slot-btn' + (qm && qm.isMax ? ' quality-max-border' : '') + '" data-eq-slot="' + sl.id + '">' +
              '<div class="tag-row" style="justify-content:space-between"><span style="font-size:10px;color:var(--acc-cyan);font-weight:900">' + HW.icon(sl.id, 11) + ' ' + sl.name + '</span>' + (eq ? HW.badgeQuality(eq.quality) : '') + '</div>' +
              '<div style="font-size:12px;font-weight:900;color:#fff">' + (tpl ? HW.esc(tpl.name) : '未装備') + '</div>' +
              '<div style="font-size:10px;color:var(--txt-sub)">' + (tpl ? HW.esc(tpl.setName) : 'タップして装着') + '</div>' +
              '</button>'
            );
          }).join('');
          bodyHtml =
            '<div class="fixed-area" style="gap:6px">' +
            '<div class="equip-slot-grid">' + cards + '</div>' +
            '<button type="button" id="btn-eq-best" class="btn btn-gold">高品質おすすめ一括装着</button>' +
            '</div>';
        }
      } else {
        const canFav = cs.unlocked && !cs.favoriteUnlocked && cs.star >= 4 && sd.gold >= 1200 && (sd.materials.mat_orb || 0) >= 3;
        const canRel = cs.unlocked && !cs.relicUnlocked && cs.star >= 5 && sd.gold >= 2400 && (sd.materials.mat_core || 0) >= 4;
        bodyHtml =
          '<div class="fixed-area" style="justify-content:space-between;gap:5px">' +
          '<div class="result-box">' +
          '<div class="tag-row" style="justify-content:space-between"><span style="font-weight:900;font-size:11.5px">愛用品: ' + HW.esc(def.favorite.name) + '</span><span class="b-pill">' + (cs.favoriteUnlocked ? '解放済' : '★4必要') + '</span></div>' +
          '<div style="font-size:10.5px;color:var(--txt-sub);margin:2px 0">' + HW.esc(def.favorite.desc) + '</div>' +
          '<button type="button" id="btn-unlock-fav" class="btn btn-sm btn-primary" style="width:100%"' + (!canFav ? ' disabled' : '') + '>' + (cs.favoriteUnlocked ? '解放済み' : '解放 (1200G＋神話の宝珠×3)') + '</button>' +
          '</div>' +
          '<div class="result-box">' +
          '<div class="tag-row" style="justify-content:space-between"><span style="font-weight:900;font-size:11.5px">固有神器: ' + HW.esc(def.relic.name) + '</span><span class="b-pill boss">' + (cs.relicUnlocked ? '解放済' : '★5必要') + '</span></div>' +
          '<div style="font-size:10.5px;color:var(--txt-sub);margin:2px 0">' + HW.esc(def.relic.desc) + '</div>' +
          '<button type="button" id="btn-unlock-rel" class="btn btn-sm btn-gold" style="width:100%"' + (!canRel ? ' disabled' : '') + '>' + (cs.relicUnlocked ? '解放済み' : '解放 (2400G＋時空の核石×4)') + '</button>' +
          '</div>' +
          '<div class="result-box" style="font-size:10.5px;color:var(--txt-sub)">' +
          '閃き極意: <strong style="color:var(--acc-gold)">' + cs.masteryCount + ' / 40</strong>（全ステ+' + Math.round(cs.masteryCount * 1.5) + '%） / バディ特性: ' + HW.esc(def.linkBonus.name) + '（' + HW.esc(def.linkBonus.desc) + '）' +
          '</div>' +
          '</div>';
      }

      bottomEl.innerHTML =
        '<div class="subtabs">' +
        tabs.map((t) => '<button type="button" class="subtab' + (rosterUi.sub === t.id ? ' active' : '') + '" data-rsub="' + t.id + '">' + t.label + '</button>').join('') +
        '</div>' +
        bodyHtml;

      bottomEl.querySelectorAll('[data-rsub]').forEach((btn) => {
        btn.addEventListener('click', () => {
          rosterUi.sub = btn.getAttribute('data-rsub');
          if (rosterUi.sub === 'ability') {
            const roleAbs = HW.ABILITIES[def.role] || [];
            const col = Math.max(0, cs.abilities[0] || 0);
            rosterUi.previewAb = Object.assign({ tier: 1 }, roleAbs[0][col]);
          }
          HW.Audio.tap();
          HW.App.render();
        });
      });

      bottomEl.querySelectorAll('[data-sel-char]').forEach((btn) => {
        btn.addEventListener('click', () => {
          rosterUi.selectedId = btn.getAttribute('data-sel-char');
          HW.Audio.tap();
          HW.App.render();
        });
      });

      const bStarOwn = document.getElementById('btn-star-own');
      if (bStarOwn) {
        bStarOwn.addEventListener('click', () => {
          const r = HW.State.unlockOrStarUp(def.id, false);
          if (r.ok) HW.DOM.toast(r.mode === 'unlock' ? def.name + ' が仲間に加わった！' : def.name + ' が ★' + r.newStar + ' へ覚醒！', 'gold');
          HW.App.render();
        });
      }

      const bStarOmni = document.getElementById('btn-star-omni');
      if (bStarOmni) {
        bStarOmni.addEventListener('click', () => {
          const r = HW.State.unlockOrStarUp(def.id, true);
          if (r.ok) HW.DOM.toast(r.mode === 'unlock' ? def.name + ' が仲間に加わった！' : def.name + ' が ★' + r.newStar + ' へ覚醒！', 'gold');
          HW.App.render();
        });
      }

      bottomEl.querySelectorAll('[data-rslot]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const si = Number(btn.getAttribute('data-rslot'));
          const r = HW.State.fillRankSlot(def.id, si);
          if (r.ok) HW.Audio.tap();
          else HW.DOM.toast('階位素材が不足しています');
          HW.App.render();
        });
      });

      const bFillAll = document.getElementById('btn-rank-fill-all');
      if (bFillAll) {
        bFillAll.addEventListener('click', () => {
          let filledAny = false;
          for (let i = 0; i < 6; i++) {
            if (HW.State.fillRankSlot(def.id, i).ok) filledAny = true;
          }
          if (filledAny) HW.Audio.tap();
          else HW.DOM.toast('装着可能な階位素材が不足しています');
          HW.App.render();
        });
      }

      const bRankUp = document.getElementById('btn-rank-up');
      if (bRankUp) {
        bRankUp.addEventListener('click', () => {
          const r = HW.State.promoteRank(def.id);
          if (r.ok) HW.DOM.toast(def.name + ' が RANK ' + HW.RANK_NAMES[r.newRank - 1] + ' へ昇格！', 'gold');
          HW.App.render();
        });
      }

      bottomEl.querySelectorAll('[data-ab-t]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const ti = Number(btn.getAttribute('data-ab-t'));
          const ci = Number(btn.getAttribute('data-ab-c'));
          const ab = HW.ABILITIES[def.role][ti][ci];
          rosterUi.previewAb = Object.assign({ tier: ti + 1 }, ab);
          if (!HW.State.setAbility(def.id, ti, ci)) {
            HW.DOM.toast('覚醒★またはRANK昇格で第' + (ti + 1) + '段階が解放されます');
          }
          HW.App.render();
        });
      });

      bottomEl.querySelectorAll('[data-eq-slot]').forEach((btn) => {
        btn.addEventListener('click', () => {
          HW.Audio.tap();
          openEquipPicker(def.id, btn.getAttribute('data-eq-slot'));
        });
      });

      const bEqBest = document.getElementById('btn-eq-best');
      if (bEqBest) {
        bEqBest.addEventListener('click', () => {
          HW.EQUIP_SLOTS.forEach((sl) => {
            const best = sd.inventory
              .filter((it) => HW.getEquipTemplate(it.tplId).slot === sl.id && (!HW.State.getEquipOwner(it.id) || HW.State.getEquipOwner(it.id) === def.id))
              .sort((a, b) => b.quality - a.quality)[0];
            if (best) HW.State.equipItem(def.id, best.id);
          });
          HW.DOM.toast('空き装備から高品質を自動装着しました', 'gold');
          HW.App.render();
        });
      }

      const bFav = document.getElementById('btn-unlock-fav');
      if (bFav) {
        bFav.addEventListener('click', () => {
          if (HW.State.unlockSpecialGear(def.id, 'favorite').ok) {
            HW.DOM.toast('愛用品「' + def.favorite.name + '」を解放！', 'gold');
            HW.App.render();
          }
        });
      }
      const bRel = document.getElementById('btn-unlock-rel');
      if (bRel) {
        bRel.addEventListener('click', () => {
          if (HW.State.unlockSpecialGear(def.id, 'relic').ok) {
            HW.DOM.toast('固有神器「' + def.relic.name + '」を解放！', 'gold');
            HW.App.render();
          }
        });
      }
    }
  };
})();
