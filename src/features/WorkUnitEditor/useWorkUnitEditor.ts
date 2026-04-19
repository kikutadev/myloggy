import { useState, useEffect, useCallback } from 'react';
import type { WorkUnitRecord } from '../../../shared/types.js';
import { toStoredCategoryLabel, UNKNOWN_LABEL } from '../../../shared/localization.js';

interface UseWorkUnitEditorOptions {
  unit: WorkUnitRecord;
  categories: string[];
  onSaved: () => void | Promise<void>;
}

interface WorkUnitDraft {
  title: string;
  projectName: string;
  category: string;
  summary: string;
}

export function useWorkUnitEditor({ unit, categories, onSaved }: UseWorkUnitEditorOptions) {
  const [draft, setDraft] = useState<WorkUnitDraft>({
    title: unit.title,
    projectName: unit.projectName,
    category: unit.category,
    summary: unit.summary,
  });
  const [customCategory, setCustomCategory] = useState('');
  const [masterCategories, setMasterCategories] = useState(categories);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMasterCategories(categories);
  }, [categories]);

  const allOptions = [
    ...new Set([
      ...masterCategories,
      UNKNOWN_LABEL,
      ...(draft.category && draft.category !== '__custom__' && !masterCategories.includes(draft.category) ? [draft.category] : []),
    ]),
  ];

  const commitCustomCategory = useCallback(async () => {
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
  }, [customCategory, masterCategories]);

  const save = useCallback(async () => {
    const category = draft.category === '__custom__'
      ? toStoredCategoryLabel(customCategory.trim()) || unit.category
      : draft.category;

    setSaving(true);
    try {
      await window.myloggy.updateWorkUnit({
        id: unit.id,
        title: draft.title,
        projectName: draft.projectName,
        category,
        summary: draft.summary,
      });
    } finally {
      setSaving(false);
    }
    await onSaved();
  }, [draft, customCategory, unit]);

  return {
    draft,
    setDraft,
    customCategory,
    setCustomCategory,
    allOptions,
    saving,
    commitCustomCategory,
    save,
  };
}