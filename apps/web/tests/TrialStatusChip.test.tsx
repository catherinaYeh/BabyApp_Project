import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { TrialStatusChip } from '@/components/common/TrialStatusChip';

describe('TrialStatusChip', () => {
  test.each([
    ['UNTRIED' as const, '未嘗試'],
    ['TRYING' as const, '嘗試中'],
    ['UNLOCKED' as const, '已解鎖'],
    ['ALLERGIC' as const, '過敏'],
  ])('renders %s label', (status, label) => {
    render(<TrialStatusChip status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
