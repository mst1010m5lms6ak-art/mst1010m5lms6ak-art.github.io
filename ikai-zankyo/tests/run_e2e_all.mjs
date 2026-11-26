import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { run as runNodeTest } from 'node:test';
import { pathToFileURL } from 'node:url';
import { DEFAULT_CHROME_PATH, startStaticServer } from './cdp_harness.mjs';

const TESTS_DIR = import.meta.dirname;

const TIER_FILES = Object.freeze({
  1: { file: 'e2e_tier1_features.mjs', minTests: 75 },
  2: { file: 'e2e_tier2_boundaries.mjs', minTests: 75 },
  3: { file: 'e2e_tier3_pairwise.mjs', minTests: 16 },
  4: { file: 'e2e_tier4_scenarios.mjs', minTests: 8 }
});

const ALL_MJS_FILES = Object.freeze([
  'cdp_harness.mjs',
  'e2e_tier1_features.mjs',
  'e2e_tier2_boundaries.mjs',
  'e2e_tier3_pairwise.mjs',
  'e2e_tier4_scenarios.mjs',
  'run_e2e_all.mjs'
]);

function parseArgs(argv) {
  const opts = {
    tiers: [1, 2, 3, 4],
    dryRun: false,
    json: false,
    mode: 'both',
    projectDir: path.resolve(TESTS_DIR, '..'),
    timeoutMs: 120000
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg.startsWith('--tier=')) {
      const raw = arg.slice('--tier='.length).trim();
      if (raw === 'all') {
        opts.tiers = [1, 2, 3, 4];
      } else {
        const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
        if (parts.length === 0) throw new Error(`Invalid --tier argument: ${arg}`);
        const parsed = [];
        for (const p of parts) {
          const n = Number(p);
          if (!Number.isInteger(n) || n < 1 || n > 4) {
            throw new Error(`Out-of-range tier "${p}" (allowed: 1..4)`);
          }
          if (!parsed.includes(n)) parsed.push(n);
        }
        opts.tiers = parsed;
      }
    } else if (arg.startsWith('--project-dir=')) {
      opts.projectDir = path.resolve(arg.slice('--project-dir='.length));
    } else if (arg.startsWith('--timeout-ms=')) {
      const ms = Number(arg.slice('--timeout-ms='.length));
      if (!Number.isFinite(ms) || ms <= 0) {
        throw new Error(`Invalid --timeout-ms: ${arg}`);
      }
      opts.timeoutMs = ms;
    } else if (arg.startsWith('--mode=')) {
      const m = arg.slice('--mode='.length).trim();
      if (!['file', 'http', 'both'].includes(m)) {
        throw new Error(`Invalid --mode "${m}" (allowed: file|http|both)`);
      }
      opts.mode = m;
    } else {
      throw new Error(`Unknown CLI argument: ${arg}`);
    }
  }
  return opts;
}

function countTestCasesInFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const matches = stripped.match(/(?:^|\s)it\s*\(/gm);
  return matches ? matches.length : 0;
}

function inspectAppReadiness(projectDir) {
  const indexPath = path.join(projectDir, 'index.html');
  const appExists = fs.existsSync(indexPath);
  if (!appExists) {
    return { appExists: false, appReady: false, appStatus: 'pending_m3', missingAssets: ['index.html'] };
  }

  const html = fs.readFileSync(indexPath, 'utf8');
  const scriptSrcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
  const missingAssets = [];
  for (const s of scriptSrcs) {
    const resolved = path.resolve(projectDir, s);
    if (!fs.existsSync(resolved)) missingAssets.push(s);
  }
  const hasAppJs = scriptSrcs.some((s) => s.includes('app.js'));
  const hasCombatJs = scriptSrcs.some((s) => s.includes('combat-engine.js'));
  const appReady = missingAssets.length === 0 && hasAppJs && hasCombatJs;

  return {
    appExists: true,
    appReady,
    appStatus: appReady ? 'ready' : 'pending_m3',
    missingAssets
  };
}

