import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { OllamaStatus } from '../../../shared/types.js';
import { I18nProvider } from '../../i18n.js';
import { OnboardingStep1 } from './OnboardingStep1.jsx';

const createMockOllamaStatus = (running: boolean): OllamaStatus => ({
  running,
  models: [],
});

describe('OnboardingStep1', () => {
  const defaultProps = {
    ollamaStatus: null as OllamaStatus | null,
    checking: false,
    onBack: vi.fn(),
    onNext: vi.fn(),
    onCheck: vi.fn(),
  };

  it('should render title and description', () => {
    render(
      <I18nProvider locale="en">
        <OnboardingStep1 {...defaultProps} />
      </I18nProvider>
    );
    expect(screen.getByText('Install Ollama')).toBeInTheDocument();
    expect(screen.getByText(/My Loggy uses a local LLM through Ollama/)).toBeInTheDocument();
  });

  it('should render brew install command', () => {
    render(
      <I18nProvider locale="en">
        <OnboardingStep1 {...defaultProps} />
      </I18nProvider>
    );
    expect(screen.getByText('brew install ollama')).toBeInTheDocument();
  });

  it('should show checking status when checking is true', () => {
    render(
      <I18nProvider locale="en">
        <OnboardingStep1 {...defaultProps} checking={true} />
      </I18nProvider>
    );
    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });

  it('should show ollama running status when running is true', () => {
    const ollamaStatus = createMockOllamaStatus(true);
    render(
      <I18nProvider locale="en">
        <OnboardingStep1 {...defaultProps} ollamaStatus={ollamaStatus} />
      </I18nProvider>
    );
    expect(screen.getByText('Ollama is running')).toBeInTheDocument();
  });

  it('should show ollama missing status when running is false', () => {
    const ollamaStatus = createMockOllamaStatus(false);
    render(
      <I18nProvider locale="en">
        <OnboardingStep1 {...defaultProps} ollamaStatus={ollamaStatus} />
      </I18nProvider>
    );
    expect(screen.getByText('Ollama was not found')).toBeInTheDocument();
  });

  it('should enable Next button when ollama is running', () => {
    const ollamaStatus = createMockOllamaStatus(true);
    const onNext = vi.fn();
    render(
      <I18nProvider locale="en">
        <OnboardingStep1 {...defaultProps} ollamaStatus={ollamaStatus} onNext={onNext} />
      </I18nProvider>
    );
    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).toBeEnabled();
  });

  it('should disable Next button when ollama is not running', () => {
    const ollamaStatus = createMockOllamaStatus(false);
    render(
      <I18nProvider locale="en">
        <OnboardingStep1 {...defaultProps} ollamaStatus={ollamaStatus} />
      </I18nProvider>
    );
    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).toBeDisabled();
  });

  it('should call onBack when Back button is clicked', () => {
    const onBack = vi.fn();
    render(
      <I18nProvider locale="en">
        <OnboardingStep1 {...defaultProps} onBack={onBack} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should call onNext when Next button is clicked and ollama is running', () => {
    const onNext = vi.fn();
    const ollamaStatus = createMockOllamaStatus(true);
    render(
      <I18nProvider locale="en">
        <OnboardingStep1 {...defaultProps} ollamaStatus={ollamaStatus} onNext={onNext} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('should call onCheck when recheck button is clicked', () => {
    const onCheck = vi.fn();
    render(
      <I18nProvider locale="en">
        <OnboardingStep1 {...defaultProps} onCheck={onCheck} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(onCheck).toHaveBeenCalledTimes(1);
  });

  it('should disable recheck button when checking is true', () => {
    render(
      <I18nProvider locale="en">
        <OnboardingStep1 {...defaultProps} checking={true} />
      </I18nProvider>
    );
    expect(screen.getByRole('button', { name: 'Check again' })).toBeDisabled();
  });
});