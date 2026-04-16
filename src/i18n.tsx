import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import dayjs from 'dayjs';

import {
  localizeCategoryLabel,
  localizeProjectName,
  localizeSnapshotStatus,
  type SupportedLocale,
} from '../shared/localization.js';
import type { SnapshotStatus } from '../shared/types.js';

type ViewMode = 'day' | 'week' | 'month';

type UiText = {
  noData: string;
  noWorkLog: string;
  title: string;
  project: string;
  category: string;
  customCategory: string;
  customCategoryPlaceholder: string;
  summary: string;
  note: string;
  notePrefix: string;
  distracted: string;
  save: string;
  saving: string;
  edit: string;
  close: string;
  checkpoints: (count: number) => string;
  categories: string;
  projects: string;
  totalWorkTime: string;
  workUnits: string;
  longestWork: string;
  distractedCount: string;
  monthSummary: string;
  loading: string;
  debug: string;
  recentSnapshots: (count: number) => string;
  noImage: string;
  screenCount: (count: number) => string;
  errorLogs: (count: number) => string;
  add: string;
  settings: string;
  language: string;
  languageJa: string;
  languageEn: string;
  cancel: string;
  model: string;
  captureTarget: string;
  allDisplays: string;
  mainOnly: string;
  checkModel: string;
  testingModel: string;
  modelCheckIdle: string;
  modelCheckOk: string;
  modelCheckFailed: string;
  captureNow: string;
  capturingNow: string;
  analyzeNow: string;
  analyzingNow: string;
  analysisErrorTitle: string;
  clearErrors: string;
  pendingSnapshotsLabel: string;
  pendingWindowsLabel: string;
  tabs: Record<ViewMode, string>;
  today: string;
  trackingOn: string;
  trackingOff: string;
  debugTitle: string;
  statusApp: string;
  statusWindow: string;
  statusPage: string;
  statusUrl: string;
  statusCursor: string;
  latestCheckpoint: string;
  checking: string;
  recheck: string;
  back: string;
  next: string;
  startSetup: string;
  getStarted: string;
  installOllamaTitle: string;
  installOllamaDescription: string;
  installOllamaSub: string;
  ollamaRunning: string;
  ollamaMissing: string;
  installModelTitle: string;
  installModelDescription: string;
  installModelSub: string;
  modelInstalled: string;
  modelMissing: string;
  screenPermissionTitle: string;
  screenPermissionDescription: string;
  screenPermissionHint: string;
  screenPermissionSub: string;
  onboardingDescription: string;
  onboardingSub: string;
  miniNoWork: string;
  miniOpenDashboard: string;
  miniElapsed: (minutes: number) => string;
  newCategoryPlaceholder: string;
  excludedApps: string;
  excludedAppsHint: string;
  excludedAppPlaceholder: string;
  excludedDomains: string;
  excludedDomainsHint: string;
  excludedDomainPlaceholder: string;
  excludedTimeBlocks: string;
  excludedTimeBlocksHint: string;
  excludedCaptureMode: string;
  excludedCaptureModeSkip: string;
  excludedCaptureModeLogOnly: string;
};

