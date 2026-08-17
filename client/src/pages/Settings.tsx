import { useState, type FormEvent } from 'react';
import { Panel } from '@/components/Panel';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { useUpdateHealthGoals, useUpdateWealthProfile } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';

const THEMES: Theme[] = ['light', 'dark', 'system'];

const GOAL_FIELDS = [
  ['dailyStepGoal', 'Steps / day', 1, 100000],
  ['dailyWaterGoal', 'Water / day', 1, 40],
  ['weeklyWorkoutMinuteGoal', 'Workout min / week', 1, 5000],
  ['dailySleepGoal', 'Sleep hrs / day', 1, 24],
  ['dailyMeditationGoal', 'Meditation min / day', 1, 600],
  ['targetWeight', 'Target weight (kg)', 1, 500]
] as const;

const MONEY_FIELDS = [
  ['monthlyIncome', 'Monthly income'],
  ['monthlySavingsGoal', 'Monthly savings goal'],
  ['emergencyFundGoal', 'Emergency fund goal'],
  ['currentSavings', 'Current savings']
] as const;

function ProfileSection() {
  const { user, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ firstName, lastName });
    } catch {
      // updateProfile already surfaces the failure as a toast.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Profile" meta={`joined ${formatDate(user?.createdAt)}`}>
      <form onSubmit={submit} className="px-3 py-2 space-y-2">
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="field-label">First name</span>
            <input
              className="input"
              required
              maxLength={50}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="flex-1">
            <span className="field-label">Last name</span>
            <input
              className="input"
              required
              maxLength={50}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
        </div>

        <div className="flex gap-2 items-end">
          <label className="flex-1">
            <span className="field-label">Email (read only)</span>
            <input className="input" value={user?.email ?? ''} disabled readOnly />
          </label>
          <button type="submit" className="btn btn-accent" disabled={saving}>
            {saving ? 'Saving' : 'Save'}
          </button>
        </div>
      </form>
    </Panel>
  );
}

function GoalsSection() {
  const { user, refreshUser } = useAuth();
  const update = useUpdateHealthGoals();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      GOAL_FIELDS.map(([key]) => [key, String(user?.healthMetrics?.[key] ?? '')])
    )
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload: Record<string, number> = {};
    for (const [key] of GOAL_FIELDS) {
      const numeric = Number(values[key]);
      if (Number.isFinite(numeric) && numeric > 0) payload[key] = numeric;
    }
    update.mutate(payload, { onSuccess: () => void refreshUser() });
  };

  return (
    <Panel title="Health goals">
      <form onSubmit={submit} className="px-3 py-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {GOAL_FIELDS.map(([key, label, min, max]) => (
            <label key={key}>
              <span className="field-label">{label}</span>
              <input
                className="input input-num"
                type="number"
                min={min}
                max={max}
                step="any"
                value={values[key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <button type="submit" className="btn btn-accent mt-3" disabled={update.isPending}>
          {update.isPending ? 'Saving' : 'Save goals'}
        </button>
      </form>
    </Panel>
  );
}

function MoneySection() {
  const { user, refreshUser } = useAuth();
  const update = useUpdateWealthProfile();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      MONEY_FIELDS.map(([key]) => [key, String(user?.financialMetrics?.[key] ?? '')])
    )
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload: Record<string, number> = {};
    for (const [key] of MONEY_FIELDS) {
      const numeric = Number(values[key]);
      if (Number.isFinite(numeric) && numeric >= 0 && values[key] !== '') payload[key] = numeric;
    }
    update.mutate(payload, { onSuccess: () => void refreshUser() });
  };

  return (
    <Panel title="Financial profile">
      <form onSubmit={submit} className="px-3 py-2">
        <div className="grid grid-cols-2 gap-2">
          {MONEY_FIELDS.map(([key, label]) => (
            <label key={key}>
              <span className="field-label">{label}</span>
              <input
                className="input input-num"
                type="number"
                min="0"
                step="any"
                value={values[key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <button type="submit" className="btn btn-accent mt-3" disabled={update.isPending}>
          {update.isPending ? 'Saving' : 'Save profile'}
        </button>
      </form>
    </Panel>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Panel title="Appearance">
      <div className="px-3 py-2">
        <span className="field-label">Theme</span>
        <div className="inline-flex rounded border overflow-hidden">
          {THEMES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTheme(option)}
              aria-pressed={theme === option}
              className={`h-7 px-3 text-[12px] border-r last:border-r-0 transition-colors ${
                theme === option ? 'bg-accent text-accent-fg' : 'bg-bg-raised hover:bg-bg-hover'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-fg-subtle mt-1.5">System follows your device setting.</p>
      </div>
    </Panel>
  );
}

export function Settings() {
  return (
    <div className="grid gap-3 lg:grid-cols-2 items-start">
      <ProfileSection />
      <AppearanceSection />
      <GoalsSection />
      <MoneySection />
    </div>
  );
}
