import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_CHROME_PATH =
  process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export const VIEWPORT_WIDTH = 390;
export const VIEWPORT_HEIGHT = 844;
export const SPLIT_Y = 422;

export const MOBILE_VIEWPORT = Object.freeze({
  width: VIEWPORT_WIDTH,
  height: VIEWPORT_HEIGHT,
  deviceScaleFactor: 3,
  mobile: true,
  screenWidth: VIEWPORT_WIDTH,
  screenHeight: VIEWPORT_HEIGHT
});

export const R5_PROHIBITED_TEXT_PATTERNS = Object.freeze([
  { id: 'lv_abbr', label: 'Lv表記', regex: /(?<![A-Za-z])lv(?:\.?(?![A-Za-z])|(?:MAX|Up)(?![A-Za-z]))/i },
  { id: 'level_word', label: 'レベル表記', regex: /レベル/ },
  { id: 'formation', label: '陣形', regex: /陣形|前衛|後衛|前列|後列/ },
  { id: 'daily', label: 'デイリー', regex: /デイリー|日課ミッション/ },
  { id: 'weekly', label: 'ウィークリー', regex: /ウィークリー|週間ミッション/ },
  { id: 'monthly', label: 'マンスリー', regex: /マンスリー|月間ミッション/ },
  { id: 'achievement', label: '実績', regex: /実績|アチーブメント/ },
  { id: 'pvp', label: 'PvP', regex: /\bPvP\b|闘技場|対人戦|アリーナ/i },
  { id: 'hacking_op', label: 'オプション厳選', regex: /オプション厳選|ランダムOP|ランダムオプション/ },
  { id: 'ellipsis_jp', label: '省略記号(・・・)', regex: /・・・|\.\.\.|…/ },
  { id: 'meta_dev', label: '開発メタ発言', regex: /テスト版|デバッグ用|買い切り仕様|プロトタイプ版|未実装ダミー|実装仕様/ }
]);

export const R5_RASTER_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|ico)(\?|$|#)/i;

const MIME_MAP = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8'
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSafeRmSync(targetDir) {
  if (!targetDir || !fs.existsSync(targetDir)) return;
  try {
    fs.rmSync(targetDir, { recursive: true, force: true, maxRetries: 15, retryDelay: 100 });
  } catch {
    // Best-effort Windows cleanup; retry once more after short pause if needed
    try {
      fs.rmSync(targetDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
    } catch {
      // Ignore if already removed
    }
  }
}

/**
 * Start a local 127.0.0.1:0 static HTTP server with traversal protection,
 * strict MIME types, and hit logging (for Service Worker offline verification).
 */
export async function startStaticServer(rootDir) {
  const absRoot = path.resolve(rootDir);
  const hits = [];

  const server = http.createServer((req, res) => {
    const method = req.method || 'GET';
    const rawUrl = req.url || '/';
    let reqPath = '/';
    try {
      const parsed = new URL(rawUrl, 'http://127.0.0.1');
      reqPath = decodeURIComponent(parsed.pathname);
    } catch {
      hits.push({ method, url: rawUrl, status: 400, ts: Date.now() });
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Request');
      return;
    }

    if (reqPath === '/') {
      reqPath = '/index.html';
    }

    const normalized = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.resolve(absRoot, '.' + (normalized.startsWith(path.sep) ? normalized : path.sep + normalized));

    if (!filePath.startsWith(absRoot + path.sep) && filePath !== absRoot) {
      hits.push({ method, url: rawUrl, status: 403, ts: Date.now() });
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    let finalPath = filePath;
    if (fs.existsSync(finalPath) && fs.statSync(finalPath).isDirectory()) {
      finalPath = path.join(finalPath, 'index.html');
    }

    if (!fs.existsSync(finalPath) || !fs.statSync(finalPath).isFile()) {
      hits.push({ method, url: rawUrl, status: 404, ts: Date.now() });
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(finalPath).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const body = fs.readFileSync(finalPath);
    hits.push({ method, url: rawUrl, status: 200, ts: Date.now() });
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/'
    });
    res.end(body);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    port,
    baseUrl,
    getHits: () => hits.slice(),
    resetHits: () => {
      hits.length = 0;
    },
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      })
  };
}

function readDevToolsActivePortSafe(userDataDir) {
  const portFile = path.join(userDataDir, 'DevToolsActivePort');
  try {
    const content = fs.readFileSync(portFile, 'utf8');
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const port = Number(lines[0]);
      const wsPath = lines[1];
      if (Number.isInteger(port) && port > 0 && wsPath.startsWith('/')) {
        return `ws://127.0.0.1:${port}${wsPath}`;
      }
    }
  } catch {
    // Ignore ENOENT / EBUSY during Chrome startup
  }
  return null;
}

async function waitForWsUrl(proc, userDataDir, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let stderrBuffer = '';

  return await new Promise((resolve, reject) => {
    let settled = false;
    let pollTimer = null;

    const finish = (err, wsUrl) => {
      if (settled) return;
      settled = true;
      if (pollTimer) clearInterval(pollTimer);
      proc.stderr?.off('data', onStderr);
      proc.off('exit', onExit);
      if (err) reject(err);
      else resolve(wsUrl);
    };

    const onStderr = (chunk) => {
      stderrBuffer += chunk.toString('utf8');
      const match = stderrBuffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        finish(null, match[1].trim());
      }
    };

    const onExit = (code, signal) => {
      finish(new Error(`Chrome exited prematurely (code=${code}, signal=${signal}). stderr:\n${stderrBuffer}`));
    };

    proc.stderr?.on('data', onStderr);
    proc.once('exit', onExit);

    pollTimer = setInterval(() => {
      const fromFile = readDevToolsActivePortSafe(userDataDir);
      if (fromFile) {
        finish(null, fromFile);
        return;
      }
      if (Date.now() > deadline) {
        finish(new Error(`Timed out waiting for Chrome DevTools WebSocket URL (${timeoutMs}ms). stderr:\n${stderrBuffer}`));
      }
    }, 30);
  });
}

export class CdpBrowser {
  constructor({ proc, ws, userDataDir, ownUserDataDir }) {
    this.proc = proc;
    this.ws = ws;
    this.userDataDir = userDataDir;
    this.ownUserDataDir = ownUserDataDir;
    this.nextId = 1;
    this.pending = new Map();
    this.eventListeners = new Map();
    this.attachedTargets = new Map(); // targetId -> sessionId
    this.sessionMeta = new Map(); // sessionId -> { targetId, type, url }
    this.swSessions = new Map(); // sessionId -> { targetId, url }
    this.pageSessionId = null;
    this.isOffline = false;
    this.closed = false;
    this._closePromise = null;
    this.diagnostics = this._createEmptyDiagnostics();

    this.ws.addEventListener('message', (event) => {
      this._handleMessage(event.data);
    });
    this.ws.addEventListener('close', () => {
      for (const [, entry] of this.pending) {
        clearTimeout(entry.timer);
        entry.reject(new Error('CDP WebSocket closed'));
      }
      this.pending.clear();
    });
  }

  _createEmptyDiagnostics() {
    return {
      consoleErrors: [],
      consoleWarnings: [],
      exceptions: [],
      cspViolations: [],
      networkErrors: [],
      dialogs: [],
      securityStates: []
    };
  }

  static async launch(options = {}) {
    const {
      chromePath = DEFAULT_CHROME_PATH,
      userDataDir: providedUserDataDir,
      viewport = MOBILE_VIEWPORT,
      emulateSafeArea = null,
      maskCryptoSubtle = false,
      timeoutMs = 15000
    } = options;

    if (!fs.existsSync(chromePath)) {
      throw new Error(`Chrome executable not found at: ${chromePath}`);
    }

    const ownUserDataDir = !providedUserDataDir;
    const userDataDir =
      providedUserDataDir || fs.mkdtempSync(path.join(os.tmpdir(), 'ikai-cdp-profile-'));

    const args = [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-extensions',
      '--disable-sync',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--mute-audio',
      '--allow-file-access-from-files',
      'about:blank'
    ];

    const proc = spawn(chromePath, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true
    });

