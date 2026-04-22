import { useState, useEffect } from 'react';
import type { AnalysisProgress, BootstrapPayload } from '../../../shared/types.js';
import { resolveLocalePreference } from '../../../shared/localization.js';
import { useI18n } from '../../i18n.js';
import { navigateDate } from '../shared/navigateDate.js';
import { AnalysisErrorBanner } from '../shared/AnalysisErrorBanner.jsx';
import { AnalysisProgressBanner } from '../shared/AnalysisProgressBanner.jsx';
import { DayView } from '../DayView/DayView.jsx';
import { WeekView } from '../WeekView/WeekView.jsx';
import { MonthView } from '../MonthView/MonthView.jsx';
import { SettingsModal } from '../Settings/SettingsModal.jsx';
import { DebugModal } from '../Debug/DebugModal.jsx';
import { Onboarding } from '../Onboarding/Onboarding.jsx';
import { useAnalyze } from './useAnalyze.js';
import { useReanalyze } from '../DayView/useReanalyze.js';
import { useClearSnapshots } from './useClearSnapshots.js';
import { useClearErrors } from './useClearErrors.js';

type ViewMode = 'day' | 'week' | 'month';

interface AppScreenProps {
  bootstrap: BootstrapPayload;
  today: string;
  selectedDate: string;
  setSelectedDate: (value: string) => void;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  settingsOpen: boolean;
  setSettingsOpen: (value: boolean) => void;
  debugOpen: boolean;
  setDebugOpen: (value: boolean) => void;
  onReload: (targetDate?: string) => Promise<void>;
  setBootstrap: React.Dispatch<React.SetStateAction<BootstrapPayload | null>>;
}

export function AppScreen({
  bootstrap,
  today,
  selectedDate,
  setSelectedDate,
  view,
  setView,
  settingsOpen,
  setSettingsOpen,
  debugOpen,
  setDebugOpen,
  onReload,
  setBootstrap,
}: AppScreenProps) {
  const { locale, text, formatDateForView } = useI18n();
  const { dashboard, settings, state } = bootstrap;
  const { runningAnalyze, runAnalyzeNow } = useAnalyze(onReload);
  const { runningReanalyze, reanalyzeDate } = useReanalyze(onReload);
  const { clearingPending, clearPendingSnapshots } = useClearSnapshots(onReload);
  const { clearingErrors, clearErrors } = useClearErrors(onReload);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const unsub = window.myloggy.onAnalysisProgress((p) => {
      setProgress(p);
      if (p.phase === 'complete' || p.phase === 'error') {
        timeoutId = setTimeout(() => setProgress(null), 3000);
      }
    });
    return () => {
      unsub();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const analyzeLocked = state.isAnalyzing || runningAnalyze || runningReanalyze;
  const latestAnalysisError = dashboard.errors.find((error) => error.scope === 'analysis') ?? null;

  if (!settings.onboardingCompleted) {
    return (
      <Onboarding
        onComplete={async () => {
          await window.myloggy.updateSettings({ onboardingCompleted: true });
          await onReload();
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar-left">
          <span className="app-name">My Loggy</span>
          <nav className="tab-bar">
            {(['day', 'week', 'month'] as const).map((v) => (
              <button key={v} className={`tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
                {text.tabs[v]}
              </button>
            ))}
          </nav>
        </div>
        <div className="top-bar-center">
          <button className="btn btn-ghost btn-icon" onClick={() => setSelectedDate(navigateDate(-1, view, selectedDate))}>←</button>
          <span className="date-label">{formatDateForView(view, selectedDate)}</span>
          <button className="btn btn-ghost btn-icon" onClick={() => setSelectedDate(navigateDate(1, view, selectedDate))}>→</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(today)}>{text.today}</button>
          {view === 'day' ? (
            <button
              className="btn btn-ghost btn-sm"
              disabled={analyzeLocked}
              onClick={() => {
                if (window.confirm(text.reanalyzeConfirm)) {
                  void reanalyzeDate(selectedDate);
                }
              }}
            >
              {runningReanalyze ? text.reanalyzing : text.reanalyzeDay}
            </button>
          ) : null}
        </div>
        <div className="top-bar-right">
          <div className="top-bar-status">
            <button
              className="top-bar-counter top-bar-counter-btn"
              disabled={!state.pendingSnapshots || clearingPending}
              onClick={() => { void clearPendingSnapshots(state.pendingSnapshots); }}
              title={locale === 'ja' ? 'タップでクリア' : 'Tap to clear'}
            >
              {text.pendingSnapshotsLabel}: {state.pendingSnapshots}
            </button>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            disabled={analyzeLocked}
            onClick={() => { void runAnalyzeNow(); }}
          >
            {analyzeLocked ? text.analyzingNow : text.analyzeNow}
          </button>
          <button
            className={`btn btn-sm ${state.isTracking ? 'btn-primary' : 'btn-danger'}`}
            onClick={async () => { await window.myloggy.toggleTracking(!state.isTracking); await onReload(); }}
          >
            {state.isTracking ? text.trackingOn : text.trackingOff}
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => setSettingsOpen(true)} title={text.settings}>⚙</button>
        </div>
      </header>

      <AnalysisErrorBanner
        error={state.pendingSnapshots > 0 ? latestAnalysisError : null}
        fallbackMessage={state.pendingSnapshots > 0 && !latestAnalysisError ? state.lastError : null}
        onOpenDebug={() => setDebugOpen(true)}
        onClearErrors={() => { void clearErrors(); }}
        clearingErrors={clearingErrors}
      />

      <AnalysisProgressBanner progress={progress} />

      <main className="workspace">
        {view === 'day' ? <DayView dashboard={dashboard} categories={settings.categories ?? []} onRefresh={() => void onReload()} /> : null}
        {view === 'week' ? <WeekView dashboard={dashboard} /> : null}
        {view === 'month' ? <MonthView dashboard={dashboard} /> : null}
      </main>

      {settingsOpen ? (
        <SettingsModal
          settings={settings}
          currentLocale={locale}
          onSaved={(next) => {
            setBootstrap((current) => current ? {
              ...current,
              settings: next,
              locale: resolveLocalePreference(next.language, current.locale),
            } : current);
            void onReload();
          }}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
      {debugOpen ? <DebugModal onClose={() => setDebugOpen(false)} onErrorsCleared={() => onReload()} /> : null}
    </div>
  );
}