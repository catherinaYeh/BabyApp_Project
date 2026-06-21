import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { QueryError } from '@/components/common/QueryError';

describe('QueryError', () => {
  test('renders default friendly error message and a retry button', () => {
    render(<QueryError onRetry={() => {}} />);
    expect(screen.getByText('糟糕，載入失敗了')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重試' })).toBeInTheDocument();
  });

  test('calls onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn();
    render(<QueryError onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: '重試' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('supports custom title and description', () => {
    render(<QueryError onRetry={() => {}} title="自訂標題" description="自訂說明" />);
    expect(screen.getByText('自訂標題')).toBeInTheDocument();
    expect(screen.getByText('自訂說明')).toBeInTheDocument();
  });
});