    let browser = null;
    try {
      const wsUrl = await waitForWsUrl(proc, userDataDir, timeoutMs);
      const ws = new WebSocket(wsUrl);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('WebSocket open timeout')), timeoutMs);
        ws.addEventListener('open', () => {
          clearTimeout(timer);
          resolve();
        }, { once: true });
        ws.addEventListener('error', (err) => {
          clearTimeout(timer);
          reject(new Error(`WebSocket error: ${err?.message || 'unknown'}`));
        }, { once: true });
      });

      browser = new CdpBrowser({ proc, ws, userDataDir, ownUserDataDir });
      await browser._initialize({ viewport, emulateSafeArea, maskCryptoSubtle });
      return browser;
    } catch (err) {
      if (browser) {
        await browser.close();
      } else {
        try {
          if (proc.pid && proc.exitCode === null) {
            if (process.platform === 'win32') {
              spawnSync('taskkill', ['/F', '/T', '/PID', String(proc.pid)], { stdio: 'ignore' });
            } else {
              proc.kill('SIGKILL');
            }
          }
        } catch {
          // ignore
        }
        if (ownUserDataDir) getSafeRmSync(userDataDir);
      }
      throw err;
    }
  }

  _handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
    } catch {
      return;
    }

    if (typeof msg.id === 'number') {
      const entry = this.pending.get(msg.id);
      if (entry) {
        this.pending.delete(msg.id);
        clearTimeout(entry.timer);
        if (msg.error) {
          entry.reject(new Error(`CDP ${entry.method} failed (${msg.error.code}): ${msg.error.message}`));
        } else {
          entry.resolve(msg.result);
        }
      }
      return;
    }

    const { method, params, sessionId } = msg;
    if (method === 'Target.attachedToTarget') {
      this._onTargetAttached(params);
    } else if (method === 'Target.detachedFromTarget') {
      this._onTargetDetached(params);
    } else if (method === 'Runtime.consoleAPICalled' && sessionId === this.pageSessionId) {
      const text = (params.args || [])
        .map((a) => (a.value !== undefined ? String(a.value) : a.description || a.type || ''))
        .join(' ');
      if (params.type === 'error') {
        this.diagnostics.consoleErrors.push({ text, ts: Date.now(), args: params.args });
      } else if (params.type === 'warning') {
        this.diagnostics.consoleWarnings.push({ text, ts: Date.now() });
      }
    } else if (method === 'Runtime.exceptionThrown' && sessionId === this.pageSessionId) {
      const details = params.exceptionDetails || {};
      const text = details.exception?.description || details.text || 'Uncaught exception';
      this.diagnostics.exceptions.push({
        text,
        lineNumber: details.lineNumber,
        columnNumber: details.columnNumber,
        url: details.url,
        ts: Date.now()
      });
    } else if (method === 'Log.entryAdded' && sessionId === this.pageSessionId) {
      const entry = params.entry || {};
      if (entry.source === 'security') {
        this.diagnostics.cspViolations.push({
          source: 'cdp_log',
          level: entry.level,
          text: entry.text,
          url: entry.url,
          lineNumber: entry.lineNumber,
          ts: Date.now()
        });
      } else if (entry.source === 'network' && entry.level === 'error') {
        this.diagnostics.networkErrors.push({
          text: entry.text,
          url: entry.url,
          ts: Date.now()
        });
      }
    } else if (method === 'Page.javascriptDialogOpening' && sessionId === this.pageSessionId) {
      this.diagnostics.dialogs.push({
        type: params.type,
        message: params.message,
        ts: Date.now()
      });
      this.send('Page.handleJavaScriptDialog', { accept: false }).catch(() => {});
    } else if (method === 'Security.securityStateChanged' && sessionId === this.pageSessionId) {
      this.diagnostics.securityStates.push({
        securityState: params.securityState,
        summary: params.summary,
        ts: Date.now()
      });
    }

    const listeners = this.eventListeners.get(method);
    if (listeners) {
      for (const fn of [...listeners]) {
        try {
          fn(params, sessionId);
        } catch {
          // ignore listener errors
        }
      }
    }
  }

  _onTargetAttached(params) {
    const { sessionId, targetInfo } = params || {};
    if (!sessionId || !targetInfo) return;
    const { targetId, type, url } = targetInfo;

    this.attachedTargets.set(targetId, sessionId);
    this.sessionMeta.set(sessionId, { targetId, type, url });

    if (type === 'service_worker' && !String(url || '').startsWith('chrome-extension://')) {
      this.swSessions.set(sessionId, { targetId, url });
      // Ensure SW network is enabled and offline state synced if currently offline
      this.send('Network.enable', {}, sessionId)
        .then(() => {
          if (this.isOffline) {
            return this.send(
              'Network.emulateNetworkConditions',
              { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
              sessionId
            );
          }
          return null;
        })
        .catch(() => {});
    }
  }

  _onTargetDetached(params) {
    const { sessionId, targetId } = params || {};
    if (targetId) this.attachedTargets.delete(targetId);
    if (sessionId) {
      this.sessionMeta.delete(sessionId);
      this.swSessions.delete(sessionId);
    }
  }

  on(method, fn) {
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, new Set());
    }
    this.eventListeners.get(method).add(fn);
    return () => this.eventListeners.get(method)?.delete(fn);
  }

  async send(method, params = {}, sessionId = this.pageSessionId, timeoutMs = 15000) {
    if (this.closed) {
      throw new Error(`Cannot send ${method}: CdpBrowser is closed`);
    }
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) {
      payload.sessionId = sessionId;
    }

    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout after ${timeoutMs}ms: ${method}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer, method });
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  async _initialize({ viewport, emulateSafeArea, maskCryptoSubtle }) {
    await this.send(
      'Target.setAutoAttach',
      { autoAttach: true, waitForDebuggerOnStart: false, flatten: true },
      null
    );

    const { targetInfos } = await this.send('Target.getTargets', {}, null);
    let pageTarget = (targetInfos || []).find((t) => t.type === 'page');
    if (!pageTarget) {
      const created = await this.send('Target.createTarget', { url: 'about:blank' }, null);
      pageTarget = { targetId: created.targetId, type: 'page', url: 'about:blank' };
    }

    // Deduplicate against Target.setAutoAttach
    let pageSessionId = this.attachedTargets.get(pageTarget.targetId);
    if (!pageSessionId) {
      const attached = await this.send(
        'Target.attachToTarget',
        { targetId: pageTarget.targetId, flatten: true },
        null
      );
      pageSessionId = attached.sessionId;
      this.attachedTargets.set(pageTarget.targetId, pageSessionId);
      this.sessionMeta.set(pageSessionId, {
        targetId: pageTarget.targetId,
        type: 'page',
        url: pageTarget.url
      });
    }
    this.pageSessionId = pageSessionId;

    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Log.enable');
    await this.send('Network.enable');
    try {
      await this.send('Security.enable');
    } catch {
      // Optional domain in some contexts
    }

    const initLines = [
      `window.__e2eCspViolations = [];`,
      `document.addEventListener('securitypolicyviolation', (ev) => {`,
      `  window.__e2eCspViolations.push({`,
      `    source: 'dom_spv',`,
      `    violatedDirective: ev.violatedDirective || ev.effectiveDirective || '',`,
      `    blockedURI: ev.blockedURI || '',`,
      `    sourceFile: ev.sourceFile || '',`,
      `    lineNumber: ev.lineNumber || 0`,
      `  });`,
      `});`
    ];

    if (maskCryptoSubtle) {
      initLines.push(
        `try {`,
        `  if (window.crypto) {`,
        `    Object.defineProperty(window.crypto, 'subtle', { get: () => undefined, configurable: true });`,
        `  }`,
        `} catch (_) {}`
      );
    }

    if (
      emulateSafeArea &&
      (emulateSafeArea.top !== undefined ||
        emulateSafeArea.bottom !== undefined ||
        emulateSafeArea.left !== undefined ||
        emulateSafeArea.right !== undefined)
    ) {
      const topPx = Number(emulateSafeArea.top ?? 0);
      const bottomPx = Number(emulateSafeArea.bottom ?? 0);
      const leftPx = Number(emulateSafeArea.left ?? 0);
      const rightPx = Number(emulateSafeArea.right ?? 0);
      initLines.push(
        `document.addEventListener('DOMContentLoaded', () => {`,
        `  const r = document.documentElement;`,
        `  r.style.setProperty('--safe-top', '${topPx}px');`,
        `  r.style.setProperty('--safe-bottom', '${bottomPx}px');`,
        `  r.style.setProperty('--safe-left', '${leftPx}px');`,
        `  r.style.setProperty('--safe-right', '${rightPx}px');`,
        `  r.style.setProperty('--sat', '${topPx}px');`,
        `  r.style.setProperty('--sab', '${bottomPx}px');`,
        `  r.style.setProperty('--sal', '${leftPx}px');`,
        `  r.style.setProperty('--sar', '${rightPx}px');`,
        `  r.style.setProperty('--safe-area-inset-top', '${topPx}px');`,
        `  r.style.setProperty('--safe-area-inset-bottom', '${bottomPx}px');`,
        `  r.style.setProperty('--safe-area-inset-left', '${leftPx}px');`,
        `  r.style.setProperty('--safe-area-inset-right', '${rightPx}px');`,
        `});`
      );
    }

    await this.send('Page.addScriptToEvaluateOnNewDocument', {
      source: initLines.join('\n')
    });

    await this.setViewport(viewport);
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  }

  async setViewport(viewport = MOBILE_VIEWPORT) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor ?? 3,
      mobile: viewport.mobile ?? true,
      screenWidth: viewport.screenWidth ?? viewport.width,
      screenHeight: viewport.screenHeight ?? viewport.height
    });
  }

  async navigate(url, { timeoutMs = 15000, settleMs = 150 } = {}) {
    let loaded = false;
    const waitLoad = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new Error(`Page loadEventFired timeout (${timeoutMs}ms) for ${url}`));
      }, timeoutMs);
      const off = this.on('Page.loadEventFired', (_params, sid) => {
        if (sid === this.pageSessionId) {
          loaded = true;
          clearTimeout(timer);
          off();
          resolve();
        }
      });
    });

    const navRes = await this.send('Page.navigate', { url });
    if (navRes?.errorText && !loaded) {
      throw new Error(`Navigation error for ${url}: ${navRes.errorText}`);
    }
    await waitLoad;
    if (settleMs > 0) await sleep(settleMs);
  }

  async reload({ ignoreCache = false, timeoutMs = 15000, settleMs = 150 } = {}) {
    const waitLoad = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new Error(`Page reload loadEventFired timeout (${timeoutMs}ms)`));
      }, timeoutMs);
      const off = this.on('Page.loadEventFired', (_params, sid) => {
        if (sid === this.pageSessionId) {
          clearTimeout(timer);
          off();
          resolve();
        }
      });
    });

    await this.send('Page.reload', { ignoreCache });
    await waitLoad;
    if (settleMs > 0) await sleep(settleMs);
  }

  async eval(expression, { awaitPromise = true, timeoutMs = 10000 } = {}) {
    const res = await this.send(
      'Runtime.evaluate',
      {
        expression,
        awaitPromise,
        returnByValue: true
      },
      this.pageSessionId,
      timeoutMs
    );

    if (res.exceptionDetails) {
      const desc =
        res.exceptionDetails.exception?.description ||
        res.exceptionDetails.text ||
        'Evaluation failed';
      throw new Error(`Browser eval error: ${desc}`);
    }
    return res.result?.value;
  }

  async evalFn(fn, ...args) {
    const serializedArgs = args.map((a) => JSON.stringify(a)).join(',');
    const expr = `(${fn.toString()})(${serializedArgs})`;
    return await this.eval(expr);
  }

  async waitFor(fn, { timeoutMs = 10000, intervalMs = 60, label = 'condition' } = {}, ...args) {
    const deadline = Date.now() + timeoutMs;
    let lastErr = null;
    while (Date.now() <= deadline) {
      try {
        const res = await this.evalFn(fn, ...args);
        if (res) return res;
      } catch (err) {
        lastErr = err;
      }
      await sleep(intervalMs);
    }
    throw new Error(
      `Timed out waiting for ${label} (${timeoutMs}ms)` + (lastErr ? `: ${lastErr.message}` : '')
    );
  }

  /**
   * 4-layer Opaque-box control locator:
   * P1: ARIA/interactive role + Japanese label regex
   * P2: data-testid fallback
   * P3: CSS selector fallback
   */
  async queryControl(spec, options = {}) {
    const normalized =
      typeof spec === 'string'
        ? { selector: spec, scrollIntoView: Boolean(options.scrollIntoView) }
        : {
            labelRegex: spec.labelRegex instanceof RegExp ? spec.labelRegex.source : spec.labelRegex,
            labelFlags: spec.labelRegex instanceof RegExp ? spec.labelRegex.flags : spec.labelFlags || '',
            testId: Array.isArray(spec.testId) ? spec.testId : spec.testId ? [spec.testId] : [],
            selector: spec.selector || '',
            scope: spec.scope || 'any', // 'lower' | 'upper' | 'any'
            index: spec.index ?? 0,
            scrollIntoView: Boolean(options.scrollIntoView || spec.scrollIntoView)
          };

    return await this.evalFn((cfg) => {
      const isVisible = (el) => {
        if (!el) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };

      const toPlain = (el, layer) => {
        if (cfg.scrollIntoView && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          found: true,
          layer,
          tagName: el.tagName.toLowerCase(),
          testId: el.getAttribute('data-testid') || '',
          text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
          ariaLabel: el.getAttribute('aria-label') || '',
          disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
          pointerEvents: cs.pointerEvents,
          rect: {
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height
          }
        };
      };

      const scopeRoot =
        cfg.scope === 'lower'
          ? document.querySelector('.lower-deck') || document
          : cfg.scope === 'upper'
            ? document.querySelector('.upper-stage') || document
            : document;

      // P1: ARIA / Interactive elements + Japanese label regex
      if (cfg.labelRegex) {
        const re = new RegExp(cfg.labelRegex, cfg.labelFlags || '');
        const candidates = [
          ...scopeRoot.querySelectorAll(
            'button, [role="button"], [role="tab"], a, select, input, textarea, label, [tabindex]'
          )
        ].filter((el) => {
          if (!isVisible(el)) return false;
          const label = (el.getAttribute('aria-label') || el.textContent || '')
            .replace(/\s+/g, ' ')
            .trim();
          return re.test(label);
        });
        if (candidates.length > cfg.index) {
          return toPlain(candidates[cfg.index], 'P1_ARIA_LABEL');
        }
      }

      // P2: data-testid fallback
      for (const tid of cfg.testId || []) {
        const els = [...scopeRoot.querySelectorAll(`[data-testid="${tid}"]`)].filter(isVisible);
        if (els.length > cfg.index) {
          return toPlain(els[cfg.index], 'P2_TESTID');
        }
      }

      // P3: CSS selector fallback
      if (cfg.selector) {
        const els = [...scopeRoot.querySelectorAll(cfg.selector)].filter(isVisible);
        if (els.length > cfg.index) {
          return toPlain(els[cfg.index], 'P3_SELECTOR');
        }
      }

      return { found: false };
    }, normalized);
  }

  async tapPoint(x, y) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    await this.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: rx, y: ry, radiusX: 2, radiusY: 2, force: 1, id: 1 }]
    });
    await this.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });
  }

  async tap(targetOrSpec) {
    const info = await this.queryControl(targetOrSpec, { scrollIntoView: true });
    if (!info?.found) {
      throw new Error(`tap() target not found: ${JSON.stringify(targetOrSpec)}`);
    }
    const cx = info.rect.left + info.rect.width / 2;
    const cy = info.rect.top + info.rect.height / 2;
    await this.tapPoint(cx, cy);
    await sleep(40);
    return info;
  }

  async selectValue(targetOrSpec, valueOrTextRegex) {
    const info = await this.queryControl(targetOrSpec);
    if (!info?.found) {
      throw new Error(`selectValue() target not found: ${JSON.stringify(targetOrSpec)}`);
    }
    const spec =
      typeof targetOrSpec === 'string'
        ? { selector: targetOrSpec, index: 0 }
        : {
            labelRegex: targetOrSpec.labelRegex instanceof RegExp ? targetOrSpec.labelRegex.source : targetOrSpec.labelRegex,
            labelFlags: targetOrSpec.labelRegex instanceof RegExp ? targetOrSpec.labelRegex.flags : targetOrSpec.labelFlags || '',
            testId: Array.isArray(targetOrSpec.testId) ? targetOrSpec.testId : targetOrSpec.testId ? [targetOrSpec.testId] : [],
            selector: targetOrSpec.selector || '',
            scope: targetOrSpec.scope || 'any',
            index: targetOrSpec.index ?? 0
          };

    const reSource = valueOrTextRegex instanceof RegExp ? valueOrTextRegex.source : null;
    const reFlags = valueOrTextRegex instanceof RegExp ? valueOrTextRegex.flags : '';
    const exactVal = valueOrTextRegex instanceof RegExp ? null : String(valueOrTextRegex);

    const changed = await this.evalFn((cfg, reSrc, reFlg, valStr) => {
      const isVisible = (el) => {
        if (!el) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const root =
        cfg.scope === 'lower'
          ? document.querySelector('.lower-deck') || document
          : cfg.scope === 'upper'
            ? document.querySelector('.upper-stage') || document
            : document;
      const idx = cfg.index ?? 0;
      let el = null;

      // P1: ARIA / label regex
      if (cfg.labelRegex) {
        const re = new RegExp(cfg.labelRegex, cfg.labelFlags || '');
        const candidates = [];
        for (const node of root.querySelectorAll('select, label')) {
          if (!isVisible(node)) continue;
          let resolved = node;
          if (node.tagName.toLowerCase() === 'label') {
            const ctrl = node.control || node.querySelector('select');
            if (!ctrl || !isVisible(ctrl)) continue;
            resolved = ctrl;
          }
          if (resolved.tagName.toLowerCase() !== 'select') continue;
          const lbl = (resolved.getAttribute('aria-label') || node.textContent || '').replace(/\s+/g, ' ').trim();
          if (re.test(lbl) && !candidates.includes(resolved)) {
            candidates.push(resolved);
          }
        }
        if (candidates.length > idx) el = candidates[idx];
      }

      // P2: data-testid
      if (!el) {
        for (const tid of cfg.testId || []) {
          const els = [...root.querySelectorAll(`[data-testid="${tid}"]`)].filter(isVisible);
          if (els.length > idx) {
            el = els[idx];
            break;
          }
        }
      }

      // P3: CSS selector
      if (!el && cfg.selector) {
        const els = [...root.querySelectorAll(cfg.selector)].filter(isVisible);
        if (els.length > idx) el = els[idx];
      }
      if (!el) return { ok: false, reason: 'not_found' };

      if (el.tagName.toLowerCase() === 'select') {
        const re = reSrc ? new RegExp(reSrc, reFlg || '') : null;
        const opt = [...el.options].find((o) =>
          re ? re.test(o.textContent || '') || re.test(o.value) : o.value === valStr || (o.textContent || '').trim() === valStr
        );
        if (!opt) return { ok: false, reason: 'option_not_found' };
        el.value = opt.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true, value: el.value, label: opt.textContent };
      }
      return { ok: false, reason: 'not_select' };
    }, spec, reSource, reFlags, exactVal);

    if (!changed?.ok) {
      throw new Error(`selectValue failed: ${JSON.stringify(changed)}`);
    }
    return changed;
  }

  async setInputValue(targetOrSpec, value) {
    const spec =
      typeof targetOrSpec === 'string'
        ? { selector: targetOrSpec, index: 0 }
        : {
            labelRegex: targetOrSpec.labelRegex instanceof RegExp ? targetOrSpec.labelRegex.source : targetOrSpec.labelRegex,
            labelFlags: targetOrSpec.labelRegex instanceof RegExp ? targetOrSpec.labelRegex.flags : targetOrSpec.labelFlags || '',
            testId: Array.isArray(targetOrSpec.testId) ? targetOrSpec.testId : targetOrSpec.testId ? [targetOrSpec.testId] : [],
            selector: targetOrSpec.selector || '',
            scope: targetOrSpec.scope || 'any',
            index: targetOrSpec.index ?? 0
          };

    const res = await this.evalFn((cfg, val) => {
      const isVisible = (el) => {
        if (!el) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const root =
        cfg.scope === 'lower'
          ? document.querySelector('.lower-deck') || document
          : cfg.scope === 'upper'
            ? document.querySelector('.upper-stage') || document
            : document;
      const idx = cfg.index ?? 0;
      let el = null;

      // P1: ARIA / label regex
      if (cfg.labelRegex) {
        const re = new RegExp(cfg.labelRegex, cfg.labelFlags || '');
        const candidates = [];
        for (const node of root.querySelectorAll('input, textarea, select, label')) {
          if (!isVisible(node)) continue;
          let resolved = node;
          if (node.tagName.toLowerCase() === 'label') {
            const ctrl = node.control || node.querySelector('input, textarea, select');
            if (!ctrl || !isVisible(ctrl)) continue;
            resolved = ctrl;
          }
          const lbl = (resolved.getAttribute('aria-label') || node.textContent || '').replace(/\s+/g, ' ').trim();
          if (re.test(lbl) && !candidates.includes(resolved)) {
            candidates.push(resolved);
          }
        }
        if (candidates.length > idx) el = candidates[idx];
      }

      // P2: data-testid
      if (!el) {
        for (const tid of cfg.testId || []) {
          const els = [...root.querySelectorAll(`[data-testid="${tid}"]`)].filter(isVisible);
          if (els.length > idx) {
            el = els[idx];
            break;
          }
        }
      }

      // P3: CSS selector
      if (!el && cfg.selector) {
        const els = [...root.querySelectorAll(cfg.selector)].filter(isVisible);
        if (els.length > idx) el = els[idx];
      }
      if (!el) return { ok: false, reason: 'not_found' };
      el.value = String(val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, value: el.value };
    }, spec, String(value));

    if (!res?.ok) {
      throw new Error(`setInputValue failed: ${JSON.stringify(res)}`);
    }
    return res;
  }

  async setOffline(offline) {
    this.isOffline = Boolean(offline);
    const params = {
      offline: this.isOffline,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1
    };

    await this.send('Network.enable');
    await this.send('Network.emulateNetworkConditions', params);

    for (const [sid] of this.swSessions) {
      try {
        await this.send('Network.enable', {}, sid);
        await this.send('Network.emulateNetworkConditions', params, sid);
      } catch {
        // SW session might have terminated cleanly
      }
    }
  }

  async waitForServiceWorkerReady(timeoutMs = 10000) {
    const safeTimeout = Math.max(1, Number(timeoutMs) || 10000);
    return await this.eval(
      `(async () => {
        if (!('serviceWorker' in navigator)) return { supported: false };
        const deadline = Date.now() + ${safeTimeout};
        let readyTimer = null;
        const reg = await Promise.race([
          navigator.serviceWorker.ready.finally(() => {
            if (readyTimer !== null) {
              clearTimeout(readyTimer);
              readyTimer = null;
            }
          }),
          new Promise((_, rej) => {
            readyTimer = setTimeout(() => rej(new Error('SW ready timeout')), ${safeTimeout});
          })
        ]);
        const active = reg.active;
        if (active && active.state !== 'activated') {
          if (active.state === 'redundant') {
            throw new Error('SW became redundant before activation');
          }
          await new Promise((resolve, reject) => {
            let timer = null;
            const cleanup = () => {
              active.removeEventListener('statechange', onStateChange);
              if (timer !== null) {
                clearTimeout(timer);
                timer = null;
              }
            };
            const onStateChange = () => {
              if (active.state === 'activated') {
                cleanup();
                resolve();
              } else if (active.state === 'redundant') {
                cleanup();
                reject(new Error('SW became redundant before activation'));
              }
            };
            active.addEventListener('statechange', onStateChange);
            if (active.state === 'activated') {
              cleanup();
              resolve();
              return;
            }
            if (active.state === 'redundant') {
              cleanup();
              reject(new Error('SW became redundant before activation'));
              return;
            }
            const remaining = deadline - Date.now();
            if (remaining <= 0) {
              cleanup();
              reject(new Error('SW activation timeout (state=' + active.state + ')'));
              return;
            }
            timer = setTimeout(() => {
              cleanup();
              reject(new Error('SW activation timeout (state=' + active.state + ')'));
            }, remaining);
          });
        }
        return {
          supported: true,
          scope: reg.scope,
          activeState: reg.active ? reg.active.state : null,
          hasController: Boolean(navigator.serviceWorker.controller)
        };
      })()`,
      { awaitPromise: true, timeoutMs: safeTimeout + 2000 }
    );
  }

  clearDiagnostics() {
    this.diagnostics = this._createEmptyDiagnostics();
    return this.eval('Array.isArray(window.__e2eCspViolations = [])').catch(() => false);
  }

  async getDiagnostics() {
    let domSpv = [];
    try {
      domSpv = (await this.eval('Array.isArray(window.__e2eCspViolations) ? window.__e2eCspViolations : []')) || [];
    } catch {
      domSpv = [];
    }

    return {
      consoleErrors: this.diagnostics.consoleErrors.slice(),
      consoleWarnings: this.diagnostics.consoleWarnings.slice(),
      exceptions: this.diagnostics.exceptions.slice(),
      cspViolations: [...this.diagnostics.cspViolations, ...domSpv],
      networkErrors: this.diagnostics.networkErrors.slice(),
      dialogs: this.diagnostics.dialogs.slice(),
      securityStates: this.diagnostics.securityStates.slice()
    };
  }

  async assertZeroErrors({ allowFavicon404 = true } = {}) {
    const d = await this.getDiagnostics();
    const filteredNet = allowFavicon404
      ? d.networkErrors.filter((e) => !String(e.url || '').endsWith('/favicon.ico'))
      : d.networkErrors;

    const problems = [];
    if (d.consoleErrors.length) problems.push(`consoleErrors(${d.consoleErrors.length}): ${JSON.stringify(d.consoleErrors)}`);
    if (d.exceptions.length) problems.push(`exceptions(${d.exceptions.length}): ${JSON.stringify(d.exceptions)}`);
    if (d.cspViolations.length) problems.push(`cspViolations(${d.cspViolations.length}): ${JSON.stringify(d.cspViolations)}`);
    if (d.dialogs.length) problems.push(`dialogs(${d.dialogs.length}): ${JSON.stringify(d.dialogs)}`);
    if (filteredNet.length) problems.push(`networkErrors(${filteredNet.length}): ${JSON.stringify(filteredNet)}`);

    assert.equal(problems.length, 0, `Expected zero browser errors, got:\n${problems.join('\n')}`);
    return d;
  }

  async auditUpperLowerSplit({ expectedWidth = VIEWPORT_WIDTH, expectedHeight = VIEWPORT_HEIGHT } = {}) {
    return await this.evalFn((expW, expH) => {
      const violations = [];
      const w = window.innerWidth;
      const h = window.innerHeight;
      const half = h / 2;

      if (w !== expW || h !== expH) {
        violations.push(`viewport mismatch: innerWidth=${w}, innerHeight=${h}, expected=${expW}x${expH}`);
      }

      const upper = document.querySelector('.upper-stage');
      const lower = document.querySelector('.lower-deck');
      const shell = document.querySelector('.app-shell');

      if (!upper) violations.push('missing .upper-stage');
      if (!lower) violations.push('missing .lower-deck');

      const serializeRect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      };

      const getVisibleRect = (el) => {
        const r = el.getBoundingClientRect();
        let left = r.left;
        let top = r.top;
        let right = r.right;
        let bottom = r.bottom;
        let cur = el;
        while (cur && cur !== document.documentElement) {
          const curCs = getComputedStyle(cur);
          if (curCs.position === 'fixed') {
            break;
          }
          const parent = cur.parentElement;
          if (!parent || parent === document.documentElement) {
            break;
          }
          const pCs = getComputedStyle(parent);
          const clipsY =
            pCs.overflowY === 'hidden' ||
            pCs.overflowY === 'clip' ||
            pCs.overflowY === 'auto' ||
            pCs.overflowY === 'scroll';
          const clipsX =
            pCs.overflowX === 'hidden' ||
            pCs.overflowX === 'clip' ||
            pCs.overflowX === 'auto' ||
            pCs.overflowX === 'scroll';
          if ((clipsY || clipsX) && !(curCs.position === 'absolute' && pCs.position === 'static')) {
            const pr = parent.getBoundingClientRect();
            if (clipsX) {
              left = Math.max(left, pr.left);
              right = Math.min(right, pr.right);
            }
            if (clipsY) {
              top = Math.max(top, pr.top);
              bottom = Math.min(bottom, pr.bottom);
            }
          }
          cur = parent;
        }
        left = Math.max(left, 0);
        top = Math.max(top, 0);
        right = Math.min(right, w);
        bottom = Math.min(bottom, h);
        return {
          left,
          top,
          right,
          bottom,
          width: Math.max(0, right - left),
          height: Math.max(0, bottom - top)
        };
      };

      const upperRect = serializeRect(upper);
      const lowerRect = serializeRect(lower);
      const shellRect = serializeRect(shell);

      if (shellRect && Math.abs(shellRect.top) > 1) {
        violations.push(`app-shell top offset drift: ${shellRect.top}`);
      }

      if (upper && upperRect) {
        const uStyle = getComputedStyle(upper);
        if (uStyle.pointerEvents !== 'none') {
          violations.push(`.upper-stage pointerEvents must be 'none', got '${uStyle.pointerEvents}'`);
        }
        if (uStyle.overflow !== 'hidden' && (uStyle.overflowY !== 'hidden' || uStyle.overflowX !== 'hidden')) {
          violations.push(`.upper-stage overflow must be hidden, got '${uStyle.overflow}'`);
        }
        if (upperRect.top > 1) {
          violations.push(`.upper-stage top expected ~0, got ${upperRect.top}`);
        }
        if (upperRect.bottom > half + 0.5) {
          violations.push(`.upper-stage bottom (${upperRect.bottom}) exceeds 50% boundary (${half})`);
        }
      }

      if (lower && lowerRect) {
        if (lowerRect.top < half - 0.5) {
          violations.push(`.lower-deck top (${lowerRect.top}) intrudes into upper 50% (< ${half})`);
        }
      }

      // Check all visible interactive elements across entire document (respecting overflow clipping, fixed escapes)
      const interactive = [
        ...document.querySelectorAll(
          'button, a[href], input, select, textarea, [role="button"], [role="tab"], [tabindex], [onclick]'
        )
      ];
      for (const el of interactive) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const vr = getVisibleRect(el);
        if (vr.width === 0 || vr.height === 0) continue;
        if (vr.top < half - 0.5) {
          violations.push(
            `interactive element in upper 50%: <${el.tagName.toLowerCase()}> "${(el.textContent || '').trim().slice(0, 20)}" top=${vr.top}`
          );
        }
      }

      // Enforce pointer-events: none on .upper-stage and all visible descendants
      if (upper) {
        for (const el of [upper, ...upper.querySelectorAll('*')]) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const vr = getVisibleRect(el);
          if (vr.width === 0 && vr.height === 0) continue;
          if (cs.pointerEvents !== 'none') {
            violations.push(`non-none pointer-events in .upper-stage: <${el.tagName.toLowerCase()}> (${cs.pointerEvents})`);
          }
        }
      }

      // Check all DOM elements overlapping upper 50% for vertical or horizontal scrollability
      const allDom = document.body ? [...document.body.querySelectorAll('*')] : [];
      for (const el of allDom) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const vr = getVisibleRect(el);
        if (vr.width === 0 || vr.height === 0) continue;
        if (vr.top < half - 0.5) {
          const canScrollY = cs.overflowY === 'scroll' || (cs.overflowY === 'auto' && el.scrollHeight > el.clientHeight + 1);
          const canScrollX = cs.overflowX === 'scroll' || (cs.overflowX === 'auto' && el.scrollWidth > el.clientWidth + 1);
          if (canScrollY || canScrollX) {
            violations.push(
              `scrollable element in upper 50%: <${el.tagName.toLowerCase()}> top=${vr.top} (scrollY=${canScrollY}, scrollX=${canScrollX})`
            );
          }
        }
      }

      const horizontalOverflow = document.documentElement.scrollWidth > w + 1;
      if (horizontalOverflow) {
        violations.push(`horizontal overflow: scrollWidth=${document.documentElement.scrollWidth} > ${w}`);
      }

      const verticalOverflow =
        document.documentElement.scrollHeight > h + 1 ||
        (document.body && document.body.scrollHeight > h + 1);
      if (verticalOverflow) {
        violations.push(
          `vertical overflow: docScrollHeight=${document.documentElement.scrollHeight}, bodyScrollHeight=${document.body?.scrollHeight} > ${h}`
        );
      }

      return {
        ok: violations.length === 0,
        violations,
        metrics: {
          innerWidth: w,
          innerHeight: h,
          half,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          shellRect,
          upperRect,
          lowerRect
        }
      };
    }, expectedWidth, expectedHeight);
  }

  async auditNoEllipsisAndOverflow() {
    return await this.evalFn(() => {
      const ellipsisHits = [];
      const overflowHits = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let node;
      while ((node = walker.nextNode())) {
        const tagUpper = node.tagName ? node.tagName.toUpperCase() : '';
        if (tagUpper === 'SCRIPT' || tagUpper === 'STYLE' || tagUpper === 'NOSCRIPT' || tagUpper === 'TEMPLATE') {
          continue;
        }
        if (tagUpper === 'SVG' || node.closest('svg')) {
          continue;
        }
        const cs = getComputedStyle(node);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = node.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;

        if (cs.textOverflow === 'ellipsis') {
          ellipsisHits.push({
            tag: node.tagName.toLowerCase(),
            testId: node.getAttribute('data-testid') || '',
            text: (node.textContent || '').trim().slice(0, 30)
          });
        }

        const directText = [...node.childNodes]
          .filter((c) => c.nodeType === Node.TEXT_NODE)
          .map((c) => c.textContent || '')
          .join('');
        if (/・・・|\.\.\.|…/.test(directText)) {
          ellipsisHits.push({
            tag: node.tagName.toLowerCase(),
            reason: 'ellipsis_glyph',
            text: directText.trim().slice(0, 40)
          });
        }

        if (tagUpper !== 'INPUT' && tagUpper !== 'TEXTAREA' && tagUpper !== 'SELECT') {
          if (cs.display !== 'inline') {
            const hasDirect = directText.trim().length > 0;
            const clipsText =
              (cs.overflowX === 'hidden' || cs.overflowX === 'clip') &&
              (node.textContent || '').trim().length > 0;
            if ((hasDirect || clipsText) && node.scrollWidth > node.clientWidth + 1) {
              overflowHits.push({
                tag: node.tagName.toLowerCase(),
                testId: node.getAttribute('data-testid') || '',
                className: typeof node.className === 'string' ? node.className : '',
                scrollWidth: node.scrollWidth,
                clientWidth: node.clientWidth,
                text: (node.textContent || '').trim()
              });
            }
          } else if (directText.trim().length > 0) {
            let p = node.parentElement;
            while (p && getComputedStyle(p).display === 'inline') {
              p = p.parentElement;
            }
            if (p) {
              const pr = p.getBoundingClientRect();
              const range = document.createRange();
              range.selectNodeContents(node);
              const rects = [...range.getClientRects()];
              const over = rects.some(
                (lr) => lr.width > 0 && lr.height > 0 && (lr.right > pr.right + 1 || lr.left < pr.left - 1)
              );
              if (over) {
                overflowHits.push({
                  tag: node.tagName.toLowerCase(),
                  reason: 'inline_overflow',
                  testId: node.getAttribute('data-testid') || '',
                  className: typeof node.className === 'string' ? node.className : '',
                  parentWidth: Math.round(pr.width),
                  text: (node.textContent || '').trim()
                });
              }
            }
          }
        }
      }

      return {
        ok: ellipsisHits.length === 0 && overflowHits.length === 0,
        ellipsisHits,
        overflowHits
      };
    });
  }

  async auditProhibitedContent(extraPatterns = []) {
    const serializedPatterns = [
      ...R5_PROHIBITED_TEXT_PATTERNS.map((p) => ({ id: p.id, label: p.label, source: p.regex.source, flags: p.regex.flags })),
      ...extraPatterns.map((p, idx) => ({
        id: p.id || `extra_${idx}`,
        label: p.label || `extra_${idx}`,
        source: p.regex instanceof RegExp ? p.regex.source : String(p),
        flags: p.regex instanceof RegExp ? p.regex.flags : ''
      }))
    ];

    return await this.evalFn((patterns) => {
      const textHits = [];
      const mediaHits = [];

      const imgs = [...document.querySelectorAll('img, canvas')];
      for (const el of imgs) {
        const src = el.getAttribute('src') || '';
        mediaHits.push({ tag: el.tagName.toLowerCase(), src: src.slice(0, 80) });
      }

      // Check SVG elements for prohibited raster embedded images or huge/portrait-style svgs
      for (const svg of document.querySelectorAll('svg')) {
        if (svg.querySelector('image')) {
          mediaHits.push({ tag: 'svg>image', src: 'embedded_image' });
          continue;
        }
        const cs = getComputedStyle(svg);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = svg.getBoundingClientRect();
        const shapes = svg.querySelectorAll('path, circle, ellipse, polygon, polyline, rect').length;
        const aria = svg.getAttribute('aria-label') || '';
        const inPortrait = Boolean(svg.closest('[class*="portrait"], [class*="illust"], [class*="avatar"], [class*="stand"]'));
        if (
          (r.width >= 100 && r.height >= 100) ||
          (r.height >= 80 && r.height >= r.width * 1.25 && shapes >= 2) ||
          inPortrait ||
          /立ち絵|イラスト|肖像|portrait|illust/i.test(aria)
        ) {
          mediaHits.push({
            tag: 'svg_portrait',
            width: Math.round(r.width),
            height: Math.round(r.height),
            shapes,
            aria
          });
        }
      }

      const fullText = document.body ? document.body.innerText || '' : '';
      for (const p of patterns) {
        const re = new RegExp(p.source, p.flags || '');
        const m = fullText.match(re);
        if (m) {
          textHits.push({ id: p.id, label: p.label, match: m[0] });
        }
      }

      return {
        ok: textHits.length === 0 && mediaHits.length === 0,
        textHits,
        mediaHits
      };
    }, serializedPatterns);
  }

  async close() {
    if (this._closePromise) {
      return this._closePromise;
    }
    this.closed = true;
    this._closePromise = this._performClose();
    return this._closePromise;
  }

  async _performClose() {
    try {
      await Promise.race([
        (async () => {
          const id = this.nextId++;
          if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ id, method: 'Browser.close', params: {} }));
          }
        })(),
        sleep(1200)
      ]);
    } catch {
      // ignore
    }

    try {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
    } catch {
      // ignore
    }

    if (this.proc && this.proc.exitCode === null) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 2500);
        this.proc.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }

    if (this.proc && this.proc.exitCode === null && this.proc.pid) {
      try {
        if (process.platform === 'win32') {
          spawnSync('taskkill', ['/F', '/T', '/PID', String(this.proc.pid)], { stdio: 'ignore' });
        } else {
          this.proc.kill('SIGKILL');
        }
      } catch {
        // ignore
      }
      await sleep(100);
    }

    if (this.ownUserDataDir) {
      getSafeRmSync(this.userDataDir);
    }
  }
}

