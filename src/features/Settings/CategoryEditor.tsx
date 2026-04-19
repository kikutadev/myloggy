import { useState } from 'react';
import { toStoredCategoryLabel } from '../../../shared/localization.js';
import { useI18n } from '../../i18n.js';

interface CategoryEditorProps {
  categories: string[];
  onChange: (categories: string[]) => void;
}

export function CategoryEditor({ categories, onChange }: CategoryEditorProps) {
  const { text, categoryLabel } = useI18n();
  const [newCategory, setNewCategory] = useState('');

  function addCategory() {
    const name = toStoredCategoryLabel(newCategory.trim());
    if (name && !categories.includes(name)) {
      onChange([...categories, name]);
      setNewCategory('');
    }
  }

  return (
    <div className="category-editor">
      <div className="category-list">
        {categories.map((category, index) => (
          <div className="category-item" key={category}>
            <span>{categoryLabel(category)}</span>
            <div className="category-actions">
              <button
                className="btn btn-ghost btn-sm"
                disabled={index === 0}
                onClick={() => {
                  const next = [...categories];
                  [next[index - 1]!, next[index]!] = [next[index]!, next[index - 1]!];
                  onChange(next);
                }}
              >
                ↑
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={index === categories.length - 1}
                onClick={() => {
                  const next = [...categories];
                  [next[index]!, next[index + 1]!] = [next[index + 1]!, next[index]!];
                  onChange(next);
                }}
              >
                ↓
              </button>
              <button
                className="btn btn-ghost btn-sm btn-danger-text"
                onClick={() => onChange(categories.filter((_, categoryIndex) => categoryIndex !== index))}
              >
                ✕
              </button>
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