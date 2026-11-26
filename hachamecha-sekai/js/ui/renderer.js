'use strict';

(function (global) {
  const Kairo = global.Kairo || (global.Kairo = {});
  const Data = Kairo.data;
  const { el, clearNode } = Kairo.dom;

  const NAV_ITEMS = [
    { id: 'battle', glyph: '戦', label: '戦場' },
    { id: 'party', glyph: '編', label: '編成' },
    { id: 'summon', glyph: '召', label: '召喚' },
    { id: 'relics', glyph: '遺', label: '遺物' },
    { id: 'records', glyph: '記', label: '記録' }
  ];

  function fmtNum(n) {
    const v = Math.floor(Number(n) || 0);
    if (v >= 1000000) return (v / 1000000).toFixed(2) + 'M';
    if (v >= 100000) return (v / 1000).toFixed(1) + 'K';
    return v.toLocaleString();
  }

  class UIRenderer {
    constructor(store, battle) {
      this.store = store;
      this.battle = battle;

      this.activeTab = 'battle';
      this.subTab = {
        battle: 'campaign', // campaign | boss | corridor | tactics
        party: 'roster',    // roster | grow | skills
        summon: 'pull',     // pull | mileage
        relics: 'list',     // list | craft | filter
        records: 'ach'      // ach | codex | stats | settings
      };

      this.selectedUnitId = null;
      this.selectedRelicId = null;
      this.selectedCodexUnitId = null;
      this.selectedAchId = Data.ACHIEVEMENTS[0].id;
      this.partyRealmFilter = 'all';
      this.relicSlotFilter = 'all';
      this.craftSetId = 'cross_fusion';
      this.craftSlotId = 'weapon';

      this.modal = null;
      this.toastTimer = null;

      this.dom = {
        shell: document.getElementById('app-shell'),
        topHud: document.getElementById('top-hud'),
        battleViewport: document.getElementById('battle-viewport'),
        battleOverlay: document.getElementById('battle-overlay'),
        inspectViewport: document.getElementById('inspect-viewport'),
        topModalStage: document.getElementById('top-modal-stage'),
        toastBanner: document.getElementById('toast-banner'),
        divLeft: document.getElementById('divider-left'),
        divCenter: document.getElementById('divider-center'),
        divRight: document.getElementById('divider-right'),
        bottomPanel: document.getElementById('bottom-panel-body'),
        bottomModal: document.getElementById('bottom-modal-deck'),
        bottomNav: document.getElementById('bottom-nav')
      };
    }

    ensureSelections() {
      const st = this.store.getState();
      if (!this.selectedUnitId || !st.units[this.selectedUnitId]) {
        this.selectedUnitId = st.party[0] || Object.keys(st.units)[0];
      }
      if (!this.selectedRelicId || !st.relics.some((r) => r.id === this.selectedRelicId)) {
        this.selectedRelicId = st.relics[0]?.id || null;
      }
      if (!this.selectedCodexUnitId) {
        this.selectedCodexUnitId = this.selectedUnitId || Data.UNITS[0].id;
      }
    }

    clearToast() {
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = null;
      this.dom.toastBanner.classList.add('hidden');
    }

    showToast(msg) {
      if (!msg) return;
      this.dom.toastBanner.textContent = msg;
      this.dom.toastBanner.classList.remove('hidden');
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.dom.toastBanner.classList.add('hidden');
      }, 2200);
    }

    openModal(modalObj) {
      this.clearToast();
      this.modal = modalObj;
      this.renderModal();
    }

    closeModal() {
      this.modal = null;
      this.renderModal();
    }

    setTab(tabId) {
      if (this.activeTab === tabId) return;
      this.activeTab = tabId;
      Kairo.audio.play('tab');
      this.renderAll();
    }

    applyAccessibilityAttrs() {
      const s = this.store.getState().settings;
      this.dom.shell.dataset.hand = s.handMode || 'right';
      this.dom.shell.dataset.contrast = s.contrastMode || 'normal';
      this.dom.shell.dataset.motion = s.motionMode || 'full';
    }

    renderAll() {
      this.ensureSelections();
      this.applyAccessibilityAttrs();
      this.renderTopHud();
      this.renderDivider();
      this.renderTopStage();
      this.renderBottomPanel(true);
      this.renderBottomNav();
      this.renderModal();
    }

    renderDynamicTick() {
      this.renderTopHud();
      this.renderDivider();
      if (this.activeTab === 'battle') {
        this.renderBattleOverlay();
      } else if (this.activeTab === 'records' && this.subTab.records === 'stats') {
        this.renderTopStage();
      }
    }

    // --- TOP HUD (Strictly passive display) ---
    renderTopHud() {
      const st = this.store.getState();
      const c = st.currencies;
      clearNode(this.dom.topHud);

      const rankBox = el('div', { class: 'hud-rank' }, [
        el('span', { class: 'hud-rank-badge', text: `R.${st.commanderRank}` }),
        el('span', { text: `戦力 ${fmtNum(this.store.computePartyPower())}` })
      ]);

      const curBox = el('div', { class: 'hud-currencies' }, [
        el('div', { class: 'hud-cur' }, [
          el('span', { class: 'hud-cur-label', style: { color: '#e879f9' }, text: '星晶' }),
          el('span', { class: 'hud-cur-val', text: fmtNum(c.gems) })
        ]),
        el('div', { class: 'hud-cur' }, [
          el('span', { class: 'hud-cur-label', style: { color: '#fbbf24' }, text: '魂貨' }),
          el('span', { class: 'hud-cur-val', text: fmtNum(c.gold) })
        ]),
        el('div', { class: 'hud-cur' }, [
          el('span', { class: 'hud-cur-label', style: { color: '#38bdf8' }, text: '塵' }),
          el('span', { class: 'hud-cur-val', text: fmtNum(c.dust) })
        ]),
        el('div', { class: 'hud-cur' }, [
          el('span', { class: 'hud-cur-label', style: { color: '#34d399' }, text: '核' }),
          el('span', { class: 'hud-cur-val', text: fmtNum(c.cores) })
        ])
      ]);

      this.dom.topHud.append(rankBox, curBox);
    }

    // --- DIVIDER TICKER ---
    renderDivider() {
      const st = this.store.getState();
      const stage = this.battle.stage || Data.getStageById(st.progress.currentStageId);
      const speed = st.settings.speed;
      this.dom.divLeft.textContent = `${stage.code} ${st.settings.autoLoop ? `自動${speed}x` : `${speed}x`}`;
      this.dom.divCenter.textContent = this.battle.session.lastLootText || '境界回廊 展開中';
      this.dom.divRight.textContent = `周回 ${this.battle.session.loopsCompleted}`;
    }

    // --- TOP STAGE DISPATCH ---
    renderTopStage() {
      if (this.activeTab === 'battle') {
        this.dom.battleViewport.classList.remove('hidden');
        this.dom.inspectViewport.classList.add('hidden');
        this.renderBattleOverlay();
        this.battle.vfx.resize();
      } else {
        this.dom.battleViewport.classList.add('hidden');
        this.dom.inspectViewport.classList.remove('hidden');
        clearNode(this.dom.inspectViewport);
        if (this.activeTab === 'party') this.renderTopParty();
        else if (this.activeTab === 'summon') this.renderTopSummon();
        else if (this.activeTab === 'relics') this.renderTopRelics();
        else if (this.activeTab === 'records') this.renderTopRecords();
      }
    }

    renderBattleOverlay() {
      const st = this.store.getState();
      const b = this.battle;
      const stage = b.stage || Data.getStageById(st.progress.currentStageId);
      const realm = Data.REALMS[stage.realm] || Data.REALMS.astral;
      const syn = b.synergy || this.store.computePartySynergy();
      const tactic = Data.TACTICS[st.settings.tactic];

      clearNode(this.dom.battleOverlay);

      const topStrip = el('div', { class: 'battle-top-strip' }, [
        el('div', { class: 'stage-title-box', style: { borderLeftColor: realm.color } }, [
          el('div', { class: 'stage-code', style: { color: realm.color }, text: `${stage.code} [${realm.name}] WAVE ${b.waveIndex + 1}/${stage.waves.length}` }),
          el('div', { class: 'stage-name', text: stage.name })
        ]),
        el('div', { class: 'battle-meta-pills' }, [
          el('div', { class: 'meta-pill accent', text: `方針: ${tactic.name}` }),
          el('div', { class: 'meta-pill', text: `推奨 ${fmtNum(stage.powerRec)}` })
        ])
      ]);

      const synTags = syn.activeList.slice(0, 3).map((item) =>
        el('span', { class: 'syn-tag', style: { color: item.color, borderColor: item.color }, text: item.name })
      );
      if (synTags.length === 0) {
        synTags.push(el('span', { class: 'syn-tag', text: '単独編成' }));
      }

      const avgSec = b.session.loopsCompleted > 0
        ? (b.session.totalClearMs / b.session.loopsCompleted / 1000).toFixed(1) + '秒/周'
        : (b.state === 'fighting' ? '交戦中' : '待機中');

      const bottomStrip = el('div', { class: 'battle-bottom-strip' }, [
        el('div', { class: 'synergy-ribbon' }, synTags),
        el('div', { class: 'loop-pill', text: avgSec })
      ]);

      this.dom.battleOverlay.append(topStrip, bottomStrip);
    }

    // --- TOP: PARTY INSPECTOR (Display Only, includes all 4 skills + multipliers) ---
    renderTopParty() {
      const st = this.store.getState();
      const uid = this.selectedUnitId;
      const def = Data.UNIT_MAP[uid];
      const inst = st.units[uid];
      const calc = this.store.computeUnitStats(uid);
      if (!def || !inst || !calc) return;

      const realm = Data.REALMS[def.realm];
      const rar = Data.RARITIES[def.rarity];
      const role = Data.ROLES[def.role];
      const maxLv = this.store.getMaxLevelForStars(inst.stars);
      const syn = this.store.computePartySynergy();

      const basicMultPct = Math.round(def.basic.mult * (1 + (inst.skills.basic - 1) * 0.08) * 100);
      const skillMultTxt = def.skill.mult > 0
        ? `倍率${Math.round(def.skill.mult * (1 + (inst.skills.skill - 1) * 0.08) * 100)}% / ${def.skill.desc}`
        : def.skill.desc;
      const ultMultTxt = def.ult.mult > 0
        ? `倍率${Math.round(def.ult.mult * (1 + (inst.skills.ult - 1) * 0.08) * 100)}% / ${def.ult.desc}`
        : def.ult.desc;

      const headerCard = el('div', { class: 'inspect-card grow', style: { borderColor: rar.color } }, [
        el('div', { class: 'inspect-header' }, [
          el('div', { class: 'sigil-emblem', style: { color: realm.color, boxShadow: `0 0 12px ${rar.glow}` } }, [
            el('span', { text: def.sigil }),
            el('span', { class: 'sigil-sub', text: realm.code })
          ]),
          el('div', { class: 'inspect-title-col' }, [
            el('div', { class: 'inspect-kicker' }, [
              el('span', { style: { color: rar.color }, text: `[${rar.label}]` }),
              el('span', { style: { color: realm.color }, text: realm.name }),
              el('span', { text: `${role.name} Lv.${inst.level}/${maxLv} 凸${inst.lb} ★${inst.stars}` })
            ]),
            el('div', { class: 'inspect-name', text: `${def.name} — ${def.title}` })
          ]),
          el('div', { class: 'inspect-power' }, [
            el('div', { class: 'power-label', text: '戦力' }),
            el('div', { class: 'power-num', text: fmtNum(calc.power) })
          ])
        ]),
        el('div', { class: 'stat-grid' }, [
          el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: 'HP' }), el('span', { class: 'stat-v', text: fmtNum(calc.hp) })]),
          el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '攻撃' }), el('span', { class: 'stat-v', text: fmtNum(calc.atk) })]),
          el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '防御' }), el('span', { class: 'stat-v', text: fmtNum(calc.def) })]),
          el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '速度' }), el('span', { class: 'stat-v', text: String(calc.spd) })]),
          el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '会心率' }), el('span', { class: 'stat-v', text: `${calc.crit}%` })]),
          el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '会心倍' }), el('span', { class: 'stat-v', text: `${calc.cdmg}%` })])
        ]),
        el('div', { class: 'skill-brief-list' }, [
          el('div', { class: 'skill-brief' }, [
            el('span', { class: 'skill-badge', style: { background: 'rgba(56,189,248,0.22)', color: '#bae6fd' }, text: `通Lv${inst.skills.basic}` }),
            el('span', { class: 'skill-name', text: def.basic.name }),
            el('span', { class: 'skill-desc', text: `倍率${basicMultPct}% (${def.basic.hits || 1}連撃)` })
          ]),
          el('div', { class: 'skill-brief' }, [
            el('span', { class: 'skill-badge', text: `技Lv${inst.skills.skill}` }),
            el('span', { class: 'skill-name', text: def.skill.name }),
            el('span', { class: 'skill-desc', text: skillMultTxt })
          ]),
          el('div', { class: 'skill-brief' }, [
            el('span', { class: 'skill-badge', style: { background: 'rgba(245,158,11,0.25)', color: '#fde68a' }, text: `奥Lv${inst.skills.ult}` }),
            el('span', { class: 'skill-name', text: def.ult.name }),
            el('span', { class: 'skill-desc', text: ultMultTxt })
          ]),
          el('div', { class: 'skill-brief' }, [
            el('span', { class: 'skill-badge', style: { background: 'rgba(16,185,129,0.22)', color: '#6ee7b7' }, text: `固Lv${inst.skills.passive}` }),
            el('span', { class: 'skill-name', text: def.passive.name }),
            el('span', { class: 'skill-desc', text: def.passive.desc })
          ])
        ]),
        el('div', { class: 'inspect-kicker' }, [
          el('span', { text: `魂片:${inst.shards} / 遺物:${calc.equippedRelics.length}/4` }),
          ...calc.activeSets.map((as) =>
            el('span', { style: { color: as.color }, text: `[${as.name}×${as.pieces}]` })
          )
        ])
      ]);

      const partyMini = el('div', { class: 'party-strip-preview' }, [0, 1, 2, 3].map((idx) => {
        const pid = st.party[idx];
        if (!pid) {
          return el('div', { class: 'party-mini-slot' }, [el('span', { class: 'party-mini-lv', text: `枠${idx + 1}: 空` })]);
        }
        const pd = Data.UNIT_MAP[pid];
        const pi = st.units[pid];
        const pr = Data.REALMS[pd.realm];
        return el('div', { class: `party-mini-slot ${pid === uid ? 'active' : ''}`, style: { borderLeft: `2px solid ${pr.color}` } }, [
          el('span', { style: { color: pr.color, fontWeight: '900', fontSize: '12px' }, text: pd.sigil }),
          el('div', { class: 'party-mini-text' }, [
            el('div', { class: 'party-mini-name', text: pd.name }),
            el('div', { class: 'party-mini-lv', text: `Lv.${pi.level} 凸${pi.lb}` })
          ])
        ]);
      }));

      const synLine = el('div', { class: 'synergy-ribbon', style: { maxWidth: '100%' } },
        syn.activeList.length > 0
          ? syn.activeList.slice(0, 3).map((item) =>
              el('span', { class: 'syn-tag', style: { color: item.color, borderColor: item.color }, text: `${item.name} ${item.desc}` })
            )
          : [el('span', { class: 'syn-tag', text: '複数世界または同世界編成で共鳴発動' })]
      );

      this.dom.inspectViewport.append(headerCard, partyMini, synLine);
    }

    // --- TOP: SUMMON STAGE (Display Only) ---
    renderTopSummon() {
      const st = this.store.getState();
      const bannerId = st.gacha.banner;
      const realm = bannerId === 'all' ? null : Data.REALMS[bannerId];
      const accent = realm ? realm.color : '#e879f9';
      const title = realm ? `ピックアップ召喚：${realm.name}《${realm.worldName}》` : '境界交錯召喚：五界混在レゾナンス';
      const desc = realm ? `${realm.name}所属の英雄出現率が大幅上昇。` : '全五世界25英雄が等しく共鳴する標準召喚。';
      const pityRem = this.store.constants.HARD_PITY - st.gacha.pity;
      const pityPct = Math.min(100, (st.gacha.pity / this.store.constants.HARD_PITY) * 100);
      const results = st.gacha.lastResults || [];

      const wrap = el('div', { class: 'summon-stage-box' });

      const hero = el('div', { class: 'summon-banner-hero', style: { borderColor: accent } }, [
        el('div', { class: 'inspect-kicker' }, [
          el('span', { style: { color: accent }, text: realm ? `[${realm.kanji}] ${realm.code}` : '[五界] ALL' }),
          el('span', { text: 'UR 3% / SSR 12% / SR 35% / 10連SR以上確定' })
        ]),
        el('div', { class: 'inspect-name', style: { marginTop: '2px' }, text: title }),
        el('div', { class: 'item-row-sub', text: desc })
      ]);

      wrap.appendChild(hero);

      if (results.length > 0) {
        const grid = el('div', { class: `summon-results-grid ${results.length === 1 ? 'single' : ''}` }, results.map((r) => {
          const ud = Data.UNIT_MAP[r.unitId];
          const rm = Data.REALMS[ud.realm];
          const ra = Data.RARITIES[r.rarity];
          return el('div', { class: `summon-card ${r.rarity.toLowerCase()}`, style: { borderColor: ra.color } }, [
            el('div', { class: 'summon-rar', style: { color: ra.color }, text: r.rarity }),
            el('div', { class: 'summon-sigil', style: { color: rm.color }, text: ud.sigil }),
            el('div', { class: 'summon-uname', text: ud.name }),
            el('div', { class: 'summon-bonus', style: { color: r.isNew ? '#fde047' : '#67e8f9' }, text: r.isNew ? 'NEW!' : r.bonusText })
          ]);
        }));
        wrap.appendChild(grid);
      } else {
        const urList = Data.UNITS.filter((u) => u.rarity === 'UR' && (bannerId === 'all' || u.realm === bannerId));
        const preview = el('div', { class: 'inspect-card grow' }, [
          el('div', { class: 'inspect-kicker', text: '注目UR英雄（天井または境界結晶50で確定契約）' }),
          ...urList.slice(0, 4).map((u) => {
            const rm = Data.REALMS[u.realm];
            return el('div', { class: 'skill-brief' }, [
              el('span', { class: 'skill-badge', style: { color: rm.color, background: rm.colorSoft }, text: `${rm.kanji} UR` }),
              el('span', { class: 'skill-name', text: u.name }),
              el('span', { class: 'skill-desc', text: `${u.title} / 奥義:${u.ult.name}` })
            ]);
          })
        ]);
        wrap.appendChild(preview);
      }

      const pityBox = el('div', { class: 'pity-bar-wrap' }, [
        el('div', { class: 'pity-bar-head' }, [
          el('span', { text: `UR確定天井まで あと ${pityRem} 回（35連以降確率上昇）` }),
          el('span', { style: { color: '#e879f9' }, text: `境界結晶 ${st.currencies.mileage}/${this.store.constants.MILEAGE_UR_COST}` })
        ]),
        el('div', { class: 'bar-track' }, [
          el('div', { class: 'bar-fill', style: { width: `${pityPct}%` } })
        ])
      ]);
      wrap.appendChild(pityBox);

      this.dom.inspectViewport.appendChild(wrap);
    }

    // --- TOP: RELIC INSPECTOR + EQUIP COMPARISON (Zero Dead Space) ---
    renderTopRelics() {
      const st = this.store.getState();
      const rel = st.relics.find((r) => r.id === this.selectedRelicId);
      const heroId = this.selectedUnitId;
      const heroDef = Data.UNIT_MAP[heroId];
      const heroInst = st.units[heroId];

      if (!rel) {
        this.dom.inspectViewport.appendChild(
          el('div', { class: 'inspect-card grow' }, [
            el('div', { class: 'inspect-name', text: '遺物が未選択です' }),
            el('div', { class: 'item-row-sub', text: '戦闘周回や鍛造でランダム能力付きの遺物を獲得できます。' })
          ])
        );
        return;
      }

      const rMeta = Data.RELIC_RARITIES[rel.rarity];
      const sDef = Data.RELIC_SETS[rel.setId];
      const slotMeta = Data.RELIC_SLOTS[rel.slot];
      const mainVal = Data.getRelicMainValue(rel);
      const score = Data.getRelicScore(rel);
      const owner = rel.equippedBy ? Data.UNIT_MAP[rel.equippedBy]?.name : '未装備';

      const card = el('div', { class: 'inspect-card', style: { borderColor: rMeta.color } }, [
        el('div', { class: 'inspect-header' }, [
          el('div', { class: 'sigil-emblem', style: { color: rMeta.color } }, [
            el('span', { text: slotMeta.short }),
            el('span', { class: 'sigil-sub', text: `+${rel.level}` })
          ]),
          el('div', { class: 'inspect-title-col' }, [
            el('div', { class: 'inspect-kicker' }, [
              el('span', { style: { color: rMeta.color }, text: `[${rMeta.name}・T${rel.tier}]` }),
              el('span', { style: { color: sDef.color }, text: sDef.name }),
              el('span', { text: rel.locked ? '保護中' : '未保護' }),
              el('span', { text: `装着: ${owner}` })
            ]),
            el('div', { class: 'inspect-name', text: `${sDef.name}の${slotMeta.name} +${rel.level}/${rMeta.maxLv}` })
          ]),
          el('div', { class: 'inspect-power' }, [
            el('div', { class: 'power-label', text: '評価' }),
            el('div', { class: 'power-num', text: String(score) })
          ])
        ]),
        el('div', { class: 'stat-box', style: { borderColor: rMeta.color, padding: '4px 8px' } }, [
          el('span', { class: 'stat-k', style: { color: rMeta.color }, text: `主能力: ${Data.STAT_META[rel.main.stat].name}` }),
          el('span', { class: 'stat-v', style: { fontSize: '12.5px', color: '#fde68a' }, text: Data.formatStatValue(rel.main.stat, mainVal) })
        ]),
        el('div', { class: 'substat-list' }, rel.subs.map((s) =>
          el('div', { class: 'substat-row' }, [
            el('span', { class: `grade-badge grade-${s.grade}`, text: s.grade }),
            el('span', { style: { flex: 1, color: '#cbd5e1', fontWeight: '700' }, text: Data.STAT_META[s.stat].name }),
            el('span', { style: { fontWeight: '800' }, text: Data.formatStatValue(s.stat, s.val) })
          ])
        )),
        el('div', { class: 'skill-brief' }, [
          el('span', { class: 'skill-badge', style: { color: sDef.color }, text: '2組/4組' }),
          el('span', { class: 'skill-desc', text: `${sDef.two.desc} ／ ${sDef.four.desc}` })
        ])
      ]);

      // Comparison against selected hero's currently equipped relic in same slot
      const curEquipId = heroInst?.relics?.[rel.slot];
      const curEquip = curEquipId ? st.relics.find((x) => x.id === curEquipId) : null;
      const curScore = curEquip ? Data.getRelicScore(curEquip) : 0;
      const diffScore = score - curScore;
      const diffClass = diffScore > 0 ? 'diff-pos' : diffScore < 0 ? 'diff-neg' : 'diff-eq';
      const diffText = curEquip && curEquip.id === rel.id
        ? '現在この英雄が装着中'
        : `評価差 ${diffScore >= 0 ? '+' : ''}${diffScore} (${curEquip ? `${Data.RELIC_SETS[curEquip.setId].name}+${curEquip.level}` : '空きスロット'})`;

      const slotStrip = el('div', { class: 'slot-mini-strip' }, Data.RELIC_SLOT_LIST.map((sl) => {
        const rid = heroInst?.relics?.[sl.id];
        const eq = rid ? st.relics.find((x) => x.id === rid) : null;
        const col = eq ? Data.RELIC_RARITIES[eq.rarity].color : '#64748b';
        return el('div', {
          class: 'slot-mini-pill',
          style: { borderColor: sl.id === rel.slot ? '#06b6d4' : col, color: col },
          text: eq ? `${sl.short}:${Data.RELIC_RARITIES[eq.rarity].name}+${eq.level}` : `${sl.short}:空`
        });
      }));

      const compareCard = el('div', { class: 'compare-box' }, [
        el('div', { class: 'inspect-kicker', style: { justifyContent: 'space-between' } }, [
          el('span', { text: `装着対象: ${heroDef ? heroDef.name : '—'} (${slotMeta.name}比較)` }),
          el('span', { class: diffClass, text: diffText })
        ]),
        slotStrip
      ]);

      this.dom.inspectViewport.append(card, compareCard);
    }

    // --- TOP: RECORDS / CODEX / STATS / SETTINGS (Full Info Density) ---
    renderTopRecords() {
      const st = this.store.getState();
      const sub = this.subTab.records;

      if (sub === 'ach') {
        const claimable = this.store.getClaimableAchievements();
        const claimedCount = Data.ACHIEVEMENTS.filter((a) => st.achievementsClaimed[a.id]).length;
        const achievedCount = Data.ACHIEVEMENTS.filter((a) => st.achievementsClaimed[a.id] || this.store.getAchievementProgress(a) >= a.target).length;
        const sel = Data.ACHIEVEMENTS.find((a) => a.id === this.selectedAchId) || Data.ACHIEVEMENTS[0];
        const prog = this.store.getAchievementProgress(sel);
        const pct = Math.min(100, (prog / sel.target) * 100);

        const rwParts = [];
        if (sel.reward.gems) rwParts.push(`星晶+${sel.reward.gems}`);
        if (sel.reward.gold) rwParts.push(`魂貨+${sel.reward.gold}`);
        if (sel.reward.exp) rwParts.push(`記憶結晶+${sel.reward.exp}`);
        if (sel.reward.dust) rwParts.push(`遺物塵+${sel.reward.dust}`);
        if (sel.reward.cores) rwParts.push(`覚醒核+${sel.reward.cores}`);

        // Pick top 3 closest unachieved goals
        const nearList = Data.ACHIEVEMENTS
          .filter((a) => !st.achievementsClaimed[a.id] && this.store.getAchievementProgress(a) < a.target)
          .map((a) => ({ a, p: this.store.getAchievementProgress(a), ratio: this.store.getAchievementProgress(a) / a.target }))
          .sort((x, y) => y.ratio - x.ratio)
          .slice(0, 3);

        this.dom.inspectViewport.append(
          el('div', { class: 'inspect-card' }, [
            el('div', { class: 'inspect-kicker', style: { justifyContent: 'space-between' } }, [
              el('span', { style: { color: '#fbbf24' }, text: `達成 ${achievedCount}/${Data.ACHIEVEMENTS.length}（受取済 ${claimedCount}）` }),
              el('span', { style: { color: claimable.length ? '#fb7185' : '#94a3b8' }, text: `未受取 ${claimable.length}件` })
            ]),
            el('div', { class: 'inspect-name', text: `[${sel.cat}] ${sel.title}` }),
            el('div', { class: 'item-row-sub', text: sel.desc }),
            el('div', { class: 'pity-bar-wrap' }, [
              el('div', { class: 'pity-bar-head' }, [
                el('span', { text: `進捗 ${fmtNum(Math.min(prog, sel.target))} / ${fmtNum(sel.target)}` }),
                el('span', { style: { color: '#34d399' }, text: st.achievementsClaimed[sel.id] ? '受取済' : (prog >= sel.target ? '達成!' : `${Math.floor(pct)}%`) })
              ]),
              el('div', { class: 'bar-track' }, [el('div', { class: 'bar-fill', style: { width: `${pct}%` } })])
            ]),
            el('div', { class: 'stat-box', style: { marginTop: '2px' } }, [
              el('span', { class: 'stat-k', text: '達成報酬' }),
              el('span', { class: 'stat-v', style: { color: '#fde68a' }, text: rwParts.join(' / ') })
            ])
          ]),
          el('div', { class: 'inspect-card grow' }, [
            el('div', { class: 'inspect-kicker', text: '達成間近の目標ピックアップ' }),
            el('div', { class: 'near-ach-list' },
              nearList.length > 0
                ? nearList.map((item) => el('div', { class: 'near-ach-row' }, [
                    el('div', { class: 'near-ach-head' }, [
                      el('span', { text: item.a.title }),
                      el('span', { text: `${fmtNum(item.p)}/${fmtNum(item.a.target)} (${Math.floor(item.ratio * 100)}%)` })
                    ]),
                    el('div', { class: 'bar-track thin' }, [el('div', { class: 'bar-fill', style: { width: `${Math.min(100, item.ratio * 100)}%` } })])
                  ]))
                : [el('div', { class: 'item-row-sub', text: 'すべての実績条件を達成しました!' })]
            )
          ])
        );
      } else if (sub === 'codex') {
        const cb = Data.computeCodexBonuses(st);
        const u = Data.UNIT_MAP[this.selectedCodexUnitId] || Data.UNITS[0];
        const owned = Boolean(st.units[u.id]);
        const rm = Data.REALMS[u.realm];
        const ra = Data.RARITIES[u.rarity];

        this.dom.inspectViewport.append(
          el('div', { class: 'inspect-card' }, [
            el('div', { class: 'inspect-kicker', text: '図鑑収集ボーナス（全英雄に永続適用）' }),
            el('div', { class: 'stat-grid' }, [
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '英雄' }), el('span', { class: 'stat-v', text: `${cb.unitCount}/${Data.UNITS.length}` })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '遺物組' }), el('span', { class: 'stat-v', text: `${cb.setCount}/${Data.RELIC_SET_LIST.length}` })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '討伐種' }), el('span', { class: 'stat-v', text: `${cb.enemyCount}種` })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '攻撃' }), el('span', { class: 'stat-v', style: { color: '#fde68a' }, text: `+${cb.atkPct.toFixed(1)}%` })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: 'HP' }), el('span', { class: 'stat-v', style: { color: '#6ee7b7' }, text: `+${cb.hpPct.toFixed(1)}%` })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '獲得率' }), el('span', { class: 'stat-v', style: { color: '#67e8f9' }, text: `+${cb.dropPct}%` })])
            ])
          ]),
          el('div', { class: 'inspect-card grow', style: { borderColor: owned ? ra.color : 'rgba(148,163,184,0.28)' } }, [
            el('div', { class: 'inspect-kicker' }, [
              el('span', { style: { color: ra.color }, text: `[${ra.label}]` }),
              el('span', { style: { color: rm.color }, text: `${rm.name}《${rm.worldName}》` }),
              el('span', { text: owned ? '契約済' : '未観測' })
            ]),
            el('div', { class: 'inspect-name', text: `${u.name} — ${u.title}` }),
            el('div', { class: 'modal-display-desc', text: owned ? u.lore : '境界回廊の召喚にて観測することで伝承記録が解放されます。' }),
            el('div', { class: 'skill-brief' }, [
              el('span', { class: 'skill-badge', text: '奥義' }),
              el('span', { class: 'skill-name', text: u.ult.name }),
              el('span', { class: 'skill-desc', text: u.ult.desc })
            ]),
            el('div', { class: 'skill-brief' }, [
              el('span', { class: 'skill-badge', style: { background: 'rgba(16,185,129,0.22)', color: '#6ee7b7' }, text: '固有' }),
              el('span', { class: 'skill-name', text: u.passive.name }),
              el('span', { class: 'skill-desc', text: u.passive.desc })
            ])
          ])
        );
      } else if (sub === 'stats') {
        const s = st.stats;
        const ses = this.battle.session;
        const avgSec = ses.loopsCompleted > 0 ? (ses.totalClearMs / ses.loopsCompleted / 1000).toFixed(1) + '秒' : '—';
        const fastSec = s.fastestClearMs > 0 ? (s.fastestClearMs / 1000).toFixed(2) + '秒' : '—';
        const mins = Math.floor(s.totalPlaySec / 60);
        const elapsedHr = Math.max(1 / 120, (Date.now() - ses.startedAt) / 3600000);
        const goldPerHr = ses.loopsCompleted > 0 ? Math.round(ses.goldEarned / elapsedHr) : 0;
        const gemsPerHr = ses.loopsCompleted > 0 ? Math.round(ses.gemsEarned / elapsedHr) : 0;
        const dustPerHr = ses.loopsCompleted > 0 ? Math.round(ses.dustEarned / elapsedHr) : 0;

        this.dom.inspectViewport.append(
          el('div', { class: 'inspect-card' }, [
            el('div', { class: 'inspect-name', text: '観測戦歴・累計記録' }),
            el('div', { class: 'stat-grid' }, [
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '総勝利' }), el('span', { class: 'stat-v', text: fmtNum(s.totalWins) })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '総討伐' }), el('span', { class: 'stat-v', text: fmtNum(s.totalKills) })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '最大撃' }), el('span', { class: 'stat-v', style: { color: '#fde68a' }, text: fmtNum(s.maxHitDamage) })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '最速' }), el('span', { class: 'stat-v', text: fastSec })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '平均周回' }), el('span', { class: 'stat-v', text: avgSec })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '最高回廊' }), el('span', { class: 'stat-v', text: `${st.progress.maxCorridorFloor}F` })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '総召喚' }), el('span', { class: 'stat-v', text: fmtNum(s.totalSummons) })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '発掘数' }), el('span', { class: 'stat-v', text: fmtNum(s.totalRelicsFound) })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '累計時間' }), el('span', { class: 'stat-v', text: `${mins}分` })])
            ])
          ]),
          el('div', { class: 'inspect-card grow' }, [
            el('div', { class: 'inspect-kicker', style: { justifyContent: 'space-between' } }, [
              el('span', { style: { color: '#67e8f9' }, text: `現在周回効率 (${ses.loopsCompleted}周集計)` }),
              el('span', { style: { color: '#34d399' }, text: '記録署名: 正常検証済' })
            ]),
            el('div', { class: 'stat-grid' }, [
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '魂貨/時' }), el('span', { class: 'stat-v', style: { color: '#fbbf24' }, text: fmtNum(goldPerHr) })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '星晶/時' }), el('span', { class: 'stat-v', style: { color: '#e879f9' }, text: fmtNum(gemsPerHr) })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '塵/時' }), el('span', { class: 'stat-v', style: { color: '#38bdf8' }, text: fmtNum(dustPerHr) })])
            ]),
            el('div', { class: 'slot-mini-strip', style: { gridTemplateColumns: 'repeat(5, 1fr)' } }, [1, 2, 3, 4, 5].map((rk) =>
              el('div', {
                class: 'slot-mini-pill',
                style: { color: Data.RELIC_RARITIES[rk].color, borderColor: Data.RELIC_RARITIES[rk].color },
                text: `${Data.RELIC_RARITIES[rk].name}:${ses.relicsByRarity[rk] || 0}`
              })
            )),
            el('div', { class: 'inspect-kicker' }, [
              el('span', { text: `時刻保護: 有効 (異常検知 ${s.clockAnomalies}件 / 復旧 ${s.tamperRecoveries}回)` })
            ])
          ])
        );
      } else {
        const cfg = st.settings;
        const unequipped = st.relics.filter((r) => !r.equippedBy).length;
        const capPct = Math.min(100, Math.round((unequipped / this.store.constants.MAX_RELICS) * 100));

        this.dom.inspectViewport.append(
          el('div', { class: 'inspect-card' }, [
            el('div', { class: 'inspect-name', text: '環境設定・操作設定' }),
            el('div', { class: 'stat-grid' }, [
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '効果音' }), el('span', { class: 'stat-v', text: cfg.soundEnabled ? `${Math.round(cfg.soundVolume * 100)}%` : 'OFF' })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '操作手' }), el('span', { class: 'stat-v', text: cfg.handMode === 'left' ? '左手系' : '右手系' })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '配色' }), el('span', { class: 'stat-v', text: cfg.contrastMode === 'high' ? '高対比' : '標準' })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '演出' }), el('span', { class: 'stat-v', text: cfg.motionMode === 'reduced' ? '抑制' : '標準' })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '敗北再戦' }), el('span', { class: 'stat-v', text: cfg.retryOnDefeat ? '自動' : '停止' })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '自動分解' }), el('span', { class: 'stat-v', text: cfg.autoSalvageRank ? `${Data.RELIC_RARITIES[cfg.autoSalvageRank].name}以下` : 'OFF' })])
            ])
          ]),
          el('div', { class: 'inspect-card grow' }, [
            el('div', { class: 'inspect-kicker', style: { justifyContent: 'space-between' } }, [
              el('span', { text: '記録保全・保管庫ステータス' }),
              el('span', { style: { color: '#34d399' }, text: 'HMAC署名・二重保管 有効' })
            ]),
            el('div', { class: 'pity-bar-wrap' }, [
              el('div', { class: 'pity-bar-head' }, [
                el('span', { text: `未装着遺物の保管枠 (${unequipped} / ${this.store.constants.MAX_RELICS})` }),
                el('span', { text: `${capPct}%` })
              ]),
              el('div', { class: 'bar-track' }, [el('div', { class: 'bar-fill', style: { width: `${capPct}%` } })])
            ]),
            el('div', { class: 'item-row-sub', style: { marginTop: '4px' }, text: '記録コードの書き出し・復元・環境切替は下の操作欄から実行できます。' })
          ])
        );
      }
    }

    // =========================================================
    // BOTTOM HALF CONTROL HUB (Preserves scroll position on item tap)
    // =========================================================
    renderBottomPanel(preserveScroll) {
      let prevScrollTop = 0;
      if (preserveScroll) {
        const sc = this.dom.bottomPanel.querySelector('.scroll-list, .scroll-grid');
        if (sc) prevScrollTop = sc.scrollTop;
      }

      clearNode(this.dom.bottomPanel);
      if (this.activeTab === 'battle') this.renderBottomBattle();
      else if (this.activeTab === 'party') this.renderBottomParty();
      else if (this.activeTab === 'summon') this.renderBottomSummon();
      else if (this.activeTab === 'relics') this.renderBottomRelics();
      else if (this.activeTab === 'records') this.renderBottomRecords();

      if (preserveScroll && prevScrollTop > 0) {
        const scNew = this.dom.bottomPanel.querySelector('.scroll-list, .scroll-grid');
        if (scNew) scNew.scrollTop = prevScrollTop;
      }
    }

    // --- BOTTOM: BATTLE CONTROLS ---
    renderBottomBattle() {
      const st = this.store.getState();
      const sub = this.subTab.battle;
      const curStage = this.battle.stage || Data.getStageById(st.progress.currentStageId);
      const canSweep = (st.progress.clearedStages[curStage.id] || 0) >= 3 && !curStage.isCorridor;

      const quickBar = el('div', { class: 'action-row hand-cta' }, [
        el('button', {
          class: 'btn sm',
          onClick: () => {
            const next = st.settings.speed === 1 ? 2 : st.settings.speed === 2 ? 4 : 1;
            this.store.updateSetting('speed', next);
            Kairo.audio.play('tap');
          }
        }, [el('span', { text: `速度 ${st.settings.speed}x` })]),
        el('button', {
          class: `btn sm ${st.settings.autoLoop ? 'active-toggle' : ''}`,
          onClick: () => {
            this.store.updateSetting('autoLoop', !st.settings.autoLoop);
            Kairo.audio.play('tap');
            if (this.battle.state === 'idle' && st.settings.autoLoop) this.battle.startStage(curStage.id);
          }
        }, [el('span', { text: st.settings.autoLoop ? '自動周回 ON' : '自動周回 OFF' })]),
        el('button', {
          class: 'btn sm gold',
          disabled: !canSweep,
          onClick: () => {
            const res = this.store.sweepStage(curStage.id, 10);
            if (res.ok) {
              this.showToast(`10連掃討完了: 魂貨+${fmtNum(res.gold)} / 星晶+${res.gems} / 遺物+${res.kept}`);
              this.renderAll();
            } else {
              this.showToast(res.msg);
            }
          }
        }, [
          el('span', { text: '10連掃討' }),
          !canSweep ? el('span', { class: 'btn-sub', text: '★3で解放' }) : null
        ]),
        el('button', {
          class: 'btn sm primary',
          onClick: () => {
            Kairo.audio.play('confirm');
            this.battle.startStage(curStage.id);
          }
        }, [el('span', { text: '再出撃' })])
      ]);

      const subBar = el('div', { class: 'subtab-bar' }, [
        { id: 'campaign', label: '境界領域' },
        { id: 'boss', label: '次元討伐' },
        { id: 'corridor', label: '無限回廊' },
        { id: 'tactics', label: '作戦方針' }
      ].map((t) => el('button', {
        class: `subtab-btn ${sub === t.id ? 'active' : ''}`,
        text: t.label,
        onClick: () => { this.subTab.battle = t.id; Kairo.audio.play('tap'); this.renderBottomPanel(false); }
      })));

      const list = el('div', { class: 'scroll-list' });

      if (sub === 'campaign') {
        Data.CAMPAIGN_STAGES.forEach((s, idx) => {
          const prev = idx === 0 ? null : Data.CAMPAIGN_STAGES[idx - 1];
          const unlocked = idx === 0 || Boolean(st.progress.clearedStages[prev.id]);
          const stars = st.progress.clearedStages[s.id] || 0;
          const rm = Data.REALMS[s.realm];
          const setsTxt = s.relicSets.map((sid) => Data.RELIC_SETS[sid]?.name).join('・');
          list.appendChild(el('button', {
            class: `item-row ${curStage.id === s.id ? 'selected' : ''}`,
            disabled: !unlocked,
            onClick: () => {
              this.store.setStage(s.id);
              this.battle.startStage(s.id);
              Kairo.audio.play('confirm');
              this.renderAll();
            }
          }, [
            el('div', { class: 'item-row-left' }, [
              el('div', { class: 'sigil-emblem sm', style: { color: rm.color } }, [el('span', { text: rm.kanji })]),
              el('div', { class: 'item-row-text' }, [
                el('div', { class: 'item-row-title', text: `${s.code} ${s.name}` }),
                el('div', { class: 'item-row-sub', text: unlocked ? `推奨${fmtNum(s.powerRec)} / 遺物: ${setsTxt}` : `「${prev.code}」クリアで解放` })
              ])
            ]),
            el('div', { class: 'item-row-right' }, [
              el('span', { style: { color: stars === 3 ? '#fbbf24' : '#94a3b8' }, text: stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : (unlocked ? '未踏破' : '封鎖') }),
              el('span', { class: 'item-row-sub', text: `星晶+${s.rewards.gemLoop}` })
            ])
          ]));
        });
      } else if (sub === 'boss') {
        Data.BOSS_RAIDS.forEach((b) => {
          const rm = Data.REALMS[b.realm];
          const stars = st.progress.clearedStages[b.id] || 0;
          list.appendChild(el('button', {
            class: `item-row ${curStage.id === b.id ? 'selected' : ''}`,
            onClick: () => {
              this.store.setStage(b.id);
              this.battle.startStage(b.id);
              Kairo.audio.play('confirm');
              this.renderAll();
            }
          }, [
            el('div', { class: 'item-row-left' }, [
              el('div', { class: 'sigil-emblem sm', style: { color: rm.color } }, [el('span', { text: '討' })]),
              el('div', { class: 'item-row-text' }, [
                el('div', { class: 'item-row-title', text: `${b.code} ${b.name}` }),
                el('div', { class: 'item-row-sub', text: b.gimmick })
              ])
            ]),
            el('div', { class: 'item-row-right' }, [
              el('span', { style: { color: '#e879f9' }, text: `推奨${fmtNum(b.powerRec)}` }),
              el('span', { class: 'item-row-sub', text: stars ? '★'.repeat(stars) : '高純度遺物・核' })
            ])
          ]));
        });
      } else if (sub === 'corridor') {
        const maxF = st.progress.maxCorridorFloor;
        const nextF = maxF + 1;
        const nextStage = Data.generateCorridorStage(nextF);
        list.append(
          el('div', { class: 'item-row' }, [
            el('div', { class: 'item-row-text' }, [
              el('div', { class: 'item-row-title', text: `最高到達: 第${maxF}層 （全軍永続攻撃 +${Math.min(60, Math.floor(maxF * 1.5))}%）` }),
              el('div', { class: 'item-row-sub', text: `次層: ${nextStage.name} / 推奨戦力 ${fmtNum(nextStage.powerRec)}` })
            ])
          ]),
          el('div', { class: 'action-row hand-cta' }, [
            el('button', {
              class: 'btn rainbow',
              onClick: () => {
                const sid = `corridor_${nextF}`;
                this.store.setStage(sid);
                this.battle.startStage(sid);
                Kairo.audio.play('confirm');
                this.renderAll();
              }
            }, [
              el('span', { text: `第${nextF}層へ出撃` }),
              el('span', { class: 'btn-sub', text: '勝利で自動的に次層へ連戦' })
            ]),
            maxF >= 5 ? el('button', {
              class: 'btn',
              onClick: () => {
                const farmF = Math.floor(maxF / 5) * 5;
                const sid = `corridor_${farmF}`;
                this.store.setStage(sid);
                this.battle.startStage(sid);
                Kairo.audio.play('confirm');
                this.renderAll();
              }
            }, [
              el('span', { text: `第${Math.floor(maxF / 5) * 5}層ボス周回` }),
              el('span', { class: 'btn-sub', text: '高レア遺物・核狙い' })
            ]) : null
          ])
        );
      } else {
        Object.values(Data.TACTICS).forEach((tac) => {
          list.appendChild(el('button', {
            class: `item-row ${st.settings.tactic === tac.id ? 'selected' : ''}`,
            onClick: () => {
              this.store.updateSetting('tactic', tac.id);
              Kairo.audio.play('confirm');
              this.showToast(`作戦を「${tac.name}」へ切替えました`);
            }
          }, [
            el('div', { class: 'item-row-text' }, [
              el('div', { class: 'item-row-title', text: tac.name }),
              el('div', { class: 'item-row-sub', text: tac.desc })
            ]),
            el('div', { class: 'item-row-right' }, [
              el('span', { class: `badge ${st.settings.tactic === tac.id ? 'in-party' : ''}`, text: st.settings.tactic === tac.id ? '適用中' : '選択' })
            ])
          ]));
        });
      }

      this.dom.bottomPanel.append(quickBar, subBar, list);
    }

    // --- BOTTOM: PARTY & GROWTH CONTROLS ---
    renderBottomParty() {
      const st = this.store.getState();
      const sub = this.subTab.party;
      const uid = this.selectedUnitId;
      const def = Data.UNIT_MAP[uid];
      const inst = st.units[uid];

      const subBar = el('div', { class: 'subtab-bar' }, [
        { id: 'roster', label: '編成・一覧' },
        { id: 'grow', label: '強化・覚醒' },
        { id: 'skills', label: 'スキル鍛錬' }
      ].map((t) => el('button', {
        class: `subtab-btn ${sub === t.id ? 'active' : ''}`,
        text: t.label,
        onClick: () => { this.subTab.party = t.id; Kairo.audio.play('tap'); this.renderBottomPanel(false); }
      })));

      this.dom.bottomPanel.appendChild(subBar);

      if (sub === 'roster') {
        const filterRow = el('div', { class: 'banner-grid' }, [
          { id: 'all', label: '全界' },
          ...Data.REALM_LIST.map((r) => ({ id: r.id, label: r.name }))
        ].map((f) => el('button', {
          class: `banner-chip ${this.partyRealmFilter === f.id ? 'active' : ''}`,
          text: f.label,
          onClick: () => { this.partyRealmFilter = f.id; Kairo.audio.play('tap'); this.renderBottomPanel(false); }
        })));

        const ownedIds = Object.keys(st.units).filter((id) =>
          this.partyRealmFilter === 'all' || Data.UNIT_MAP[id].realm === this.partyRealmFilter
        );
        ownedIds.sort((a, b) => {
          const inA = st.party.includes(a) ? 1 : 0;
          const inB = st.party.includes(b) ? 1 : 0;
          if (inA !== inB) return inB - inA;
          return this.store.computeUnitStats(b).power - this.store.computeUnitStats(a).power;
        });

        const grid = el('div', { class: 'scroll-grid' }, ownedIds.map((id) => {
          const ud = Data.UNIT_MAP[id];
          const ui = st.units[id];
          const rm = Data.REALMS[ud.realm];
          const ra = Data.RARITIES[ud.rarity];
          const inParty = st.party.includes(id);
          return el('button', {
            class: `unit-tile ${id === uid ? 'selected' : ''}`,
            onClick: () => {
              this.selectedUnitId = id;
              Kairo.audio.play('tap');
              this.renderTopStage();
              this.renderBottomPanel(true);
            }
          }, [
            el('div', { class: 'sigil-emblem sm', style: { color: rm.color, borderColor: ra.color } }, [el('span', { text: ud.sigil })]),
            el('div', { class: 'item-row-text' }, [
              el('div', { class: 'item-row-title', text: ud.name }),
              el('div', { class: 'item-row-sub', text: `${ra.label} Lv.${ui.level} 凸${ui.lb}` })
            ]),
            inParty ? el('span', { class: 'badge in-party', text: '出撃' }) : null
          ]);
        }));

        const inParty = st.party.includes(uid);
        const actions = el('div', { class: 'action-row hand-cta' }, [
          el('button', {
            class: 'btn sm',
            onClick: () => {
              this.store.autoAssembleParty();
              this.battle.startStage();
              this.showToast('最適パーティを自動編成しました');
            }
          }, [el('span', { text: 'おまかせ編成' })]),
          el('button', {
            class: 'btn sm gold',
            onClick: () => {
              const res = this.store.autoEquipUnit(uid);
              if (res.ok) this.showToast(`${def.name}へ最適遺物を装着しました`);
            }
          }, [el('span', { text: '最適遺物装着' })]),
          el('button', {
            class: `btn sm ${inParty ? 'danger' : 'primary'}`,
            onClick: () => {
              const res = this.store.togglePartyMember(uid);
              if (res.ok) this.battle.startStage();
              else if (res.msg) this.showToast(res.msg);
            }
          }, [el('span', { text: inParty ? '編成から外す' : 'パーティ出撃' })])
        ]);

        this.dom.bottomPanel.append(filterRow, grid, actions);
      } else if (sub === 'grow') {
        const maxLv = this.store.getMaxLevelForStars(inst.stars);
        const pv1 = this.store.previewLevelUp(uid, 1);
        const pv10 = this.store.previewLevelUp(uid, 10);
        const pvMax = this.store.previewLevelUp(uid, 'max');
        const lbCost = this.store.getLimitBreakShardCost(inst.lb);
        const awkCost = this.store.getAwakenCost(inst.stars);
        const maxStars = Data.RARITIES[def.rarity].maxStars;

        const list = el('div', { class: 'scroll-list' }, [
          el('div', { class: 'item-row' }, [
            el('div', { class: 'item-row-text' }, [
              el('div', { class: 'item-row-title', text: `記憶結晶 保有: ${fmtNum(st.currencies.expPool)}` }),
              el('div', { class: 'item-row-sub', text: inst.level >= maxLv ? '上限到達（覚醒で上限+16）' : `次Lv費用: 晶${fmtNum(pv1.exp)} / 貨${fmtNum(pv1.gold)}` })
            ]),
            el('div', { class: 'item-row-right', text: `Lv.${inst.level}/${maxLv}` })
          ]),
          el('div', { class: 'action-row hand-cta' }, [
            el('button', {
              class: 'btn primary',
              disabled: inst.level >= maxLv || !pv1.canAfford,
              onClick: () => {
                const r = this.store.levelUpUnit(uid, 1);
                if (!r.ok) this.showToast(r.msg);
              }
            }, [
              el('span', { text: 'Lv+1' }),
              el('span', { class: 'btn-sub', text: inst.level >= maxLv ? '上限' : `晶${fmtNum(pv1.exp)}・貨${fmtNum(pv1.gold)}` })
            ]),
            el('button', {
              class: 'btn primary',
              disabled: inst.level >= maxLv || !pv10.canAfford,
              onClick: () => {
                const r = this.store.levelUpUnit(uid, 10);
                if (r.ok) this.showToast(`Lv.${r.level}へ強化しました (+${r.gained})`);
                else this.showToast(r.msg);
              }
            }, [
              el('span', { text: pv10.gained > 0 ? `Lv+${pv10.gained} (→${pv10.targetLevel})` : 'Lv+10' }),
              el('span', { class: 'btn-sub', text: pv10.gained > 0 ? `晶${fmtNum(pv10.exp)}・貨${fmtNum(pv10.gold)}` : '素材不足' })
            ]),
            el('button', {
              class: 'btn gold',
              disabled: inst.level >= maxLv || !pvMax.canAfford,
              onClick: () => {
                const r = this.store.levelUpUnit(uid, 'max');
                if (r.ok) this.showToast(`Lv.${r.level}まで最大強化 (+${r.gained})`);
                else this.showToast(r.msg);
              }
            }, [
              el('span', { text: pvMax.gained > 0 ? `最大 (→${pvMax.targetLevel})` : '最大強化' }),
              el('span', { class: 'btn-sub', text: pvMax.gained > 0 ? `晶${fmtNum(pvMax.exp)}・貨${fmtNum(pvMax.gold)}` : '素材不足' })
            ])
          ]),
          el('div', { class: 'action-row hand-cta' }, [
            el('button', {
              class: 'btn rainbow',
              disabled: inst.lb >= 5,
              onClick: () => {
                const r = this.store.limitBreakUnit(uid);
                if (r.ok) this.showToast(`${def.name} 限界突破 +${r.lb} 達成!`);
                else this.showToast(r.msg);
              }
            }, [
              el('span', { text: inst.lb >= 5 ? '限界突破 MAX' : `限界突破 (${inst.lb}→${inst.lb + 1})` }),
              el('span', { class: 'btn-sub', text: inst.lb >= 5 ? '完了' : `魂片 ${inst.shards}/${lbCost}` })
            ]),
            el('button', {
              class: 'btn gold',
              disabled: inst.stars >= maxStars,
              onClick: () => {
                const r = this.store.awakenUnit(uid);
                if (r.ok) this.showToast(`${def.name} ★${r.stars}覚醒! Lv上限解放`);
                else this.showToast(r.msg);
              }
            }, [
              el('span', { text: inst.stars >= maxStars ? '覚醒 MAX' : `星核覚醒 (★${inst.stars}→★${inst.stars + 1})` }),
              el('span', { class: 'btn-sub', text: inst.stars >= maxStars ? '完了' : `核${awkCost.cores} / 貨${fmtNum(awkCost.gold)}` })
            ])
          ])
        ]);
        this.dom.bottomPanel.appendChild(list);
      } else {
        const keys = [
          { k: 'basic', tag: '通常', name: def.basic.name },
          { k: 'skill', tag: '戦技', name: def.skill.name },
          { k: 'ult', tag: '奥義', name: def.ult.name },
          { k: 'passive', tag: '固有', name: def.passive.name }
        ];
        const list = el('div', { class: 'scroll-list' }, keys.map((item) => {
          const lv = inst.skills[item.k];
          const cost = this.store.getSkillUpgradeCost(lv);
          return el('button', {
            class: 'item-row',
            disabled: lv >= 10,
            onClick: () => {
              const r = this.store.upgradeSkill(uid, item.k);
              if (r.ok) this.showToast(`${item.name} Lv.${r.level} 強化完了`);
              else this.showToast(r.msg);
            }
          }, [
            el('div', { class: 'item-row-left' }, [
              el('span', { class: 'skill-badge', text: item.tag }),
              el('div', { class: 'item-row-text' }, [
                el('div', { class: 'item-row-title', text: `${item.name}  Lv.${lv}/10` }),
                el('div', { class: 'item-row-sub', text: lv >= 10 ? '極致到達' : `強化費: 魂貨${fmtNum(cost.gold)} / 遺物塵${cost.dust}` })
              ])
            ]),
            el('div', { class: 'item-row-right' }, [
              el('span', { class: 'badge in-party', text: lv >= 10 ? 'MAX' : '強化' })
            ])
          ]);
        }));
        this.dom.bottomPanel.appendChild(list);
      }
    }

    // --- BOTTOM: SUMMON CONTROLS (3x2 Banner Grid) ---
    renderBottomSummon() {
      const st = this.store.getState();
      const sub = this.subTab.summon;

      const subBar = el('div', { class: 'subtab-bar' }, [
        { id: 'pull', label: '英雄召喚' },
        { id: 'mileage', label: `境界結晶交換 (${st.currencies.mileage}/50)` }
      ].map((t) => el('button', {
        class: `subtab-btn ${sub === t.id ? 'active' : ''}`,
        text: t.label,
        onClick: () => { this.subTab.summon = t.id; Kairo.audio.play('tap'); this.renderBottomPanel(false); }
      })));

      this.dom.bottomPanel.appendChild(subBar);

      if (sub === 'pull') {
        const bannerGrid = el('div', { class: 'banner-grid' }, [
          { id: 'all', label: '五界混在' },
          ...Data.REALM_LIST.map((r) => ({ id: r.id, label: `${r.name}PU` }))
        ].map((b) => el('button', {
          class: `banner-chip ${st.gacha.banner === b.id ? 'active' : ''}`,
          text: b.label,
          onClick: () => { this.store.setGachaBanner(b.id); }
        })));

        const last = st.gacha.lastResults || [];
        const logList = el('div', { class: 'scroll-list' });
        if (last.length > 0) {
          last.forEach((r) => {
            const ud = Data.UNIT_MAP[r.unitId];
            const rm = Data.REALMS[ud.realm];
            const ra = Data.RARITIES[r.rarity];
            logList.appendChild(el('button', {
              class: 'item-row',
              onClick: () => {
                this.selectedUnitId = ud.id;
                this.setTab('party');
              }
            }, [
              el('div', { class: 'item-row-left' }, [
                el('div', { class: 'sigil-emblem sm', style: { color: rm.color, borderColor: ra.color } }, [el('span', { text: ud.sigil })]),
                el('div', { class: 'item-row-text' }, [
                  el('div', { class: 'item-row-title', text: `[${r.rarity}] ${ud.name}` }),
                  el('div', { class: 'item-row-sub', text: `${rm.name} / ${ud.title}` })
                ])
              ]),
              el('div', { class: 'item-row-right' }, [
                el('span', { style: { color: r.isNew ? '#fde047' : '#67e8f9' }, text: r.isNew ? 'NEW契約' : r.bonusText }),
                el('span', { class: 'item-row-sub', text: '編成で確認' })
              ])
            ]));
          });
        } else {
          logList.appendChild(el('div', { class: 'item-row' }, [
            el('div', { class: 'item-row-text' }, [
              el('div', { class: 'item-row-title', text: '被り英雄は自動で限界突破の魂片へ変換されます' }),
              el('div', { class: 'item-row-sub', text: '5凸済みの英雄は遺物塵・覚醒核へ還元されます。' })
            ])
          ]));
        }

        const pullRow = el('div', { class: 'action-row' }, [
          el('button', {
            class: 'btn primary',
            disabled: st.currencies.gems < this.store.constants.SUMMON_COST_1,
            onClick: () => {
              this.clearToast();
              const r = this.store.performSummon(1);
              if (r.ok && r.bestRank >= 4) this.showToast('星虹共鳴!! UR英雄が降臨しました!');
              else if (!r.ok) this.showToast(r.msg);
            }
          }, [
            el('span', { text: '1回召喚' }),
            el('span', { class: 'btn-sub', text: `星晶 ${this.store.constants.SUMMON_COST_1}` })
          ]),
          el('button', {
            class: 'btn rainbow',
            disabled: st.currencies.gems < this.store.constants.SUMMON_COST_10,
            onClick: () => {
              this.clearToast();
              const r = this.store.performSummon(10);
              if (r.ok && r.bestRank >= 4) this.showToast('星虹共鳴!! UR英雄が降臨しました!');
              else if (!r.ok) this.showToast(r.msg);
            }
          }, [
            el('span', { text: '10連召喚 (SR以上確定)' }),
            el('span', { class: 'btn-sub', text: `星晶 ${this.store.constants.SUMMON_COST_10}` })
          ])
        ]);

        this.dom.bottomPanel.append(bannerGrid, logList, pullRow);
      } else {
        const urList = Data.UNITS.filter((u) => u.rarity === 'UR');
        const list = el('div', { class: 'scroll-list' }, urList.map((u) => {
          const rm = Data.REALMS[u.realm];
          const owned = Boolean(st.units[u.id]);
          return el('button', {
            class: 'item-row',
            disabled: st.currencies.mileage < this.store.constants.MILEAGE_UR_COST,
            onClick: () => {
              const r = this.store.exchangeMileageUR(u.id);
              if (r.ok) this.showToast(`UR ${u.name} と確定契約しました!`);
              else this.showToast(r.msg);
            }
          }, [
            el('div', { class: 'item-row-left' }, [
              el('div', { class: 'sigil-emblem sm', style: { color: rm.color, borderColor: '#e879f9' } }, [el('span', { text: u.sigil })]),
              el('div', { class: 'item-row-text' }, [
                el('div', { class: 'item-row-title', text: `${u.name} — ${u.title}` }),
                el('div', { class: 'item-row-sub', text: `${rm.name} / ${owned ? '所持済(魂片+60)' : '未所持(新規契約)'}` })
              ])
            ]),
            el('div', { class: 'item-row-right' }, [
              el('span', { style: { color: '#e879f9' }, text: '結晶 50' })
            ])
          ]);
        }));
        this.dom.bottomPanel.appendChild(list);
      }
    }

    // --- BOTTOM: RELICS (Direct 4-Party Hero Picker + Previewed Bulk Salvage) ---
    renderBottomRelics() {
      const st = this.store.getState();
      const sub = this.subTab.relics;
      const selRelic = st.relics.find((r) => r.id === this.selectedRelicId);

      const subBar = el('div', { class: 'subtab-bar' }, [
        { id: 'list', label: `所持一覧 (${st.relics.length})` },
        { id: 'craft', label: '鍛造・一括分解' },
        { id: 'filter', label: '自動分解設定' }
      ].map((t) => el('button', {
        class: `subtab-btn ${sub === t.id ? 'active' : ''}`,
        text: t.label,
        onClick: () => { this.subTab.relics = t.id; Kairo.audio.play('tap'); this.renderBottomPanel(false); }
      })));
      this.dom.bottomPanel.appendChild(subBar);

      if (sub === 'list') {
        // Direct party hero selector right inside Relics tab!
        const partyTargets = st.party.slice();
        if (!partyTargets.includes(this.selectedUnitId) && st.units[this.selectedUnitId]) {
          partyTargets[partyTargets.length - 1] = this.selectedUnitId;
        }
        const heroPicker = el('div', { class: 'hero-pick-row' }, partyTargets.map((pid) => {
          const ud = Data.UNIT_MAP[pid];
          const rm = Data.REALMS[ud.realm];
          return el('button', {
            class: `hero-pick-btn ${this.selectedUnitId === pid ? 'active' : ''}`,
            style: { borderBottom: `2px solid ${rm.color}` },
            text: `${ud.sigil} ${ud.name}`,
            onClick: () => {
              this.selectedUnitId = pid;
              Kairo.audio.play('tap');
              this.renderTopStage();
              this.renderBottomPanel(true);
            }
          });
        }));

        const slotBar = el('div', { class: 'chip-row' }, [
          { id: 'all', label: '全部位' },
          ...Data.RELIC_SLOT_LIST.map((sl) => ({ id: sl.id, label: sl.name }))
        ].map((f) => el('button', {
          class: `chip-btn ${this.relicSlotFilter === f.id ? 'active' : ''}`,
          text: f.label,
          onClick: () => { this.relicSlotFilter = f.id; Kairo.audio.play('tap'); this.renderBottomPanel(false); }
        })));

        const filtered = st.relics
          .filter((r) => this.relicSlotFilter === 'all' || r.slot === this.relicSlotFilter)
          .slice()
          .sort((a, b) => Data.getRelicScore(b) - Data.getRelicScore(a));

        const list = el('div', { class: 'scroll-list' });
        if (filtered.length === 0) {
          list.appendChild(el('div', { class: 'item-row', text: '該当する遺物がありません。周回または鍛造で入手してください。' }));
        } else {
          filtered.slice(0, 60).forEach((r) => {
            const rm = Data.RELIC_RARITIES[r.rarity];
            const sd = Data.RELIC_SETS[r.setId];
            const sl = Data.RELIC_SLOTS[r.slot];
            list.appendChild(el('button', {
              class: `item-row ${r.id === this.selectedRelicId ? 'selected' : ''}`,
              onClick: () => {
                this.selectedRelicId = r.id;
                Kairo.audio.play('tap');
                this.renderTopStage();
                this.renderBottomPanel(true);
              }
            }, [
              el('div', { class: 'item-row-left' }, [
                el('div', { class: 'sigil-emblem sm', style: { color: rm.color } }, [el('span', { text: sl.short })]),
                el('div', { class: 'item-row-text' }, [
                  el('div', { class: 'item-row-title', style: { color: rm.color }, text: `${sd.name}・${sl.name} +${r.level}` }),
                  el('div', { class: 'item-row-sub', text: `${Data.STAT_META[r.main.stat].name} ${Data.formatStatValue(r.main.stat, Data.getRelicMainValue(r))} / 評価${Data.getRelicScore(r)}` })
                ])
              ]),
              el('div', { class: 'item-row-right' }, [
                r.equippedBy ? el('span', { class: 'badge equipped', text: Data.UNIT_MAP[r.equippedBy]?.name.slice(0, 5) }) : null,
                r.locked ? el('span', { class: 'badge locked', text: '保護' }) : null
              ])
            ]));
          });
        }

        const isEquippedOnSel = selRelic && selRelic.equippedBy === this.selectedUnitId;

        const actions1 = el('div', { class: 'action-row hand-cta' }, [
          el('button', {
            class: 'btn sm primary',
            disabled: !selRelic,
            onClick: () => {
              const r = this.store.upgradeRelic(selRelic.id, 1);
              if (!r.ok) this.showToast(r.msg);
            }
          }, [el('span', { text: '強化+1' })]),
          el('button', {
            class: 'btn sm primary',
            disabled: !selRelic,
            onClick: () => {
              const r = this.store.upgradeRelic(selRelic.id, 3);
              if (r.ok) this.showToast(`+${r.level}へ強化 (サブ能力覚醒!)`);
              else this.showToast(r.msg);
            }
          }, [el('span', { text: '強化+3' })]),
          el('button', {
            class: 'btn sm rainbow',
            disabled: !selRelic,
            onClick: () => {
              const r = this.store.reforgeRelic(selRelic.id);
              if (r.ok) this.showToast('サブ能力を再鍛造しました');
              else this.showToast(r.msg);
            }
          }, [el('span', { text: '再鍛造' })])
        ]);

        const actions2 = el('div', { class: 'action-row hand-cta' }, [
          el('button', {
            class: 'btn sm',
            disabled: !selRelic,
            onClick: () => { this.store.toggleLockRelic(selRelic.id); }
          }, [el('span', { text: selRelic?.locked ? '保護解除' : '保護ロック' })]),
          el('button', {
            class: 'btn sm danger',
            disabled: !selRelic || selRelic.locked || Boolean(selRelic.equippedBy),
            onClick: () => {
              const r = this.store.salvageRelic(selRelic.id);
              if (r.ok) this.showToast(`分解完了: 遺物塵+${r.dust}`);
              else this.showToast(r.msg);
            }
          }, [el('span', { text: '分解' })]),
          el('button', {
            class: 'btn sm gold',
            disabled: !selRelic,
            onClick: () => {
              const heroName = Data.UNIT_MAP[this.selectedUnitId]?.name || '英雄';
              if (isEquippedOnSel) {
                this.store.unequipRelic(this.selectedUnitId, selRelic.slot);
                this.showToast(`${heroName}から遺物を外しました`);
              } else {
                this.store.equipRelic(this.selectedUnitId, selRelic.id);
                this.showToast(`${heroName}へ装着しました`);
              }
            }
          }, [el('span', { text: isEquippedOnSel ? '装着解除' : '対象へ装着' })])
        ]);

        this.dom.bottomPanel.append(heroPicker, slotBar, list, actions1, actions2);
      } else if (sub === 'craft') {
        const setChips = el('div', { class: 'chip-row' }, Data.RELIC_SET_LIST.map((s) => el('button', {
          class: `chip-btn ${this.craftSetId === s.id ? 'active' : ''}`,
          text: s.name,
          onClick: () => { this.craftSetId = s.id; Kairo.audio.play('tap'); this.renderBottomPanel(false); }
        })));
        const slotChips = el('div', { class: 'chip-row' }, Data.RELIC_SLOT_LIST.map((sl) => el('button', {
          class: `chip-btn ${this.craftSlotId === sl.id ? 'active' : ''}`,
          text: sl.name,
          onClick: () => { this.craftSlotId = sl.id; Kairo.audio.play('tap'); this.renderBottomPanel(false); }
        })));

        const body = el('div', { class: 'scroll-list' }, [
          el('div', { class: 'item-row' }, [
            el('div', { class: 'item-row-text' }, [
              el('div', { class: 'item-row-title', text: `指定鍛造: ${Data.RELIC_SETS[this.craftSetId].name}・${Data.RELIC_SLOTS[this.craftSlotId].name}` }),
              el('div', { class: 'item-row-sub', text: '紫晶(Rank3)以上確定・高確率で黄金/星虹を生成 (費用: 塵160 / 魂貨1,000)' })
            ])
          ]),
          el('div', { class: 'action-row' }, [
            el('button', {
              class: 'btn rainbow',
              onClick: () => {
                const r = this.store.craftRelic(this.craftSetId, this.craftSlotId);
                if (r.ok) {
                  this.selectedRelicId = r.relic.id;
                  this.showToast(`鍛造成功! [${Data.RELIC_RARITIES[r.relic.rarity].name}] を生成しました`);
                  this.renderAll();
                } else {
                  this.showToast(r.msg);
                }
              }
            }, [el('span', { text: '狙い撃ち遺物鍛造' }), el('span', { class: 'btn-sub', text: '遺物塵160 / 魂貨1,000' })])
          ]),
          el('div', { class: 'item-row-sub', style: { padding: '4px 2px 0' }, text: '未装備・未保護の不要遺物を一括分解：' }),
          el('div', { class: 'action-row' }, [1, 2, 3].map((rk) => {
            const pv = this.store.previewBulkSalvage(rk);
            return el('button', {
              class: 'btn sm danger',
              disabled: pv.count === 0,
              onClick: () => {
                const r = this.store.bulkSalvageRelics(rk);
                if (r.ok) this.showToast(`${r.count}個を一括分解 (遺物塵+${r.dust})`);
                else this.showToast(r.msg);
              }
            }, [
              el('span', { text: `${Data.RELIC_RARITIES[rk].name}以下` }),
              el('span', { class: 'btn-sub', text: pv.count > 0 ? `${pv.count}個 / 塵+${pv.dust}` : '対象0個' })
            ]);
          }))
        ]);

        this.dom.bottomPanel.append(setChips, slotChips, body);
      } else {
        const cur = st.settings.autoSalvageRank;
        const opts = [
          { rank: 0, title: '自動分解 OFF', desc: '全てのドロップ遺物をそのまま所持品へ保管します。' },
          { rank: 1, title: '白銀 (Rank1) 以下を自動分解', desc: '白銀遺物をドロップ瞬間に遺物塵へ自動変換します。' },
          { rank: 2, title: '蒼玉 (Rank2) 以下を自動分解', desc: '紫晶以上の厳選遺物だけを残し、他を自動還元します。' },
          { rank: 3, title: '紫晶 (Rank3) 以下を自動分解', desc: '黄金・星虹の最上位遺物だけを手元へ残します。' }
        ];
        const list = el('div', { class: 'scroll-list' }, opts.map((o) => el('button', {
          class: `item-row ${cur === o.rank ? 'selected' : ''}`,
          onClick: () => {
            this.store.updateSetting('autoSalvageRank', o.rank);
            Kairo.audio.play('confirm');
            this.showToast(`自動分解設定: ${o.title}`);
          }
        }, [
          el('div', { class: 'item-row-text' }, [
            el('div', { class: 'item-row-title', text: o.title }),
            el('div', { class: 'item-row-sub', text: o.desc })
          ]),
          el('span', { class: `badge ${cur === o.rank ? 'in-party' : ''}`, text: cur === o.rank ? '有効' : '選択' })
        ])));
        this.dom.bottomPanel.appendChild(list);
      }
    }

    // --- BOTTOM: RECORDS / CODEX (2-Column Zero Clip) / STATS / SETTINGS ---
    renderBottomRecords() {
      const st = this.store.getState();
      const sub = this.subTab.records;
      const claimCount = this.store.getClaimableAchievements().length;

      const subBar = el('div', { class: 'subtab-bar' }, [
        { id: 'ach', label: claimCount > 0 ? `実績 (${claimCount})` : '実績', alert: claimCount > 0 },
        { id: 'codex', label: '図鑑', alert: false },
        { id: 'stats', label: '統計', alert: false },
        { id: 'settings', label: '設定', alert: false }
      ].map((t) => el('button', {
        class: `subtab-btn ${sub === t.id ? 'active' : ''} ${t.alert ? 'has-alert' : ''}`,
        text: t.label,
        onClick: () => { this.subTab.records = t.id; Kairo.audio.play('tap'); this.renderAll(); }
      })));

      this.dom.bottomPanel.appendChild(subBar);

      if (sub === 'ach') {
        const sorted = Data.ACHIEVEMENTS.slice().sort((a, b) => {
          const ca = !st.achievementsClaimed[a.id] && this.store.getAchievementProgress(a) >= a.target ? 2 : (st.achievementsClaimed[a.id] ? 0 : 1);
          const cb = !st.achievementsClaimed[b.id] && this.store.getAchievementProgress(b) >= b.target ? 2 : (st.achievementsClaimed[b.id] ? 0 : 1);
          return cb - ca;
        });

        const list = el('div', { class: 'scroll-list' }, sorted.map((a) => {
          const prog = this.store.getAchievementProgress(a);
          const claimed = Boolean(st.achievementsClaimed[a.id]);
          const ready = !claimed && prog >= a.target;
          return el('button', {
            class: `item-row ${this.selectedAchId === a.id ? 'selected' : ''}`,
            onClick: () => {
              this.selectedAchId = a.id;
              Kairo.audio.play('tap');
              this.renderTopStage();
              this.renderBottomPanel(true);
            }
          }, [
            el('div', { class: 'item-row-text' }, [
              el('div', { class: 'item-row-title', text: `[${a.cat}] ${a.title}` }),
              el('div', { class: 'item-row-sub', text: `${a.desc} (${fmtNum(Math.min(prog, a.target))}/${fmtNum(a.target)})` })
            ]),
            el('div', { class: 'item-row-right' }, [
              claimed
                ? el('span', { class: 'badge', text: '済' })
                : ready
                  ? el('span', { class: 'badge claimable', text: '受取可' })
                  : el('span', { class: 'badge', text: `${Math.floor((prog / a.target) * 100)}%` })
            ])
          ]);
        }));

        const claimBar = el('div', { class: 'action-row' }, [
          el('button', {
            class: 'btn gold',
            disabled: claimCount === 0,
            onClick: () => {
              const r = this.store.claimAllAchievements();
              if (r.ok) this.showToast(`${r.count}件の報酬を獲得! 星晶+${r.gems}`);
            }
          }, [el('span', { text: claimCount > 0 ? `実績報酬を一括受取 (${claimCount}件)` : '受取可能な実績なし' })])
        ]);

        this.dom.bottomPanel.append(list, claimBar);
      } else if (sub === 'codex') {
        // 2-column grid guarantees clean names with zero horizontal overflow on 390px
        const grid = el('div', { class: 'scroll-grid' }, Data.UNITS.map((u) => {
          const owned = Boolean(st.units[u.id]);
          const rm = Data.REALMS[u.realm];
          const ra = Data.RARITIES[u.rarity];
          return el('button', {
            class: `unit-tile ${this.selectedCodexUnitId === u.id ? 'selected' : ''} ${owned ? '' : 'unowned'}`,
            onClick: () => {
              this.selectedCodexUnitId = u.id;
              Kairo.audio.play('tap');
              this.renderTopStage();
              this.renderBottomPanel(true);
            }
          }, [
            el('div', { class: 'sigil-emblem sm', style: { color: rm.color, borderColor: ra.color } }, [el('span', { text: u.sigil })]),
            el('div', { class: 'item-row-text' }, [
              el('div', { class: 'item-row-title', text: u.name }),
              el('div', { class: 'item-row-sub', text: `${ra.label}・${rm.name} (${owned ? '契約済' : '未観測'})` })
            ])
          ]);
        }));
        this.dom.bottomPanel.appendChild(grid);
      } else if (sub === 'stats') {
        const logs = this.battle.session.recentLogs;
        const list = el('div', { class: 'scroll-list' },
          logs.length > 0
            ? logs.map((l) => el('div', { class: 'item-row', style: { minHeight: '36px' } }, [
                el('div', { class: 'item-row-sub', style: { color: 'var(--text-main)' }, text: l.msg })
              ]))
            : [el('div', { class: 'item-row', text: '周回戦果ログがここに記録されます。' })]
        );
        this.dom.bottomPanel.appendChild(list);
      } else {
        const cfg = st.settings;
        const list = el('div', { class: 'scroll-list' }, [
          el('div', { class: 'action-row' }, [
            el('button', {
              class: `btn sm ${cfg.soundEnabled ? 'active-toggle' : ''}`,
              onClick: () => { this.store.updateSetting('soundEnabled', !cfg.soundEnabled); }
            }, [el('span', { text: `効果音: ${cfg.soundEnabled ? 'ON' : 'OFF'}` })]),
            el('button', {
              class: 'btn sm',
              onClick: () => {
                const next = cfg.soundVolume >= 0.7 ? 0.25 : cfg.soundVolume >= 0.4 ? 0.75 : 0.45;
                this.store.updateSetting('soundVolume', next);
                Kairo.audio.play('confirm');
              }
            }, [el('span', { text: `音量: ${Math.round(cfg.soundVolume * 100)}%` })])
          ]),
          el('div', { class: 'action-row' }, [
            el('button', {
              class: `btn sm ${cfg.handMode === 'left' ? 'active-toggle' : ''}`,
              onClick: () => {
                this.store.updateSetting('handMode', cfg.handMode === 'left' ? 'right' : 'left');
                Kairo.audio.play('tap');
              }
            }, [el('span', { text: `主操作配置: ${cfg.handMode === 'left' ? '左手寄せ' : '右手寄せ'}` })]),
            el('button', {
              class: `btn sm ${cfg.contrastMode === 'high' ? 'active-toggle' : ''}`,
              onClick: () => {
                this.store.updateSetting('contrastMode', cfg.contrastMode === 'high' ? 'normal' : 'high');
                Kairo.audio.play('tap');
              }
            }, [el('span', { text: `高対比表示: ${cfg.contrastMode === 'high' ? 'ON' : 'OFF'}` })])
          ]),
          el('div', { class: 'action-row' }, [
            el('button', {
              class: `btn sm ${cfg.motionMode === 'reduced' ? 'active-toggle' : ''}`,
              onClick: () => {
                this.store.updateSetting('motionMode', cfg.motionMode === 'reduced' ? 'full' : 'reduced');
                Kairo.audio.play('tap');
              }
            }, [el('span', { text: `画面揺れ抑制: ${cfg.motionMode === 'reduced' ? 'ON' : 'OFF'}` })]),
            el('button', {
              class: `btn sm ${cfg.retryOnDefeat ? 'active-toggle' : ''}`,
              onClick: () => {
                this.store.updateSetting('retryOnDefeat', !cfg.retryOnDefeat);
                Kairo.audio.play('tap');
              }
            }, [el('span', { text: `敗北時自動再戦: ${cfg.retryOnDefeat ? 'ON' : 'OFF'}` })])
          ]),
          el('div', { class: 'action-row' }, [
            el('button', {
              class: 'btn sm primary',
              onClick: () => {
                Kairo.audio.play('tap');
                this.openModal({ type: 'transfer', code: this.store.exportTransferCode() });
              }
            }, [el('span', { text: '記録コード引継ぎ' })]),
            el('button', {
              class: 'btn sm danger',
              onClick: () => {
                Kairo.audio.play('tap');
                this.openModal({ type: 'resetConfirm' });
              }
            }, [el('span', { text: '記録の初期化' })])
          ])
        ]);
        this.dom.bottomPanel.appendChild(list);
      }
    }

    // --- BOTTOM MAIN NAVIGATION BAR ---
    renderBottomNav() {
      clearNode(this.dom.bottomNav);
      const st = this.store.getState();
      const claimCount = this.store.getClaimableAchievements().length;
      const summonAlert = st.currencies.gems >= this.store.constants.SUMMON_COST_10 || st.currencies.mileage >= this.store.constants.MILEAGE_UR_COST;

      NAV_ITEMS.forEach((item) => {
        const showDot = (item.id === 'records' && claimCount > 0) || (item.id === 'summon' && summonAlert);
        this.dom.bottomNav.appendChild(el('button', {
          class: `nav-btn ${this.activeTab === item.id ? 'active' : ''}`,
          dataset: { tab: item.id },
          onClick: () => this.setTab(item.id)
        }, [
          el('span', { class: 'nav-glyph', text: item.glyph }),
          el('span', { class: 'nav-label', text: item.label }),
          showDot ? el('span', { class: 'nav-dot' }) : null
        ]));
      });
    }

    // --- SPLIT MODAL (Top half = Display Only, Bottom half = Controls Only) ---
    renderModal() {
      clearNode(this.dom.topModalStage);
      clearNode(this.dom.bottomModal);

      if (!this.modal) {
        this.dom.topModalStage.classList.add('hidden');
        this.dom.bottomModal.classList.add('hidden');
        return;
      }

      this.dom.topModalStage.classList.remove('hidden');
      this.dom.bottomModal.classList.remove('hidden');

      if (this.modal.type === 'offline') {
        const rep = this.modal.report;
        const hrs = Math.floor(rep.minutes / 60);
        const mins = rep.minutes % 60;
        const timeStr = hrs > 0 ? `${hrs}時間${mins}分` : `${mins}分`;

        this.dom.topModalStage.appendChild(
          el('div', { class: 'modal-display-box' }, [
            el('div', { class: 'modal-display-title', text: '帰還戦果報告' }),
            el('div', { class: 'modal-display-desc', text: `${timeStr}の不在期間中、${rep.stageName} にて自動探索を継続しました${rep.capped ? '（最大24時間蓄積）' : ''}。` }),
            el('div', { class: 'stat-grid' }, [
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '星晶' }), el('span', { class: 'stat-v', style: { color: '#e879f9' }, text: `+${fmtNum(rep.gems)}` })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '魂貨' }), el('span', { class: 'stat-v', style: { color: '#fbbf24' }, text: `+${fmtNum(rep.gold)}` })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '記憶晶' }), el('span', { class: 'stat-v', text: `+${fmtNum(rep.exp)}` })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '遺物塵' }), el('span', { class: 'stat-v', style: { color: '#38bdf8' }, text: `+${fmtNum(rep.dust)}` })]),
              el('div', { class: 'stat-box' }, [el('span', { class: 'stat-k', text: '遺物枠' }), el('span', { class: 'stat-v', style: { color: '#6ee7b7' }, text: `${rep.relicRolls}個` })])
            ])
          ])
        );

        this.dom.bottomModal.append(
          el('div', { class: 'item-row' }, [
            el('div', { class: 'item-row-text' }, [
              el('div', { class: 'item-row-title', text: '不在中の獲得戦利品を受け取ります' }),
              el('div', { class: 'item-row-sub', text: '自動分解フィルター設定が遺物獲得時にも適用されます。' })
            ])
          ]),
          el('div', { class: 'action-row' }, [
            el('button', {
              class: 'btn gold',
              onClick: () => {
                const res = this.store.claimOfflineRewards();
                this.closeModal();
                if (res.ok) this.showToast(`帰還戦果を受領! 遺物+${res.foundRelics.length}`);
              }
            }, [el('span', { text: '戦利品を一括受領' })])
          ])
        );
      } else if (this.modal.type === 'transfer') {
        this.dom.topModalStage.appendChild(
          el('div', { class: 'modal-display-box' }, [
            el('div', { class: 'modal-display-title', text: '署名付き記録コード' }),
            el('div', { class: 'modal-display-desc', text: '現在の記録を署名付きコードとして保存、または別端末のコードから復元できます。改ざんされたコードは検証により拒否されます。' })
          ])
        );

        const textarea = el('textarea', { class: 'code-textarea', value: this.modal.code, placeholder: 'ここにKC1:から始まる記録コードを貼り付け' });

        this.dom.bottomModal.append(
          textarea,
          el('div', { class: 'action-row' }, [
            el('button', {
              class: 'btn sm',
              onClick: () => {
                Kairo.audio.play('tap');
                this.closeModal();
              }
            }, [el('span', { text: '閉じる' })]),
            el('button', {
              class: 'btn sm primary',
              onClick: async () => {
                try {
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(textarea.value);
                    this.showToast('記録コードをコピーしました');
                  } else {
                    textarea.select();
                    this.showToast('コードを選択しました');
                  }
                  Kairo.audio.play('confirm');
                } catch (_e) {
                  this.showToast('コード欄から手動コピーしてください');
                }
              }
            }, [el('span', { text: 'コピー' })]),
            el('button', {
              class: 'btn sm gold',
              onClick: async () => {
                const res = await this.store.importTransferCode(textarea.value);
                if (res.ok) {
                  this.closeModal();
                  this.battle.startStage();
                  this.showToast('記録を正常に復元しました');
                } else {
                  this.showToast(res.msg);
                }
              }
            }, [el('span', { text: 'コード復元' })])
          ])
        );
      } else if (this.modal.type === 'resetConfirm') {
        this.dom.topModalStage.appendChild(
          el('div', { class: 'modal-display-box', style: { borderColor: '#f43f5e' } }, [
            el('div', { class: 'modal-display-title', style: { color: '#fb7185' }, text: '記録初期化の確認' }),
            el('div', { class: 'modal-display-desc', text: '現在の英雄・遺物・踏破記録をすべて初期化し、最初から開始します。この操作は元に戻せません。' })
          ])
        );

        this.dom.bottomModal.append(
          el('div', { class: 'item-row' }, [
            el('div', { class: 'item-row-sub', text: '必要に応じて先に「記録コード引継ぎ」で控えを保存してください。' })
          ]),
          el('div', { class: 'action-row' }, [
            el('button', {
              class: 'btn',
              onClick: () => { Kairo.audio.play('tap'); this.closeModal(); }
            }, [el('span', { text: 'キャンセル' })]),
            el('button', {
              class: 'btn danger',
              onClick: async () => {
                await this.store.resetAllData();
                this.closeModal();
                this.battle.startStage('st_1_1');
                this.showToast('記録を初期化しました');
              }
            }, [el('span', { text: '完全に初期化する' })])
          ])
        );
      }
    }
  }

  Kairo.UIRenderer = UIRenderer;
})(window);