/**
 * Resolve project paths and environment overrides shared by Tiers 1-4.
 */
export function resolveProjectContext(projectDirOverride) {
  const defaultDir = path.resolve(import.meta.dirname, '..');
  const projectDir = path.resolve(projectDirOverride || process.env.IKAI_PROJECT_DIR || defaultDir);
  const indexHtmlPath = path.join(projectDir, 'index.html');
  const fileUrl = process.env.IKAI_FILE_URL || pathToFileURL(indexHtmlPath).href;
  return {
    projectDir,
    indexHtmlPath,
    fileUrl,
    baseUrl: process.env.IKAI_BASE_URL || null,
    mode: process.env.IKAI_TEST_MODE || 'both'
  };
}

/**
 * Wait for `window.IkaiApp` async `App.boot()` completion and lower-deck DOM readiness.
 */
export async function waitForIkaiBooted(browser, { timeoutMs = 10000 } = {}) {
  await browser.waitFor(
    () =>
      Boolean(
        window.IkaiApp &&
          window.IkaiApp.StateStore &&
          window.IkaiApp.MasterData &&
          (window.IkaiApp.App?.getUiState ? window.IkaiApp.App.getUiState().booted : true) &&
          document.querySelector('.lower-deck button, .lower-deck [role="tab"]')
      ),
    { timeoutMs, label: 'window.IkaiApp booted and lower-deck rendered' }
  );
}

