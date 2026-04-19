import type { AppSettings } from '../../../shared/types.js';
import { resolveLocalePreference } from '../../../shared/localization.js';
import type { SupportedLocale } from '../../../shared/localization.js';
import { useI18n } from '../../i18n.js';
import { CategoryEditor } from './CategoryEditor.jsx';
import { ExclusionListEditor } from './ExclusionListEditor.jsx';
import { useSettings } from './useSettings.js';

interface SettingsModalProps {
  settings: AppSettings;
  currentLocale: SupportedLocale;
  onSaved: (settings: AppSettings) => void;
  onClose: () => void;
}

export function SettingsModal({ settings, currentLocale, onSaved, onClose }: SettingsModalProps) {
  const { text } = useI18n();
const {
  draft,
  setDraft,
  saving,
  checkingModel,
  modelCheck,
  setModelCheck,
  testModel,
  save,
} = useSettings({ settings, currentLocale });

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{text.settings}</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="settings-current-provider">
          {text.currentProvider(
            draft.llmProvider === 'ollama' ? text.ollama : text.lmstudio,
            draft.llmModel
          )}
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
              value={resolveLocalePreference(draft.language, currentLocale)}
              onChange={(e) => setDraft({ ...draft, language: e.target.value as SupportedLocale })}
            >
              <option value="ja">{text.languageJa}</option>
              <option value="en">{text.languageEn}</option>
            </select>
          </label>
          <label className="full-span">
            {text.llmProvider}
            <div className="settings-radio-group">
              <label className="settings-radio">
                <input
                  type="radio"
                  name="llmProvider"
                  checked={draft.llmProvider === 'ollama'}
                  onChange={() => { setDraft({ ...draft, llmProvider: 'ollama' }); setModelCheck(null); }}
                />
                {text.ollama}
              </label>
              <label className="settings-radio">
                <input
                  type="radio"
                  name="llmProvider"
                  checked={draft.llmProvider === 'lmstudio'}
                  onChange={() => { setDraft({ ...draft, llmProvider: 'lmstudio' }); setModelCheck(null); }}
                />
                {text.lmstudio}
              </label>
            </div>
          </label>
          {draft.llmProvider === 'ollama' ? (
            <label>Ollama Host<input value={draft.ollamaHost} onChange={(e) => {
              setDraft({ ...draft, ollamaHost: e.target.value });
              setModelCheck(null);
            }} /></label>
          ) : (
            <label>LM Studio Host<input value={draft.lmstudioHost} onChange={(e) => {
              setDraft({ ...draft, lmstudioHost: e.target.value });
              setModelCheck(null);
            }} /></label>
          )}
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
          <button className="btn btn-ghost" onClick={onClose}>{text.cancel}</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => save(onSaved, onClose)}>{saving ? text.saving : text.save}</button>
        </div>
      </div>
    </div>
  );
}