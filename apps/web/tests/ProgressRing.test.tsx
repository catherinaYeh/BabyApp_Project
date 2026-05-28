import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { ProgressRing } from '@/components/common/ProgressRing';

describe('ProgressRing', () => {
  test('shows integer percent ≥ 10', () => {
    render(<ProgressRing percent={42} />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  test('shows 1 decimal when percent < 10', () => {
    render(<ProgressRing percent={6.3} />);
    expect(screen.getByText('6.3%')).toBeInTheDocument();
  });

  test('clamps over-100 to 100', () => {
    render(<ProgressRing percent={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