type I18nValue = {
  locale: SupportedLocale;
  text: UiText;
  weekdays: string[];
  formatMinutes: (minutes: number) => string;
  formatDateForView: (view: ViewMode, date: string) => string;
  formatTime: (value: string) => string;
  formatTimeRange: (startAt: string, endAt: string) => string;
  categoryLabel: (category: string) => string;
  projectLabel: (project: string | null | undefined) => string;
  snapshotStatusLabel: (status: SnapshotStatus) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function createText(locale: SupportedLocale): UiText {
  if (locale === 'ja') {
    return {
      noData: 'データなし',
      noWorkLog: '作業記録なし',
      title: 'タイトル',
      project: 'プロジェクト',
      category: 'カテゴリ',
      customCategory: 'カスタムカテゴリ',
      customCategoryPlaceholder: '新しいカテゴリ名',
      summary: '要約',
      note: 'メモ',
      notePrefix: 'メモ',
      distracted: '脱線',
      save: '保存',
      saving: '保存中...',
      edit: '編集',
      close: '閉じる',
      checkpoints: (count) => `チェックポイント ${count}件`,
      categories: 'カテゴリ',
      projects: 'プロジェクト',
      totalWorkTime: '総作業時間',
      workUnits: '作業単位',
      longestWork: '長時間作業トップ',
      distractedCount: '脱線',
      monthSummary: '月次サマリー',
      loading: '読み込み中...',
      debug: 'デバッグ',
      recentSnapshots: (count) => `直近スナップショット (${count}件)`,
      noImage: '画像なし',
      screenCount: (count) => `(${count}画面)`,
      errorLogs: (count) => `エラーログ (${count}件)`,
      add: '追加',
      settings: '設定',
      language: '表示言語',
      languageJa: '日本語',
      languageEn: '英語',
      cancel: 'キャンセル',
      model: 'モデル',
      captureTarget: '画面取得対象',
      allDisplays: '全ディスプレイ',
      mainOnly: 'メインのみ',
      checkModel: 'モデル確認',
      testingModel: '確認中...',
      modelCheckIdle: 'モデル未確認',
      modelCheckOk: 'モデル応答OK',
      modelCheckFailed: 'モデル確認失敗',
      captureNow: '今すぐ記録',
      capturingNow: '記録中...',
      analyzeNow: '今すぐAI処理',
      analyzingNow: 'AI処理中...',
      analysisErrorTitle: 'AI処理失敗',
      clearErrors: 'エラーを消す',
      pendingSnapshotsLabel: '未処理記録',
      pendingWindowsLabel: 'AI待ち',
      tabs: { day: '日次', week: '週次', month: '月次' },
      today: '今日',
      trackingOn: '● 記録中',
      trackingOff: '■ 停止中',
      debugTitle: 'デバッグ',
      statusApp: 'App',
      statusWindow: 'Window',
      statusPage: 'Page',
      statusUrl: 'URL',
      statusCursor: 'Cursor',
      latestCheckpoint: '最近のログ',
      checking: '確認中...',
      recheck: '再チェック',
      back: '戻る',
      next: '次へ',
      startSetup: 'セットアップを始める',
      getStarted: '使い始める',
      installOllamaTitle: 'Ollama をインストール',
      installOllamaDescription: 'My Loggy はローカルLLM（Ollama）を使って作業を分類します。まず Ollama をインストールしてください。',
      installOllamaSub: 'またはollama.comからダウンロードしてください。\nインストール後、Ollamaを起動してください。',
      ollamaRunning: 'Ollama 起動中',
      ollamaMissing: 'Ollama が見つかりません',
      installModelTitle: 'AI モデルをダウンロード',
      installModelDescription: '作業分析に使うモデル（Gemma 4）をダウンロードします。ターミナルで以下を実行してください。',
      installModelSub: '約16GBのダウンロードです。完了後「再チェック」を押してください。',
      modelInstalled: 'gemma4 インストール済み',
      modelMissing: 'gemma4 が見つかりません',
      screenPermissionTitle: '画面収録の許可',
      screenPermissionDescription: 'スクリーンショットを撮るために、macOSの画面収録の許可が必要です。',
      screenPermissionHint: 'システム設定 → プライバシーとセキュリティ → 画面収録 で My Loggy を許可してください。',
      screenPermissionSub: '初回起動時に自動で許可ダイアログが出る場合もあります。',
      onboardingDescription: 'あなたの作業を静かに記録するデスクトップアプリ。\n1分ごとにスクリーンショットを撮り、ローカルAIが\n何をしていたか自動で分類します。',
      onboardingSub: 'データはすべてローカルに保存。外部送信しません。',
      miniNoWork: '作業なし',
      miniOpenDashboard: 'ダッシュボードを開く →',
      miniElapsed: (minutes) => `${minutes}分経過`,
      newCategoryPlaceholder: '新しいカテゴリ',
      excludedApps: '除外アプリ',
      excludedAppsHint: '指定アプリがアクティブなときはスキップ',
      excludedAppPlaceholder: 'アプリ名（例: LINE）',
      excludedDomains: '除外ドメイン',
      excludedDomainsHint: '指定ドメインを閲覧中はスキップ',
      excludedDomainPlaceholder: 'ドメイン（例: youtube.com）',
      excludedTimeBlocks: '除外時間帯',
      excludedTimeBlocksHint: '指定時間帯はスキップ',
      excludedCaptureMode: '除外時の動作',
      excludedCaptureModeSkip: 'スキップ（記録しない）',
      excludedCaptureModeLogOnly: 'ログのみ（AI処理しない）',
    };
  }

  return {
    noData: 'No data',
    noWorkLog: 'No work log yet',
    title: 'Title',
    project: 'Project',
    category: 'Category',
    customCategory: 'Custom category',
    customCategoryPlaceholder: 'New category name',
    summary: 'Summary',
    note: 'Note',
    notePrefix: 'Note',
    distracted: 'Distracted',
    save: 'Save',
    saving: 'Saving...',
    edit: 'Edit',
    close: 'Close',
    checkpoints: (count) => `${count} checkpoint${count === 1 ? '' : 's'}`,
    categories: 'Categories',
    projects: 'Projects',
    totalWorkTime: 'Total time',
    workUnits: 'Work units',
    longestWork: 'Longest sessions',
    distractedCount: 'Distracted',
    monthSummary: 'Monthly summary',
    loading: 'Loading...',
    debug: 'Debug',
    recentSnapshots: (count) => `Recent snapshots (${count})`,
    noImage: 'No image',
    screenCount: (count) => `(${count} screen${count === 1 ? '' : 's'})`,
    errorLogs: (count) => `Error log${count === 1 ? '' : 's'} (${count})`,
    add: 'Add',
    settings: 'Settings',
    language: 'Language',
    languageJa: 'Japanese',
    languageEn: 'English',
    cancel: 'Cancel',
    model: 'Model',
    captureTarget: 'Capture target',
    allDisplays: 'All displays',
    mainOnly: 'Main only',
    checkModel: 'Check model',
    testingModel: 'Checking...',
    modelCheckIdle: 'Model not checked',
    modelCheckOk: 'Model responded',
    modelCheckFailed: 'Model check failed',
    captureNow: 'Capture now',
    capturingNow: 'Capturing...',
    analyzeNow: 'Run AI now',
    analyzingNow: 'Running AI...',
    analysisErrorTitle: 'AI processing failed',
    clearErrors: 'Clear errors',
    pendingSnapshotsLabel: 'Pending captures',
    pendingWindowsLabel: 'Pending AI',
    tabs: { day: 'Day', week: 'Week', month: 'Month' },
    today: 'Today',
    trackingOn: '● Tracking',
    trackingOff: '■ Stopped',
    debugTitle: 'Debug',
    statusApp: 'App',
    statusWindow: 'Window',
    statusPage: 'Page',
    statusUrl: 'URL',
    statusCursor: 'Cursor',
    latestCheckpoint: 'Recent log',
    checking: 'Checking...',
    recheck: 'Check again',
    back: 'Back',
    next: 'Next',
    startSetup: 'Start setup',
    getStarted: 'Start using My Loggy',
    installOllamaTitle: 'Install Ollama',
    installOllamaDescription: 'My Loggy uses a local LLM through Ollama to classify your work. Install Ollama first.',
    installOllamaSub: 'Or download it from ollama.com.\nAfter installation, launch Ollama.',
    ollamaRunning: 'Ollama is running',
    ollamaMissing: 'Ollama was not found',
    installModelTitle: 'Download the AI model',
    installModelDescription: 'Download the model used for work analysis (Gemma 4). Run the command below in Terminal.',
    installModelSub: 'This download is about 16 GB. Press "Check again" after it finishes.',
    modelInstalled: 'gemma4 is installed',
    modelMissing: 'gemma4 was not found',
    screenPermissionTitle: 'Allow screen recording',
    screenPermissionDescription: 'My Loggy needs macOS screen recording permission to capture screenshots.',
    screenPermissionHint: 'Open System Settings → Privacy & Security → Screen Recording, then allow My Loggy.',
    screenPermissionSub: 'macOS may also show the permission dialog automatically on first launch.',
    onboardingDescription: 'A desktop app that quietly logs your work.\nIt captures a screenshot every minute and lets a local AI\nclassify what you were doing.',
    onboardingSub: 'Everything stays on your machine. Nothing is sent outside.',
    miniNoWork: 'No active work',
    miniOpenDashboard: 'Open dashboard →',
    miniElapsed: (minutes) => `${minutes}m elapsed`,
    newCategoryPlaceholder: 'New category',
    excludedApps: 'Excluded apps',
    excludedAppsHint: 'Skip when these apps are active',
    excludedAppPlaceholder: 'App name (e.g. LINE)',
    excludedDomains: 'Excluded domains',
    excludedDomainsHint: 'Skip when browsing these domains',
    excludedDomainPlaceholder: 'Domain (e.g. youtube.com)',
    excludedTimeBlocks: 'Excluded time blocks',
    excludedTimeBlocksHint: 'Skip during these time ranges',
    excludedCaptureMode: 'Exclusion behavior',
    excludedCaptureModeSkip: 'Skip (do not record)',
    excludedCaptureModeLogOnly: 'Log only (skip AI analysis)',
  };
}

function createI18n(locale: SupportedLocale): I18nValue {
  const text = createText(locale);
  const localeCode = locale === 'ja' ? 'ja-JP' : 'en-US';
  const dayFormatter = new Intl.DateTimeFormat(localeCode, locale === 'ja'
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' });
  const monthFormatter = new Intl.DateTimeFormat(localeCode, locale === 'ja'
    ? { year: 'numeric', month: 'long' }
    : { year: 'numeric', month: 'long' });
  const weekFormatter = new Intl.DateTimeFormat(localeCode, locale === 'ja'
    ? { month: 'numeric', day: 'numeric' }
    : { month: 'short', day: 'numeric' });

  return {
    locale,
    text,
    weekdays: locale === 'ja' ? ['日', '月', '火', '水', '木', '金', '土'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    formatMinutes(minutes) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (locale === 'ja') {
        if (hours === 0) return `${mins}分`;
        return `${hours}時間${mins.toString().padStart(2, '0')}分`;
      }
      if (hours === 0) return `${mins}m`;
      return `${hours}h ${mins.toString().padStart(2, '0')}m`;
    },
    formatDateForView(view, date) {
      const target = dayjs(date);
      if (view === 'day') {
        return dayFormatter.format(target.toDate());
      }
      if (view === 'week') {
        const start = target.startOf('week').toDate();
        const end = target.endOf('week').toDate();
        return `${weekFormatter.format(start)} – ${weekFormatter.format(end)}`;
      }
      return monthFormatter.format(target.toDate());
    },
    formatTime(value) {
      return dayjs(value).format('HH:mm');
    },
    formatTimeRange(startAt, endAt) {
      return `${dayjs(startAt).format('HH:mm')} - ${dayjs(endAt).format('HH:mm')}`;
    },
    categoryLabel(category) {
      return localizeCategoryLabel(category, locale);
    },
    projectLabel(project) {
      return localizeProjectName(project, locale);
    },
    snapshotStatusLabel(status) {
      return localizeSnapshotStatus(status, locale);
    },
  };
}

export function I18nProvider(props: { locale: SupportedLocale; children: ReactNode }) {
  const value = useMemo(() => createI18n(props.locale), [props.locale]);

  useEffect(() => {
    document.documentElement.lang = props.locale;
  }, [props.locale]);

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('I18nProvider is missing');
  }
  return value;
}
