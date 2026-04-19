import { useState } from 'react';
import { useI18n } from '../../i18n.js';

interface ExclusionListEditorProps {
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}

export function ExclusionListEditor({ items, placeholder, onChange }: ExclusionListEditorProps) {
  const { text } = useI18n();
  const [draft, setDraft] = useState('');

  function add() {
    const value = draft.trim();
    if (value && !items.includes(value)) {
      onChange([...items, value]);
      setDraft('');
    }
  }

  return (
    <div className="category-editor">
      <div className="category-list">
        {items.map((item, index) => (
          <div className="category-item" key={item}>
            <span>{item}</span>
            <div className="category-actions">
              <button
                className="btn btn-ghost btn-sm btn-danger-text"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="category-add">
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        />
        <button className="btn btn-ghost btn-sm" onClick={add}>{text.add}</button>
      </div>
    </div>
  );
}