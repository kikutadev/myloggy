import { contextBridge, ipcRenderer } from 'electron';

import type { DesktopApi } from '../shared/api.js';
import type { AppSettings, BootstrapPayload, DebugData, LmStudioStatus, OllamaStatus, WorkUnitPatch } from '../shared/types.js';

const api: DesktopApi = {
  bootstrap: (date: string) => ipcRenderer.invoke('bootstrap', date) as Promise<BootstrapPayload>,
  getDashboard: (date: string) => ipcRenderer.invoke('dashboard:get', date),
  getDayTimeline: (date: string) => ipcRenderer.invoke('timeline:day', date),
  getWeekTimeline: (date: string) => ipcRenderer.invoke('timeline:week', date),
  getMonthTimeline: (date: string) => ipcRenderer.invoke('timeline:month', date),
  onSettingsChanged: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, settings: AppSettings) => {
      listener(settings);
    };
    ipcRenderer.on('settings:changed', wrapped);
    return () => {
      ipcRenderer.off('settings:changed', wrapped);
    };
  },
  getSettings: () => ipcRenderer.invoke('settings:get') as Promise<AppSettings>,
  updateSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:update', settings),
  toggleTracking: (enabled: boolean) => ipcRenderer.invoke('tracking:toggle', enabled),
  captureNow: () => ipcRenderer.invoke('tracking:capture-now'),
  analyzeNow: () => ipcRenderer.invoke('tracking:analyze-now'),
  clearPendingSnapshots: () => ipcRenderer.invoke('tracking:clear-pending'),
  clearErrors: () => ipcRenderer.invoke('tracking:clear-errors'),
  updateWorkUnit: (patch: WorkUnitPatch) => ipcRenderer.invoke('work-unit:update', patch),
  openDashboard: () => ipcRenderer.invoke('open-dashboard'),
  checkOllama: () => ipcRenderer.invoke('ollama:check') as Promise<OllamaStatus>,
  testModel: (params) => ipcRenderer.invoke('ollama:test-model', params),
  checkLmstudio: () => ipcRenderer.invoke('lmstudio:check') as Promise<LmStudioStatus>,
  testLmstudioModel: (params) => ipcRenderer.invoke('lmstudio:test-model', params),
  getDebugData: () => ipcRenderer.invoke('debug:data') as Promise<DebugData>,
};

contextBridge.exposeInMainWorld('myloggy', api);
