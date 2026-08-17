import { useState } from 'react';
import { Panel, PanelState } from '@/components/Panel';
import { Sparkline } from '@/components/Sparkline';
import { Stat, StatRow } from '@/components/Stat';
import { useTrends, useUserStats } from '@/hooks/useApi';
import { formatNumber, pick, pickArray } from '@/lib/format';

const PERIODS = ['7d', '30d', '90d'];

interface MetricSeries {
  type: string;
  label: string;
  unit: string;
  series: { day: string; value: number }[];
}

interface DayPoint {
  day: string;
  points: number;
  entries: number;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function Analytics() {
  const [period, setPeriod] = useState('30d');
  const trends = useTrends(period);
  const stats = useUserStats();

  const dailyPoints = pickArray<DayPoint>(trends.data, 'data.dailyPoints');
  const metrics = pickArray<MetricSeries>(trends.data, 'data.metrics');

  const pointsInPeriod = sum(dailyPoints.map((d) => d.points));
  const entriesInPeriod = sum(dailyPoints.map((d) => d.entries));
  const activeDays = dailyPoints.filter((d) => d.entries > 0).length;
  const bestDay = dailyPoints.reduce<DayPoint | null>(
    (best, day) => (best === null || day.points > best.points ? day : best),
    null
  );
  const consistency = dailyPoints.length
    ? Math.round((activeDays / dailyPoints.length) * 100)
    : 0;

  return (
    <>
      <StatRow>
        <Stat label="Points" value={formatNumber(pointsInPeriod)} hint={`last ${period}`} />
        <Stat label="Entries" value={formatNumber(entriesInPeriod)} />
        <Stat
          label="Active days"
          value={formatNumber(activeDays)}
          suffix={`/ ${dailyPoints.length}`}
        />
        <Stat
          label="Consistency"
          value={`${consistency}%`}
          tone={consistency >= 70 ? 'good' : consistency >= 40 ? 'warn' : 'bad'}
        />
        <Stat label="Best day" value={formatNumber(bestDay?.points ?? 0)} hint={bestDay?.day} />
        <Stat label="Rank" value={`#${formatNumber(pick(stats.data, 'data.rank', 0))}`} />
      </StatRow>

      <Panel
        title="Points earned"
        meta={`${dailyPoints.length} days`}
        actions={
          <select
            className="input w-20"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Period"
          >
            {PERIODS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        }
      >
        <PanelState
          isLoading={trends.isLoading}
          error={trends.error}
          isEmpty={dailyPoints.length === 0}
          onRetry={() => void trends.refetch()}
        >
          <div className="px-3 py-4">
            <Sparkline
              values={dailyPoints.map((d) => d.points)}
              width={1200}
              height={90}
              tone="accent"
              filled
              label={`Points per day over ${period}`}
            />
            <div className="flex justify-between mt-1.5 micro">
              <span>{dailyPoints[0]?.day}</span>
              <span>{dailyPoints.at(-1)?.day}</span>
            </div>
          </div>
        </PanelState>
      </Panel>

      <Panel title="Metric trends" meta={`${metrics.length} metrics`}>
        <PanelState
          isLoading={trends.isLoading}
          error={trends.error}
          isEmpty={metrics.length === 0}
          onRetry={() => void trends.refetch()}
        >
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="grow-col">Metric</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Peak</th>
                  <th className="text-right">Avg / day</th>
                  <th className="w-64">Trend</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => {
                  const values = metric.series.map((p) => p.value);
                  const total = sum(values);
                  const peak = values.length ? Math.max(...values) : 0;
                  const average = values.length ? total / values.length : 0;
                  const isReading = metric.type === 'weight';

                  return (
                    <tr key={metric.type}>
                      <td className="font-medium">{metric.label}</td>
                      <td className="num">
                        {isReading ? '-' : formatNumber(total, total % 1 === 0 ? 0 : 1)}
                      </td>
                      <td className="num text-fg-muted">
                        {formatNumber(peak, peak % 1 === 0 ? 0 : 1)}
                      </td>
                      <td className="num text-fg-muted">
                        {formatNumber(average, average % 1 === 0 ? 0 : 1)}
                      </td>
                      <td>
                        <Sparkline
                          values={values}
                          width={240}
                          height={24}
                          tone="muted"
                          label={`${metric.label} over ${period}`}
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
    </>
  );
}
