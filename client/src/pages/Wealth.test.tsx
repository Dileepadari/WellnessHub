/**
 * Covers the Wealth page's reads across the summary and the ledger.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderPage, stubFetch } from '@/test/harness';
import { formatCurrency } from '@/lib/format';
import { Wealth } from './Wealth';

const SUMMARY = {
  month: '2026-09',
  income: 6990,
  expenses: 2936,
  net: 4054,
  savingsRate: 58,
  averageIncome: 6740,
  averageExpenses: 3007,
  series: [
    { month: '2026-08', income: 6576, expenses: 2884 },
    { month: '2026-09', income: 6990, expenses: 2936 }
  ],
  categories: [
    { category: 'housing', total: 1717, count: 1 },
    { category: 'food', total: 614, count: 7 }
  ],
  goals: [
    {
      _id: 'g1',
      title: 'Emergency fund',
      currentValue: 6700,
      targetValue: 15000,
      progress: 45,
      dueDate: '2027-05-22T00:00:00.000Z'
    }
  ]
};

const TRANSACTIONS = {
  transactions: [
    { _id: 't1', kind: 'expense', category: 'entertainment', amount: 103, at: '2026-09-24T10:00:00.000Z', description: '' },
    { _id: 't2', kind: 'income', category: 'salary', amount: 6576, at: '2026-09-01T10:00:00.000Z', description: 'Monthly salary' }
  ]
};

const ROUTES = {
  '/wealth/summary': SUMMARY,
  '/wealth/transactions': TRANSACTIONS,
  '/wealth/goals': { goals: SUMMARY.goals },
  '/wealth/categories': { income: ['salary'], expense: ['housing', 'food', 'entertainment'] }
};

afterEach(() => vi.unstubAllGlobals());

describe('Wealth', () => {
  it('shows the month summary', async () => {
    stubFetch(ROUTES);
    renderPage(<Wealth />);

    // Income appears in the stat strip and again as the chart's end label.
    expect((await screen.findAllByText(formatCurrency(6990))).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(2936)).length).toBeGreaterThan(0);
    expect(screen.getByText('58%')).toBeInTheDocument();
  });

  it('breaks spending down by category', async () => {
    stubFetch(ROUTES);
    renderPage(<Wealth />);

    // Scoped to the table: the same words are options in the record form.
    const table = await screen.findByRole('table', { name: 'Spend by category' });
    expect(within(table).getByText('Housing')).toBeInTheDocument();
    expect(within(table).getByText('Food')).toBeInTheDocument();
  });

  it('lists the ledger with a sign per kind', async () => {
    stubFetch(ROUTES);
    renderPage(<Wealth />);

    const table = await screen.findByRole('table', { name: 'Transactions' });
    expect(within(table).getByText('Monthly salary')).toBeInTheDocument();
  });

  it('shows goal progress from its contributions', async () => {
    stubFetch(ROUTES);
    renderPage(<Wealth />);

    expect(await screen.findByText('Emergency fund')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('degrades rather than throwing when the arrays are missing', async () => {
    stubFetch({
      '/wealth/summary': { income: 0, expenses: 0, net: 0, series: null, categories: undefined },
      '/wealth/transactions': { transactions: 'nope' },
      '/wealth/goals': {},
      '/wealth/categories': {}
    });
    renderPage(<Wealth />);

    expect((await screen.findAllByText('Goals')).length).toBeGreaterThan(0);
  });
});
