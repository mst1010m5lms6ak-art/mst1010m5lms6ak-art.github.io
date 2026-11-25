(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  /* 非キャライラスト：純粋な幾何学ピクトグラム・記号アイコンのみ */
  const PATHS = {
    /* ナビ用 */
    adventure: '<polygon points="12,2 22,12 12,22 2,12"/><circle cx="12" cy="12" r="3"/>',
    party: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
    roster: '<polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/><circle cx="12" cy="12" r="3"/>',
    equip: '<polygon points="12,3 20,8 17,20 7,20 4,8"/><line x1="12" y1="3" x2="12" y2="20"/>',
    hub: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
    codex: '<rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/>',

    /* 属性用 */
    fire: '<path d="M12 2L19 13a7 7 0 1 1-14 0L12 2z"/>',
    water: '<path d="M12 3L18 13a6 6 0 1 1-12 0L12 3z"/><line x1="9" y1="15" x2="15" y2="15"/>',
    wind: '<path d="M3 9h14a3 3 0 1 0-3-3M3 15h17a3 3 0 1 1-3 3"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>',
    dark: '<path d="M19 14A7 7 0 1 1 10 5a5.5 5.5 0 0 0 9 9z"/>',
    none: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',

    /* ロール用 */
    tank: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
    dealer: '<polygon points="12,2 15,10 22,12 15,14 12,22 9,14 2,12 9,10"/>',
    supporter: '<polygon points="12,3 21,19 3,19"/><circle cx="12" cy="14" r="2.5"/>',
    healer: '<rect x="10" y="4" width="4" height="16" rx="1"/><rect x="4" y="10" width="16" height="4" rx="1"/>',

    /* 装備部位・汎用 */
    weapon: '<line x1="5" y1="19" x2="19" y2="5"/><polyline points="12,5 19,5 19,12"/><line x1="7" y1="13" x2="11" y2="17"/>',
    armor: '<path d="M6 4h12l2 5-3 2v9H7v-9l-3-2 2-5z"/>',
    accessory: '<circle cx="12" cy="13" r="6"/><polygon points="12,3 15,7 9,7"/>',
    core: '<polygon points="12,2 20,7 20,17 12,22 4,17 4,7"/><circle cx="12" cy="12" r="3"/>',
    crown: '<polygon points="3,18 5,8 10,12 12,6 14,12 19,8 21,18"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    bolt: '<polygon points="13,2 4,14 11,14 10,22 20,10 13,10"/>',
    loop: '<polyline points="17,2 21,6 17,10"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7,22 3,18 7,14"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'
  };

  HW.icon = function (name, size, color) {
    const s = size || 14;
    const p = PATHS[name] || PATHS.none;
    const stroke = color || 'currentColor';
    return (
      '<svg class="icon-svg" width="' +
      s +
      '" height="' +
      s +
      '" viewBox="0 0 24 24" fill="none" stroke="' +
      stroke +
      '" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      p +
      '</svg>'
    );
  };
})();
