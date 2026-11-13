import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { validate, diagnose, portAvailable, tcpReachable } from '../src/doctor.mjs';
test('checks missing files, versions and env without exposing values', async () => {
  const r = await diagnose(
    { nodeMajors: [22], files: ['missing-file'], env: ['TOKEN'] },
    { nodeVersion: '24.1.0', env: { TOKEN: 'synthetic-sensitive-value' } },
  );
  assert.equal(r.ok, false);
  assert.equal(r.checks[2].ok, true);
  assert.ok(!JSON.stringify(r).includes('synthetic-sensitive-value'));
});
test('detects occupied and released loopback ports', async (t) => {
  const server = net.createServer((s) => s.end());
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  t.after(() => server.close());
  const port = server.address().port;
  assert.equal(await portAvailable(port), false);
  assert.equal(await tcpReachable('127.0.0.1', port), true);
  await new Promise((r) => server.close(r));
  assert.equal(await portAvailable(port), true);
  assert.equal(await tcpReachable('127.0.0.1', port), false);
});
test('rejects invalid configurations and path traversal', () => {
  for (const c of [
    null,
    [],
    { typo: [] },
    { ports: [-1] },
    { files: ['../secret'] },
    { env: ['BAD=KEY'] },
    { connections: [{}] },
    { nodeMajors: '24' },
  ])
    assert.throws(() => validate(c));
});
test('CLI smoke test and documented exit codes', async (t) => {
  const output = execFileSync(
    process.execPath,
    ['src/cli.mjs', '--config', 'examples/doctor.json', '--json'],
    { encoding: 'utf8' },
  );
  assert.equal(JSON.parse(output).ok, true);
  assert.equal(spawnSync(process.execPath, ['src/cli.mjs', '--wrong']).status, 2);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'doctor-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'fail.json');
  await fs.writeFile(file, JSON.stringify({ files: ['__does_not_exist__'] }));
  assert.equal(spawnSync(process.execPath, ['src/cli.mjs', '--config', file]).status, 1);
});
