(function (root) {
  'use strict';

  const IkaiApp = root.IkaiApp = root.IkaiApp || {};
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    const doc = root.document;
    const node = doc.createElementNS(SVG_NS, tag);
    if (attrs) {
      const keys = Object.keys(attrs);
      for (let i = 0; i < keys.length; i += 1) {
        node.setAttribute(keys[i], String(attrs[keys[i]]));
      }
    }
    return node;
  }

  function makeRoot(className, ariaLabel) {
    const cls = className ? 'icon-svg ' + className : 'icon-svg';
    const attrs = {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.9',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      class: cls
    };
    if (ariaLabel) {
      attrs['aria-label'] = ariaLabel;
      attrs.role = 'img';
    } else {
      attrs['aria-hidden'] = 'true';
    }
    return svgEl('svg', attrs);
  }

  function createRoleIcon(role, className) {
    const svg = makeRoot(className, role || 'ロール');
    if (role === 'タンク') {
      svg.appendChild(svgEl('path', { d: 'M12 3 L19 6 V12 C19 16.5 15.8 19.8 12 21 C8.2 19.8 5 16.5 5 12 V6 Z' }));
      svg.appendChild(svgEl('path', { d: 'M12 6 V18' }));
    } else if (role === 'ディーラー') {
      svg.appendChild(svgEl('path', { d: 'M12 3 L16 10 L12 21 L8 10 Z' }));
      svg.appendChild(svgEl('path', { d: 'M5 18 L19 6 M5 6 L19 18' }));
    } else if (role === 'サポーター') {
      svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 8 }));
      svg.appendChild(svgEl('path', { d: 'M12 4 L14 10 L20 12 L14 14 L12 20 L10 14 L4 12 L10 10 Z' }));
    } else if (role === 'ヒーラー') {
      svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 8.5 }));
      svg.appendChild(svgEl('path', { d: 'M12 7.5 V16.5 M7.5 12 H16.5' }));
    } else {
      svg.appendChild(svgEl('polygon', { points: '12,4 20,12 12,20 4,12' }));
    }
    return svg;
  }

  function createBuffIcon(type, className) {
    const svg = makeRoot(className, type || '状態');
    switch (type) {
      case 'atk_up':
        svg.appendChild(svgEl('path', { d: 'M7 17 L17 7 M12 7 H17 V12' }));
        break;
      case 'def_up':
        svg.appendChild(svgEl('path', { d: 'M12 4 L18 7 V12 C18 16 15 19 12 20 C9 19 6 16 6 12 V7 Z' }));
        break;
      case 'spd_up':
        svg.appendChild(svgEl('path', { d: 'M6 15 L12 9 L18 15 M6 10 L12 4 L18 10' }));
        break;
      case 'crit_up':
        svg.appendChild(svgEl('polygon', { points: '12,3 14.5,9.5 21,12 14.5,14.5 12,21 9.5,14.5 3,12 9.5,9.5' }));
        break;
      case 'shield':
        svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 8 }));
        svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 4 }));
        break;
      case 'regen':
        svg.appendChild(svgEl('path', { d: 'M12 6 V18 M6 12 H18' }));
        svg.appendChild(svgEl('path', { d: 'M5 7 A8 8 0 0 1 19 7' }));
        break;
      case 'counter':
        svg.appendChild(svgEl('path', { d: 'M17 8 A6 6 0 1 0 18 14 M17 4 V8 H13' }));
        break;
      case 'taunt':
        svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 7 }));
        svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 2 }));
        break;
      case 'atk_down':
        svg.appendChild(svgEl('path', { d: 'M7 7 L17 17 M17 12 V17 H12' }));
        break;
      case 'def_down':
        svg.appendChild(svgEl('path', { d: 'M12 4 L18 7 V12 C18 16 15 19 12 20 C9 19 6 16 6 12 V7 Z M8 8 L16 16' }));
        break;
      case 'spd_down':
        svg.appendChild(svgEl('path', { d: 'M6 9 L12 15 L18 9 M6 14 L12 20 L18 14' }));
        break;
      case 'burn':
        svg.appendChild(svgEl('path', { d: 'M12 3 C15 7 18 10 18 14 A6 6 0 0 1 6 14 C6 10 9 8 12 3 Z' }));
        break;
      case 'stun':
        svg.appendChild(svgEl('path', { d: 'M13 3 L7 13 H12 L11 21 L17 11 H12 Z' }));
        break;
      case 'heal_down':
        svg.appendChild(svgEl('path', { d: 'M12 7 V17 M7 12 H17 M5 5 L19 19' }));
        break;
      case 'vuln':
        svg.appendChild(svgEl('polygon', { points: '12,4 20,19 4,19' }));
        svg.appendChild(svgEl('path', { d: 'M12 10 V14 M12 16.5 V17' }));
        break;
      case 'dmg_down':
        svg.appendChild(svgEl('path', { d: 'M12 3 L19 6.5 V12 C19 16.5 15.8 19.6 12 21 C8.2 19.6 5 16.5 5 12 V6.5 Z' }));
        svg.appendChild(svgEl('path', { d: 'M9 11 L12 14 L15 11' }));
        break;
      case 'crit_down':
        svg.appendChild(svgEl('polygon', { points: '12,3 14.5,9.5 21,12 14.5,14.5 12,21 9.5,14.5 3,12 9.5,9.5' }));
        svg.appendChild(svgEl('path', { d: 'M5 19 L19 5' }));
        break;
      case 'freeze':
        svg.appendChild(svgEl('path', { d: 'M12 3 V21 M3 12 H21 M6 6 L18 18 M18 6 L6 18' }));
        break;
      default:
        svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 5 }));
        break;
    }
    return svg;
  }

  function createEquipIcon(slot, className) {
    const svg = makeRoot(className, slot || '装備');
    if (slot === '主器') {
      svg.appendChild(svgEl('path', { d: 'M18 4 L9 13 M18 4 L15 10 L11 6 Z M6 14 L10 18 M5 19 L8 16' }));
    } else if (slot === '護符') {
      svg.appendChild(svgEl('rect', { x: 7, y: 4, width: 10, height: 16, rx: 2 }));
      svg.appendChild(svgEl('path', { d: 'M12 8 V16 M9.5 11 H14.5' }));
    } else if (slot === '装具') {
      svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 7 }));
      svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 3 }));
    } else if (slot === '印章') {
      svg.appendChild(svgEl('polygon', { points: '12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5' }));
      svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 2.5 }));
    } else {
      svg.appendChild(svgEl('rect', { x: 5, y: 5, width: 14, height: 14, rx: 3 }));
    }
    return svg;
  }

  function createUiIcon(name, className) {
    const svg = makeRoot(className, name || '記号');
    switch (name) {
      case 'sound_on':
        svg.appendChild(svgEl('path', { d: 'M5 9 H9 L14 5 V19 L9 15 H5 Z' }));
        svg.appendChild(svgEl('path', { d: 'M17 8.5 A5 5 0 0 1 17 15.5' }));
        break;
      case 'sound_off':
        svg.appendChild(svgEl('path', { d: 'M5 9 H9 L14 5 V19 L9 15 H5 Z' }));
        svg.appendChild(svgEl('path', { d: 'M17 9 L21 15 M21 9 L17 15' }));
        break;
      case 'sort':
        svg.appendChild(svgEl('path', { d: 'M4 7 H16 M4 12 H13 M4 17 H10 M18 6 V18 M15 15 L18 18 L21 15' }));
        break;
      case 'lock':
        svg.appendChild(svgEl('rect', { x: 5, y: 11, width: 14, height: 9, rx: 2 }));
        svg.appendChild(svgEl('path', { d: 'M8 11 V8 A4 4 0 0 1 16 8 V11' }));
        break;
      case 'auto':
        svg.appendChild(svgEl('path', { d: 'M17 7 A7 7 0 1 0 19 13 M17 3 V7 H13' }));
        break;
      case 'sword':
        svg.appendChild(svgEl('path', { d: 'M19 5 L8 16 M6 14 L10 18 M5 19 L8 16' }));
        break;
      case 'summon':
        svg.appendChild(svgEl('polygon', { points: '12,3 14.5,9.5 21,12 14.5,14.5 12,21 9.5,14.5 3,12 9.5,9.5' }));
        break;
      case 'book':
        svg.appendChild(svgEl('path', { d: 'M4 5 H11 A2 2 0 0 1 13 7 V19 A2 2 0 0 0 11 17 H4 Z' }));
        svg.appendChild(svgEl('path', { d: 'M20 5 H13 A2 2 0 0 0 11 7 V19 A2 2 0 0 1 13 17 H20 Z' }));
        break;
      case 'settings':
        svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 3.2 }));
        svg.appendChild(svgEl('path', { d: 'M12 3 V5 M12 19 V21 M3 12 H5 M19 12 H21 M5.6 5.6 L7 7 M17 17 L18.4 18.4 M18.4 5.6 L17 7 M7 17 L5.6 18.4' }));
        break;
      case 'compass':
        svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 9 }));
        svg.appendChild(svgEl('polygon', { points: '15,9 13,13 9,15 11,11' }));
        break;
      case 'warning':
        svg.appendChild(svgEl('polygon', { points: '12,4 21,19 3,19' }));
        svg.appendChild(svgEl('path', { d: 'M12 10 V14 M12 16.8 V17' }));
        break;
      case 'party':
        svg.appendChild(svgEl('rect', { x: 4, y: 4, width: 7, height: 7, rx: 1.5 }));
        svg.appendChild(svgEl('rect', { x: 13, y: 4, width: 7, height: 7, rx: 1.5 }));
        svg.appendChild(svgEl('rect', { x: 4, y: 13, width: 7, height: 7, rx: 1.5 }));
        svg.appendChild(svgEl('rect', { x: 13, y: 13, width: 7, height: 7, rx: 1.5 }));
        break;
      case 'enhance':
        svg.appendChild(svgEl('polygon', { points: '12,3 19,10 12,21 5,10' }));
        svg.appendChild(svgEl('path', { d: 'M9 11 L12 8 L15 11 M9 15 L12 12 L15 15' }));
        break;
      case 'check':
        svg.appendChild(svgEl('path', { d: 'M5 13 L10 18 L19 7' }));
        break;
      case 'crystal':
        svg.appendChild(svgEl('polygon', { points: '12,3 19,8 19,16 12,21 5,16 5,8' }));
        svg.appendChild(svgEl('path', { d: 'M12 3 V21 M5 8 L19 16 M19 8 L5 16' }));
        break;
      default:
        svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 6 }));
        break;
    }
    return svg;
  }

  IkaiApp.SvgIcons = Object.freeze({
    createRoleIcon,
    createBuffIcon,
    createEquipIcon,
    createUiIcon
  });
})(typeof window !== 'undefined' ? window : globalThis);
