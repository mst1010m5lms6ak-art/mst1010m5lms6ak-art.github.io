import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { requestPersistentStorage } from './engine/storage';
import './styles/base.css';
import './styles/theme.css';
import './styles/layout.css';

// iOS Safari 誤操作防止（コンテキストメニュー・ピンチズーム・ダブルタップズーム抑止）
window.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
  e.preventDefault();
});

document.addEventListener(
  'gesturestart',
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);

let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (e) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
    const now = Date.now();
    if (now - lastTouchEnd <= 280) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  },
  { passive: false }
);

// 永続ストレージ要求（オフラインPWAデータ保持強化）
requestPersistentStorage();

// オフライン対応 Service Worker 登録（ネイティブCapacitor外）
if (!('Capacitor' in window) && 'serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
