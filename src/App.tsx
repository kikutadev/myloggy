import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';

import { resolveLocalePreference } from '../shared/localization.js';
import type { BootstrapPayload } from '../shared/types.js';
import { I18nProvider } from './i18n.js';
import { AppScreen } from './features/AppScreen/AppScreen.jsx';
import { LoadingScreen } from './features/shared/LoadingScreen.jsx';

type ViewMode = 'day' | 'week' | 'month';

export default function App() {
  const today = dayjs().format('YYYY-MM-DD');
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<ViewMode>('day');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);

  const load = useCallback(async (targetDate = selectedDate) => {
    const payload = await window.myloggy.bootstrap(targetDate);
    setBootstrap(payload);
  }, [selectedDate]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => { void load(); }, 20_000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    return window.myloggy.onSettingsChanged((settings) => {
      setBootstrap((current) => current ? {
        ...current,
        settings,
        locale: resolveLocalePreference(settings.language, current.locale),
      } : current);
      void load();
    });
  }, [load]);

  const locale = useMemo(() => {
    return resolveLocalePreference(
      bootstrap?.settings.language,
      bootstrap?.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'ja'),
    );
  }, [bootstrap?.locale, bootstrap?.settings.language]);

  return (
    <I18nProvider locale={locale}>
      {bootstrap ? (
        <AppScreen
          bootstrap={bootstrap}
          today={today}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          view={view}
          setView={setView}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          debugOpen={debugOpen}
          setDebugOpen={setDebugOpen}
          onReload={load}
          setBootstrap={setBootstrap}
        />
      ) : (
        <LoadingScreen />
      )}
    </I18nProvider>
  );
}