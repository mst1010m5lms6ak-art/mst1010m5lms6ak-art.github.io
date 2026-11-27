/* 汎用UI記号・属性マーク・ロール記号・装備部位記号（人物・モンスター絵は一切含まない） */
(function () {
  'use strict';

  const PATHS = {
    /* 属性シンボル（純幾何学・UIマーク） */
    fire: '<path d="M12 2c2.5 3.6 6 6.4 6 11a6 6 0 1 1-12 0c0-2.7 1.3-5.1 3-7 0 2 1 3 2 3 0-3 1-5 1-7z"/>',
    water: '<path d="M12 2.5C8.5 7.5 6 10.5 6 14a6 6 0 0 0 12 0c0-3.5-2.5-6.5-6-11.5z"/>',
    wind: '<path d="M3 9h11a2.5 2.5 0 1 0-2.5-2.5M3 14h15a2.5 2.5 0 1 1-2.5 2.5M5 18h6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    light: '<polygon points="12,2 14.8,9.2 22,12 14.8,14.8 12,22 9.2,14.8 2,12 9.2,9.2"/>',
    dark: '<path d="M16.5 14.8A6.8 6.8 0 0 1 9.2 7.5a6.8 6.8 0 1 0 7.3 7.3z"/>',
    none: '<polygon points="12,3 20,12 12,21 4,12" fill="none" stroke="currentColor" stroke-width="2.2"/>',

    /* ロール記号 */
    tank: '<path d="M12 2.5L4.5 5.8v5.8c0 4.8 3.2 8.7 7.5 10 4.3-1.3 7.5-5.2 7.5-10V5.8L12 2.5z"/>',
    dealer: '<path d="M19.5 4.5l-9.2 9.2-2.2-2.2 9.2-9.2h2.2v2.2zM6.2 13.8l4 4-1.5 1.5-1.6-1.6-2.4 2.4-1.2-1.2 2.4-2.4-1.2-1.2 1.5-1.5z"/>',
    support: '<polygon points="12,2.5 14.5,8.5 21,9 16,13.3 17.6,19.7 12,16.2 6.4,19.7 8,13.3 3,9 9.5,8.5"/>',
    healer: '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6v-6z"/>',

    /* 装備部位記号 */
    weapon: '<path d="M19.5 3.5l1 1-9.8 9.8-2.8.8.8-2.8 9.8-9.8zM7.6 13.6l2.8 2.8-1.4 1.4-1.1-1.1-2.5 2.5-1.4-1.4 2.5-2.5-1.1-1.1 1.4-1.4z"/>',
    armor: '<path d="M7 4l5 2 5-2 3 4-2.5 2.5V20h-11v-9.5L4 8l3-4z"/>',
    accessory: '<circle cx="12" cy="13.5" r="6" fill="none" stroke="currentColor" stroke-width="2.2"/><polygon points="12,3 15,7.5 9,7.5"/>',
    emblem: '<polygon points="12,2.5 20.5,7.2 20.5,16.8 12,21.5 3.5,16.8 3.5,7.2" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3"/>',

    /* UIナビ・演出記号（出撃アイコンを鮮明・立体的な交差剣へ刷新） */
    battle: '<path d="M4.5 4.5L9 5l10.5 10.5-1.8 1.8L7.2 6.8 4.5 4.5zm15 0L15 5 4.5 15.5l1.8 1.8L16.8 6.8 19.5 4.5z" /><path d="M14.2 17.8l3.6-3.6 1.6 1.6-1.1 1.1 1.7 1.7-1.4 1.4-1.7-1.7-1.1 1.1-1.6-1.6zM9.8 17.8l-3.6-3.6-1.6 1.6 1.1 1.1-1.7 1.7 1.4 1.4 1.7-1.7 1.1 1.1 1.6-1.6z"/>',
    party: '<rect x="3" y="4" width="8" height="7" rx="1.6"/><rect x="13" y="4" width="8" height="7" rx="1.6"/><rect x="3" y="13" width="8" height="7" rx="1.6"/><rect x="13" y="13" width="8" height="7" rx="1.6"/>',
    grow: '<path d="M12 3l8 8h-5v10h-6V11H4l8-8z"/>',
    equip: '<polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="none" stroke="currentColor" stroke-width="2.2"/><polygon points="12,7 16.5,12 12,17 7.5,12"/>',
    summon: '<polygon points="12,2 14.5,9.5 22,12 14.5,14.5 12,22 9.5,14.5 2,12 9.5,9.5"/><circle cx="19" cy="5" r="1.8"/><circle cx="5" cy="19" r="1.5"/>',
    codex: '<path d="M4.5 4h11a3 3 0 0 1 3 3v13H7a2.5 2.5 0 0 0-2.5 2.5V4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8h7M8 12h7M8 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    crown: '<path d="M3 18h18l-1.5-10-4.5 4-3-6-3 6-4.5-4L3 18z"/>',
    warn: '<polygon points="12,3 22,20 2,20" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="11" y="9" width="2" height="5.5"/><rect x="11" y="16" width="2" height="2"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/>',
    unlock: '<rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.6" fill="none" stroke="currentColor" stroke-width="2"/>',
    stone: '<polygon points="12,2 19,9 12,22 5,9"/>',
    coin: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3.2"/>',
    crystal: '<polygon points="12,2 18,7 16,21 8,21 6,7"/>',
    soul: '<polygon points="12,2.5 18.5,12 12,21.5 5.5,12" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3.2"/>',
    mark: '<polygon points="12,2 15,8 21.5,9 16.8,13.8 18,20.5 12,17.2 6,20.5 7.2,13.8 2.5,9 9,8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.6"/>',
    gear: '<circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
  };

  function svg(name, size) {
    const s = size || 14;
    const body = PATHS[name] || PATHS.none;
    return `<svg class="ui-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${body}</svg>`;
  }

  Object.defineProperty(window, '__IZ_ICON__', {
    value: Object.freeze({ svg }),
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
