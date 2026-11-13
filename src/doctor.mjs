import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';

const portNumber = (n) => Number.isInteger(n) && n > 0 && n <= 65535;
export function validate(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config))
    throw new Error('Configuration must be a JSON object.');
  const allowed = ['nodeMajors', 'files', 'env', 'ports', 'connections'];
  for (const key of Object.keys(config))
    if (!allowed.includes(key)) throw new Error('Unknown configuration key: ' + key);
  for (const key of allowed)
    if (config[key] !== undefined && !Array.isArray(config[key]))
      throw new Error(key + ' must be an array.');
  for (const major of config.nodeMajors ?? [])
    if (!Number.isInteger(major) || major < 1) throw new Error('Invalid Node.js major version.');
  for (const item of config.files ?? [])
    if (
      typeof item !== 'string' ||
      !item ||
      path.isAbsolute(item) ||
      item.split(/[\/]/).includes('..')
    )
      throw new Error('File checks must be relative paths inside the project.');
  for (const key of config.env ?? [])
    if (typeof key !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
      throw new Error('Invalid environment variable name.');
  for (const port of config.ports ?? [])
    if (!portNumber(port)) throw new Error('Ports must be integers from 1 to 65535.');
  for (const c of config.connections ?? [])
    if (
      !c ||
      typeof c.name !== 'string' ||
      !c.name ||
      typeof c.host !== 'string' ||
      !c.host ||
      !portNumber(c.port)
    )
      throw new Error('Connections require name, host, and port.');
  return config;
}
export function tcpReachable(host, port, timeout = 1000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeout, () => finish(false));
    socket.once('error', () => finish(false));
    socket.once('connect', () => finish(true));
  });
}
export function portAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen({ host: '127.0.0.1', port }, () => server.close(() => resolve(true)));
  });
}
export async function diagnose(
  config,
  { cwd = process.cwd(), env = process.env, nodeVersion = process.versions.node } = {},
) {
  validate(config);
  const checks = [];
  const add = (check, ok, fix) => checks.push({ check, ok, ...(!ok ? { fix } : {}) });
  if (config.nodeMajors?.length)
    add(
      'Node.js major version',
      config.nodeMajors.includes(Number(nodeVersion.split('.')[0])),
      'Use Node.js ' + config.nodeMajors.join(' or ') + '.',
    );
  for (const file of config.files ?? []) {
    const exists = await fs
      .stat(path.join(cwd, file))
      .then((s) => s.isFile())
      .catch(() => false);
    add('File ' + file, exists, 'Create this file using the project setup instructions.');
  }
  for (const key of config.env ?? [])
    add(
      'Environment ' + key,
      typeof env[key] === 'string' && env[key].trim().length > 0,
      'Set ' + key + ' in the process environment; values are never printed.',
    );
  for (const port of config.ports ?? [])
    add(
      'Port ' + port + ' available on IPv4 loopback',
      await portAvailable(port),
      'Stop the existing listener or choose another port.',
    );
  for (const c of config.connections ?? [])
    add(
      c.name,
      await tcpReachable(c.host, c.port),
      'Start the service and check its host, port, and firewall.',
    );
  return { ok: checks.every((c) => c.ok), checks };
}
