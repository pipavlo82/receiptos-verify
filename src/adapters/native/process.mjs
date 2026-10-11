import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateSourceManifest } from './pins.mjs';

const root = new URL('../../../', import.meta.url);
const limit = 4 * 1024 * 1024;
const pins = {
  crystal: '45b46bf7df3a60b32583291f577a36bf19d22f00',
  rvr: '9dd36e882dd372f264b77b179130948aa5adcbde',
  qev: '5de55f007ab5ce4cf5acb7fe79d7f755ff0fee05',
  qev_moth: '5de55f007ab5ce4cf5acb7fe79d7f755ff0fee05',
};
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function runNative(name, input) {
  const executable = name === 'crystal'
    ? (process.platform === 'win32' ? 'C:/Users/msi/.bun/bin/bun.exe' : 'bun') : 'python';
  const scripts = { crystal: './crystal-bridge.ts', rvr: './rvr-bridge.py', qev: './qev-bridge.py', qev_moth: './qev-moth-bridge.py' };
  const script = fileURLToPath(new URL(scripts[name] ?? './rvr-bridge.py', import.meta.url));
  const argv = name === 'crystal' ? [script] : ['-I', '-B', '-X', 'utf8', script];
  let payload;
  const temporary = fileURLToPath(new URL('work/native-temp/', root));
  try {
    if (!(name in pins)) throw new Error('Unknown fixed native adapter');
    payload = Buffer.from(JSON.stringify(input), 'utf8');
    if (payload.length > limit) throw new Error('Native input exceeds 4 MiB');
    const manifests = { qev: 'provenance/qev-sources.json', qev_moth: 'provenance/qev-moth-sources.json' };
    const source = JSON.parse(await readFile(new URL(manifests[name] ?? 'provenance/native-sources.json', root), 'utf8'))
      .sources.find((item) => item.adapter === name);
    validateSourceManifest(name, source);
    for (const file of source.files) {
      if (!file.vendoredPath.startsWith(`vendor/${name}/`) || file.vendoredPath.includes('..') || file.vendoredPath.includes('\\')) {
        throw new Error('Invalid fixed vendor path');
      }
      if (hash(await readFile(new URL(file.vendoredPath, root))) !== file.sha256) {
        throw new Error(`Native source integrity mismatch: ${file.sourcePath}`);
      }
    }
    if (name === 'qev_moth') await mkdir(temporary, { recursive: true });
  } catch (error) {
    const stderr = String(error.message);
    return { status: 'UNAVAILABLE', argv: [executable, ...argv], exitCode: null,
      stdout: '', stderr, stdoutSha256: hash(''), stderrSha256: hash(stderr),
      truncated: false, reason: 'NATIVE_SOURCE_OR_INPUT_UNAVAILABLE' };
  }
  return new Promise((resolve) => {
    const child = spawn(executable, argv, {
      cwd: fileURLToPath(root), windowsHide: true, shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONNOUSERSITE: '1',
        ...(name === 'qev_moth' ? { TMPDIR: temporary, TMP: temporary, TEMP: temporary,
          PATH: `${process.platform === 'win32' ? 'C:/Users/msi/.bun/bin;' : ''}${process.env.PATH ?? ''}` } : {}) },
    });
    const out = []; const err = []; let size = 0; let barrier = null;
    const collect = (target, data) => {
      const room = Math.max(0, limit - size);
      if (room) target.push(data.subarray(0, room));
      size += data.length;
      if (size > limit && !barrier) { barrier = 'OUTPUT_LIMIT'; child.kill(); }
    };
    child.stdout.on('data', (data) => collect(out, data));
    child.stderr.on('data', (data) => collect(err, data));
    child.stdin.on('error', () => {});
    child.on('error', (error) => { barrier = 'UNAVAILABLE'; err.push(Buffer.from(error.message)); });
    const timer = setTimeout(() => { barrier = 'TIMEOUT'; child.kill(); }, 10000);
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(out); const stderr = Buffer.concat(err);
      resolve({ status: barrier ?? (signal ? 'CRASH' : 'COMPLETED'),
        argv: [executable, ...argv], exitCode, signal, stdout: stdout.toString('utf8'),
        stderr: stderr.toString('utf8'), stdoutSha256: hash(stdout), stderrSha256: hash(stderr),
        truncated: barrier === 'OUTPUT_LIMIT' });
    });
    child.stdin.end(payload);
  });
}

export function parsedExecution(execution) {
  if (execution.status !== 'COMPLETED' || execution.exitCode !== 0) return null;
  try { return JSON.parse(execution.stdout); } catch { return null; }
}
