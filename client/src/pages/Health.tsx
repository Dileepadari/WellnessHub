import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { Panel, PanelState } from '@/components/Panel';
import { Sparkline } from '@/components/Sparkline';
import { Stat, StatRow } from '@/components/Stat';
import {
  useActivities,
  useDeleteActivity,
  useHealthSummary,
  useLogActivity
} from '@/hooks/useApi';
import { formatNumber, formatDateTime, humanise, pick, pickArray } from '@/lib/format';

const WINDOWS = [7, 14, 30, 90];

interface MetricRow {
  type: string;
  label: string;
  unit: string;
  value: number;
  goal: number | null;
  progress: number | null;
  goalPeriod: string;
  higherIsBetter: boolean;
  precision: number;
  entries: number;
  series: { day: string; value: number }[];
}

interface Entry {
  _id: string;
  type: string;
  value: number;
  unit?: string;
  at: string;
  notes?: string;
  pointsEarned?: number;
}

function LogForm({ types }: { types: MetricRow[] }) {
  const [type, setType] = useState('steps');
  const [value, setValue] = useState('');
  const log = useLogActivity();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    log.mutate({ type, value: numeric }, { onSuccess: () => setValue('') });
  };

  const unit = types.find((t) => t.type === type)?.unit ?? '';

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 px-3 py-2">
      <label className="w-40">
        <span className="field-label">Metric</span>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="w-32">
        <span className="field-label">Value {unit && `(${unit})`}</span>
        <input
          className="input input-num"
          type="number"
          min="0"
          step="any"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
        />
      </label>

      <button type="submit" className="btn btn-accent" disabled={log.isPending}>
        {log.isPending ? 'Saving' : 'Log'}
      </button>
    </form>
  );
}

export function Health() {
  const [days, setDays] = useState(14);
  const summary = useHealthSummary(days);
  const activities = useActivities(30);
  const remove = useDeleteActivity();

  const rows = pickArray<MetricRow>(summary.data, 'data.rows');
  const entries = pickArray<Entry>(activities.data, 'data.entries');
  const streakCurrent = pick(summary.data, 'data.streaks.current', 0);
  const streakLongest = pick(summary.data, 'data.streaks.longest', 0);
  const totalEntries = pick(summary.data, 'data.totalEntries', 0);

  const goalsMet = rows.filter((r) => r.progress !== null && r.progress >= 100).length;
  const tracked = rows.filter((r) => r.progress !== null).length;

  return (
    <>
      <StatRow>
        <Stat label="Streak" value={formatNumber(streakCurrent)} suffix="days" />
        <Stat label="Longest" value={formatNumber(streakLongest)} suffix="days" />
        <Stat
          label="Goals met"
          value={formatNumber(goalsMet)}
          suffix={`/ ${tracked}`}
          tone={goalsMet === tracked && tracked > 0 ? 'good' : 'default'}
        />
        <Stat label="Entries" value={formatNumber(totalEntries)} hint={`last ${days}d`} />
        <Stat label="Metrics" value={formatNumber(rows.length)} />
        <Stat label="Window" value={`${days}d`} />
      </StatRow>

      <Panel
        title="Metrics"
        meta={`${days} day window`}
        actions={
          <select
            className="input w-20"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Window"
          >
            {WINDOWS.map((d) => (
              <option key={d} value={d}>
                {d}d
              </option>
            ))}
          </select>
        }
      >
        <PanelState
          isLoading={summary.isLoading}
          error={summary.error}
          isEmpty={rows.length === 0}
          onRetry={() => void summary.refetch()}
        >
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="grow-col">Metric</th>
                  <th className="text-right">Current</th>
                  <th className="text-right">Goal</th>
                  <th className="w-24">Progress</th>
                  <th className="text-right">Entries</th>
                  <th className="w-28">Trend</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const met = row.progress !== null && row.progress >= 100;
                  return (
                    <tr key={row.type}>
                      <td>
                        <span className="font-medium">{row.label}</span>
                        <span className="text-fg-subtle ml-1.5 text-[11px]">
                          {row.goalPeriod === 'week' ? 'per week' : 'per day'}
                        </span>
                      </td>
                      <td className="num">
                        {formatNumber(row.value, row.precision)}
                        <span className="text-fg-subtle ml-1 text-[10px]">{row.unit}</span>
                      </td>
                      <td className="num text-fg-muted">
                        {row.goal === null ? '-' : formatNumber(row.goal, row.precision)}
                      </td>
                      <td>
                        {row.progress === null ? (
                          <span className="text-fg-subtle text-[11px]">n/a</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className={`meter flex-1 ${met ? 'is-good' : ''}`}>
                              <span style={{ width: `${Math.min(100, row.progress)}%` }} />
                            </div>
                            <span className="mono tnum text-[11px] text-fg-muted w-8 text-right">
                              {row.progress}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="num text-fg-muted">{formatNumber(row.entries)}</td>
                      <td>
                        <Sparkline
                          values={row.series.map((p) => p.value)}
                          reference={row.goalPeriod === 'day' ? row.goal : null}
                          tone={met ? 'good' : 'accent'}
                          label={`${row.label} over ${days} days`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PanelState>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[380px_1fr]">
        <Panel title="Log entry">
          <LogForm types={rows} />
        </Panel>

        <Panel title="Recent entries" meta={`${entries.length} shown`}>
          <PanelState
            isLoading={activities.isLoading}
            error={activities.error}
            isEmpty={entries.length === 0}
            emptyMessage="Nothing logged yet."
            onRetry={() => void activities.refetch()}
          >
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="tbl">
                <thead className="sticky top-0">
                  <tr>
                    <th>When</th>
                    <th className="grow-col">Metric</th>
                    <th className="text-right">Value</th>
                    <th className="text-right">Points</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry._id}>
                      <td className="mono text-[11px] text-fg-muted whitespace-nowrap">
                        {formatDateTime(entry.at)}
                      </td>
                      <td>{humanise(entry.type)}</td>
                      <td className="num">
                        {formatNumber(entry.value, Number.isInteger(entry.value) ? 0 : 1)}
                        <span className="text-fg-subtle ml-1 text-[10px]">{entry.unit}</span>
                      </td>
                      <td className="num text-fg-muted">{formatNumber(entry.pointsEarned ?? 0)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost h-5 px-1"
                          aria-label="Delete entry"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(entry._id)}
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
