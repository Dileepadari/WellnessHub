import { Link } from 'react-router-dom';
import { Panel, PanelState } from '@/components/Panel';
import { Sparkline } from '@/components/Sparkline';
import { Stat, StatRow } from '@/components/Stat';
import { useAuth } from '@/contexts/AuthContext';
import { useClaimDailyBonus, useDashboard } from '@/hooks/useApi';
import { formatCurrency, formatNumber, formatPercent, pick, pickArray } from '@/lib/format';

interface HealthRow {
  type: string;
  label: string;
  value: number;
  goal: number | null;
  progress: number | null;
  unit: string;
  series: { day: string; value: number }[];
}

export function Overview() {
  const { user, refreshUser } = useAuth();
  const dashboard = useDashboard('30d');
  const claim = useClaimDailyBonus();

  const totalPoints = pick(dashboard.data, 'data.progression.totalPoints', user?.totalPoints ?? 0);
  const level = pick(dashboard.data, 'data.progression.level', user?.level ?? 0);
  const levelProgress = pick(dashboard.data, 'data.progression.levelProgress', 0);
  const rank = pick<number | null>(dashboard.data, 'data.progression.rank', null);
  const achievements = pick(dashboard.data, 'data.progression.achievements', 0);
  const activeChallenges = pick(dashboard.data, 'data.progression.activeChallenges', 0);
  const streak = pick(dashboard.data, 'data.streaks.current', 0);

  const healthRows = pickArray<HealthRow>(dashboard.data, 'data.health.rows');
  const wealthSeries = pickArray<{ month: string; income: number; expenses: number }>(
    dashboard.data,
    'data.wealth.series'
  );

  const income = pick(dashboard.data, 'data.wealth.income', 0);
  const expenses = pick(dashboard.data, 'data.wealth.expenses', 0);
  const net = pick(dashboard.data, 'data.wealth.net', 0);
  const activeGoals = pick(dashboard.data, 'data.wealth.activeGoals', 0);

  const policies = pick(dashboard.data, 'data.insurance.activePolicies', 0);
  const coverage = pick(dashboard.data, 'data.insurance.totalCoverage', 0);
  const renewals = pick(dashboard.data, 'data.insurance.renewalsDueSoon', 0);

  return (
    <>
      <StatRow>
        <Stat label="Points" value={formatNumber(totalPoints)} />
        <Stat
          label="Level"
          value={formatNumber(level)}
          suffix={`${formatPercent(levelProgress)}`}
          hint="to next level"
        />
        <Stat label="Streak" value={formatNumber(streak)} suffix="days" />
        <Stat label="Rank" value={rank === null ? '-' : `#${formatNumber(rank)}`} />
        <Stat label="Achievements" value={formatNumber(achievements)} />
        <Stat label="Challenges" value={formatNumber(activeChallenges)} hint="active" />
      </StatRow>

      <Panel
        title="Today"
        meta="health metrics"
        actions={
          <>
            <button
              type="button"
              className="btn"
              disabled={claim.isPending}
              onClick={() => claim.mutate(undefined, { onSuccess: () => void refreshUser() })}
            >
              {claim.isPending ? 'Claiming' : 'Daily bonus'}
            </button>
            <Link to="/health" className="btn btn-ghost">
              Open
            </Link>
          </>
        }
      >
        <PanelState
          isLoading={dashboard.isLoading}
          error={dashboard.error}
          isEmpty={healthRows.length === 0}
          onRetry={() => void dashboard.refetch()}
        >
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="grow-col">Metric</th>
                  <th className="text-right">Current</th>
                  <th className="text-right">Goal</th>
                  <th className="w-32">Progress</th>
                  <th className="w-28">7 days</th>
                </tr>
              </thead>
              <tbody>
                {healthRows.map((row) => {
                  const met = row.progress !== null && row.progress >= 100;
                  return (
                    <tr key={row.type}>
                      <td className="font-medium">{row.label}</td>
                      <td className="num">
                        {formatNumber(row.value, Number.isInteger(row.value) ? 0 : 1)}
                        <span className="text-fg-subtle ml-1 text-[10px]">{row.unit}</span>
                      </td>
                      <td className="num text-fg-muted">
                        {row.goal === null ? '-' : formatNumber(row.goal)}
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
                      <td>
                        <Sparkline
                          values={row.series.map((p) => p.value)}
                          tone={met ? 'good' : 'accent'}
                          label={`${row.label}, last 7 days`}
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

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          title="Wealth"
          meta="this month"
          actions={
            <Link to="/wealth" className="btn btn-ghost">
              Open
            </Link>
          }
        >
          <div className="grid grid-cols-3 divide-x border-b">
            <Stat label="Income" value={formatCurrency(income)} />
            <Stat label="Expenses" value={formatCurrency(expenses)} />
            <Stat label="Net" value={formatCurrency(net)} tone={net >= 0 ? 'good' : 'bad'} />
          </div>
          <div className="px-3 py-3">
            {wealthSeries.length > 1 ? (
              <Sparkline
                values={wealthSeries.map((s) => s.income - s.expenses)}
                width={480}
                height={40}
                tone={net >= 0 ? 'good' : 'bad'}
                filled
                label="Net position by month"
              />
            ) : (
              <p className="text-[12px] text-fg-subtle">Not enough history to chart yet.</p>
            )}
            <p className="micro mt-2">{activeGoals} active goals</p>
          </div>
        </Panel>

        <Panel
          title="Insurance"
          actions={
            <Link to="/insurance" className="btn btn-ghost">
              Open
            </Link>
          }
        >
          <div className="grid grid-cols-3 divide-x">
            <Stat label="Policies" value={formatNumber(policies)} />
            <Stat label="Coverage" value={formatCurrency(coverage)} />
            <Stat
              label="Renewals"
              value={formatNumber(renewals)}
              tone={renewals > 0 ? 'warn' : 'good'}
              hint="next 90d"
            />
          </div>
        </Panel>
      </div>
    </>
  );
}
