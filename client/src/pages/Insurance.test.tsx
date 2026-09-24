/**
 * Covers the Insurance page's reads across three separate endpoints.
 *
 * This page is the one that stitches several payloads together, so a field
 * moving in any one of them degrades quietly to a zero rather than an error.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderPage, stubFetch } from '@/test/harness';
import { formatCurrency } from '@/lib/format';
import { Insurance } from './Insurance';

const POLICIES = {
  policies: [
    {
      _id: 'p1',
      type: 'health',
      provider: 'BlueShield',
      coverageAmount: 500000,
      premium: 240,
      premiumFrequency: 'monthly',
      renewalDate: '2026-10-18T00:00:00.000Z',
      annualPremium: 2880,
      status: 'active'
    },
    {
      _id: 'p2',
      type: 'auto',
      provider: 'Northwind Mutual',
      coverageAmount: 60000,
      premium: 420,
      premiumFrequency: 'quarterly',
      renewalDate: '2027-01-14T00:00:00.000Z',
      annualPremium: 1680,
      status: 'active'
    }
  ],
  summary: { active: 2, totalCoverage: 560000, totalAnnualPremium: 4560 }
};

// Field names taken from routes/insurance.js: title and daysUntil, not item
// and days. The page renders title through humanise(), which title-cases it.
const ALERTS = {
  alerts: [
    {
      kind: 'renewal',
      severity: 'medium',
      title: 'health renewal - BlueShield',
      detail: 'Renews in 24 days',
      daysUntil: 24
    },
    {
      kind: 'gap',
      severity: 'medium',
      title: 'No life cover',
      detail: 'You have no active life policy on file',
      insuranceType: 'life'
    }
  ]
};

const COVERAGE = { score: 55, essentialsMissing: ['life'], premiumToIncomePercent: 6 };

const ROUTES = {
  '/insurance/policies': POLICIES,
  '/insurance/alerts': ALERTS,
  '/insurance/coverage': COVERAGE,
  '/insurance/types': { types: ['health', 'auto', 'life', 'travel'] }
};

afterEach(() => vi.unstubAllGlobals());

describe('Insurance', () => {
  it('summarises the register', async () => {
    stubFetch(ROUTES);
    renderPage(<Insurance />);

    expect(await screen.findByText(formatCurrency(560000))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(4560))).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
  });

  it('lists each policy with its provider', async () => {
    stubFetch(ROUTES);
    renderPage(<Insurance />);

    expect(await screen.findByText('BlueShield')).toBeInTheDocument();
    expect(screen.getByText('Northwind Mutual')).toBeInTheDocument();
  });

  it('shows both a renewal and a gap alert', async () => {
    stubFetch(ROUTES);
    renderPage(<Insurance />);

    // The server writes "health renewal - BlueShield". Run through humanise,
    // which exists for enum values, the hyphen separator became whitespace and
    // the alert read "Health renewal BlueShield".
    expect(await screen.findByText('Health renewal - BlueShield')).toBeInTheDocument();
    expect(screen.getByText('No life cover')).toBeInTheDocument();
    expect(screen.getByText('renewal')).toBeInTheDocument();
    expect(screen.getByText('gap')).toBeInTheDocument();
  });

  it('annualises premiums rather than showing the billed figure', async () => {
    stubFetch(ROUTES);
    renderPage(<Insurance />);

    // 420 quarterly is 1,680 a year. Showing 420 beside a monthly 240 would
    // make the cheaper policy look dearer.
    expect(await screen.findByText(formatCurrency(1680))).toBeInTheDocument();
  });

  it('degrades to an empty state rather than throwing on a shape change', async () => {
    stubFetch({
      '/insurance/policies': { policies: null, summary: {} },
      '/insurance/alerts': { alerts: undefined },
      '/insurance/coverage': {},
      '/insurance/types': {}
    });
    renderPage(<Insurance />);

    expect(await screen.findByText('Policies')).toBeInTheDocument();
    expect(screen.queryByText('BlueShield')).not.toBeInTheDocument();
  });
});
