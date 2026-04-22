import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { CheckpointRecord } from '../../../shared/types.js';
import { I18nProvider } from '../../i18n.js';
import { CheckpointList } from './CheckpointList.jsx';

const createMockCheckpoint = (overrides: Partial<CheckpointRecord> = {}): CheckpointRecord => ({
  id: 'c1',
  startAt: '2024-01-15T09:00:00Z',
  endAt: '2024-01-15T09:30:00Z',
  projectName: 'myloggy',
  taskLabel: 'Write tests',
  category: 'coding',
  stateSummary: 'In progress',
  evidence: [],
  continuity: 'continue',
  confidence: 0.8,
  sourceSnapshotIds: ['s1'],
  llmModel: 'gemma4:26b',
  createdAt: '2024-01-15T09:00:00Z',
  isDistracted: false,
  status: 'completed',
  appSummary: [],
  urlSummary: [],
  ...overrides,
});

describe('CheckpointList', () => {
  beforeEach(() => {
    window.myloggy = {
      ...window.myloggy,
      getCheckpointSnapshots: vi.fn((checkpointId: string) =>
        Promise.resolve([
          {
            id: 's1',
            capturedAt: '2024-01-15T09:00:00Z',
            imagesBase64: [
              // 最小限の有効な base64 JPEG（1x1 ピクセル）
              '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
            ],
            displayCount: 1,
          },
        ]),
      ),
    } as any;
  });

  it('renders checkpoint info', async () => {
    render(
      <I18nProvider locale="en">
        <CheckpointList checkpoints={[createMockCheckpoint()]} />
      </I18nProvider>,
    );

    expect(screen.getByText('Write tests')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('renders screenshot thumbnails after loading', async () => {
    render(
      <I18nProvider locale="en">
        <CheckpointList checkpoints={[createMockCheckpoint()]} />
      </I18nProvider>,
    );

    await waitFor(() => {
      const img = screen.getByAltText('Screenshot 1');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', expect.stringContaining('data:image/jpeg;base64,'));
    });
  });

  it('calls getCheckpointSnapshots for each checkpoint', async () => {
    render(
      <I18nProvider locale="en">
        <CheckpointList checkpoints={[createMockCheckpoint({ id: 'c1' }), createMockCheckpoint({ id: 'c2' })]} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(window.myloggy.getCheckpointSnapshots).toHaveBeenCalledWith('c1');
      expect(window.myloggy.getCheckpointSnapshots).toHaveBeenCalledWith('c2');
    });
  });
});
