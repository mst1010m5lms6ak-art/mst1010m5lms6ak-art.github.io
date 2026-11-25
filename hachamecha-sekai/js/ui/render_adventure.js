(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  const advState = {
    mode: 'normal', // 'normal' | 'tower' | 'raid' | 'restriction' | 'arena'
    area: 1,
    stageId: 'st_1_1',
    towerId: 'tower_1',
    raidId: 'raid_fire',
    restrictionId: 'res_fire_water',
    arenaTargetRank: null
  };

  function getArenaCandidates() {
    const myRank = HW.State.data.progress.arenaRank || 100;
    const ranks = [];
    const steps = myRank > 30 ? [12, 6, 3, 1] : myRank > 10 ? [5, 3, 2, 1] : [3, 2, 1, 0];
    steps.forEach((d) => {
      const r = Math.max(1, myRank - d);
      if (!ranks.includes(r)) ranks.push(r);
    });
    if (!ranks.includes(1) && myRank <= 5) ranks.push(1);
    return ranks.sort((a, b) => a - b);
  }

  function openArenaInspectSheet(opp) {
    const form = HW.getFormation(opp.formationId);
    const body =
      '<div class="arena-detail-card" style="border-color:var(--acc-gold)">' +
      '<div class="tag-row" style="justify-content:space-between">' +
      '<span style="font-weight:900;font-size:12px;color:#fff">' + opp.rank + '位 ' + HW.esc(opp.teamName) + '</span>' +
      '<span class="syn-chip">陣形: ' + HW.esc(form.name) + '</span>' +
      '</div>' +
      '<div style="font-size:10px;color:var(--txt-sub)">' + HW.esc(form.summary) + '</div>' +
      '</div>' +
      opp.members.map((m, idx) => {
        const def = HW.getCharDef(m.charId);
        const calc = HW.computeCharStats(m.charId, m);
        const eqNames = HW.EQUIP_SLOTS.map((sl) => {
          const it = m.equips[sl.id];
          if (!it) return '';
          const tpl = HW.getEquipTemplate(it.tplId);
          return tpl.name + '(' + it.quality + '%)';
        }).filter(Boolean).join(' / ');

        const abList = (m.abilities || []).map((col, ti) => {
          if (col < 0) return null;
          const ab = HW.ABILITIES[def.role][ti] && HW.ABILITIES[def.role][ti][col];
          return ab ? 'T' + (ti + 1) + ':' + ab.short : null;
        }).filter(Boolean).join('・');

        const skList = def.skills.map((sk) => sk.name + '[' + (HW.TARGET_LABELS[sk.target] || HW.TARGET_LABELS.single).text + ']').join(' / ');

        return (
          '<div class="arena-detail-card">' +
          '<div class="tag-row" style="justify-content:space-between">' +
          '<span style="font-size:11.5px"><strong>' + (idx + 1) + '. ' + HW.esc(def.name) + '</strong> ' + HW.badgeElement(def.element) + HW.badgeRole(def.role, true) + '</span>' +
          '<span class="char-stars">' + HW.starsText(m.star) + ' R-' + HW.RANK_NAMES[m.rank - 1] + '</span>' +
          '</div>' +
          '<div style="font-size:10px;color:#dbe4ff" class="num">HP ' + HW.formatNum(calc.hp) + ' / 攻 ' + HW.formatNum(calc.atk) + ' / 防 ' + HW.formatNum(calc.def) + ' / 速 ' + calc.spd + '</div>' +
          '<div style="font-size:9.5px;color:var(--acc-cyan)">技: ' + HW.esc(skList) + '</div>' +
          '<div style="font-size:9.5px;color:var(--txt-sub)">装: ' + HW.esc(eqNames) + '</div>' +
          '<div style="font-size:9.5px;color:#d5b4ff">能力: ' + HW.esc(abList || 'なし') + '</div>' +
          '</div>'
        );
      }).join('');

    const actions =
      '<button type="button" class="btn" data-sheet-close="1">閉じる</button>' +
      '<button type="button" class="btn btn-primary" id="sheet-arena-go">この相手に挑む</button>';

    HW.DOM.openSheet('相手編成詳細（' + opp.rank + '位）', body, actions, (panel) => {
      panel.querySelector('#sheet-arena-go').addEventListener('click', () => {
        HW.Audio.tap();
        HW.DOM.closeSheet();
        HW.App.launchBattle({ mode: 'arena', targetRank: opp.rank, autoLoop: false });
      });
    });
  }

  function renderTopPreview() {
    const sd = HW.State.data;
    if (advState.mode === 'normal') {
      const st = HW.getStageDef(advState.stageId);
      const area = HW.AREAS[st.area - 1];
      const boss = HW.getEnemyDef(st.bossId);
      const shardChar = HW.getCharDef(st.shardCharId);
      const setsText = st.equipSets.slice(0, 4).map((id) => HW.getEquipSet(id).name).join('・');
      const unlocked = HW.State.isStageUnlocked(st.id);
      const cleared = sd.progress.clearedStages[st.id];
      const areaClearedCnt = area.stages.filter((x) => sd.progress.clearedStages[x.id]).length;
      const statusBadge = !unlocked
        ? '<span class="b-pill boss">未解放</span>'
        : cleared
          ? '<span class="b-pill">制覇済</span>'
          : '<span class="b-pill intruder">攻略中</span>';

      return (
        '<div class="preview-box">' +
        '<div class="preview-head">' +
        '<span class="preview-name">' + HW.esc(st.name) + '</span>' +
        statusBadge +
        '</div>' +
        '<div class="tag-row" style="justify-content:space-between;font-size:10.5px;color:var(--txt-sub)">' +
        '<span>' + HW.esc(area.name) + '</span>' +
        '<span class="num">エリア進捗 ' + areaClearedCnt + '/10</span>' +
        '</div>' +
        '<div class="stat-grid-3">' +
        '<div class="stat-cell"><span class="stat-k">構成</span><span class="stat-v num">5 WAVE</span></div>' +
        '<div class="stat-cell"><span class="stat-k">品質範囲</span><span class="stat-v num">' + st.minQuality + '%〜極</span></div>' +
        '<div class="stat-cell"><span class="stat-k">報酬目安</span><span class="stat-v num" style="color:var(--acc-gold)">' + HW.formatNum(st.goldBase) + 'G</span></div>' +
        '</div>' +
        '<div class="result-box">' +
        '<div class="tag-row" style="justify-content:space-between">' +
        '<span style="font-size:11px;font-weight:900">BOSS: ' + HW.esc(boss.name) + '</span>' +
        '<span>' + HW.badgeElement(boss.element) + HW.badgeRole(boss.role, true) + '</span>' +
        '</div>' +
        '<div style="font-size:10px;color:var(--txt-sub);margin-top:3px">欠片(低確率): <strong style="color:var(--acc-cyan)">' + HW.esc(shardChar.name) + '</strong> / 装備: ' + HW.esc(setsText) + '</div>' +
        '<div style="font-size:9.5px;color:var(--acc-gold);margin-top:2px">' + (!unlocked ? '解放条件: ' + HW.esc(HW.State.getStageUnlockText(st.id)) : '超低確率で万能欠片・希少乱入あり ／ 炎>風>水>炎・光⇄闇') + '</div>' +
        '</div>' +
        '</div>'
      );
    }

    if (advState.mode === 'tower') {
      const tower = HW.TOWERS.find((t) => t.id === advState.towerId) || HW.TOWERS[0];
      const clearedF = sd.progress.towerCleared[tower.id] || 0;
      const nextF = Math.min(tower.maxFloor, clearedF + 1);
      const tf = HW.getTowerFloorDef(tower.id, nextF);
      const boss = HW.getEnemyDef(tf.bossId);
      return (
        '<div class="preview-box">' +
        '<div class="preview-head">' +
        '<span class="preview-name">' + HW.esc(tower.name) + '</span>' +
        '<span class="b-pill num">到達 ' + clearedF + ' / ' + tower.maxFloor + 'F</span>' +
        '</div>' +
        '<div class="stat-grid-3">' +
        '<div class="stat-cell"><span class="stat-k">挑戦階層</span><span class="stat-v num">' + nextF + 'F</span></div>' +
        '<div class="stat-cell"><span class="stat-k">初回万能欠片</span><span class="stat-v num" style="color:var(--acc-cyan)">×' + tf.rewardOmni + '</span></div>' +
        '<div class="stat-cell"><span class="stat-k">初回ゴールド</span><span class="stat-v num" style="color:var(--acc-gold)">' + HW.formatNum(tf.rewardGold) + '</span></div>' +
        '</div>' +
        '<div class="result-box">' +
        '<div class="tag-row" style="justify-content:space-between"><span style="font-weight:900;font-size:11px">守護敵: ' + HW.esc(boss.name) + '</span>' + HW.badgeElement(boss.element) + '</div>' +
        '<div style="font-size:10.5px;color:var(--txt-sub);margin-top:3px">各階層1度きりの踏破報酬。5階層ごとに高品質装備ドロップ' + (tf.unlockForm ? '・新陣形解放！' : '') + '</div>' +
        '</div>' +
        '</div>'
      );
    }

    if (advState.mode === 'raid') {
      const rd = HW.RAIDS.find((r) => r.id === advState.raidId) || HW.RAIDS[0];
      const enemy = HW.getEnemyDef(rd.enemyId);
      const best = sd.progress.raidBestDamage[rd.id] || 0;
      const teamCounts = sd.raidTeams.map((t) => (t || []).filter(Boolean).length);
      return (
        '<div class="preview-box">' +
        '<div class="preview-head">' +
        '<span class="preview-name">' + HW.esc(enemy.name) + '</span>' +
        HW.badgeElement(rd.element) +
        '</div>' +
        '<div style="font-size:11px;color:var(--txt-sub)">' + HW.esc(rd.sub) + ' — 最大3部隊リレーで残HP＆デバフ引継ぎ攻略</div>' +
        '<div class="stat-grid-3">' +
        '<div class="stat-cell"><span class="stat-k">最大与ダメ</span><span class="stat-v num" style="color:var(--acc-gold)">' + HW.formatNum(best) + '</span></div>' +
        '<div class="stat-cell"><span class="stat-k">討伐状況</span><span class="stat-v">' + (sd.progress.raidCleared[rd.id] ? '討伐済' : '未討伐') + '</span></div>' +
        '<div class="stat-cell"><span class="stat-k">待機部隊</span><span class="stat-v num">' + teamCounts.filter((c) => c > 0).length + '部隊</span></div>' +
        '</div>' +
        '<div class="result-box" style="font-size:10.5px;color:var(--txt-sub)">' +
        '報酬装備セット: <strong style="color:#fff">' + HW.esc(HW.getEquipSet(rd.equipSet).name) + '</strong> / 万能欠片最大×' + rd.omni + ' / 階位素材獲得' +
        '</div>' +
        '</div>'
      );
    }

    if (advState.mode === 'restriction') {
      const rs = HW.RESTRICTIONS.find((r) => r.id === advState.restrictionId) || HW.RESTRICTIONS[0];
      const eligible = HW.CHARACTERS_SORTED.filter((c) => sd.chars[c.id].unlocked && rs.check(c));
      return (
        '<div class="preview-box">' +
        '<div class="preview-head">' +
        '<span class="preview-name">' + HW.esc(rs.name) + '</span>' +
        '<span class="b-pill">' + (sd.progress.restrictionCleared[rs.id] ? '制覇済' : '挑戦可') + '</span>' +
        '</div>' +
        '<div class="result-box" style="border-color:var(--acc-pink)">' +
        '<div style="font-size:11.5px;font-weight:900;color:#ffb4d8">出撃条件: ' + HW.esc(rs.ruleText) + '</div>' +
        '<div style="font-size:10.5px;color:var(--txt-sub);margin-top:3px">適合所持キャラ: <strong style="color:#fff">' + eligible.length + '体</strong>（出撃時に上位4体を自動選出）</div>' +
        '</div>' +
        '<div class="result-box" style="font-size:10.5px;color:var(--txt-sub)">狙い撃ち欠片: <strong style="color:var(--acc-cyan)">' + HW.esc(rs.shardPool.slice(0, 5).map((id) => HW.getCharDef(id).name).join('・')) + '</strong></div>' +
        '</div>'
      );
    }

    // 異界闘技場
    const myRank = sd.progress.arenaRank || 100;
    const cands = getArenaCandidates();
    const targetRank = cands.includes(advState.arenaTargetRank) ? advState.arenaTargetRank : cands[cands.length - 1];
    advState.arenaTargetRank = targetRank;
    const opp = HW.getArenaOpponent(targetRank);
    const oppForm = HW.getFormation(opp.formationId);
    const membersHtml = opp.members.map((m) => {
      const def = HW.getCharDef(m.charId);
      return '<span class="syn-chip">' + HW.esc(def.name) + ' ' + HW.starsText(m.star) + '</span>';
    }).join('');

    return (
      '<div class="preview-box">' +
      '<div class="preview-head">' +
      '<span class="preview-name">異界闘技場 現在 ' + myRank + '位</span>' +
      '<span class="b-pill boss num">最高 ' + (sd.progress.arenaBestRank || 100) + '位</span>' +
      '</div>' +
      '<div class="result-box" style="border-color:var(--acc-gold)">' +
      '<div class="tag-row" style="justify-content:space-between;margin-bottom:3px">' +
      '<span style="font-weight:900;font-size:12px">' + opp.rank + '位 ' + HW.esc(opp.teamName) + '</span>' +
      '<span class="cur-pill medal num">報酬 +' + opp.medalReward + '闘</span>' +
      '</div>' +
      '<div style="font-size:10.5px;color:var(--txt-sub);margin-bottom:4px">陣形: ' + HW.esc(oppForm.name) + '（' + HW.esc(oppForm.summary) + '）</div>' +
      '<div class="tag-row">' + membersHtml + '</div>' +
      '</div>' +
      '<div style="font-size:10px;color:var(--txt-sub)">「相手詳細」から装備・技・5段階能力を確認して有利な編成で挑めます</div>' +
      '</div>'
    );
  }

  HW.RenderAdventure = {
    render: function (topEl, bottomEl) {
      const sd = HW.State.data;
      topEl.innerHTML = HW.renderStageHeader('はちゃめちゃ世界') + renderTopPreview();

      const modes = [
        { id: 'normal', label: '通常' },
        { id: 'tower', label: '異界塔' },
        { id: 'raid', label: '総力戦' },
        { id: 'restriction', label: '制約' },
        { id: 'arena', label: '闘技場' }
      ];

      let middleHtml = '';
      let actionHtml = '';

      if (advState.mode === 'normal') {
        const areaBtns = HW.AREAS.map((a) =>
          '<button type="button" class="subtab' + (advState.area === a.area ? ' active' : '') + '" data-area="' + a.area + '">Area ' + a.area + '</button>'
        ).join('');
        const areaObj = HW.AREAS[advState.area - 1];
        const stageCards = areaObj.stages.map((st) => {
          const unlocked = HW.State.isStageUnlocked(st.id);
          const cleared = sd.progress.clearedStages[st.id];
          const sel = advState.stageId === st.id;
          return (
            '<button type="button" class="stage-card' + (sel ? ' selected' : '') + '" data-stage="' + st.id + '" style="' + (!unlocked ? 'opacity:0.55' : '') + '">' +
            '<div class="stage-card-left">' +
            '<span class="stage-card-title">' + HW.esc(st.name) + '</span>' +
            '<span class="stage-card-sub">欠片: ' + HW.esc(HW.getCharDef(st.shardCharId).name) + ' / 品質' + st.minQuality + '%〜</span>' +
            '</div>' +
            '<span class="b-pill' + (st.isAreaBoss ? ' boss' : '') + '">' + (!unlocked ? '未解放' : cleared ? '制覇' : '挑戦') + '</span>' +
            '</button>'
          );
        }).join('');
        const canLaunchNormal = HW.State.isStageUnlocked(advState.stageId);
        middleHtml = '<div class="subtabs">' + areaBtns + '</div><div class="scroll-list" data-scroll-key="adv_normal_' + advState.area + '">' + stageCards + '</div>';
        actionHtml =
          '<div class="battle-ctrl-row">' +
          '<button type="button" id="adv-go-once" class="btn btn-primary"' + (!canLaunchNormal ? ' disabled' : '') + '>' + (canLaunchNormal ? '出撃' : '未解放') + '</button>' +
          '<button type="button" id="adv-go-loop" class="btn btn-lime"' + (!canLaunchNormal ? ' disabled' : '') + '>' + HW.icon('loop', 13) + ' 自動周回で出撃</button>' +
          '</div>';
      } else if (advState.mode === 'tower') {
        const cards = HW.TOWERS.map((t) => {
          const cl = sd.progress.towerCleared[t.id] || 0;
          const locked = t.id === 'tower_2' && (sd.progress.towerCleared.tower_1 || 0) < 100;
          const sel = advState.towerId === t.id;
          const doneAll = cl >= t.maxFloor;
          return (
            '<button type="button" class="stage-card' + (sel ? ' selected' : '') + '" data-tower="' + t.id + '"' + (locked ? ' disabled' : '') + '>' +
            '<div class="stage-card-left">' +
            '<span class="stage-card-title">' + HW.esc(t.name) + '</span>' +
            '<span class="stage-card-sub">' + (locked ? '異界塔Ⅰ 100F制覇で解放' : '到達 ' + cl + ' / ' + t.maxFloor + 'F') + '</span>' +
            '</div>' +
            '<span class="b-pill num">' + (doneAll ? '制覇済' : '次 ' + (cl + 1) + 'F') + '</span>' +
            '</button>'
          );
        }).join('');
        middleHtml = '<div class="fixed-area">' + cards + '</div>';
        actionHtml =
          '<div class="battle-ctrl-row">' +
          '<button type="button" id="adv-go-once" class="btn btn-primary">1階層挑戦</button>' +
          '<button type="button" id="adv-go-loop" class="btn btn-lime">' + HW.icon('loop', 13) + ' 自動連続登頂</button>' +
          '</div>';
      } else if (advState.mode === 'raid') {
        const cards = HW.RAIDS.map((rd) => {
          const sel = advState.raidId === rd.id;
          const best = sd.progress.raidBestDamage[rd.id] || 0;
          return (
            '<button type="button" class="stage-card' + (sel ? ' selected' : '') + '" data-raid="' + rd.id + '">' +
            '<div class="stage-card-left">' +
            '<span class="stage-card-title">' + HW.badgeElement(rd.element) + ' ' + HW.esc(rd.name) + '</span>' +
            '<span class="stage-card-sub">' + HW.esc(rd.sub) + ' / 最大 ' + HW.formatNum(best) + '</span>' +
            '</div>' +
            '<span class="b-pill' + (sd.progress.raidCleared[rd.id] ? '' : ' boss') + '">' + (sd.progress.raidCleared[rd.id] ? '討伐済' : 'レイド') + '</span>' +
            '</button>'
          );
        }).join('');
        middleHtml = '<div class="scroll-list" data-scroll-key="adv_raid">' + cards + '</div>';
        actionHtml = '<button type="button" id="adv-go-once" class="btn btn-primary" style="min-height:40px">総力戦 複数部隊リレー出撃</button>';
      } else if (advState.mode === 'restriction') {
        const cards = HW.RESTRICTIONS.map((rs) => {
          const sel = advState.restrictionId === rs.id;
          const cnt = HW.CHARACTERS_SORTED.filter((c) => sd.chars[c.id].unlocked && rs.check(c)).length;
          return (
            '<button type="button" class="stage-card' + (sel ? ' selected' : '') + '" data-res="' + rs.id + '">' +
            '<div class="stage-card-left">' +
            '<span class="stage-card-title">' + HW.esc(rs.name) + '</span>' +
            '<span class="stage-card-sub">' + HW.esc(rs.ruleText) + '（適合' + cnt + '体）</span>' +
            '</div>' +
            '<span class="b-pill">' + (sd.progress.restrictionCleared[rs.id] ? '制覇' : '挑戦') + '</span>' +
            '</button>'
          );
        }).join('');
        middleHtml = '<div class="scroll-list" data-scroll-key="adv_res">' + cards + '</div>';
        actionHtml =
          '<div class="battle-ctrl-row">' +
          '<button type="button" id="adv-go-once" class="btn btn-primary">出撃</button>' +
          '<button type="button" id="adv-go-loop" class="btn btn-lime">' + HW.icon('loop', 13) + ' 自動周回</button>' +
          '</div>';
      } else {
        const cands = getArenaCandidates();
        const cards = cands.map((r) => {
          const opp = HW.getArenaOpponent(r);
          const sel = advState.arenaTargetRank === r;
          return (
            '<button type="button" class="stage-card' + (sel ? ' selected' : '') + '" data-arena-rank="' + r + '">' +
            '<div class="stage-card-left">' +
            '<span class="stage-card-title">' + r + '位 ' + HW.esc(opp.teamName) + '</span>' +
            '<span class="stage-card-sub">陣形: ' + HW.esc(HW.getFormation(opp.formationId).name) + ' / 報酬 +' + opp.medalReward + '闘</span>' +
            '</div>' +
            '<span class="b-pill boss">4vs4</span>' +
            '</button>'
          );
        }).join('');
        middleHtml = '<div class="compact-card-stack">' + cards + '</div>';
        actionHtml =
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;flex-shrink:0">' +
          '<button type="button" id="arena-inspect" class="btn btn-gold">相手詳細</button>' +
          '<button type="button" id="adv-go-once" class="btn btn-primary">挑戦</button>' +
          '<button type="button" id="adv-go-loop" class="btn btn-lime">' + HW.icon('loop', 12) + ' 周回</button>' +
          '</div>';
      }

      bottomEl.innerHTML =
        '<div class="subtabs">' +
        modes.map((m) => '<button type="button" class="subtab' + (advState.mode === m.id ? ' active' : '') + '" data-adv-mode="' + m.id + '">' + m.label + '</button>').join('') +
        '</div>' +
        middleHtml +
        actionHtml;

      bottomEl.querySelectorAll('[data-adv-mode]').forEach((btn) => {
        btn.addEventListener('click', () => {
          advState.mode = btn.getAttribute('data-adv-mode');
          HW.Audio.tap();
          HW.App.render({ resetScroll: true });
        });
      });

      bottomEl.querySelectorAll('[data-area]').forEach((btn) => {
        btn.addEventListener('click', () => {
          advState.area = Number(btn.getAttribute('data-area'));
          const areaStages = HW.AREAS[advState.area - 1].stages;
          // 解放済み最新ステージ、未解放エリアなら先頭ステージへ連動更新！
          let target = areaStages[0];
          for (let i = areaStages.length - 1; i >= 0; i--) {
            if (HW.State.isStageUnlocked(areaStages[i].id)) {
              target = areaStages[i];
              break;
            }
          }
          advState.stageId = target.id;
          HW.Audio.tap();
          HW.App.render({ resetScroll: true });
        });
      });

      bottomEl.querySelectorAll('[data-stage]').forEach((btn) => {
        btn.addEventListener('click', () => {
          advState.stageId = btn.getAttribute('data-stage');
          HW.Audio.tap();
          HW.App.render();
        });
      });

      bottomEl.querySelectorAll('[data-tower]').forEach((btn) => {
        btn.addEventListener('click', () => {
          advState.towerId = btn.getAttribute('data-tower');
          HW.Audio.tap();
          HW.App.render();
        });
      });

      bottomEl.querySelectorAll('[data-raid]').forEach((btn) => {
        btn.addEventListener('click', () => {
          advState.raidId = btn.getAttribute('data-raid');
          HW.Audio.tap();
          HW.App.render();
        });
      });

      bottomEl.querySelectorAll('[data-res]').forEach((btn) => {
        btn.addEventListener('click', () => {
          advState.restrictionId = btn.getAttribute('data-res');
          HW.Audio.tap();
          HW.App.render();
        });
      });

      bottomEl.querySelectorAll('[data-arena-rank]').forEach((btn) => {
        btn.addEventListener('click', () => {
          advState.arenaTargetRank = Number(btn.getAttribute('data-arena-rank'));
          HW.Audio.tap();
          HW.App.render();
        });
      });

      const inspectBtn = document.getElementById('arena-inspect');
      if (inspectBtn) {
        inspectBtn.addEventListener('click', () => {
          HW.Audio.tap();
          openArenaInspectSheet(HW.getArenaOpponent(advState.arenaTargetRank));
        });
      }

      const startBattle = (autoLoop) => {
        HW.Audio.tap();
        if (advState.mode === 'normal') {
          if (!HW.State.isStageUnlocked(advState.stageId)) {
            HW.DOM.toast('前のステージを制覇してください');
            return;
          }
          HW.App.launchBattle({ mode: 'normal', stageId: advState.stageId, autoLoop: autoLoop });
        } else if (advState.mode === 'tower') {
          const tower = HW.TOWERS.find((t) => t.id === advState.towerId) || HW.TOWERS[0];
          const nextF = Math.min(tower.maxFloor, (sd.progress.towerCleared[tower.id] || 0) + 1);
          HW.App.launchBattle({ mode: 'tower', towerId: tower.id, floor: nextF, autoLoop: autoLoop });
        } else if (advState.mode === 'raid') {
          HW.App.launchBattle({ mode: 'raid', raidId: advState.raidId, autoLoop: false });
        } else if (advState.mode === 'restriction') {
          const rs = HW.RESTRICTIONS.find((r) => r.id === advState.restrictionId);
          const eligible = HW.CHARACTERS_SORTED
            .filter((c) => sd.chars[c.id].unlocked && rs.check(c))
            .sort((a, b) => HW.computeCharStats(b.id).power - HW.computeCharStats(a.id).power)
            .slice(0, 4)
            .map((c) => c.id);
          if (eligible.length === 0) {
            HW.DOM.toast('条件を満たす所持キャラがいません');
            return;
          }
          HW.App.launchBattle({ mode: 'restriction', restrictionId: rs.id, customParty: eligible, autoLoop: autoLoop });
        } else if (advState.mode === 'arena') {
          HW.App.launchBattle({ mode: 'arena', targetRank: advState.arenaTargetRank, autoLoop: autoLoop });
        }
      };

      const onceBtn = document.getElementById('adv-go-once');
      if (onceBtn) onceBtn.addEventListener('click', () => startBattle(false));
      const loopBtn = document.getElementById('adv-go-loop');
      if (loopBtn) loopBtn.addEventListener('click', () => startBattle(true));
    }
  };
})();
