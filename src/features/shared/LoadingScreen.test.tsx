import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '../../i18n.js';
import { LoadingScreen } from './LoadingScreen.jsx';

describe('LoadingScreen', () => {
  it('should render loading text', () => {
    render(
      <I18nProvider locale="en">
        <LoadingScreen />
      </I18nProvider>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render loading text in Japanese', () => {
    render(
      <I18nProvider locale="ja">
        <LoadingScreen />
      </I18nProvider>
    );
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });
});