import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../../i18n.js';
import { OnboardingStep0 } from './OnboardingStep0.jsx';

describe('OnboardingStep0', () => {
  it('should render logo and title', () => {
    render(
      <I18nProvider locale="en">
        <OnboardingStep0 onNext={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('My Loggy')).toBeInTheDocument();
  });

  it('should render start setup button', () => {
    render(
      <I18nProvider locale="en">
        <OnboardingStep0 onNext={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByRole('button', { name: 'Start setup' })).toBeInTheDocument();
  });

  it('should call onNext when Start setup is clicked', () => {
    const onNext = vi.fn();
    render(
      <I18nProvider locale="en">
        <OnboardingStep0 onNext={onNext} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start setup' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('should render Japanese text when locale is ja', () => {
    render(
      <I18nProvider locale="ja">
        <OnboardingStep0 onNext={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('My Loggy')).toBeInTheDocument();
  });
});