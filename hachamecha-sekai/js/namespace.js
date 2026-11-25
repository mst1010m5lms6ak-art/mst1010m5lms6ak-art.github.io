(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};

  HS.VERSION = '1.0.0';

  HS.CONST = {
    ELEMENTS: ['fire', 'water', 'wind', 'light', 'dark', 'none'],
    RACES: ['human', 'dragon', 'god', 'demon', 'fairy', 'beast', 'mech'],
    ROLES: ['tank', 'dealer', 'supporter', 'healer'],
    SLOTS: ['weapon', 'armor', 'accessory', 'core'],
    WORLDS: ['frontier', 'mechcity', 'dragonpeak', 'fairyvale', 'abyss', 'sanctum', 'wilds'],

    QUALITY_MIN: 1,
    QUALITY_MAX: 100,
    QUALITY_TIERS: [
      { min: 1, max: 39, id: 'c', rank: 'C', label: '並', badge: '並', color: '#9ba8bd' },
      { min: 40, max: 69, id: 'b', rank: 'B', label: '良', badge: '良', color: '#58b8ff' },
      { min: 70, max: 89, id: 'a', rank: 'A', label: '優', badge: '優', color: '#b482ff' },
      { min: 90, max: 99, id: 's', rank: 'S', label: '秀', badge: '秀', color: '#ffbd4a' },
      { min: 100, max: 100, id: 'max', rank: 'MAX', label: '極', badge: '👑極', color: '#fff3a1' }
    ],

    SLOT_NAMES: {
      weapon: '武器',
      armor: '防具',
      accessory: '装飾',
      core: '核コア'
    },
    SLOT_ICONS: {
      weapon: '⚔️',
      armor: '🛡️',
      accessory: '💍',
      core: '💠'
    },

    TARGET_NAMES: {
      single: '単体',
      area: '範囲',
      all: '全体',
      self: '自身',
      ally_single: '味方単',
      ally_all: '味方全'
    },

    SPEEDS: [1, 2, 3],
    PARTY_SIZE: 4,
    MAX_RELICS: 3,
    MAX_EXPEDITIONS: 2,
    MAX_RELAY_SQUADS: 3,
    SKILL_AWAKEN_MAX: 3,
    RESONANCE_MAX: 5,
    ABILITY_TIERS: 5,
    ABILITY_CHOICES: 5,
    BASE_CRIT_DMG: 1.5,
    ATB_MAX: 1000
  };

  HS.Data = HS.Data || {};
  HS.Utils = HS.Utils || {};
  HS.Storage = HS.Storage || {};
  HS.Engine = HS.Engine || {};
  HS.UI = HS.UI || {};
})(typeof window !== 'undefined' ? window : globalThis);
