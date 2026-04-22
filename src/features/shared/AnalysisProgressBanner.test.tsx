import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalysisProgressBanner } from './AnalysisProgressBanner.js';
import type { AnalysisProgress } from '../../../shared/types.js';

describe('AnalysisProgressBanner', () => {
  it('progressがnullのとき何も描画しない', () => {
    const { container } = render(<AnalysisProgressBanner progress={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('phaseがcompleteのとき何も描画しない', () => {
    const progress: AnalysisProgress = { phase: 'complete', current: 5, total: 5, message: '完了' };
    const { container } = render(<AnalysisProgressBanner progress={progress} />);
    expect(container.firstChild).toBeNull();
  });

  it('phaseがanalyzeのときメッセージとプログレスバーを描画する', () => {
    const progress: AnalysisProgress = { phase: 'analyze', current: 2, total: 5, message: 'AI解析中... (2/5)' };
    render(<AnalysisProgressBanner progress={progress} />);

    expect(screen.getByText('AI解析中... (2/5)')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('value', '2');
    expect(bar).toHaveAttribute('max', '5');
  });

  it('phaseがerrorのときエラースタイルが適用される', () => {
    const progress: AnalysisProgress = { phase: 'error', current: 0, total: 0, message: 'エラー: モデル応答なし' };
    render(<AnalysisProgressBanner progress={progress} />);

    expect(screen.getByText('エラー: モデル応答なし')).toBeInTheDocument();
    const banner = screen.getByText('エラー: モデル応答なし').closest('.progress-banner');
    expect(banner).toHaveClass('progress-banner--error');
  });

  it('totalが0のときプログレスバーを描画しない', () => {
    const progress: AnalysisProgress = { phase: 'reset', current: 0, total: 0, message: '既存解析結果を削除中...' };
    render(<AnalysisProgressBanner progress={progress} />);

    expect(screen.getByText('既存解析結果を削除中...')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
