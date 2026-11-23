(function (global) {
  "use strict";
  const HS = (global.HS = global.HS || {});

  let bottomViewTab = "log"; // 'log' | 'dealt' | 'taken' | 'healOut' | 'healIn'
  let resultMetricTab = "dealt"; // 'dealt' | 'taken' | 'healOut' | 'healIn'
  let lastRenderedState = null;

  const METRIC_LABELS = {
    dealt: "与ダメージ",
    taken: "被ダメージ",
    healOut: "与回復量",
    healIn: "被回復量"
  };

  function renderLogLine(entry) {
    const E = HS.CONST.esc;
    if (entry.kind === "sys") {
      return `<div class="log-line"><span class="log-val-sys">${E(entry.text)}</span></div>`;
    }
    const actorCls = entry.actorSide === "ally" ? "log-actor-ally" : "log-actor-enemy";
    const targetCls = entry.actorSide === "ally" ? "log-actor-enemy" : "log-actor-ally";
    const arrow = entry.kind === "heal" ? "＋" : "▶";
    const valCls =
      entry.kind === "crit" ? "log-val-crit" : entry.kind === "heal" ? "log-val-heal" : "log-val-dmg";
    const targetHtml =
      entry.kind === "heal"
        ? `<span class="log-actor-ally">${E(entry.target)}</span>`
        : `<span class="${targetCls}">${E(entry.target)}</span>`;
    return `<div class="log-line"><span class="${actorCls}">${E(entry.actor)}</span> ${arrow} ${targetHtml} ${E(entry.action)} <span class="${valCls} num">${E(entry.val)}</span></div>`;
  }

  function renderDpsPanelHtml(units, elapsedSec, metricKey, detailed) {
    const E = HS.CONST.esc;
    const sec = Math.max(0.5, elapsedSec || 1);
    const list = units.map((u) => {
      const val = u.metrics ? u.metrics[metricKey] || 0 : u[metricKey] || 0;
      return { name: u.name, val, perSec: val / sec };
    });
    const total = Math.max(1, list.reduce((s, x) => s + x.val, 0));
    const maxVal = Math.max(1, ...list.map((x) => x.val));
    const fgCls = "dps-fg-" + metricKey;

    return list
      .map((item) => {
        const pct = Math.min(100, Math.round((item.val / maxVal) * 100));
        const share = Math.round((item.val / total) * 100);
        const rightText = detailed
          ? `${HS.CONST.fmtNum(item.val)} (${share}%)`
          : `${HS.CONST.fmtNum(item.val)} · ${HS.CONST.fmtNum(item.perSec)}/s`;
        return `<div class="dps-row ${detailed ? "dps-row-lg" : ""}">
          <span class="truncate">${E(item.name)}</span>
          <div class="dps-bar-bg"><div class="dps-bar-fg ${fgCls}" style="width:${pct}%"></div></div>
          <span class="num" style="text-align:right;white-space:nowrap">${rightText}</span>
        </div>`;
      })
      .join("");
  }

  function renderUnitCard(u, b) {
    const E = HS.CONST.esc;
    const hpPct = Math.max(0, Math.min(100, Math.round((u.hp / u.maxHp) * 100)));
    const shPct = Math.max(0, Math.min(100, Math.round((u.shield / u.maxHp) * 100)));
    const atbPct = Math.max(0, Math.min(100, Math.round(u.atb)));
    const isActing = b.actingUid === u.uid || (b.waitingActor && b.waitingActor.uid === u.uid);
    const isTargeted = u.side === "enemy" && b.selectedTargetUid === u.uid && u.hp > 0;
    const deadCls = u.hp <= 0 ? "dead" : "";
    const actCls = isActing ? "acting" : "";
    const tgtCls = isTargeted ? "targeted" : "";

    const buffs = [];
    if (u.buffs.taunt > 0) buffs.push(`<span class="b-buff-dot">挑</span>`);
    if (u.buffs.atkUp > 0) buffs.push(`<span class="b-buff-dot">攻↑</span>`);
    if (u.buffs.defUp > 0) buffs.push(`<span class="b-buff-dot">防↑</span>`);
    if (u.buffs.spdUp > 0) buffs.push(`<span class="b-buff-dot">速↑</span>`);
    if (u.buffs.critUp > 0) buffs.push(`<span class="b-buff-dot">会↑</span>`);
    if (u.debuffs.burn > 0) buffs.push(`<span class="b-buff-dot debuff">焼</span>`);
    if (u.debuffs.defDown > 0) buffs.push(`<span class="b-buff-dot debuff">防↓</span>`);
    if (u.debuffs.atkDown > 0) buffs.push(`<span class="b-buff-dot debuff">攻↓</span>`);
    if (u.debuffs.slow > 0) buffs.push(`<span class="b-buff-dot debuff">鈍</span>`);

    return `<div id="bu_${u.uid}" class="b-unit ${u.side} ${deadCls} ${actCls} ${tgtCls}">
      <div class="b-unit-head">
        <span class="el-${u.element}" style="padding:0 3px;border-radius:4px;font-size:8px">${HS.CONST.ELEMENT_MAP[u.element].name}</span>
        <span class="num" style="color:var(--text-sub)">${u.hp > 0 ? hpPct + "%" : "撃破"}</span>
      </div>
      ${HS.SVG.emblem(u, 30)}
      <div class="b-unit-name truncate">${E(u.name)}</div>
      <div class="bar-track">
        <div class="bar-fill ${u.side === "ally" ? "bar-hp-ally" : "bar-hp-enemy"}" style="width:${hpPct}%"></div>
        ${shPct > 0 ? `<div class="bar-shield" style="width:${shPct}%"></div>` : ""}
      </div>
      <div class="bar-track" style="height:3px">
        <div class="bar-fill bar-atb" style="width:${atbPct}%"></div>
      </div>
      <div class="b-buffs">${buffs.slice(0, 3).join("")}</div>
    </div>`;
  }

  function mountBattleShell(topEl) {
    topEl.innerHTML = `<div id="battle-top-wrap" class="battle-top-wrap">
      <div id="b-hud-bar" class="battle-hud-bar"></div>
      <div id="b-timeline" class="timeline-bar"></div>
      <div class="battle-arena">
        <canvas id="battle-fx-canvas"></canvas>
        <div id="b-enemy-row" class="unit-row"></div>
        <div id="b-ally-row" class="unit-row"></div>
      </div>
      <div id="b-chaos-strip" class="chaos-meter-strip"></div>
      <div id="b-feed-slot"></div>
    </div>`;
    const canvas = document.getElementById("battle-fx-canvas");
    if (canvas && HS.FX) HS.FX.attach(canvas);
  }

  function renderFighting(b, topEl, ctrlEl) {
    const E = HS.CONST.esc;
    if (lastRenderedState !== "fighting" || !document.getElementById("battle-top-wrap")) {
      mountBattleShell(topEl);
      lastRenderedState = "fighting";
    }

    const wrap = document.getElementById("battle-top-wrap");
    if (wrap) wrap.classList.toggle("chaos-active", !!b.activeLaw);

    // 1. HUD
    const hud = document.getElementById("b-hud-bar");
    if (hud) {
      hud.innerHTML = `<span class="truncate">${E(b.stage.name)} <span style="color:var(--accent-cyan)">W${b.waveIdx + 1}/${b.stage.waves.length}</span></span>
        ${
          b.activeLaw
            ? `<span class="chaos-law-pill truncate">法則：${E(b.activeLaw.name)}</span>`
            : `<span style="color:var(--text-dim);font-size:10px">混沌蓄積中</span>`
        }`;
    }

    // 2. Action Order Timeline
    const tl = document.getElementById("b-timeline");
    if (tl) {
      const order = HS.BATTLE.getActionOrder(6);
      tl.innerHTML =
        `<span class="tl-label">行動順</span>` +
        order
          .map(
            (u, i) =>
              `<span class="tl-item ${u.side} ${i === 0 ? "first" : ""}">${E(u.name.slice(0, 4))}</span>`
          )
          .join("");
    }

    // 3. Units
    const erow = document.getElementById("b-enemy-row");
    const arow = document.getElementById("b-ally-row");
    if (erow) {
      erow.style.gridTemplateColumns = `repeat(${Math.max(1, b.enemies.length)}, 1fr)`;
      erow.innerHTML = b.enemies.map((u) => renderUnitCard(u, b)).join("");
    }
    if (arow) {
      arow.style.gridTemplateColumns = `repeat(${Math.max(1, b.allies.length)}, 1fr)`;
      arow.innerHTML = b.allies.map((u) => renderUnitCard(u, b)).join("");
    }

    // 4. Chaos meter
    const cstrip = document.getElementById("b-chaos-strip");
    if (cstrip) {
      const pct = Math.round(b.chaos);
      cstrip.innerHTML = `<span style="font-size:10px;font-weight:900;color:var(--accent-pink);flex-shrink:0">CHAOS</span>
        <div class="chaos-track"><div class="chaos-fill" style="width:${pct}%"></div></div>
        <span class="num" style="font-size:10px;font-weight:900;color:${b.burstReady ? "#ffd54a" : "var(--text-sub)"};width:34px;text-align:right">${pct}%</span>`;
    }

    // 5. Log OR 4-metric DPS meter (exact fixed height, never shifts)
    const feed = document.getElementById("b-feed-slot");
    if (feed) {
      if (bottomViewTab === "log") {
        const last4 = b.logs.slice(-4);
        feed.innerHTML = `<div class="combat-log-box">${last4.map(renderLogLine).join("")}</div>`;
      } else {
        feed.innerHTML = `<div class="dps-panel">${renderDpsPanelHtml(b.allies, b.elapsed, bottomViewTab)}</div>`;
      }
    }

    // 6. Bottom Controls (Thumb Zone ONLY)
    const save = b.saveRef;
    const speed = save.settings.speed || 1;
    const isAuto = !!save.settings.autoBattle;
    const isLoop = !!b.isLoopMode;
    const activeUnit =
      b.waitingActor ||
      b.allies.find((a) => a.uid === b.actingUid && a.hp > 0) ||
      b.allies.find((a) => a.hp > 0) ||
      b.allies[0];

    const aliveEnemies = b.enemies.filter((e) => e.hp > 0);

    ctrlEl.innerHTML = `<div class="battle-ctrl-wrap">
      <div class="battle-toolbar">
        <button class="btn btn-sm active-toggle" data-action="battle-speed">${speed}倍速</button>
        <button class="btn btn-sm ${isAuto ? "active-toggle" : ""}" data-action="battle-auto">${isAuto ? "AUTO中" : "手動"}</button>
        <button class="btn btn-sm ${isLoop ? "active-toggle" : ""}" data-action="battle-loop">${isLoop ? "周回ON" : "周回OFF"}</button>
        <button class="btn btn-sm btn-danger" data-action="battle-retreat">撤退</button>
      </div>

      <div class="subtabs">
        ${[
          ["log", "ログ"],
          ["dealt", "与ダメ"],
          ["taken", "被ダメ"],
          ["healOut", "与回復"],
          ["healIn", "被回復"]
        ]
          .map(
            ([k, lbl]) =>
              `<button class="subtab ${bottomViewTab === k ? "active" : ""}" data-action="battle-feed-tab" data-tab="${k}">${lbl}</button>`
          )
          .join("")}
      </div>

      <div class="target-strip" style="grid-template-columns:repeat(${Math.max(1, aliveEnemies.length)}, 1fr)">
        ${aliveEnemies
          .map(
            (e) => `<button class="target-btn ${b.selectedTargetUid === e.uid ? "active" : ""}"
              data-action="battle-target" data-uid="${e.uid}"
              data-drop-zone="enemy-target" data-drop-accept="skill" data-drop-id="${e.uid}">
              <span class="truncate" style="max-width:100%">${E(e.name)}</span>
              <span style="font-size:9px;color:var(--text-sub)">${HS.CONST.ELEMENT_MAP[e.element].name} ${Math.round((e.hp / e.maxHp) * 100)}%</span>
            </button>`
          )
          .join("")}
      </div>

      ${
        b.burstReady
          ? `<button class="burst-btn" data-action="battle-burst">★ はちゃめちゃバースト発動！ ★</button>`
          : `<div class="section-label">
              <span>${b.waitingActor ? "行動選択：" + E(b.waitingActor.name) : "展開中：" + E(activeUnit ? activeUnit.name : "")}</span>
              <span style="color:var(--text-dim)">${b.waitingActor ? "タップ／敵へドラッグ" : "ロール：" + (activeUnit ? HS.CONST.ROLE_MAP[activeUnit.role].abilityName : "")}</span>
            </div>`
      }

      <div class="skill-deck">
        ${
          activeUnit
            ? activeUnit.skills
                .map((sk, idx) => {
                  const cd = activeUnit.cds[idx] || 0;
                  const canCast = !!b.waitingActor && cd === 0;
                  const ultCls = idx === 2 ? "ult" : "";
                  const stateCls = canCast ? "ready" : cd > 0 ? "cooling" : "";
                  const chaosGain = sk.chaos ? "混沌+" + sk.chaos : "";
                  return `<button class="skill-card-btn ${ultCls} ${stateCls}"
                    data-action="battle-skill" data-idx="${idx}"
                    ${canCast ? `data-drag-type="skill" data-drag-id="${idx}" data-drag-label="${E(sk.name)}"` : ""}
                    ${!b.waitingActor || cd > 0 ? "disabled" : ""}>
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:4px">
                      <span class="badge ${idx === 2 ? "el-fire" : "el-water"}">${idx === 0 ? "技1" : idx === 1 ? "技2" : "奥義"}</span>
                      <span class="num" style="font-size:10px;font-weight:900;color:${cd > 0 ? "#ff8a95" : "#6eff5c"}">${cd > 0 ? "CT " + cd : "OK"}</span>
                    </div>
                    <div style="font-size:12px;font-weight:900;line-height:1.2" class="truncate">${E(sk.name)}</div>
                    <div style="font-size:10px;color:var(--text-sub);line-height:1.25">${E(sk.desc)}</div>
                    <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--accent-gold);font-weight:800">
                      <span>${sk.target === "all" ? "全体" : sk.target === "multi" ? (sk.hits || 3) + "連撃" : sk.target === "allies" ? "味方全体" : "単体"}</span>
                      <span>${chaosGain}</span>
                    </div>
                  </button>`;
                })
                .join("")
            : ""
        }
      </div>

      ${
        activeUnit
          ? `<div class="battle-role-strip">
              <span class="truncate"><strong style="color:var(--accent-cyan)">${E(HS.CONST.ROLE_MAP[activeUnit.role].abilityName)}</strong>：${E(HS.CONST.ROLE_MAP[activeUnit.role].abilityDesc)}</span>
            </div>`
          : ""
      }
    </div>`;
  }

  /**
   * NORMAL RESULT SCREEN (Single battle detailed view)
   */
  function renderNormalResult(b, topEl, ctrlEl) {
    const E = HS.CONST.esc;
    if (HS.FX) HS.FX.detach();
    lastRenderedState = "result_normal";
    const r = b.result;

    topEl.innerHTML = `<div class="top-visual-body">
      <div class="result-banner ${r.won ? "win" : "lose"}">
        <span>${r.won ? "VICTORY — 制圧完了！" : "DEFEAT — 撤退"}</span>
        <span class="num" style="font-size:12px">${r.elapsed.toFixed(1)}秒</span>
      </div>
      <div class="display-card">
        <div class="section-label">
          <span>${E(b.stage.name)}</span>
          ${r.firstClear ? `<span class="badge rar-SSR">初回制圧ボーナス</span>` : ""}
        </div>
        <div class="stat-grid-4">
          <div class="stat-cell"><span class="k">ゴールド</span><span class="v num">+${HS.CONST.fmtNum(r.gold)}</span></div>
          <div class="stat-cell"><span class="k">経験値</span><span class="v num">+${HS.CONST.fmtNum(r.exp)}</span></div>
          <div class="stat-cell"><span class="k">混沌結晶</span><span class="v num">+${r.crystal}</span></div>
          <div class="stat-cell"><span class="k">混沌核</span><span class="v num">+${r.core}</span></div>
        </div>
        ${
          r.levelUps.length
            ? `<div style="font-size:10px;font-weight:800;color:var(--accent-lime);line-height:1.3">LEVEL UP: ${r.levelUps.map((u) => E(u.name) + " Lv" + u.level).join(" / ")}</div>`
            : ""
        }
      </div>
      <div class="display-card" style="flex:1;min-height:0;justify-content:flex-start;gap:8px">
        <div class="section-label">
          <span>戦闘統計：${METRIC_LABELS[resultMetricTab]}</span>
          <span style="color:var(--accent-cyan)">通常リザルト</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;justify-content:center">
          ${renderDpsPanelHtml(b.allies, r.elapsed, resultMetricTab, true)}
        </div>
      </div>
    </div>`;

    const dropsHtml = r.drops.length
      ? r.drops
          .map((d) => {
            const eq = d.eq;
            const liveEq = b.saveRef.inventory.find((x) => x.uid === eq.uid);
            return `<div class="equip-row">
              ${HS.SVG.equipIcon(eq.slot, eq.rarity, 28)}
              <div style="flex:1;min-width:0">
                <div class="truncate" style="font-size:12px;font-weight:800"><span class="rar-${eq.rarity}">[${eq.rarity}]</span> ${E(eq.name)}</div>
                <div class="truncate" style="font-size:10px;color:var(--text-sub)">${eq.main.label}+${eq.main.val} / ${eq.subs.map((s) => s.label + "+" + s.val + s.unit).join(" ")}</div>
              </div>
              ${
                d.autoSold
                  ? `<span class="badge rar-N">自動売却 +${d.sellVal}G</span>`
                  : liveEq
                  ? `<div style="display:flex;gap:4px">
                      <button class="btn btn-sm ${liveEq.locked ? "btn-gold" : "btn-ghost"}" data-action="res-lock" data-uid="${eq.uid}">${liveEq.locked ? "保護" : "鍵"}</button>
                      <button class="btn btn-sm btn-danger" data-action="res-sell" data-uid="${eq.uid}" ${liveEq.locked ? "disabled" : ""}>売</button>
                    </div>`
                  : `<span class="badge rar-N">売却済</span>`
              }
            </div>`;
          })
          .join("")
      : `<div style="text-align:center;color:var(--text-dim);padding:16px;font-size:12px">${r.won ? "獲得装備はありません" : "編成や装備を整えて再挑戦しよう"}</div>`;

    const isAbyssNext = b.stage.mode === "abyss" && r.won;

    ctrlEl.innerHTML = `<div class="battle-ctrl-wrap">
      <div class="subtabs">
        ${Object.entries(METRIC_LABELS)
          .map(
            ([k, lbl]) =>
              `<button class="subtab ${resultMetricTab === k ? "active" : ""}" data-action="res-metric-tab" data-tab="${k}">${lbl}</button>`
          )
          .join("")}
      </div>
      <div class="section-label">
        <span>獲得装備（自動売却：${r.autoSoldCount}件 / +${HS.CONST.fmtNum(r.autoSoldGold)}G）</span>
      </div>
      <div class="scroll-y" style="flex:1;min-height:0;display:flex;flex-direction:column;gap:5px">
        ${dropsHtml}
      </div>
      <div class="action-row">
        <button class="btn btn-ghost" style="flex:1" data-action="res-back">拠点へ戻る</button>
        ${
          isAbyssNext
            ? `<button class="btn btn-gold" style="flex:1.2" data-action="res-next-abyss">次の階層へ (${b.stage.floor + 1}F)</button>`
            : `<button class="btn btn-primary" style="flex:1.2" data-action="res-retry">もう一度挑む</button>`
        }
      </div>
    </div>`;
  }

  /**
   * LOOP RESULT SCREEN (Dedicated continuous auto-farming summary screen)
   */
  function renderLoopResult(b, topEl, ctrlEl) {
    const E = HS.CONST.esc;
    if (HS.FX) HS.FX.detach();
    lastRenderedState = "result_loop";
    const s = HS.BATTLE.getLoopSession();
    const avgSec = s && s.runs > 0 ? (s.totalElapsed / s.runs).toFixed(1) : "0.0";
    const meterUnits = s ? Object.values(s.metricsByChar) : b.allies;
    const cdPct = s ? Math.min(100, Math.round((s.countdown / 2.0) * 100)) : 0;

    topEl.innerHTML = `<div class="top-visual-body">
      <div class="result-banner loop-theme">
        <span>無限周回サマリー：第${s ? s.runs : 1}周</span>
        <span class="num" style="font-size:12px">${s ? s.wins : 0}勝 ${s ? s.losses : 0}敗 (平均${avgSec}s)</span>
      </div>
      <div class="display-card">
        <div class="section-label">
          <span>${E(b.stage.name)}</span>
          <span style="color:${s && s.paused ? "#ff8a95" : "#ffd54a"}">${s && s.paused ? "一時停止中" : "次戦まで " + (s ? s.countdown.toFixed(1) : "0.0") + "秒"}</span>
        </div>
        <div class="loop-progress-bar"><div class="loop-progress-fill" style="width:${cdPct}%"></div></div>
        <div class="stat-grid-4">
          <div class="stat-cell"><span class="k">累計G</span><span class="v num">${HS.CONST.fmtNum(s ? s.totalGold + s.autoSoldGold : 0)}</span></div>
          <div class="stat-cell"><span class="k">累計結晶</span><span class="v num">${HS.CONST.fmtNum(s ? s.totalCrystal : 0)}</span></div>
          <div class="stat-cell"><span class="k">累計核</span><span class="v num">${HS.CONST.fmtNum(s ? s.totalCore : 0)}</span></div>
          <div class="stat-cell"><span class="k">自動売却</span><span class="v num">${s ? s.autoSoldCount : 0}件</span></div>
        </div>
      </div>
      <div class="display-card" style="flex:1;min-height:0;justify-content:flex-start;gap:8px">
        <div class="section-label">
          <span>累計統計：${METRIC_LABELS[resultMetricTab]}</span>
          <span style="color:var(--accent-gold)">周回専用ビュー</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;justify-content:center">
          ${renderDpsPanelHtml(meterUnits, s ? s.totalElapsed : 1, resultMetricTab, true)}
        </div>
      </div>
    </div>`;

    const kept = s ? s.keptEquips : [];
    const keptHtml = kept.length
      ? kept
          .map((eq) => {
            const liveEq = b.saveRef.inventory.find((x) => x.uid === eq.uid);
            return `<div class="equip-row">
              ${HS.SVG.equipIcon(eq.slot, eq.rarity, 26)}
              <div style="flex:1;min-width:0">
                <div class="truncate" style="font-size:12px;font-weight:800"><span class="rar-${eq.rarity}">[${eq.rarity}]</span> ${E(eq.name)}</div>
                <div class="truncate" style="font-size:10px;color:var(--text-sub)">${eq.main.label}+${eq.main.val} / ${eq.subs.map((x) => x.label + "+" + x.val + x.unit).join(" ")}</div>
              </div>
              ${
                liveEq
                  ? `<button class="btn btn-sm ${liveEq.locked ? "btn-gold" : "btn-ghost"}" data-action="res-lock" data-uid="${eq.uid}">${liveEq.locked ? "保護済" : "保護"}</button>`
                  : `<span class="badge rar-N">済</span>`
              }
            </div>`;
          })
          .join("")
      : `<div style="text-align:center;color:var(--text-dim);padding:16px;font-size:12px">自動売却を通過した装備がここに記録されます</div>`;

    ctrlEl.innerHTML = `<div class="battle-ctrl-wrap">
      <div class="subtabs">
        ${Object.entries(METRIC_LABELS)
          .map(
            ([k, lbl]) =>
              `<button class="subtab ${resultMetricTab === k ? "active" : ""}" data-action="res-metric-tab" data-tab="${k}">${lbl}</button>`
          )
          .join("")}
      </div>
      <div class="section-label">
        <span>周回で確保した装備（最新12件）</span>
        <span style="color:var(--accent-lime)">換金累計 +${HS.CONST.fmtNum(s ? s.autoSoldGold : 0)}G</span>
      </div>
      <div class="scroll-y" style="flex:1;min-height:0;display:flex;flex-direction:column;gap:5px">
        ${keptHtml}
      </div>
      <div class="action-row">
        <button class="btn btn-danger" style="flex:1" data-action="res-back">周回終了</button>
        <button class="btn btn-cyan" style="flex:1" data-action="loop-pause">${s && s.paused ? "周回再開" : "一時停止"}</button>
        <button class="btn btn-gold" style="flex:1" data-action="loop-now">今すぐ次戦</button>
      </div>
    </div>`;
  }

  function render(b, topEl, ctrlEl) {
    if (!b) return;
    if (b.state === "fighting") renderFighting(b, topEl, ctrlEl);
    else if (b.state === "result_normal") renderNormalResult(b, topEl, ctrlEl);
    else if (b.state === "result_loop") renderLoopResult(b, topEl, ctrlEl);
  }

  function resetState() {
    lastRenderedState = null;
  }

  HS.UI_BATTLE = {
    render,
    resetState,
    setFeedTab(t) {
      bottomViewTab = t;
    },
    setResultMetricTab(t) {
      resultMetricTab = t;
    }
  };
})(window);
