import { useI18n } from '../../i18n.js';

export function LoadingScreen() {
  const { text } = useI18n();
  return <div className="loading">{text.loading}</div>;
}