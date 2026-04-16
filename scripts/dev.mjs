import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

const cwd = process.cwd();
const preloadPath = path.join(cwd, 'dist-electron', 'electron', 'preload.js');

function log(scope, message) {
  process.stdout.write(`[${scope}] ${message}\n`);
}

function pipeOutput(scope, child) {
  child.stdout?.on('data', (chunk) => {
    process.stdout.write(
      chunk
        .toString()
        .split('\n')
        .filter(Boolean)
        .map((line) => `[${scope}] ${line}`)
        .join('\n') + '\n',
    );
  });

  child.stderr?.on('data', (chunk) => {
    process.stderr.write(
      chunk
        .toString()
        .split('\n')
        .filter(Boolean)
        .map((line) => `[${scope}] ${line}`)
        .join('\n') + '\n',
    );
  });
}

async function isPortFree(port) {
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findFreePort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await isPortFree(port)) {
      return port;
    }
  }
  throw new Error(`No free port found from ${startPort}`);
}

async function waitForPort(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await new Promise((resolve) => {
      const socket = net.createConnection({ port, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.end();
        resolve(true);
      });
      socket.once('error', () => resolve(false));
    });
    if (ready) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for port ${port}`);
}

async function waitForFile(filePath, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for ${filePath}`);
}

const children = new Set();

function spawnCommand(scope, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd,
    env: {
      ...process.env,
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  children.add(child);
  pipeOutput(scope, child);
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (signal) {
      log(scope, `exited with signal ${signal}`);
      return;
    }
    log(scope, `exited with code ${code}`);
    if (code && code !== 0) {
      shutdown(code);
    }
  });
  return child;
}

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 150);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
  const port = await findFreePort(5173);
  const devServerUrl = `http://127.0.0.1:${port}`;
  log('dev', `using renderer port ${port}`);

  spawnCommand('dev:main', 'npm', ['run', 'dev:main']);
  spawnCommand('dev:renderer', 'npm', ['run', 'dev:renderer', '--', '--port', String(port), '--strictPort']);

  await Promise.all([waitForFile(preloadPath), waitForPort(port)]);

  spawnCommand('dev:electron', 'npm', ['run', 'dev:electron'], {
    VITE_DEV_SERVER_URL: devServerUrl,
  });
}

main().catch((error) => {
  process.stderr.write(`[dev] ${error instanceof Error ? error.message : String(error)}\n`);
  shutdown(1);
});
