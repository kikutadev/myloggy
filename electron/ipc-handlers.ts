import { ipcMain, BrowserWindow } from 'electron';
import type { TrackerService } from './core/tracker-service.js';
import type { AppSettings, LmStudioStatus, ModelCheckResult } from '../shared/types.js';

export function registerIpcHandlers(
  tracker: TrackerService,
  getMainWindow: () => BrowserWindow | null,
  broadcastSettingsChanged: (settings: AppSettings) => void,
  createMainWindow?: () => BrowserWindow
): void {
  ipcMain.handle('bootstrap', (_event, date: string) => tracker.getBootstrap(date));
  ipcMain.handle('dashboard:get', (_event, date: string) => tracker.getDashboard(date));
  ipcMain.handle('timeline:day', (_event, date: string) => tracker.getDayTimeline(date));
  ipcMain.handle('timeline:week', (_event, date: string) => tracker.getWeekTimeline(date));
  ipcMain.handle('timeline:month', (_event, date: string) => tracker.getMonthTimeline(date));
  ipcMain.handle('settings:get', () => tracker.getSettings());
  ipcMain.handle('settings:update', (_event, patch) => {
    const settings = tracker.updateSettings(patch);
    broadcastSettingsChanged(settings);
    return settings;
  });
  ipcMain.handle('tracking:toggle', (_event, enabled: boolean) => tracker.setTracking(enabled));
  ipcMain.handle('tracking:capture-now', () => tracker.captureNow());
  ipcMain.handle('tracking:analyze-now', () => tracker.analyzeNow());
  ipcMain.handle('tracking:clear-pending', () => tracker.clearPendingSnapshots());
  ipcMain.handle('tracking:clear-errors', () => tracker.clearErrors());
  ipcMain.handle('work-unit:update', (_event, patch) => tracker.updateWorkUnit(patch));
  ipcMain.handle('open-dashboard', () => {
    const mainWindow = getMainWindow();
    if (!mainWindow && createMainWindow) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  ipcMain.handle('debug:data', () => tracker.getDebugData());
  ipcMain.handle('ollama:check', async () => {
    const settings = tracker.getSettings();
    try {
      const res = await fetch(`${settings.ollamaHost}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return { running: false, models: [] };
      const data = (await res.json()) as { models?: { name: string }[] };
      const models = (data.models ?? []).map((m) => m.name);
      return { running: true, models };
    } catch {
      return { running: false, models: [] };
    }
  });
  ipcMain.handle('ollama:test-model', async (_event, params: { model: string; ollamaHost: string }) => {
    try {
      const res = await fetch(`${params.ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          model: params.model,
          prompt: 'Reply with OK.',
          stream: false,
          options: { temperature: 0, num_predict: 8 },
        }),
      });

      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        return { ok: false, message: data.error ? String(data.error) : `HTTP ${res.status}` };
      }

      return { ok: true, message: 'Model responded successfully.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Model check failed.';
      if (message.includes('Connection refused') || message.includes('ECONNREFUSED')) {
        return { ok: false, message: 'Ollamaが起動していない可能性があります。Ollamaを起動してください。' };
      }
      if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        return { ok: false, message: '接続がタイムアウトしました。ホスト地址を確認してください。' };
      }
      return { ok: false, message };
    }
  });
  ipcMain.handle('lmstudio:check', async (): Promise<LmStudioStatus> => {
    const settings = tracker.getSettings();
    const url = `${settings.lmstudioHost}/v1/models`;
    console.log('[LM Studio] check request to:', url);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      console.log('[LM Studio] check response status:', res.status);
      if (!res.ok) return { running: false, models: [] };
      const data = (await res.json()) as { data?: { id: string }[] };
      const models = (data.data ?? []).map((m) => m.id);
      console.log('[LM Studio] available models:', models);
      return { running: true, models };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[LM Studio] check failed:', errMsg);
      return { running: false, models: [] };
    }
  });
  ipcMain.handle('lmstudio:test-model', async (_event, params: { model: string; lmstudioHost: string }): Promise<ModelCheckResult> => {
    const url = `${params.lmstudioHost}/v1/chat/completions`;
    console.log('[LM Studio] test-model request:', { url, model: params.model });
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          model: params.model,
          messages: [{ role: 'user', content: 'Reply with OK.' }],
          temperature: 0,
        }),
      });

      console.log('[LM Studio] test-model response status:', res.status);
      const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
      if (!res.ok) {
        console.error('[LM Studio] test-model error response:', data);
        return { ok: false, message: data.error?.message ?? `HTTP ${res.status}` };
      }

      console.log('[LM Studio] test-model success');
      return { ok: true, message: 'Model responded successfully.' };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Model check failed.';
      console.error('[LM Studio] test-model failed:', errMsg);
      if (errMsg.includes('Connection refused') || errMsg.includes('ECONNREFUSED')) {
        return { ok: false, message: 'LM Studioが起動していない可能性があります。LM Studioを起動してください。' };
      }
      if (errMsg.includes('timeout') || errMsg.includes('ETIMEDOUT')) {
        return { ok: false, message: '接続がタイムアウトしました。ホスト地址を確認してください。' };
      }
      return { ok: false, message: errMsg };
    }
  });
}

export function requireTracker(tracker: TrackerService | null): TrackerService {
  if (!tracker) {
    throw new Error('Tracker is not initialized');
  }
  return tracker;
}