import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';

import { resolveLocalePreference } from '../shared/localization.js';
import type { BootstrapPayload } from '../shared/types.js';
import { I18nProvider, useI18n } from './i18n.js';

function MiniContent(props: { data: BootstrapPayload | null; onReload: () => Promise<void> }) {
  const { text, categoryLabel } = useI18n();
  if (!props.data) {
    return (
      <div className="mini-shell">
        <div className="mini-header">
          <span className="mini-name">My Loggy</span>
        </div>
        <div className="mini-empty">{text.loading}</div>
      </div>
    );
  }

  const state = props.data.state;
  const unit = state?.currentWorkUnit;
  const elapsed = unit ? dayjs().diff(dayjs(unit.startAt), 'minute') : 0;

  return (
    <div className="mini-shell">
      <div className="mini-header">
        <span className="mini-name">My Loggy</span>
        <button
          className={`mini-status ${state?.isTracking ? 'on' : 'off'}`}
          onClick={async () => {
            if (state) {
              await window.myloggy.toggleTracking(!state.isTracking);
              await props.onReload();
            }
          }}
        >
          {state?.isTracking ? text.trackingOn : text.trackingOff}
        </button>
      </div>

      {unit ? (
        <div className="mini-work">
          <div className="mini-tag">{categoryLabel(unit.category)}</div>
          <div className="mini-title">{unit.title}</div>
          <div className="mini-elapsed">{text.miniElapsed(elapsed)}</div>
        </div>
      ) : (
        <div className="mini-empty">{text.miniNoWork}</div>
      )}

      <button className="mini-open" onClick={() => window.myloggy.openDashboard()}>
        {text.miniOpenDashboard}
      </button>
    </div>
  );
}

export default function MiniApp() {
  const [data, setData] = useState<BootstrapPayload | null>(null);

  const load = useCallback(async () => {
    const payload = await window.myloggy.bootstrap(dayjs().format('YYYY-MM-DD'));
    setData(payload);
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 20_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    return window.myloggy.onSettingsChanged((settings) => {
      setData((current) => current ? {
        ...current,
        settings,
        locale: resolveLocalePreference(settings.language, current.locale),
      } : current);
      void load();
    });
  }, [load]);

  const locale = useMemo(() => {
    return resolveLocalePreference(
      data?.settings.language,
      data?.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'ja'),
    );
  }, [data?.locale, data?.settings.language]);

  return (
    <I18nProvider locale={locale}>
      <MiniContent data={data} onReload={load} />
    </I18nProvider>
  );
}
