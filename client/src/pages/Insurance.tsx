import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { Panel, PanelState } from '@/components/Panel';
import { Stat, StatRow } from '@/components/Stat';
import {
  useCoverage,
  useCreatePolicy,
  useDeletePolicy,
  useInsuranceAlerts,
  usePolicies,
  usePolicyTypes
} from '@/hooks/useApi';
import { formatCurrency, formatDate, formatNumber, humanise, pick, pickArray } from '@/lib/format';

interface Policy {
  _id: string;
  type: string;
  provider: string;
  policyNumber?: string;
  coverageAmount: number;
  premium: number;
  premiumFrequency: string;
  annualPremium: number;
  renewalDate: string;
  daysUntilRenewal: number | null;
  status: string;
}

interface Alert {
  kind: 'overdue' | 'renewal' | 'gap';
  severity: string;
  title: string;
  detail: string;
  daysUntil?: number;
}

const FREQUENCIES = ['monthly', 'quarterly', 'semi-annual', 'annual'];

function PolicyForm() {
  const types = usePolicyTypes();
  const create = useCreatePolicy();
  const options = pickArray<string>(types.data, 'data.types');

  const [form, setForm] = useState({
    type: 'health',
    provider: '',
    coverageAmount: '',
    premium: '',
    premiumFrequency: 'monthly',
    renewalDate: ''
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(
      {
        type: form.type,
        provider: form.provider,
        coverageAmount: Number(form.coverageAmount),
        premium: Number(form.premium),
        premiumFrequency: form.premiumFrequency,
        renewalDate: form.renewalDate
      },
      {
        onSuccess: () =>
          setForm({
            type: 'health',
            provider: '',
            coverageAmount: '',
            premium: '',
            premiumFrequency: 'monthly',
            renewalDate: ''
          })
      }
    );
  };

  return (
    <form onSubmit={submit} className="px-3 py-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        <label className="w-28">
          <span className="field-label">Type</span>
          <select className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {(options.length ? options : ['health']).map((option) => (
              <option key={option} value={option}>
                {humanise(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 min-w-0">
          <span className="field-label">Provider</span>
          <input
            className="input"
            required
            maxLength={80}
            value={form.provider}
            onChange={(e) => set('provider', e.target.value)}
            placeholder="Provider name"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="flex-1">
          <span className="field-label">Coverage</span>
          <input
            className="input input-num"
            type="number"
            min="0"
            required
            value={form.coverageAmount}
            onChange={(e) => set('coverageAmount', e.target.value)}
            placeholder="0"
          />
        </label>
        <label className="w-24">
          <span className="field-label">Premium</span>
          <input
            className="input input-num"
            type="number"
            min="0"
            step="0.01"
            required
            value={form.premium}
            onChange={(e) => set('premium', e.target.value)}
            placeholder="0"
          />
        </label>
        <label className="w-28">
          <span className="field-label">Every</span>
          <select
            className="input"
            value={form.premiumFrequency}
            onChange={(e) => set('premiumFrequency', e.target.value)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {humanise(f)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <label className="flex-1">
          <span className="field-label">Renews</span>
          <input
            className="input"
            type="date"
            required
            value={form.renewalDate}
            onChange={(e) => set('renewalDate', e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-accent" disabled={create.isPending}>
          {create.isPending ? 'Saving' : 'Add'}
        </button>
      </div>
    </form>
  );
}

export function Insurance() {
  const policies = usePolicies();
  const alerts = useInsuranceAlerts();
  const coverage = useCoverage();
  const remove = useDeletePolicy();

  const rows = pickArray<Policy>(policies.data, 'data.policies');
  const alertRows = pickArray<Alert>(alerts.data, 'data.alerts');

  const active = pick(policies.data, 'data.summary.active', 0);
  const totalCoverage = pick(policies.data, 'data.summary.totalCoverage', 0);
  const totalPremium = pick(policies.data, 'data.summary.totalAnnualPremium', 0);
  const score = pick(coverage.data, 'data.score', 0);
  const missing = pickArray<string>(coverage.data, 'data.essentialsMissing');
  const premiumRatio = pick<number | null>(coverage.data, 'data.premiumToIncomePercent', null);

  return (
    <>
      <StatRow>
        <Stat label="Active policies" value={formatNumber(active)} />
        <Stat label="Total coverage" value={formatCurrency(totalCoverage)} />
        <Stat label="Annual premium" value={formatCurrency(totalPremium)} />
        <Stat
          label="Coverage score"
          value={formatNumber(score)}
          suffix="/100"
          tone={score >= 80 ? 'good' : score >= 50 ? 'warn' : 'bad'}
        />
        <Stat
          label="Gaps"
          value={formatNumber(missing.length)}
          tone={missing.length === 0 ? 'good' : 'warn'}
          hint={missing.length ? missing.join(', ') : 'all essentials held'}
        />
        <Stat
          label="Premium / income"
          value={premiumRatio === null ? '-' : `${premiumRatio}%`}
          hint="annual"
        />
      </StatRow>

      <Panel title="Alerts" meta={`${alertRows.length}`}>
        <PanelState
          isLoading={alerts.isLoading}
          error={alerts.error}
          isEmpty={alertRows.length === 0}
          emptyMessage="Nothing needs attention."
          onRetry={() => void alerts.refetch()}
        >
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="w-20">Kind</th>
                  <th className="w-64">Item</th>
                  <th className="grow-col">Detail</th>
                  <th className="text-right w-16">Days</th>
                </tr>
              </thead>
              <tbody>
                {alertRows.map((alert, index) => (
                  <tr key={index}>
                    <td>
                      <span
                        className={`tag ${
                          alert.kind === 'overdue'
                            ? 'tag-bad'
                            : alert.severity === 'high'
                              ? 'tag-warn'
                              : ''
                        }`}
                      >
                        {alert.kind}
                      </span>
                    </td>
                    <td className="font-medium whitespace-nowrap">{humanise(alert.title)}</td>
                    <td className="text-fg-muted">{alert.detail}</td>
                    <td className="num text-fg-muted">
                      {alert.daysUntil === undefined ? '-' : alert.daysUntil}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelState>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[380px_1fr]">
        <Panel title="Add policy">
          <PolicyForm />
        </Panel>

        <Panel title="Policies" meta={`${rows.length}`}>
          <PanelState
            isLoading={policies.isLoading}
            error={policies.error}
            isEmpty={rows.length === 0}
            emptyMessage="No policies on file."
            onRetry={() => void policies.refetch()}
          >
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th className="grow-col">Provider</th>
                    <th className="text-right">Coverage</th>
                    <th className="text-right">Premium</th>
                    <th className="text-right">Annual</th>
                    <th>Renews</th>
                    <th className="text-right">Days</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((policy) => (
                    <tr key={policy._id}>
                      <td>
                        <span className="tag">{policy.type}</span>
                      </td>
                      <td className="font-medium">{policy.provider}</td>
                      <td className="num">{formatCurrency(policy.coverageAmount)}</td>
                      <td className="num text-fg-muted">
                        {formatCurrency(policy.premium)}
                        <span className="text-[10px] ml-1">/{policy.premiumFrequency.slice(0, 2)}</span>
                      </td>
                      <td className="num">{formatCurrency(policy.annualPremium)}</td>
                      <td className="mono text-[11px] text-fg-muted">
                        {formatDate(policy.renewalDate)}
                      </td>
                      <td
                        className={`num ${
                          (policy.daysUntilRenewal ?? 999) < 0
                            ? 'text-bad'
                            : (policy.daysUntilRenewal ?? 999) <= 30
                              ? 'text-warn'
                              : 'text-fg-muted'
                        }`}
                      >
                        {policy.daysUntilRenewal ?? '-'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost h-5 px-1"
                          aria-label="Delete policy"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(policy._id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelState>
        </Panel>
      </div>
    </>
  );
}
