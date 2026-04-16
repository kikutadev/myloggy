import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { screen } from 'electron';

const execFileAsync = promisify(execFile);

export interface SnapshotMetadata {
  cursorX: number | null;
  cursorY: number | null;
  cursorDisplayId: number | null;
  cursorDisplayIndex: number | null;
  cursorRelativeX: number | null;
  cursorRelativeY: number | null;
  activeApp: string | null;
  windowTitle: string | null;
  pageTitle: string | null;
  url: string | null;
  keyboardActivity: number | null;
  mouseActivity: number | null;
  appSwitchCount: number | null;
  gitBranch: string | null;
  gitDirty: boolean | null;
  metadataJson: string;
}

async function runAppleScript(script: string): Promise<string> {
  const { stdout } = await execFileAsync('osascript', ['-e', script]);
  return stdout.trim();
}

async function getFrontmostAppAndWindow(): Promise<{ app: string | null; window: string | null }> {
  const script = `
    tell application "System Events"
      set frontApp to name of first application process whose frontmost is true
      set frontWindow to ""
      try
        tell process frontApp
          if exists front window then
            set frontWindow to name of front window
          end if
        end tell
      end try
      return frontApp & linefeed & frontWindow
    end tell
  `;

  try {
    const output = await runAppleScript(script);
    const [app, window] = output.split('\n');
    return {
      app: app?.trim() || null,
      window: window?.trim() || null,
    };
  } catch {
    return { app: null, window: null };
  }
}

async function getBrowserContext(appName: string | null): Promise<{ url: string | null; pageTitle: string | null }> {
  if (!appName) {
    return { url: null, pageTitle: null };
  }

  const target = appName.toLowerCase();
  let script: string | null = null;

  if (target.includes('chrome') || target.includes('arc') || target.includes('brave') || target.includes('edge')) {
    script = `
      tell application "${appName}"
        try
          set activeTab to active tab of front window
          return (URL of activeTab) & linefeed & (title of activeTab)
        on error
          return linefeed
        end try
      end tell
    `;
  } else if (target.includes('safari')) {
    script = `
      tell application "Safari"
        try
          return (URL of front document) & linefeed & (name of front document)
        on error
          return linefeed
        end try
      end tell
    `;
  }

  if (!script) {
    return { url: null, pageTitle: null };
  }

  try {
    const output = await runAppleScript(script);
    const [url, pageTitle] = output.split('\n');
    return {
      url: url?.trim() || null,
      pageTitle: pageTitle?.trim() || null,
    };
  } catch {
    return { url: null, pageTitle: null };
  }
}

function getCursorContext(): Pick<
  SnapshotMetadata,
  'cursorX' | 'cursorY' | 'cursorDisplayId' | 'cursorDisplayIndex' | 'cursorRelativeX' | 'cursorRelativeY'
> {
  try {
    const point = screen.getCursorScreenPoint();
    const displays = screen.getAllDisplays();
    const display = screen.getDisplayNearestPoint(point);
    const displayIndex = displays.findIndex((item) => item.id === display.id);
    const width = Math.max(1, display.bounds.width);
    const height = Math.max(1, display.bounds.height);
    const relativeX = Number(((point.x - display.bounds.x) / width).toFixed(3));
    const relativeY = Number(((point.y - display.bounds.y) / height).toFixed(3));

    return {
      cursorX: point.x,
      cursorY: point.y,
      cursorDisplayId: display.id,
      cursorDisplayIndex: displayIndex === -1 ? null : displayIndex + 1,
      cursorRelativeX: Math.min(1, Math.max(0, relativeX)),
      cursorRelativeY: Math.min(1, Math.max(0, relativeY)),
    };
  } catch {
    return {
      cursorX: null,
      cursorY: null,
      cursorDisplayId: null,
      cursorDisplayIndex: null,
      cursorRelativeX: null,
      cursorRelativeY: null,
    };
  }
}

export async function collectMetadata(): Promise<SnapshotMetadata> {
  const { app, window } = await getFrontmostAppAndWindow();
  const browser = await getBrowserContext(app);
  const cursor = getCursorContext();

  const payload = {
    ...cursor,
    activeApp: app,
    windowTitle: window,
    pageTitle: browser.pageTitle,
    url: browser.url,
  };

  return {
    ...payload,
    keyboardActivity: null,
    mouseActivity: null,
    appSwitchCount: null,
    gitBranch: null,
    gitDirty: null,
    metadataJson: JSON.stringify(payload),
  };
}