/**
 * Convenience helper to navigate & verify `window.IkaiApp` boot.
 */
export async function bootIkaiApp(browser, url, { clearStorage = false } = {}) {
  browser.clearDiagnostics();
  await browser.navigate(url);
  if (clearStorage) {
    await browser.eval('(() => { localStorage.clear(); return localStorage.length === 0; })()');
    await browser.reload();
  }
  await waitForIkaiBooted(browser);
}

export const EXPECTED_SORT_ORDER_NAMES = Object.freeze([
  '桐生 貴史',
  '氷室 宗一郎',
  '神崎 澪',
  '九条 蓮司',
  '水無瀬 栞',
  '白石 澄花',
  '藤堂 誠一',
  '天野 颯太',
  '黒田 千尋',
  '桜井 凛',
  '長谷川 悠人',
  '穂積 沙耶',
  '宮本 紬',
  '石井 大輝',
  '村上 健太',
  '小林 翔平',
  '渡辺 葵',
  '斉藤 莉子',
  '高橋 拓海',
  '中村 結衣'
]);

export const TAB_SPECS = Object.freeze({
  sortie: { labelRegex: /^出撃$/, testId: 'tab-sortie' },
  party: { labelRegex: /^編成$/, testId: 'tab-party' },
  enhance: { labelRegex: /^強化$/, testId: 'tab-enhance' },
  expedition: { labelRegex: /^調査$/, testId: 'tab-expedition' },
  summon: { labelRegex: /^召喚$/, testId: 'tab-summon' },
  codex: { labelRegex: /^図鑑$/, testId: 'tab-codex' },
  settings: { labelRegex: /^設定$/, testId: 'tab-settings' }
});

