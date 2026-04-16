import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';

import { UNKNOWN_LABEL, resolveLocalePreference, toStoredCategoryLabel, type SupportedLocale } from '../shared/localization.js';
import type {
  AppSettings,
  BootstrapPayload,
  CheckpointRecord,
  DashboardData,
  DebugData,
  ModelCheckResult,
  OllamaStatus,
  TimeBlock,
  WorkUnitRecord,
} from '../shared/types.js';
import { I18nProvider, useI18n } from './i18n.js';

type ViewMode = 'day' | 'week' | 'month';

function ratioWidth(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.max(8, Math.round((value / total) * 100))}%`;
}

function navigateDate(direction: -1 | 1, view: ViewMode, current: string): string {
  const d = dayjs(current);
  if (view === 'day') return d.add(direction, 'day').format('YYYY-MM-DD');
  if (view === 'week') return d.add(direction * 7, 'day').format('YYYY-MM-DD');
  return d.add(direction, 'month').format('YYYY-MM-DD');
}

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function formatIssueLabel(path: unknown, locale: SupportedLocale): string {
  const parts = Array.isArray(path) ? path.map(String) : [];
  const root = parts[0];

  if (root === 'evidence') {
    return locale === 'ja' ? '根拠データ' : 'evidence';
  }
  if (root === 'confidence') {
    return locale === 'ja' ? '信頼度' : 'confidence';
  }
  if (typeof root === 'string' && root) {
    return root;
  }
  return locale === 'ja' ? '返答形式' : 'response format';
}

function translateStructuredIssue(
  issue: { code?: unknown; expected?: unknown; received?: unknown; maximum?: unknown; path?: unknown; message?: unknown },
  locale: SupportedLocale,
): string {
  const label = formatIssueLabel(issue.path, locale);

  if (locale === 'ja') {
    if (issue.code === 'invalid_type' && issue.expected === 'string' && issue.received === 'object') {
      return `${label}がテキストではなくオブジェクトで返されました`;
    }
    if (issue.code === 'invalid_type' && issue.expected === 'number') {
      return `${label}が数値として返されませんでした`;
    }
    if (issue.code === 'too_big' && typeof issue.maximum === 'number') {
      return `${label}が多すぎます（最大${issue.maximum}件）`;
    }
  } else {
    if (issue.code === 'invalid_type' && issue.expected === 'string' && issue.received === 'object') {
      return `${label} came back as an object instead of text`;
    }
    if (issue.code === 'invalid_type' && issue.expected === 'number') {
      return `${label} was not returned as a number`;
    }
    if (issue.code === 'too_big' && typeof issue.maximum === 'number') {
      return `${label} has too many items (max ${issue.maximum})`;
    }
  }

  return typeof issue.message === 'string' ? issue.message : locale === 'ja' ? '返答形式が不正です' : 'Invalid response format';
}

function summarizeErrorMessage(message: string, locale: SupportedLocale): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed.find((item) => typeof item === 'object' && item !== null) as
        | { path?: unknown; message?: unknown }
        | undefined;
      const detail = first ? translateStructuredIssue(first, locale) : trimmed;
      const suffix = parsed.length > 1 ? (locale === 'ja' ? `（ほか${parsed.length - 1}件）` : ` (+${parsed.length - 1})`) : '';
      return compactText(`${detail}${suffix}`);
    }
  } catch {
    // Ignore JSON parsing failures and fall back to plain text.
  }

  const firstLine = trimmed.split('\n')[0] ?? trimmed;
  return compactText(firstLine);
}

function LoadingScreen() {
  const { text } = useI18n();
  return <div className="loading">{text.loading}</div>;
}

function AnalysisErrorNotice(props: {
  error: DashboardData['errors'][number] | null;
  fallbackMessage: string | null;
  onOpenDebug: () => void;
  onClearErrors: () => void;
  clearingErrors: boolean;
}) {
  const { locale, text, formatTime } = useI18n();
  const summary = summarizeErrorMessage(props.error?.message ?? props.fallbackMessage ?? '', locale);

  if (!summary) {
    return null;
  }

  return (
    <div className="analysis-error-banner">
      <div className="analysis-error-copy">
        <strong>{text.analysisErrorTitle}</strong>
        <span>
          {props.error ? `${formatTime(props.error.createdAt)} ` : ''}
          {summary}
        </span>
      </div>
      <div className="analysis-error-actions">
        <button className="btn btn-ghost btn-sm" onClick={props.onOpenDebug}>
          {text.debug}
        </button>
        <button className="btn btn-ghost btn-sm" disabled={props.clearingErrors} onClick={props.onClearErrors}>
          {text.clearErrors}
        </button>
      </div>
    </div>
  );
}

function CategoryBars(props: {
  totalMinutes: number;
  items: DashboardData['today']['categorySummary'];
  title: string;
}) {
  const { text, categoryLabel, formatMinutes } = useI18n();

  return (
    <section className="panel">
      <h3 className="panel-title">{props.title}</h3>
      <div className="bar-list">
        {props.items.length === 0 ? <p className="muted">{text.noData}</p> : null}
        {props.items.map((item) => (
          <div className="bar-row" key={item.category}>
            <div className="bar-label">
              <span>{categoryLabel(item.category)}</span>
              <strong>{formatMinutes(item.minutes)}</strong>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: ratioWidth(item.minutes, props.totalMinutes) }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectTable(props: {
  items: DashboardData['today']['projectSummary'];
  title: string;
}) {
  const { text, formatMinutes, projectLabel } = useI18n();

  return (
    <section className="panel">
      <h3 className="panel-title">{props.title}</h3>
      <div className="project-list">
        {props.items.length === 0 ? <p className="muted">{text.noData}</p> : null}
        {props.items.map((item) => (
          <div className="project-row" key={item.projectName}>
            <span>{projectLabel(item.projectName)}</span>
            <strong>{formatMinutes(item.minutes)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function CheckpointList(props: { checkpoints: CheckpointRecord[] }) {
  const { categoryLabel, formatTimeRange } = useI18n();

  return (
    <div className="checkpoint-list">
      {props.checkpoints.map((cp) => (
        <article className="checkpoint-item" key={cp.id}>
          <header>
            <span className="muted">{formatTimeRange(cp.startAt, cp.endAt)}</span>
            <span className="tag">{categoryLabel(cp.category)}</span>
          </header>
          <h5>{cp.taskLabel}</h5>
          <p className="muted">{cp.stateSummary}</p>
        </article>
      ))}
    </div>
  );
}

function WorkUnitEditor(props: {
  unit: WorkUnitRecord;
  categories: string[];
  onSaved: () => void | Promise<void>;
}) {
  const { text, categoryLabel } = useI18n();
  const [draft, setDraft] = useState({
    title: props.unit.title,
    projectName: props.unit.projectName,
    category: props.unit.category,
    summary: props.unit.summary,
  });
  const [customCategory, setCustomCategory] = useState('');
  const [masterCategories, setMasterCategories] = useState(props.categories);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMasterCategories(props.categories);
  }, [props.categories]);

  const allOptions = [
    ...new Set([
      ...masterCategories,
      UNKNOWN_LABEL,
      ...(draft.category && draft.category !== '__custom__' && !masterCategories.includes(draft.category) ? [draft.category] : []),
    ]),
  ];

  async function commitCustomCategory() {
    const next = toStoredCategoryLabel(customCategory.trim());
    if (!next) {
      return;
    }

    setDraft((current) => ({ ...current, category: next }));
    setCustomCategory('');

    if (masterCategories.includes(next)) {
      return;
    }

    try {
      const settings = await window.myloggy.getSettings();
      if (settings.categories.includes(next)) {
        setMasterCategories(settings.categories);
        return;
      }

      const updatedSettings = await window.myloggy.updateSettings({
        categories: [...settings.categories, next],
      });
      setMasterCategories(updatedSettings.categories);
    } catch (error) {
      console.error('Failed to add custom category to settings', error);
    }
  }

  async function save() {
    const category = draft.category === '__custom__'
      ? toStoredCategoryLabel(customCategory.trim()) || props.unit.category
      : draft.category;

    setSaving(true);
    try {
      await window.myloggy.updateWorkUnit({
        id: props.unit.id,
        title: draft.title,
        projectName: draft.projectName,
        category,
        summary: draft.summary,
      });
    } finally {
      setSaving(false);
    }
    await props.onSaved();
  }

  return (
    <div className="editor-grid">
      <label>
        {text.title}
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </label>
      <label>
        {text.project}
        <input value={draft.projectName} onChange={(e) => setDraft({ ...draft, projectName: e.target.value })} />
      </label>
      <label>
        {text.category}
        <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
          {allOptions.map((category) => (
            <option key={category} value={category}>{categoryLabel(category)}</option>
          ))}
          <option value="__custom__">{text.customCategory}</option>
        </select>
      </label>
      {draft.category === '__custom__' ? (
        <label>
          {text.customCategory}
          <input
            value={customCategory}
            placeholder={text.customCategoryPlaceholder}
            onChange={(e) => setCustomCategory(e.target.value)}
            onBlur={() => { void commitCustomCategory(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void commitCustomCategory();
              }
            }}
          />
        </label>
      ) : null}
      <label className="full-span">
        {text.summary}
        <textarea rows={3} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
      </label>
      <button className="btn btn-primary" disabled={saving} onClick={save}>
        {saving ? text.saving : text.save}
      </button>
    </div>
  );
}

function DayView(props: { dashboard: DashboardData; categories: string[]; onRefresh: () => void }) {
  const { text, categoryLabel, formatMinutes, formatTimeRange, projectLabel } = useI18n();
  const checkpointsById = useMemo(() => new Map(props.dashboard.today.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint])), [props.dashboard.today.checkpoints]);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="content-grid">
      <section className="main-panel">
        {props.dashboard.today.units.length === 0 ? <p className="muted">{text.noWorkLog}</p> : null}
        <div className="timeline-list">
          {props.dashboard.today.units.map((unit) => {
            const checkpoints = unit.checkpointIds
              .map((id) => checkpointsById.get(id))
              .filter((value): value is CheckpointRecord => Boolean(value));

            return (
              <article className="work-unit" key={unit.id}>
                <div className="work-meta">
                  <span>{formatTimeRange(unit.startAt, unit.endAt)}</span>
                  <span>{formatMinutes(unit.durationMinutes)}</span>
                </div>
                <div className="work-body">
                  <div className="work-heading">
                    <div>
                      <span className="muted small">{projectLabel(unit.projectName)}</span>
                      <h3>{unit.title}</h3>
                    </div>
                    <div className="tag-group">
                      <span className="tag">{categoryLabel(unit.category)}</span>
                      {unit.isDistracted ? <span className="tag tag-warn">{text.distracted}</span> : null}
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(editingId === unit.id ? null : unit.id)}>
                        {editingId === unit.id ? text.close : text.edit}
                      </button>
                    </div>
                  </div>
                  <p className="muted">{unit.summary}</p>
                  {unit.note ? <p className="note">{text.notePrefix}: {unit.note}</p> : null}
                  {editingId === unit.id ? (
                    <WorkUnitEditor
                      unit={unit}
                      categories={props.categories}
                      onSaved={() => {
                        setEditingId(null);
                        props.onRefresh();
                      }}
                    />
                  ) : null}
                  <details>
                    <summary>{text.checkpoints(checkpoints.length)}</summary>
                    <CheckpointList checkpoints={checkpoints} />
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <aside className="side-column">
        <CategoryBars items={props.dashboard.today.categorySummary} totalMinutes={props.dashboard.today.totalMinutes} title={text.categories} />
        <ProjectTable items={props.dashboard.today.projectSummary} title={text.projects} />
      </aside>
    </div>
  );
}

function WeekView(props: { dashboard: DashboardData }) {
  const { text, formatMinutes } = useI18n();

  return (
    <div className="content-grid">
      <div className="main-column">
        <div className="stat-row">
          <div className="stat-card"><span className="muted">{text.totalWorkTime}</span><strong>{formatMinutes(props.dashboard.week.totalMinutes)}</strong></div>
        </div>
        <section className="panel">
          <h3 className="panel-title">{text.longestWork}</h3>
          <div className="project-list">
            {props.dashboard.week.longestUnits.length === 0 ? <p className="muted">{text.noData}</p> : null}
            {props.dashboard.week.longestUnits.map((unit) => (
              <div className="project-row" key={unit.id}>
                <span>{unit.title}</span>
                <strong>{formatMinutes(unit.durationMinutes)}</strong>
              </div>
            ))}
          </div>
        </section>
        <ProjectTable items={props.dashboard.week.projectSummary} title={text.projects} />
      </div>
      <aside className="side-column">
        <CategoryBars items={props.dashboard.week.categorySummary} totalMinutes={props.dashboard.week.totalMinutes} title={text.categories} />
      </aside>
    </div>
  );
}

function MonthCell(props: { day: DashboardData['month']['days'][number]; activeMonth: string }) {
  const { formatMinutes } = useI18n();
  const isOutside = !props.day.date.startsWith(props.activeMonth);
  const unit = props.day.representativeUnit;

  return (
    <div className={`month-cell ${isOutside ? 'outside' : ''}`}>
      <span className="month-day-num">{dayjs(props.day.date).date()}</span>
      {unit ? (
        <>
          <strong className="month-cell-title">{unit.title}</strong>
          <small className="muted">{formatMinutes(props.day.totalMinutes)}</small>
        </>
      ) : (
        <small className="muted">-</small>
      )}
    </div>
  );
}

function MonthView(props: { dashboard: DashboardData }) {
  const { text, weekdays } = useI18n();

  return (
    <div className="content-grid">
      <section className="main-panel">
        <div className="calendar-grid">
          {weekdays.map((day) => (
            <div className="calendar-head" key={day}>{day}</div>
          ))}
          {props.dashboard.month.days.map((day) => (
            <MonthCell key={day.date} day={day} activeMonth={props.dashboard.month.month} />
          ))}
        </div>
      </section>
      <aside className="side-column">
        <CategoryBars
          items={props.dashboard.month.categorySummary}
          totalMinutes={props.dashboard.month.categorySummary.reduce((total, item) => total + item.minutes, 0)}
          title={text.categories}
        />
        <ProjectTable items={props.dashboard.month.projectSummary} title={text.projects} />
      </aside>
    </div>
  );
}

function DebugModal(props: { onClose: () => void; onErrorsCleared: () => Promise<void> }) {
  const { text, formatTime, snapshotStatusLabel } = useI18n();
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearingErrors, setClearingErrors] = useState(false);

  const reloadData = useCallback(async () => {
    const next = await window.myloggy.getDebugData();
    setData(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reloadData();
  }, [reloadData]);

  async function clearErrors() {
    if (clearingErrors) {
      return;
    }

    setClearingErrors(true);
    try {
      await window.myloggy.clearErrors();
      await reloadData();
      await props.onErrorsCleared();
    } finally {
      setClearingErrors(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}>
      <div className="modal-content debug-modal">
        <div className="modal-header">
          <h2>{text.debugTitle}</h2>
          <button className="btn btn-ghost" onClick={props.onClose}>✕</button>
        </div>
        {loading ? <p className="muted">{text.loading}</p> : null}
        {data ? (
          <>
            <h3 className="debug-section-title">{text.recentSnapshots(data.snapshots.length)}</h3>
            <div className="debug-snaps">
              {data.snapshots.map((snapshot) => (
                <div className="debug-snap" key={snapshot.id}>
                  <div className="debug-images">
                    {snapshot.imagesBase64.length > 0 ? snapshot.imagesBase64.map((image, index) => (
                      <img key={index} className="debug-img" src={`data:image/jpeg;base64,${image}`} alt={`display ${index + 1}`} />
                    )) : (
                      <div className="debug-img-empty">{text.noImage}</div>
                    )}
                  </div>
                  <div className="debug-meta">
                    <div>
                      <strong>{dayjs(snapshot.capturedAt).format('HH:mm:ss')}</strong>{' '}
                      <span className={`debug-status debug-status-${snapshot.status}`}>{snapshotStatusLabel(snapshot.status)}</span>{' '}
                      <span className="muted">{text.screenCount(snapshot.displayCount)}</span>
                    </div>
                    <div>{text.statusApp}: <code>{snapshot.activeApp ?? '-'}</code></div>
                    <div>{text.statusWindow}: <code>{snapshot.windowTitle ?? '-'}</code></div>
                    {snapshot.pageTitle ? <div>{text.statusPage}: <code>{snapshot.pageTitle}</code></div> : null}
                    {snapshot.url ? <div>{text.statusUrl}: <code className="debug-url">{snapshot.url}</code></div> : null}
                    <div>{text.statusCursor}: ({snapshot.cursorX?.toFixed(0) ?? '-'}, {snapshot.cursorY?.toFixed(0) ?? '-'})</div>
                    {snapshot.checkpointId ? <div className="muted">CP: {snapshot.checkpointId}</div> : null}
                  </div>
                </div>
              ))}
            </div>
            {data.errors.length > 0 ? (
              <>
                <div className="debug-section-head">
                  <h3 className="debug-section-title">{text.errorLogs(data.errors.length)}</h3>
                  <button className="btn btn-ghost btn-sm" disabled={clearingErrors} onClick={() => { void clearErrors(); }}>
                    {text.clearErrors}
                  </button>
                </div>
                <div className="debug-errors">
                  {data.errors.map((error) => (
                    <div className="debug-error" key={error.id}>
                      <div><strong>{formatTime(error.createdAt)}</strong> [{error.scope}] {error.message}</div>
                      {error.detail ? <pre className="debug-detail">{error.detail.slice(0, 300)}</pre> : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function ExclusionListEditor(props: {
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  const { text } = useI18n();
  const [draft, setDraft] = useState('');

  function add() {
    const value = draft.trim();
    if (value && !props.items.includes(value)) {
      props.onChange([...props.items, value]);
      setDraft('');
    }
  }

  return (
    <div className="category-editor">
      <div className="category-list">
        {props.items.map((item, index) => (
          <div className="category-item" key={item}>
            <span>{item}</span>
            <div className="category-actions">
              <button
                className="btn btn-ghost btn-sm btn-danger-text"
                onClick={() => props.onChange(props.items.filter((_, i) => i !== index))}
              >✕</button>
            </div>
          </div>
        ))}
      </div>
      <div className="category-add">
        <input
          value={draft}
          placeholder={props.placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        />
        <button className="btn btn-ghost btn-sm" onClick={add}>{text.add}</button>
      </div>
    </div>
  );
}

function CategoryEditor(props: {
  categories: string[];
  onChange: (categories: string[]) => void;
}) {
  const { text, categoryLabel } = useI18n();
  const [newCategory, setNewCategory] = useState('');

  function addCategory() {
    const name = toStoredCategoryLabel(newCategory.trim());
    if (name && !props.categories.includes(name)) {
      props.onChange([...props.categories, name]);
      setNewCategory('');
    }
  }

  return (
    <div className="category-editor">
      <div className="category-list">
        {props.categories.map((category, index) => (
          <div className="category-item" key={category}>
            <span>{categoryLabel(category)}</span>
            <div className="category-actions">
              <button
                className="btn btn-ghost btn-sm"
                disabled={index === 0}
                onClick={() => {
                  const next = [...props.categories];
                  [next[index - 1]!, next[index]!] = [next[index]!, next[index - 1]!];
                  props.onChange(next);
                }}
              >↑</button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={index === props.categories.length - 1}
                onClick={() => {
                  const next = [...props.categories];
                  [next[index]!, next[index + 1]!] = [next[index + 1]!, next[index]!];
                  props.onChange(next);
                }}
              >↓</button>
              <button
                className="btn btn-ghost btn-sm btn-danger-text"
                onClick={() => props.onChange(props.categories.filter((_, categoryIndex) => categoryIndex !== index))}
              >✕</button>
            </div>
          </div>
        ))}
      </div>
      <div className="category-add">
        <input
          value={newCategory}
          placeholder={text.newCategoryPlaceholder}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
        />
        <button className="btn btn-ghost btn-sm" onClick={addCategory}>{text.add}</button>
      </div>
    </div>
  );
}

function SettingsModal(props: {
  settings: AppSettings;
  currentLocale: SupportedLocale;
  onSaved: (settings: AppSettings) => void;
  onClose: () => void;
}) {
  const { text } = useI18n();
  const [draft, setDraft] = useState<AppSettings>({
    ...props.settings,
    language: resolveLocalePreference(props.settings.language, props.currentLocale),
  });
  const [saving, setSaving] = useState(false);
  const [checkingModel, setCheckingModel] = useState(false);
  const [modelCheck, setModelCheck] = useState<ModelCheckResult | null>(null);

  useEffect(() => {
    setDraft({
      ...props.settings,
      language: resolveLocalePreference(props.settings.language, props.currentLocale),
    });
    setModelCheck(null);
  }, [props.currentLocale, props.settings]);

  async function testModel() {
    setCheckingModel(true);
    try {
      const result = await window.myloggy.testModel({
        model: draft.llmModel,
        ollamaHost: draft.ollamaHost,
      });
      setModelCheck(result);
    } finally {
      setCheckingModel(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const next = await window.myloggy.updateSettings({
        ...draft,
        excludedApps: draft.excludedApps.filter(Boolean),
        excludedDomains: draft.excludedDomains.filter(Boolean),
        excludedTimeBlocks: draft.excludedTimeBlocks.filter((b) => b.start && b.end),
        categories: draft.categories.filter(Boolean),
      });
      props.onSaved(next);
      props.onClose();
    } catch (error) {
      console.error('Failed to save settings', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{text.settings}</h2>
          <button className="btn btn-ghost" onClick={props.onClose}>✕</button>
        </div>
        <div className="settings-grid">
          <label className="full-span">
            {text.categories}
            <CategoryEditor
              categories={draft.categories ?? []}
              onChange={(categories) => setDraft({ ...draft, categories })}
            />
          </label>
          <label>
            {text.language}
            <select
              value={resolveLocalePreference(draft.language, props.currentLocale)}
              onChange={(e) => setDraft({ ...draft, language: e.target.value as SupportedLocale })}
            >
              <option value="ja">{text.languageJa}</option>
              <option value="en">{text.languageEn}</option>
            </select>
          </label>
          <label>Ollama Host<input value={draft.ollamaHost} onChange={(e) => {
            setDraft({ ...draft, ollamaHost: e.target.value });
            setModelCheck(null);
          }} /></label>
          <label>
            {text.model}
            <input value={draft.llmModel} onChange={(e) => {
              setDraft({ ...draft, llmModel: e.target.value });
              setModelCheck(null);
            }} />
          </label>
          <label>{text.captureTarget}
            <select value={draft.displayCaptureMode} onChange={(e) => setDraft({ ...draft, displayCaptureMode: e.target.value as AppSettings['displayCaptureMode'] })}>
              <option value="all">{text.allDisplays}</option>
              <option value="main">{text.mainOnly}</option>
            </select>
          </label>
          <div className="full-span settings-inline-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => { void testModel(); }} disabled={checkingModel}>
              {checkingModel ? text.testingModel : text.checkModel}
            </button>
            <span className={`settings-status ${modelCheck ? (modelCheck.ok ? 'ok' : 'error') : ''}`}>
              {modelCheck
                ? `${modelCheck.ok ? text.modelCheckOk : text.modelCheckFailed}: ${modelCheck.message}`
                : text.modelCheckIdle}
            </span>
          </div>
          <label className="full-span">
            {text.excludedApps}
            <span className="note">{text.excludedAppsHint}</span>
            <ExclusionListEditor
              items={draft.excludedApps}
              placeholder={text.excludedAppPlaceholder}
              onChange={(excludedApps) => setDraft((prev) => ({ ...prev, excludedApps }))}
            />
          </label>
          <label className="full-span">
            {text.excludedDomains}
            <span className="note">{text.excludedDomainsHint}</span>
            <ExclusionListEditor
              items={draft.excludedDomains}
              placeholder={text.excludedDomainPlaceholder}
              onChange={(excludedDomains) => setDraft((prev) => ({ ...prev, excludedDomains }))}
            />
          </label>
          <label className="full-span">
            {text.excludedTimeBlocks}
            <span className="note">{text.excludedTimeBlocksHint}</span>
            <div className="time-range-row">
              <input
                type="time"
                value={draft.excludedTimeBlocks[0]?.start ?? ''}
                onChange={(e) => setDraft((prev) => ({
                  ...prev,
                  excludedTimeBlocks: [{ start: e.target.value, end: prev.excludedTimeBlocks[0]?.end ?? '' }],
                }))}
              />
              <span>–</span>
              <input
                type="time"
                value={draft.excludedTimeBlocks[0]?.end ?? ''}
                onChange={(e) => setDraft((prev) => ({
                  ...prev,
                  excludedTimeBlocks: [{ start: prev.excludedTimeBlocks[0]?.start ?? '', end: e.target.value }],
                }))}
              />
            </div>
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={props.onClose}>{text.cancel}</button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? text.saving : text.save}</button>
        </div>
      </div>
    </div>
  );
}

function Onboarding(props: { onComplete: () => void }) {
  const { text } = useI18n();
  const [step, setStep] = useState(0);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const checkOllama = useCallback(async () => {
    setChecking(true);
    const status = await window.myloggy.checkOllama();
    setOllamaStatus(status);
    setChecking(false);
  }, []);

  useEffect(() => {
    if (step === 1 || step === 2) {
      void checkOllama();
    }
  }, [step, checkOllama]);

  const hasModel = ollamaStatus?.models.some((model) => model.startsWith('gemma4')) ?? false;

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className={`onboarding-dot ${index <= step ? 'active' : ''}`} />
          ))}
        </div>

        {step === 0 ? (
          <div className="onboarding-step">
            <h1 className="onboarding-logo">My Loggy</h1>
            <p className="onboarding-desc" style={{ whiteSpace: 'pre-line' }}>{text.onboardingDescription}</p>
            <p className="onboarding-sub">{text.onboardingSub}</p>
            <button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>
              {text.startSetup}
            </button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="onboarding-step">
            <h2>{text.installOllamaTitle}</h2>
            <p className="onboarding-desc">{text.installOllamaDescription}</p>
            <div className="onboarding-code">
              <code>brew install ollama</code>
            </div>
            <p className="onboarding-sub" style={{ whiteSpace: 'pre-line' }}>{text.installOllamaSub}</p>
            <div className="onboarding-status">
              {checking ? (
                <span className="onboarding-checking">{text.checking}</span>
              ) : ollamaStatus?.running ? (
                <span className="onboarding-ok">{text.ollamaRunning}</span>
              ) : (
                <span className="onboarding-ng">{text.ollamaMissing}</span>
              )}
              <button className="btn btn-ghost btn-sm" onClick={checkOllama} disabled={checking}>{text.recheck}</button>
            </div>
            <div className="onboarding-nav">
              <button className="btn btn-ghost" onClick={() => setStep(0)}>{text.back}</button>
              <button className="btn btn-primary" disabled={!ollamaStatus?.running} onClick={() => setStep(2)}>
                {text.next}
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="onboarding-step">
            <h2>{text.installModelTitle}</h2>
            <p className="onboarding-desc">{text.installModelDescription}</p>
            <div className="onboarding-code">
              <code>ollama pull gemma4:26b</code>
            </div>
            <p className="onboarding-sub">{text.installModelSub}</p>
            <div className="onboarding-status">
              {checking ? (
                <span className="onboarding-checking">{text.checking}</span>
              ) : hasModel ? (
                <span className="onboarding-ok">{text.modelInstalled}</span>
              ) : (
                <span className="onboarding-ng">{text.modelMissing}</span>
              )}
              <button className="btn btn-ghost btn-sm" onClick={checkOllama} disabled={checking}>{text.recheck}</button>
            </div>
            <div className="onboarding-nav">
              <button className="btn btn-ghost" onClick={() => setStep(1)}>{text.back}</button>
              <button className="btn btn-primary" disabled={!hasModel} onClick={() => setStep(3)}>
                {text.next}
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="onboarding-step">
            <h2>{text.screenPermissionTitle}</h2>
            <p className="onboarding-desc">{text.screenPermissionDescription}</p>
            <div className="onboarding-permission">
              <p>{text.screenPermissionHint}</p>
            </div>
            <p className="onboarding-sub">{text.screenPermissionSub}</p>
            <div className="onboarding-nav">
              <button className="btn btn-ghost" onClick={() => setStep(2)}>{text.back}</button>
              <button className="btn btn-primary btn-lg" onClick={props.onComplete}>
                {text.getStarted}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AppScreen(props: {
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
}) {
  const { locale, text, formatDateForView } = useI18n();
  const { dashboard, settings, state } = props.bootstrap;
  const [runningAnalyze, setRunningAnalyze] = useState(false);
  const [clearingPending, setClearingPending] = useState(false);
  const [clearingErrors, setClearingErrors] = useState(false);
  const analyzeLocked = state.isAnalyzing || runningAnalyze;
  const latestAnalysisError = dashboard.errors.find((error) => error.scope === 'analysis') ?? null;

  async function runAnalyzeNow() {
    if (analyzeLocked) {
      return;
    }

    setRunningAnalyze(true);
    try {
      await window.myloggy.analyzeNow();
      await props.onReload();
    } finally {
      setRunningAnalyze(false);
    }
  }

  async function clearPendingSnapshots() {
    if (!state.pendingSnapshots || clearingPending) {
      return;
    }

    setClearingPending(true);
    try {
      await window.myloggy.clearPendingSnapshots();
      await props.onReload();
    } finally {
      setClearingPending(false);
    }
  }

  async function clearErrors() {
    if (clearingErrors) {
      return;
    }

    setClearingErrors(true);
    try {
      await window.myloggy.clearErrors();
      await props.onReload();
    } finally {
      setClearingErrors(false);
    }
  }

  if (!settings.onboardingCompleted) {
    return (
      <Onboarding
        onComplete={async () => {
          await window.myloggy.updateSettings({ onboardingCompleted: true });
          await props.onReload();
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
            {(['day', 'week', 'month'] as const).map((view) => (
              <button key={view} className={`tab ${props.view === view ? 'active' : ''}`} onClick={() => props.setView(view)}>
                {text.tabs[view]}
              </button>
            ))}
          </nav>
        </div>
        <div className="top-bar-center">
          <button className="btn btn-ghost btn-icon" onClick={() => props.setSelectedDate(navigateDate(-1, props.view, props.selectedDate))}>←</button>
          <span className="date-label">{formatDateForView(props.view, props.selectedDate)}</span>
          <button className="btn btn-ghost btn-icon" onClick={() => props.setSelectedDate(navigateDate(1, props.view, props.selectedDate))}>→</button>
          <button className="btn btn-ghost btn-sm" onClick={() => props.setSelectedDate(props.today)}>{text.today}</button>
        </div>
        <div className="top-bar-right">
          <div className="top-bar-status">
            <button
              className="top-bar-counter top-bar-counter-btn"
              disabled={!state.pendingSnapshots || clearingPending}
              onClick={() => { void clearPendingSnapshots(); }}
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
            onClick={async () => { await window.myloggy.toggleTracking(!state.isTracking); await props.onReload(); }}
          >
            {state.isTracking ? text.trackingOn : text.trackingOff}
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => props.setSettingsOpen(true)} title={text.settings}>⚙</button>
        </div>
      </header>

      <AnalysisErrorNotice
        error={state.pendingSnapshots > 0 ? latestAnalysisError : null}
        fallbackMessage={state.pendingSnapshots > 0 && !latestAnalysisError ? state.lastError : null}
        onOpenDebug={() => props.setDebugOpen(true)}
        onClearErrors={() => { void clearErrors(); }}
        clearingErrors={clearingErrors}
      />

      <main className="workspace">
        {props.view === 'day' ? <DayView dashboard={dashboard} categories={settings.categories ?? []} onRefresh={() => void props.onReload()} /> : null}
        {props.view === 'week' ? <WeekView dashboard={dashboard} /> : null}
        {props.view === 'month' ? <MonthView dashboard={dashboard} /> : null}
      </main>

      {props.settingsOpen ? (
        <SettingsModal
          settings={settings}
          currentLocale={locale}
          onSaved={(next) => {
            props.setBootstrap((current) => current ? {
              ...current,
              settings: next,
              locale: resolveLocalePreference(next.language, current.locale),
            } : current);
            void props.onReload();
          }}
          onClose={() => props.setSettingsOpen(false)}
        />
      ) : null}
      {props.debugOpen ? <DebugModal onClose={() => props.setDebugOpen(false)} onErrorsCleared={() => props.onReload()} /> : null}
    </div>
  );
}

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
