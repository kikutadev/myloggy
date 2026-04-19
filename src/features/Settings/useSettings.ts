import { useState, useEffect } from 'react';
import type { AppSettings, ModelCheckResult } from '../../../shared/types.js';
import { resolveLocalePreference } from '../../../shared/localization.js';
import type { SupportedLocale } from '../../../shared/localization.js';

interface UseSettingsOptions {
  settings: AppSettings;
  currentLocale: SupportedLocale;
}

export function useSettings({ settings, currentLocale }: UseSettingsOptions) {
  const [draft, setDraft] = useState<AppSettings>({
    ...settings,
    language: resolveLocalePreference(settings.language, currentLocale),
  });
  const [saving, setSaving] = useState(false);
  const [checkingModel, setCheckingModel] = useState(false);
  const [modelCheck, setModelCheck] = useState<ModelCheckResult | null>(null);

  useEffect(() => {
    setDraft({
      ...settings,
      language: resolveLocalePreference(settings.language, currentLocale),
    });
    setModelCheck(null);
  }, [currentLocale, settings]);

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

  async function save(onSaved: (settings: AppSettings) => void, onClose: () => void) {
    setSaving(true);
    try {
      const next = await window.myloggy.updateSettings({
        ...draft,
        excludedApps: draft.excludedApps.filter(Boolean),
        excludedDomains: draft.excludedDomains.filter(Boolean),
        excludedTimeBlocks: draft.excludedTimeBlocks.filter((b) => b.start && b.end),
        categories: draft.categories.filter(Boolean),
      });
      onSaved(next);
      onClose();
    } catch (error) {
      console.error('Failed to save settings', error);
    } finally {
      setSaving(false);
    }
  }

return {
  draft,
  setDraft,
  saving,
  checkingModel,
  modelCheck,
  setModelCheck,
  testModel,
  save,
};
}