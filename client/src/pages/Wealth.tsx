import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { Panel, PanelState } from '@/components/Panel';
import { Sparkline } from '@/components/Sparkline';
import { Stat, StatRow } from '@/components/Stat';
import {
  useAddGoalContribution,
  useCreateWealthGoal,
  useDeleteWealthGoal,
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useWealthCategories,
  useWealthGoals,
  useWealthSummary
} from '@/hooks/useApi';
import { formatCurrency, formatDate, formatPercent, humanise, pick, pickArray } from '@/lib/format';

interface Txn {
  _id: string;
  kind: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  at: string;
}

interface Goal {
  _id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  progress: number;
  unit: string;
  dueDate?: string;
  status: string;
}

function TransactionForm() {
  const categories = useWealthCategories();
  const create = useCreateTransaction();
  const [kind, setKind] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');

  const options = pickArray<string>(categories.data, `data.${kind}`);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    create.mutate(
      { kind, amount: numeric, category, description: description || undefined },
      {
        onSuccess: () => {
          setAmount('');
          setDescription('');
        }
      }
    );
  };

  return (
    <form onSubmit={submit} className="px-3 py-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        <label className="w-24">
          <span className="field-label">Kind</span>
          <select
            className="input"
            value={kind}
            onChange={(e) => {
              const next = e.target.value as 'income' | 'expense';
              setKind(next);
              // The previous category is not valid for the other kind.
              setCategory(next === 'income' ? 'salary' : 'food');
            }}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <label className="flex-1 min-w-0">
          <span className="field-label">Category</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {options.map((option) => (
              <option key={option} value={option}>
                {humanise(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="w-28">
          <span className="field-label">Amount</span>
          <input
            className="input input-num"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <label className="flex-1 min-w-0">
          <span className="field-label">Note</span>
          <input
            className="input"
            maxLength={140}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="optional"
          />
        </label>
        <button type="submit" className="btn btn-accent" disabled={create.isPending}>
          {create.isPending ? 'Saving' : 'Record'}
        </button>
      </div>
    </form>
  );
}

function NewGoalForm() {
  const create = useCreateWealthGoal();
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [dueDate, setDueDate] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const target = Number(targetValue);
    if (!title.trim() || !Number.isFinite(target) || target <= 0) return;
    create.mutate(
      { title: title.trim(), targetValue: target, dueDate: dueDate || undefined },
      {
        onSuccess: () => {
          setTitle('');
          setTargetValue('');
          setDueDate('');
        }
      }
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 px-3 py-2 border-t">
      <label className="flex-1 min-w-0">
        <span className="field-label">New goal</span>
        <input
          className="input"
          maxLength={80}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Emergency fund"
        />
      </label>
      <label className="w-28">
        <span className="field-label">Target</span>
        <input
          className="input input-num"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          placeholder="0"
        />
      </label>
      <label className="w-36">
        <span className="field-label">Due</span>
        <input
          className="input"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-accent" disabled={create.isPending}>
        {create.isPending ? 'Saving' : 'Create'}
      </button>
    </form>
  );
}

function Goals() {
  const goals = useWealthGoals();
  const contribute = useAddGoalContribution();
  const remove = useDeleteWealthGoal();
  const rows = pickArray<Goal>(goals.data, 'data.goals');
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  return (
    <Panel title="Goals" meta={`${rows.length}`}>
      <PanelState
        isLoading={goals.isLoading}
        error={goals.error}
        isEmpty={rows.length === 0}
        emptyMessage="No goals yet."
        onRetry={() => void goals.refetch()}
      >
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="grow-col">Goal</th>
                <th className="text-right">Saved</th>
                <th className="text-right">Target</th>
                <th className="w-28">Progress</th>
                <th>Due</th>
                <th className="w-32">Add</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((goal) => (
                <tr key={goal._id}>
                  <td>
                    <span className="font-medium">{goal.title}</span>
                    {goal.status === 'achieved' && <span className="tag tag-good ml-1.5">done</span>}
                  </td>
                  <td className="num">{formatCurrency(goal.currentValue)}</td>
                  <td className="num text-fg-muted">{formatCurrency(goal.targetValue)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className={`meter flex-1 ${goal.progress >= 100 ? 'is-good' : ''}`}>
                        <span style={{ width: `${Math.min(100, goal.progress)}%` }} />
                      </div>
                      <span className="mono tnum text-[11px] text-fg-muted w-8 text-right">
                        {goal.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="mono text-[11px] text-fg-muted">{formatDate(goal.dueDate)}</td>
                  <td>
                    <div className="flex gap-1">
                      <input
                        className="input input-num w-20 h-6"
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={amounts[goal._id] ?? ''}
                        onChange={(e) => setAmounts((a) => ({ ...a, [goal._id]: e.target.value }))}
                        aria-label={`Contribution to ${goal.title}`}
                      />
                      <button
                        type="button"
                        className="btn h-6 px-2"
                        disabled={contribute.isPending}
                        onClick={() => {
                          const value = Number(amounts[goal._id]);
                          if (!Number.isFinite(value) || value === 0) return;
                          contribute.mutate(
                            { id: goal._id, amount: value },
                            { onSuccess: () => setAmounts((a) => ({ ...a, [goal._id]: '' })) }
                          );
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost h-5 px-1"
                      aria-label={`Delete ${goal.title}`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(goal._id)}
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
      <NewGoalForm />
    </Panel>
  );
}

export function Wealth() {
  const summary = useWealthSummary(6);
  const transactions = useTransactions({ limit: 40 });
  const remove = useDeleteTransaction();

  const income = pick(summary.data, 'data.income', 0);
  const expenses = pick(summary.data, 'data.expenses', 0);
  const net = pick(summary.data, 'data.net', 0);
  const savingsRate = pick<number | null>(summary.data, 'data.savingsRate', null);
  const averageIncome = pick(summary.data, 'data.averageIncome', 0);
  const averageExpenses = pick(summary.data, 'data.averageExpenses', 0);

  const series = pickArray<{ month: string; income: number; expenses: number }>(
    summary.data,
    'data.series'
  );
  const categories = pickArray<{ category: string; total: number; count: number }>(
    summary.data,
    'data.categories'
  );
  const rows = pickArray<Txn>(transactions.data, 'data.transactions');

  const categoryMax = Math.max(1, ...categories.map((c) => c.total));

  return (
    <>
      <StatRow>
        <Stat label="Income" value={formatCurrency(income)} hint="this month" />
        <Stat label="Expenses" value={formatCurrency(expenses)} hint="this month" />
        <Stat
          label="Net"
          value={formatCurrency(net)}
          tone={net >= 0 ? 'good' : 'bad'}
          hint="this month"
        />
        <Stat
          label="Savings rate"
          value={savingsRate === null ? '-' : formatPercent(savingsRate)}
          tone={savingsRate !== null && savingsRate >= 20 ? 'good' : 'warn'}
        />
        <Stat label="Avg income" value={formatCurrency(averageIncome)} hint="prior months" />
        <Stat label="Avg expenses" value={formatCurrency(averageExpenses)} hint="prior months" />
      </StatRow>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Income vs expenses" meta={`${series.length} months`}>
          <PanelState
            isLoading={summary.isLoading}
            error={summary.error}
            isEmpty={series.length === 0}
            emptyMessage="No transactions recorded yet."
            onRetry={() => void summary.refetch()}
          >
            <div className="px-3 py-3 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="micro">Income</span>
                  <span className="mono tnum text-[11px] text-fg-muted">
                    {formatCurrency(series.at(-1)?.income)}
                  </span>
                </div>
                <Sparkline
                  values={series.map((s) => s.income)}
                  width={520}
                  height={36}
                  tone="good"
                  filled
                  label="Monthly income"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="micro">Expenses</span>
                  <span className="mono tnum text-[11px] text-fg-muted">
                    {formatCurrency(series.at(-1)?.expenses)}
                  </span>
                </div>
                <Sparkline
                  values={series.map((s) => s.expenses)}
                  width={520}
                  height={36}
                  tone="bad"
                  filled
                  label="Monthly expenses"
                />
              </div>
            </div>
          </PanelState>
        </Panel>

        <Panel title="Spend by category" meta="this month">
          <PanelState
            isLoading={summary.isLoading}
            error={summary.error}
            isEmpty={categories.length === 0}
            emptyMessage="No expenses this month."
            onRetry={() => void summary.refetch()}
          >
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="grow-col">Category</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Txns</th>
                    <th className="w-28">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((row) => (
                    <tr key={row.category}>
                      <td>{humanise(row.category)}</td>
                      <td className="num">{formatCurrency(row.total)}</td>
                      <td className="num text-fg-muted">{row.count}</td>
                      <td>
                        <div className="meter">
                          <span style={{ width: `${(row.total / categoryMax) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelState>
        </Panel>
      </div>

      <Goals />

      <div className="grid gap-3 lg:grid-cols-[380px_1fr]">
        <Panel title="Record transaction">
          <TransactionForm />
        </Panel>

        <Panel title="Transactions" meta={`${rows.length} shown`}>
          <PanelState
            isLoading={transactions.isLoading}
            error={transactions.error}
            isEmpty={rows.length === 0}
            emptyMessage="No transactions."
            onRetry={() => void transactions.refetch()}
          >
            <div className="max-h-96 overflow-auto">
              <table className="tbl">
                <thead className="sticky top-0">
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th className="grow-col">Note</th>
                    <th className="text-right">Amount</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((txn) => (
                    <tr key={txn._id}>
                      <td className="mono text-[11px] text-fg-muted whitespace-nowrap">
                        {formatDate(txn.at)}
                      </td>
                      <td>{humanise(txn.category)}</td>
                      <td className="text-fg-muted truncate max-w-[220px]">
                        {txn.description || '-'}
                      </td>
                      <td className={`num ${txn.kind === 'income' ? 'text-good' : ''}`}>
                        {txn.kind === 'income' ? '+' : '-'}
                        {formatCurrency(txn.amount)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost h-5 px-1"
                          aria-label="Delete transaction"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(txn._id)}
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