function getChromeVersionLabel(chromePath = DEFAULT_CHROME_PATH) {
  if (!fs.existsSync(chromePath)) {
    return 'unavailable';
  }
  const verRes = spawnSync(chromePath, ['--version'], { encoding: 'utf8', timeout: 3000 });
  const verText = `${verRes.stdout || ''} ${verRes.stderr || ''}`;
  const m = verText.match(/(\d+\.\d+\.\d+\.\d+)/);
  if (m) return m[1];

  if (process.platform === 'win32') {
    const psRes = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-Command', '(Get-Item -LiteralPath $env:IKAI_CHROME_EXE).VersionInfo.ProductVersion'],
      { encoding: 'utf8', timeout: 4000, env: { ...process.env, IKAI_CHROME_EXE: chromePath } }
    );
    const pm = (psRes.stdout || '').trim().match(/(\d+\.\d+\.\d+\.\d+)/);
    if (pm) return pm[1];
  }
  return 'unknown';
}

function emitOutput(payload, jsonMode) {
  if (jsonMode) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  } else {
    console.log(`=== Ikai Zankyo E2E Runner (${payload.mode}, testMode=${payload.testMode || 'both'}) ===`);
    console.log(`Project: ${payload.projectDir} (appExists=${payload.appExists}, status=${payload.appStatus})`);
    for (const t of payload.tiers || []) {
      console.log(`  Tier ${t.tier} (${t.file}): passed=${t.passed ?? t.registeredCount}, failed=${t.failed ?? 0}`);
    }
    console.log(`Result: ok=${payload.ok}`);
  }
}

async function runDryRun(opts) {
  const log = (msg) => {
    if (opts.json) process.stderr.write(`[dry-run] ${msg}\n`);
    else console.log(`[dry-run] ${msg}`);
  };
  process.env.IKAI_TEST_MODE = opts.mode;

  // 1. node --check across all 6 .mjs files
  const syntaxChecks = [];
  for (const name of ALL_MJS_FILES) {
    const full = path.join(TESTS_DIR, name);
    log(`Checking syntax: ${name}`);
    const r = spawnSync(process.execPath, ['--check', full], { encoding: 'utf8' });
    syntaxChecks.push({ file: name, ok: r.status === 0, stderr: (r.stderr || '').trim() });
    if (r.status !== 0) {
      const payload = {
        mode: 'dry-run',
        testMode: opts.mode,
        runtime: { node: process.version, chrome: getChromeVersionLabel() },
        projectDir: opts.projectDir,
        ...inspectAppReadiness(opts.projectDir),
        syntaxChecks,
        ok: false,
        error: `Syntax check failed for ${name}: ${r.stderr}`
      };
      emitOutput(payload, opts.json);
      return 1;
    }
  }

  // 2. Execute cdp_harness.mjs --self-test
  log('Running cdp_harness.mjs --self-test...');
  const selfTestRes = spawnSync(process.execPath, [path.join(TESTS_DIR, 'cdp_harness.mjs'), '--self-test'], {
    encoding: 'utf8',
    timeout: opts.timeoutMs
  });
  let selfTestParsed = null;
  try {
    selfTestParsed = JSON.parse((selfTestRes.stdout || '').trim());
  } catch {
    selfTestParsed = { rawStdout: (selfTestRes.stdout || '').trim(), rawStderr: (selfTestRes.stderr || '').trim() };
  }
  const selfTestOk = selfTestRes.status === 0 && Boolean(selfTestParsed?.ok);

  // 3. Verify test counts across requested tiers without running tests against missing/incomplete app
  const tiers = [];
  let totalRegistered = 0;
  let countsOk = true;
  for (const tierNum of opts.tiers) {
    const meta = TIER_FILES[tierNum];
    const full = path.join(TESTS_DIR, meta.file);
    const count = countTestCasesInFile(full);
    const meetsMin = count >= meta.minTests;
    if (!meetsMin) countsOk = false;
    totalRegistered += count;
    tiers.push({
      tier: tierNum,
      file: meta.file,
      registeredCount: count,
      minRequired: meta.minTests,
      meetsMin
    });
  }

  const readiness = inspectAppReadiness(opts.projectDir);
  const ok = selfTestOk && countsOk && syntaxChecks.every((s) => s.ok);

  const payload = {
    mode: 'dry-run',
    testMode: opts.mode,
    runtime: { node: process.version, chrome: getChromeVersionLabel() },
    projectDir: opts.projectDir,
    ...readiness,
    syntaxChecks,
    selfTest: { ok: selfTestOk, details: selfTestParsed },
    tiers,
    totals: { registered: totalRegistered, failed: ok ? 0 : 1 },
    ok
  };

  emitOutput(payload, opts.json);
  return ok ? 0 : 1;
}

