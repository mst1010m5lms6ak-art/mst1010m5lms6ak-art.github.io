(function (global) {
  "use strict";
  const HS = (global.HS = global.HS || {});

  function racePath(race, r) {
    if (race === "human") {
      // 4-point diamond star
      const a = r * 0.85, b = r * 0.34;
      return `<polygon points="0,${-a} ${b},${-b} ${a},0 ${b},${b} 0,${a} ${-b},${b} ${-a},0 ${-b},${-b}" />`;
    }
    if (race === "dragon") {
      // Sharp draconic crest
      const a = r * 0.9;
      return `<polygon points="0,${-a} ${a * 0.72},${-a * 0.15} ${a * 0.48},${a * 0.82} 0,${a * 0.42} ${-a * 0.48},${a * 0.82} ${-a * 0.72},${-a * 0.15}" />`;
    }
    if (race === "demon") {
      // Horned inverted chaos triangle
      const a = r * 0.85;
      return `<path d="M${-a * 0.75},${-a * 0.7} L${-a * 0.25},${-a * 0.2} L${a * 0.25},${-a * 0.2} L${a * 0.75},${-a * 0.7} L${a * 0.55},${a * 0.1} L0,${a * 0.9} L${-a * 0.55},${a * 0.1} Z" />`;
    }
    if (race === "fairy") {
      // Twin-wing / 4-petal crest
      const a = r * 0.82;
      return `<path d="M0,${-a} Q${a * 0.75},${-a * 0.75} ${a * 0.32},0 Q${a * 0.85},${a * 0.65} 0,${a * 0.85} Q${-a * 0.85},${a * 0.65} ${-a * 0.32},0 Q${-a * 0.75},${-a * 0.75} 0,${-a} Z" />`;
    }
    // machine: hexagon core
    const a = r * 0.85;
    const dx = (a * 0.866).toFixed(1), dy = (a * 0.5).toFixed(1);
    return `<polygon points="0,${-a} ${dx},${-dy} ${dx},${dy} 0,${a} ${-dx},${dy} ${-dx},${-dy}" />`;
  }

  /**
   * Renders a zero-illustration geometric chaos emblem combining element aura,
   * primary & secondary race geometry (dual-race overlay), and role mark.
   */
  function emblem(unit, size) {
    const s = size || 38;
    const el = HS.CONST.ELEMENT_MAP[unit.element] || HS.CONST.ELEMENT_MAP.none;
    const role = HS.CONST.ROLE_MAP[unit.role] || HS.CONST.ROLES[0];
    const r1 = HS.CONST.RACE_MAP[unit.races[0]] || HS.CONST.RACES[0];
    const r2 = unit.races[1] ? HS.CONST.RACE_MAP[unit.races[1]] : null;
    const isBoss = !!unit.boss;

    const ringDash = isBoss ? 'stroke-dasharray="7 3"' : r2 ? 'stroke-dasharray="14 4"' : "";

    return `<svg width="${s}" height="${s}" viewBox="-26 -26 52 52" aria-hidden="true" style="display:block;flex-shrink:0">
      <circle cx="0" cy="0" r="23" fill="rgba(11,9,20,0.88)" stroke="${el.color}" stroke-width="${isBoss ? 3.2 : 2.4}" ${ringDash} />
      <circle cx="0" cy="0" r="18" fill="${el.color}" fill-opacity="0.16" />
      <g fill="${r1.color}" fill-opacity="0.28" stroke="${r1.color}" stroke-width="2" stroke-linejoin="round">
        ${racePath(r1.id, 15)}
      </g>
      ${
        r2
          ? `<g fill="${r2.color}" fill-opacity="0.34" stroke="${r2.color}" stroke-width="1.8" stroke-linejoin="round" transform="rotate(24)">
              ${racePath(r2.id, 9.5)}
             </g>`
          : `<circle cx="0" cy="0" r="4" fill="${el.color}" />`
      }
      <circle cx="15" cy="15" r="8.5" fill="#120d24" stroke="${role.color}" stroke-width="1.6" />
      <text x="15" y="18.3" text-anchor="middle" font-size="9.5" font-weight="900" fill="${role.color}">${role.short}</text>
    </svg>`;
  }

  function equipIcon(slot, rarity, size) {
    const s = size || 28;
    const rar = HS.CONST.RARITY_MAP[rarity] || HS.CONST.RARITIES[0];
    let inner = "";
    if (slot === "weapon") {
      inner = `<path d="M-9,9 L7,-7 M3,-9 L9,-9 L9,-3 M-8,4 L-4,8" stroke="${rar.color}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
    } else if (slot === "armor") {
      inner = `<path d="M0,-10 L9,-6 L7,5 L0,10 L-7,5 L-9,-6 Z" fill="${rar.color}" fill-opacity="0.25" stroke="${rar.color}" stroke-width="2.2"/>`;
    } else {
      inner = `<polygon points="0,-10 9,0 0,10 -9,0" fill="${rar.color}" fill-opacity="0.25" stroke="${rar.color}" stroke-width="2.2"/><circle cx="0" cy="0" r="3" fill="${rar.color}"/>`;
    }
    return `<svg width="${s}" height="${s}" viewBox="-16 -16 32 32" aria-hidden="true" style="display:block;flex-shrink:0">
      <rect x="-14" y="-14" width="28" height="28" rx="7" fill="rgba(12,9,24,0.88)" stroke="${rar.color}" stroke-width="1.6"/>
      ${inner}
    </svg>`;
  }

  HS.SVG = { emblem, equipIcon };
})(window);