export async function openTab(browser, tabKey) {
  const spec = TAB_SPECS[tabKey];
  if (!spec) throw new Error(`Unknown tabKey: ${tabKey}`);
  await browser.tap({ labelRegex: spec.labelRegex, testId: spec.testId, scope: 'lower' });
  await sleep(60);
}

function stripJsCommentsAndExtractStrings(src) {
  let codeWithoutComments = '';
  const stringLiterals = [];
  let i = 0;
  const n = src.length;
  let lastSignificant = '';

  while (i < n) {
    const ch = src[i];
    const next = i + 1 < n ? src[i + 1] : '';

    // Line comment
    if (ch === '/' && next === '/') {
      i += 2;
      while (i < n && src[i] !== '\n') i += 1;
      continue;
    }
    // Block comment
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 2;
      codeWithoutComments += ' ';
      continue;
    }
    // String or template literal
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let val = '';
      let raw = ch;
      i += 1;
      while (i < n) {
        const c = src[i];
        raw += c;
        if (c === '\\' && i + 1 < n) {
          val += c + src[i + 1];
          raw += src[i + 1];
          i += 2;
          continue;
        }
        if (c === quote) {
          i += 1;
          break;
        }
        val += c;
        i += 1;
      }
      stringLiterals.push(val);
      codeWithoutComments += raw;
      lastSignificant = quote;
      continue;
    }
    // Heuristic regex literal skip so quotes inside /.../ don't confuse string parser
    if (ch === '/' && (!lastSignificant || '(=[,:;!&|?{}~+-*/%^<>'.includes(lastSignificant))) {
      let raw = '/';
      let inClass = false;
      i += 1;
      while (i < n) {
        const c = src[i];
        raw += c;
        if (c === '\\' && i + 1 < n) {
          raw += src[i + 1];
          i += 2;
          continue;
        }
        if (c === '[') inClass = true;
        else if (c === ']') inClass = false;
        else if (c === '/' && !inClass) {
          i += 1;
          break;
        } else if (c === '\n') {
          break;
        }
        i += 1;
      }
      codeWithoutComments += raw;
      lastSignificant = '/';
      continue;
    }

    codeWithoutComments += ch;
    if (!/\s/.test(ch)) {
      lastSignificant = ch;
    }
    i += 1;
  }

  return { codeWithoutComments, stringLiterals };
}

