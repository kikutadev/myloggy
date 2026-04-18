import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';

import { resolveLocalePreference } from '../shared/localization.js';
import type { BootstrapPayload } from '../shared/types.js';
import { I18nProvider, useI18n } from './i18n.js';

/**
 * MiniContentは、BootstrapPayloadデータに基づいてミニアプリのUIを表示するコンポーネントです。
 * データの読み込み状態、現在の作業単位、トラッキング状態に応じた表示を行います。
 */
function MiniContent(props: { data: BootstrapPayload | null; onReload: () => Promise<void> }) {
  const { text, categoryLabel } = useI18n();

  // データがない場合はローディング画面を表示
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
  // 作業開始からの経過時間を分単位で計算
  const elapsed = unit ? dayjs().diff(dayjs(unit.startAt), 'minute') : 0;

  return (
    <div className="mini-shell">
      <div className="mini-header">
        <span className="mini-name">My Loggy</span>
        <button
          // トラッキング状態に応じてクラスを切り替え（on/off）
          className={`mini-status ${state?.isTracking ? 'on' : 'off'}`}
          onClick={async () => {
            if (state) {
              // トラッキングのON/OFFを切り替え
              await window.myloggy.toggleTracking(!state.isTracking);
              // 切り替え後にデータを再取得
              await props.onReload();
            }
          }}
        >
          {/* トラッキング状態に応じて表示テキストを切り替え */}
          {state?.isTracking ? text.trackingOn : text.trackingOff}
        </button>
      </div>

      {/* 作業単位がある場合は作業情報を表示、ない場合は「作業なし」を表示 */}
      {unit ? (
        <div className="mini-work">
          <div className="mini-tag">{categoryLabel(unit.category)}</div>
          <div className="mini-title">{unit.title}</div>
          <div className="mini-elapsed">{text.miniElapsed(elapsed)}</div>
        </div>
      ) : (
        <div className="mini-empty">{text.miniNoWork}</div>
      )}

      {/* ダッシュボードを開くボタン */}
      <button className="mini-open" onClick={() => window.myloggy.openDashboard()}>
        {text.miniOpenDashboard}
      </button>
    </div>
  );
}

/**
 * MiniAppは、ミニアプリ（デスクトップWidget等）のメインコンポーネントです。
 * 初期データの取得、定期的な更新、設定変更の監視を行います。
 */
export default function MiniApp() {
  // ブートストラップデータを保持する状態
  const [data, setData] = useState<BootstrapPayload | null>(null);

  // データを取得する関数（useCallbackでメモ化）
  const load = useCallback(async () => {
    const payload = await window.myloggy.bootstrap(dayjs().format('YYYY-MM-DD'));
    setData(payload);
  }, []);

  // マウント時に初期データを取得し、20秒ごとにデータを更新する定期実行を設定
  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 20_000);
    return () => clearInterval(interval);
  }, [load]);

  // 設定変更を監視し、変更があった場合はデータを更新
  useEffect(() => {
    return window.myloggy.onSettingsChanged((settings) => {
      setData((current) => current ? {
        ...current,
        settings,
        // 言語設定に基づいてlocaleを解決
        locale: resolveLocalePreference(settings.language, current.locale),
      } : current);
      void load();
    });
  }, [load]);

  // ロケールを解決してメモ化（言語設定に基づいて使用すべきlocaleを決定）
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