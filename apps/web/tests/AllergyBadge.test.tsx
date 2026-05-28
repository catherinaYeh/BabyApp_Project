import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { AllergyBadge } from '@/components/common/AllergyBadge';

describe('AllergyBadge', () => {
  test('renders LOW label', () => {
    render(<AllergyBadge risk="LOW" />);
    expect(screen.getByText('低敏')).toBeInTheDocument();
  });

  test('renders MEDIUM label', () => {
    render(<AllergyBadge risk="MEDIUM" />);
    expect(screen.getByText('中敏')).toBeInTheDocument();
  });

  test('renders HIGH label', () => {
    render(<AllergyBadge risk="HIGH" />);
    expect(screen.getByText('高敏')).toBeInTheDocument();
  });
});