/**
 * Scan static app files (excluding tests/ and docs/) for R5 prohibited rules.
 */
export function scanStaticR5(projectDir) {
  const violations = [];
  const rasterRefs = [];
  const ellipsisCssHits = [];
  const prohibitedWordsHits = [];

  const targetFiles = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      const rel = path.relative(projectDir, full).replace(/\\/g, '/');
      if (ent.isDirectory()) {
        if (ent.name === 'tests' || ent.name === 'docs' || ent.name === '.git' || ent.name === 'node_modules') {
          continue;
        }
        walk(full);
      } else if (/\.(html|css|js|json|webmanifest|svg)$/i.test(ent.name)) {
        targetFiles.push({ full, rel });
      }
    }
  };
  walk(projectDir);

  const checkPatternsOnText = (rel, text, contextLabel) => {
    if (!text) return;
    for (const pat of R5_PROHIBITED_TEXT_PATTERNS) {
      const m = text.match(pat.regex);
      if (m) {
        prohibitedWordsHits.push({
          file: rel,
          id: pat.id,
          context: contextLabel,
          match: m[0].slice(0, 60)
        });
      }
    }
  };

  for (const { full, rel } of targetFiles) {
    const content = fs.readFileSync(full, 'utf8');

    if (rel.endsWith('.css')) {
      if (/text-overflow\s*:\s*ellipsis/i.test(content)) {
        ellipsisCssHits.push(rel);
      }
    }

    if (/\.(html|css|js|json|webmanifest)$/i.test(rel)) {
      const rasterMatch = content.match(/\.(png|jpe?g|webp|gif|bmp)(\?|"|'|$)/i);
      if (rasterMatch || /data:image\/(png|jpeg|webp|gif)/i.test(content)) {
        rasterRefs.push({ file: rel, match: rasterMatch?.[0] || 'data:image' });
      }
    }

    if (rel.endsWith('.js')) {
      let jsSource = content;
      if (rel === 'js/save-security.js') {
        jsSource = jsSource.replace(
          /const\s+FORBIDDEN_KEYS\s*=\s*new\s+Set\(\s*\[[^\]]*\]\s*\)\s*;?/g,
          'const FORBIDDEN_KEYS = new Set([]);'
        );
      }
      const { codeWithoutComments, stringLiterals } = stripJsCommentsAndExtractStrings(jsSource);

      // Check JS textOverflow = 'ellipsis' assignments
      if (
        /text-overflow\s*:\s*ellipsis/i.test(codeWithoutComments) ||
        /textOverflow\s*(?:=|:)\s*['"`]ellipsis['"`]/i.test(codeWithoutComments) ||
        /\[['"`]textOverflow['"`]\]\s*=\s*['"`]ellipsis['"`]/i.test(codeWithoutComments)
      ) {
        ellipsisCssHits.push(`${rel} (JS textOverflow)`);
      }

      // Check 'レベル' anywhere in stripped JS
      const levelIdentMatch = codeWithoutComments.match(/レベル/);
      if (levelIdentMatch) {
        prohibitedWordsHits.push({
          file: rel,
          id: 'level_word',
          context: 'js_code',
          match: levelIdentMatch[0]
        });
      }

      // Check all string & template literals against R5_PROHIBITED_TEXT_PATTERNS
      for (const lit of stringLiterals) {
        checkPatternsOnText(rel, lit, 'js_string');
      }
    } else if (rel.endsWith('.json') || rel.endsWith('.webmanifest')) {
      const { stringLiterals } = stripJsCommentsAndExtractStrings(content);
      for (const lit of stringLiterals) {
        checkPatternsOnText(rel, lit, 'json_string');
      }
    } else if (rel.endsWith('.html') || rel.endsWith('.svg')) {
      const noComments = content.replace(/<!--[\s\S]*?-->/g, '');
      if (
        /text-overflow\s*:\s*ellipsis/i.test(noComments) ||
        /textOverflow\s*(?:=|:)\s*['"`]ellipsis['"`]/i.test(noComments)
      ) {
        ellipsisCssHits.push(`${rel} (HTML style)`);
      }
      // Extract inline <script> / <style> blocks if any
      const bodyWithoutScriptStyle = noComments.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
      // Text nodes
      const textNodes = bodyWithoutScriptStyle.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      checkPatternsOnText(rel, textNodes, 'html_text');
      // Quoted attribute values
      for (const attrMatch of bodyWithoutScriptStyle.matchAll(/["']([^"']*)["']/g)) {
        checkPatternsOnText(rel, attrMatch[1], 'html_attr');
      }
      // Also check any inline <script> content if present
      for (const scriptMatch of noComments.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
        if (scriptMatch[1].trim()) {
          const { stringLiterals } = stripJsCommentsAndExtractStrings(scriptMatch[1]);
          for (const lit of stringLiterals) {
            checkPatternsOnText(rel, lit, 'inline_script');
          }
        }
      }
    }
  }

  // Check index.html CSP
  const indexHtmlPath = path.join(projectDir, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    const html = fs.readFileSync(indexHtmlPath, 'utf8');
    const cspMatch = html.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content=(?:"([^"]+)"|'([^']+)')/i);
    if (!cspMatch) {
      violations.push('index.html missing Content-Security-Policy meta tag');
    } else {
      const csp = cspMatch[1] ?? cspMatch[2] ?? '';
      if (/'unsafe-inline'|'unsafe-eval'/i.test(csp)) {
        violations.push(`CSP contains unsafe directive: ${csp}`);
      }
    }
  }

  return {
    ok:
      violations.length === 0 &&
      rasterRefs.length === 0 &&
      ellipsisCssHits.length === 0 &&
      prohibitedWordsHits.length === 0,
    filesScanned: targetFiles.length,
    violations,
    rasterRefs,
    ellipsisCssHits,
    prohibitedWordsHits
  };
}

/**
 * Self-test mode: verifies CDP launch, 390x844 viewport, upper/lower 50% split,
 * scrolled .lower-scroll non-false-positive, CSP violation capture,
 * Service Worker offline fetch (0 HTTP hits), and concurrent close() clean teardown.
 */
export async function runSelfTest() {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ikai-harness-selftest-'));
  let server = null;
  let browser = null;
  let capturedUserDataDir = null;

  try {
    const appHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;">
  <title>異界残響録 SelfTest</title>
  <link rel="stylesheet" href="./style.css">
  <script defer src="./app.js"></script>
</head>
<body>
  <div class="app-shell">
    <section class="upper-stage">
      <div class="char-name" data-name="true">氷室 宗一郎</div>
      <div id="upper-probe">上半分表示</div>
    </section>
    <main class="lower-deck">
      <div class="lower-scroll">
        <button id="lower-btn" data-testid="lower-action" type="button">出撃開始</button>
        <div id="click-log">0:0</div>
        <div class="scroll-spacer"></div>
        <button id="lower-btn-2" type="button">下端項目</button>
      </div>
    </main>
  </div>
</body>
</html>`;

    const styleCss = `
html, body, .app-shell {
  margin: 0; padding: 0; position: fixed; inset: 0; overflow: hidden; overscroll-behavior: none;
  background: #090C12; color: #E2E8F0;
}
.app-shell { display: grid; grid-template-rows: minmax(0, 1fr) minmax(0, 1fr); }
.upper-stage { pointer-events: none; overflow: hidden; }
.lower-deck { overflow: hidden; display: flex; flex-direction: column; }
.lower-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; }
.scroll-spacer { height: 600px; }
.char-name { white-space: nowrap; }
#upper-probe { height: 40px; width: 120px; }
`;

    const appJs = `
window.__upperHits = 0;
window.__lowerHits = 0;
document.getElementById('upper-probe').addEventListener('click', () => { window.__upperHits++; });
document.getElementById('lower-btn').addEventListener('click', () => {
  window.__lowerHits++;
  document.getElementById('click-log').textContent = window.__upperHits + ':' + window.__lowerHits;
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
`;

    const cspBadHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self';">
  <title>CSP Test</title>
</head>
<body>
  <script>window.__inlineExecuted = true;</script>
</body>
</html>`;

    const swJs = `
const CACHE = 'selftest-v1';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './style.css', './app.js', './offline-data.json'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
`;

    fs.writeFileSync(path.join(fixtureDir, 'index.html'), appHtml, 'utf8');
    fs.writeFileSync(path.join(fixtureDir, 'style.css'), styleCss, 'utf8');
    fs.writeFileSync(path.join(fixtureDir, 'app.js'), appJs, 'utf8');
    fs.writeFileSync(path.join(fixtureDir, 'csp-bad.html'), cspBadHtml, 'utf8');
    fs.writeFileSync(path.join(fixtureDir, 'sw.js'), swJs, 'utf8');
    fs.writeFileSync(path.join(fixtureDir, 'offline-data.json'), JSON.stringify({ ok: true, title: '異界残響録' }), 'utf8');

    server = await startStaticServer(fixtureDir);
    browser = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
    capturedUserDataDir = browser.userDataDir;

    // 1. Mobile viewport 390x844 + DPR 3 + split audit
    await browser.navigate(`${server.baseUrl}/index.html`);
    const metrics = await browser.eval('({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio })');
    assert.deepEqual(metrics, { w: 390, h: 844, dpr: 3 });

    const splitAudit = await browser.auditUpperLowerSplit();
    assert.equal(splitAudit.ok, true, `Split audit failed: ${splitAudit.violations.join('; ')}`);

    const ellipsisAudit = await browser.auditNoEllipsisAndOverflow();
    assert.equal(ellipsisAudit.ok, true, `Ellipsis audit failed: ${JSON.stringify(ellipsisAudit)}`);

    // 2. Tap upper (must remain 0) & tap lower via P1 label regex (must become 1)
    await browser.tapPoint(60, 40);
    await browser.tap({ labelRegex: /出撃開始/, scope: 'lower' });
    const hits = await browser.eval('({ u: window.__upperHits, l: window.__lowerHits })');
    assert.deepEqual(hits, { u: 0, l: 1 });
    await browser.assertZeroErrors();

    // 2b. Scroll .lower-scroll so #lower-btn moves above y=422 (clipped by .lower-scroll); audit must remain ok: true
    const scrolledTop = await browser.eval(`(() => {
      const sc = document.querySelector('.lower-scroll');
      sc.scrollTop = 200;
      return sc.scrollTop;
    })()`);
    assert.ok(scrolledTop > 0, 'Expected .lower-scroll.scrollTop > 0 in self-test');
    const splitAfterScroll = await browser.auditUpperLowerSplit();
    assert.equal(splitAfterScroll.ok, true, `Scrolled .lower-scroll false positive: ${splitAfterScroll.violations.join('; ')}`);

    // 3. SW ready + reload under controller + true offline check (0 server hits)
    const swState = await browser.waitForServiceWorkerReady(10000);
    assert.equal(swState.activeState, 'activated');
    await browser.reload();
    const ctrl = await browser.eval('Boolean(navigator.serviceWorker.controller)');
    assert.equal(ctrl, true, 'ServiceWorker must control page after reload');

    await browser.setOffline(true);
    server.resetHits();
    const cachedFetch = await browser.eval(`fetch('./offline-data.json').then(r => r.json())`);
    assert.equal(cachedFetch.ok, true);
    const uncachedRes = await browser.eval(`fetch('./uncached-xyz.json').then(() => ({ ok: true })).catch(e => ({ ok: false, msg: e.message }))`);
    assert.equal(uncachedRes.ok, false);
    assert.equal(server.getHits().length, 0, `Expected 0 server hits while offline, got ${server.getHits().length}`);
    await browser.setOffline(false);

    // 4. CSP violation detection check
    browser.clearDiagnostics();
    await browser.navigate(`${server.baseUrl}/csp-bad.html`);
    const inlineRan = await browser.eval('Boolean(window.__inlineExecuted)');
    assert.equal(inlineRan, false, 'CSP must block inline script');
    const diag = await browser.getDiagnostics();
    assert.ok(diag.cspViolations.length >= 1, 'CSP violation must be captured in diagnostics');

    // 5. Concurrent close() clean teardown verification
    const [, existsAfterConcurrentSecond] = await Promise.all([
      browser.close(),
      browser.close().then(() => fs.existsSync(capturedUserDataDir))
    ]);
    browser = null;
    assert.equal(existsAfterConcurrentSecond, false, 'Concurrent second close() must await temp userDataDir removal');
    assert.equal(fs.existsSync(capturedUserDataDir), false, 'Temp userDataDir must be removed after close()');

    return { ok: true, checks: 6 };
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
    getSafeRmSync(fixtureDir);
  }
}

if (process.argv.includes('--self-test')) {
  runSelfTest()
    .then((res) => {
      console.log(JSON.stringify({ selfTest: 'passed', ...res }));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err?.stack || String(err));
      process.exit(1);
    });
}
