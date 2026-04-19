import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { OllamaStatus } from '../../../shared/types.js';
import { I18nProvider } from '../../i18n.js';
import { OnboardingStep2 } from './OnboardingStep2.jsx';

const createMockOllamaStatus = (models: string[] = []): OllamaStatus => ({
  running: true,
  models,
});

describe('OnboardingStep2', () => {
  const defaultProps = {
    ollamaStatus: null,
    checking: false,
    onBack: vi.fn(),
    onNext: vi.fn(),
    onCheck: vi.fn(),
  };

  it('should render title and description', () => {
    render(
      <I18nProvider locale="en">
        <OnboardingStep2 {...defaultProps} />
      </I18nProvider>
    );

    expect(screen.getByText('Download the AI model')).toBeInTheDocument();
    expect(screen.getByText(/Download the model/)).toBeInTheDocument();
  });

  it('should render code block with ollama pull command', () => {
    render(
      <I18nProvider locale="en">
        <OnboardingStep2 {...defaultProps} />
      </I18nProvider>
    );

    expect(screen.getByText('ollama pull gemma4:26b')).toBeInTheDocument();
  });

  it('should show checking status when checking is true', () => {
    render(
      <I18nProvider locale="en">
        <OnboardingStep2 {...defaultProps} checking={true} />
      </I18nProvider>
    );

    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });

  it('should show model installed status when gemma4 model exists', () => {
    const ollamaStatus = createMockOllamaStatus(['gemma4:26b', 'llama3:latest']);

    render(
      <I18nProvider locale="en">
        <OnboardingStep2 {...defaultProps} ollamaStatus={ollamaStatus} />
      </I18nProvider>
    );

    expect(screen.getByText('gemma4 is installed')).toBeInTheDocument();
  });

  it('should show model missing status when gemma4 model does not exist', () => {
    const ollamaStatus = createMockOllamaStatus(['llama3:latest']);

    render(
      <I18nProvider locale="en">
        <OnboardingStep2 {...defaultProps} ollamaStatus={ollamaStatus} />
      </I18nProvider>
    );

    expect(screen.getByText('gemma4 was not found')).toBeInTheDocument();
  });

  it('should call onCheck when recheck button is clicked', () => {
    const onCheck = vi.fn();

    render(
      <I18nProvider locale="en">
        <OnboardingStep2 {...defaultProps} onCheck={onCheck} />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));

    expect(onCheck).toHaveBeenCalledTimes(1);
  });

  it('should call onBack when back button is clicked', () => {
    const onBack = vi.fn();

    render(
      <I18nProvider locale="en">
        <OnboardingStep2 {...defaultProps} onBack={onBack} />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should enable next button when model is installed', () => {
    const ollamaStatus = createMockOllamaStatus(['gemma4:26b']);
    const onNext = vi.fn();

    render(
      <I18nProvider locale="en">
        <OnboardingStep2 {...defaultProps} ollamaStatus={ollamaStatus} onNext={onNext} />
      </I18nProvider>
    );

    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).toBeEnabled();

    fireEvent.click(nextButton);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('should disable next button when model is not installed', () => {
    const ollamaStatus = createMockOllamaStatus(['llama3:latest']);

    render(
      <I18nProvider locale="en">
        <OnboardingStep2 {...defaultProps} ollamaStatus={ollamaStatus} />
      </I18nProvider>
    );

    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).toBeDisabled();
  });
});