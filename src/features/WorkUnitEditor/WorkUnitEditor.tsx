import type { WorkUnitRecord } from '../../../shared/types.js';
import { useI18n } from '../../i18n.js';
import { useWorkUnitEditor } from './useWorkUnitEditor.js';

interface WorkUnitEditorProps {
  unit: WorkUnitRecord;
  categories: string[];
  onSaved: () => void | Promise<void>;
}

export function WorkUnitEditor({ unit, categories, onSaved }: WorkUnitEditorProps) {
  const { text, categoryLabel } = useI18n();
  const {
    draft,
    setDraft,
    customCategory,
    setCustomCategory,
    allOptions,
    saving,
    commitCustomCategory,
    save,
  } = useWorkUnitEditor({ unit, categories, onSaved });

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