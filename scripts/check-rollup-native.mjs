import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const bindingsByPlatformAndArch = {
  android: {
    arm: 'android-arm-eabi',
    arm64: 'android-arm64',
  },
  darwin: {
    arm64: 'darwin-arm64',
    x64: 'darwin-x64',
  },
  freebsd: {
    arm64: 'freebsd-arm64',
    x64: 'freebsd-x64',
  },
  linux: {
    arm: 'linux-arm-gnueabihf',
    arm64: 'linux-arm64-gnu',
    loong64: 'linux-loong64-gnu',
    ppc64: 'linux-ppc64-gnu',
    riscv64: 'linux-riscv64-gnu',
    s390x: 'linux-s390x-gnu',
    x64: 'linux-x64-gnu',
  },
  openbsd: {
    x64: 'openbsd-x64',
  },
  openharmony: {
    arm64: 'openharmony-arm64',
  },
  win32: {
    arm64: 'win32-arm64-msvc',
    ia32: 'win32-ia32-msvc',
    x64: 'win32-x64-msvc',
  },
};

function resolveRollupPackageBase() {
  return bindingsByPlatformAndArch[process.platform]?.[process.arch] ?? null;
}

function listInstalledRollupPackages(rootDir) {
  const rollupDir = path.join(rootDir, 'node_modules', '@rollup');
  if (!fs.existsSync(rollupDir)) {
    return [];
  }

  return fs
    .readdirSync(rollupDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('rollup-'))
    .map((entry) => entry.name)
    .sort();
}

function main() {
  const cwd = process.cwd();
  const packageBase = resolveRollupPackageBase();

  if (!packageBase) {
    return;
  }

  const nativeBinaryPath = path.join(
    cwd,
    'node_modules',
    'rollup',
    'dist',
    `rollup.${packageBase}.node`,
  );
  const nativePackagePath = path.join(
    cwd,
    'node_modules',
    '@rollup',
    `rollup-${packageBase}`,
  );

  if (fs.existsSync(nativeBinaryPath) || fs.existsSync(nativePackagePath)) {
    return;
  }

  const installedPackages = listInstalledRollupPackages(cwd);
  const installedSummary =
    installedPackages.length > 0 ? installedPackages.join(', ') : '(none)';

  const lines = [
    '[preflight] Rollup native dependency does not match the current Node runtime.',
    `[preflight] Current runtime: ${process.platform}-${process.arch} (${process.version})`,
    `[preflight] Expected package: @rollup/rollup-${packageBase}`,
    `[preflight] Installed @rollup packages: ${installedSummary}`,
  ];

  if (
    process.platform === 'darwin' &&
    installedPackages.some((name) => name.startsWith('rollup-darwin-'))
  ) {
    lines.push(
      '[preflight] This usually means dependencies were installed under a different CPU architecture.',
      '[preflight] On Apple Silicon, use a consistent arm64 shell for install and dev:',
      '[preflight]   arch -arm64 zsh',
      '[preflight]   nvm use 20',
      '[preflight]   rm -rf node_modules package-lock.json',
      '[preflight]   npm install',
    );
  } else {
    lines.push(
      '[preflight] Reinstall dependencies in the same shell/runtime that you use to run the app:',
      '[preflight]   rm -rf node_modules package-lock.json',
      '[preflight]   npm install',
    );
  }

  lines.push(
    '[preflight] Quick check:',
    '[preflight]   node -p "process.arch + \' \' + process.version"',
  );

  process.stderr.write(`${lines.join('\n')}\n`);
  process.exit(1);
}

main();
