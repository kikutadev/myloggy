import type {
  AnalysisProgress,
  AppSettings,
  AppState,
  BootstrapPayload,
  CheckpointSnapshot,
  DashboardData,
  DayTimeline,
  DebugData,
  LmStudioStatus,
  ModelCheckResult,
  MonthTimeline,
  OllamaStatus,
  WeekTimeline,
  WorkUnitPatch,
  WorkUnitRecord,
} from './types.js';

export interface DesktopApi {
  bootstrap(date: string): Promise<BootstrapPayload>;
  getDashboard(date: string): Promise<DashboardData>;
  getDayTimeline(date: string): Promise<DayTimeline>;
  getWeekTimeline(date: string): Promise<WeekTimeline>;
  getMonthTimeline(date: string): Promise<MonthTimeline>;
  onSettingsChanged(listener: (settings: AppSettings) => void): () => void;
  onAnalysisProgress(listener: (progress: AnalysisProgress) => void): () => void;
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
  toggleTracking(enabled: boolean): Promise<AppState>;
  captureNow(): Promise<AppState>;
  analyzeNow(): Promise<AppState>;
  reanalyzeDate(date: string): Promise<AppState>;
  clearPendingSnapshots(): Promise<AppState>;
  clearErrors(): Promise<AppState>;
  updateWorkUnit(patch: WorkUnitPatch): Promise<WorkUnitRecord | null>;
  openDashboard(): Promise<void>;
  checkOllama(): Promise<OllamaStatus>;
  testModel(params: { model: string; ollamaHost: string }): Promise<ModelCheckResult>;
  checkLmstudio(): Promise<LmStudioStatus>;
  testLmstudioModel(params: { model: string; lmstudioHost: string }): Promise<ModelCheckResult>;
  getDebugData(): Promise<DebugData>;
  getCheckpointSnapshots(checkpointId: string): Promise<CheckpointSnapshot[]>;
}
