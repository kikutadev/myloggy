import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../../i18n.js';
import { OnboardingStep3 } from './OnboardingStep3.jsx';

describe('OnboardingStep3', () => {
  const defaultProps = {
    onBack: vi.fn(),
    onComplete: vi.fn(),
  };

  it('should render title and description', () => {
    render(
      <I18nProvider locale="en">
        <OnboardingStep3 {...defaultProps} />
      </I18nProvider>
    );

    expect(screen.getByText('Allow screen recording')).toBeInTheDocument();
    expect(screen.getByText(/My Loggy needs macOS screen recording/)).toBeInTheDocument();
  });

  it('should render permission hint', () => {
    render(
      <I18nProvider locale="en">
        <OnboardingStep3 {...defaultProps} />
      </I18nProvider>
    );

    expect(screen.getByText(/Open System Settings/)).toBeInTheDocument();
  });

  it('should call onBack when back button is clicked', () => {
    const onBack = vi.fn();

    render(
      <I18nProvider locale="en">
        <OnboardingStep3 {...defaultProps} onBack={onBack} />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should call onComplete when get started button is clicked', () => {
    const onComplete = vi.fn();

    render(
      <I18nProvider locale="en">
        <OnboardingStep3 {...defaultProps} onComplete={onComplete} />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start using My Loggy' }));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});