async function runLiveTier(tierNum, opts, baseUrl) {
  const meta = TIER_FILES[tierNum];
  const filePath = path.join(TESTS_DIR, meta.file);
  const start = Date.now();

  process.env.IKAI_PROJECT_DIR = opts.projectDir;
  process.env.IKAI_TEST_MODE = opts.mode;
  process.env.IKAI_BASE_URL = baseUrl || '';
  process.env.IKAI_FILE_URL = pathToFileURL(path.join(opts.projectDir, 'index.html')).href;

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const failures = [];

  const stream = runNodeTest({
    files: [filePath],
    concurrency: 1,
    timeout: opts.timeoutMs
  });

  for await (const ev of stream) {
    if (ev.type === 'test:pass') {
      if (ev.data?.details?.type !== 'suite') {
        passed++;
      }
    } else if (ev.type === 'test:fail') {
      if (ev.data?.details?.type !== 'suite') {
        failed++;
        failures.push({
          name: ev.data?.name || 'unknown',
          error: ev.data?.details?.error?.message || String(ev.data?.details?.error || 'failed')
        });
      }
    } else if (ev.type === 'test:skip') {
      if (ev.data?.details?.type !== 'suite') {
        skipped++;
      }
    }
  }

  return {
    tier: tierNum,
    file: meta.file,
    passed,
    failed,
    skipped,
    durationMs: Date.now() - start,
    failures
  };
}

async function runLive(opts) {
  process.env.IKAI_TEST_MODE = opts.mode;
  const readiness = inspectAppReadiness(opts.projectDir);
  if (!readiness.appExists) {
    const payload = {
      mode: 'live',
      testMode: opts.mode,
      status: 'missing_entrypoint',
      runtime: { node: process.version, chrome: getChromeVersionLabel() },
      projectDir: opts.projectDir,
      ...readiness,
      tiers: [],
      totals: { passed: 0, failed: 0, skipped: 0, durationMs: 0 },
      ok: false
    };
    emitOutput(payload, opts.json);
    return 2;
  }

  if (!fs.existsSync(DEFAULT_CHROME_PATH)) {
    const payload = {
      mode: 'live',
      testMode: opts.mode,
      status: 'missing_chrome',
      projectDir: opts.projectDir,
      ok: false,
      error: `Chrome not found at ${DEFAULT_CHROME_PATH}`
    };
    emitOutput(payload, opts.json);
    return 2;
  }

  const server = opts.mode === 'file' ? null : await startStaticServer(opts.projectDir);
  const tiers = [];
  const totalStart = Date.now();
  try {
    for (const tierNum of opts.tiers) {
      if (opts.json) process.stderr.write(`[live:${opts.mode}] Running Tier ${tierNum}...\n`);
      const res = await runLiveTier(tierNum, opts, server ? server.baseUrl : '');
      tiers.push(res);
    }
  } finally {
    if (server) await server.close();
  }

  const totals = {
    passed: tiers.reduce((s, t) => s + t.passed, 0),
    failed: tiers.reduce((s, t) => s + t.failed, 0),
    skipped: tiers.reduce((s, t) => s + t.skipped, 0),
    durationMs: Date.now() - totalStart
  };
  const ok = totals.failed === 0 && totals.passed > 0;

  const payload = {
    mode: 'live',
    testMode: opts.mode,
    runtime: { node: process.version, chrome: getChromeVersionLabel() },
    projectDir: opts.projectDir,
    ...readiness,
    tiers,
    totals,
    ok
  };

  emitOutput(payload, opts.json);
  return ok ? 0 : 1;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`Argument error: ${err.message}\n`);
    process.exit(2);
  }

  const code = opts.dryRun ? await runDryRun(opts) : await runLive(opts);
  process.exit(code);
}

main().catch((err) => {
  process.stderr.write((err?.stack || String(err)) + '\n');
  process.exit(2);
});
