import { useMemo, useState } from 'react';
import { Panel, PanelState } from '@/components/Panel';
import { Stat, StatRow } from '@/components/Stat';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAchievements,
  useChallenges,
  useJoinChallenge,
  useMyChallenges,
  useProgress
} from '@/hooks/useApi';
import { formatDate, formatNumber, formatPercent, humanise, pick, pickArray } from '@/lib/format';

const CATEGORIES = ['', 'health', 'wealth', 'insurance', 'wellness', 'community'];

interface Challenge {
  _id: string;
  title: string;
  description?: string;
  category: string;
  type: string;
  difficulty: string;
  points: number;
  endDate?: string;
  stats?: { totalParticipants?: number };
}

interface MyChallenge {
  _id: string;
  title: string;
  category: string;
  difficulty: string;
  points: number;
  endDate?: string;
  completed: boolean;
  progress: { current: number; goal: number; percent: number; unit: string };
}

interface Achievement {
  _id: string;
  title: string;
  description?: string;
  category: string;
  rarity: string;
  points: number;
}

const DIFFICULTY_TAG: Record<string, string> = {
  easy: 'tag-good',
  medium: 'tag-warn',
  hard: 'tag-bad'
};

/** Reduces a possibly-populated reference to its id string. */
const toId = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return String(pick(value, '_id', ''));
  return '';
};

export function Challenges() {
  const { user, refreshUser } = useAuth();
  const [category, setCategory] = useState('');
  const challenges = useChallenges(category);
  const achievements = useAchievements();
  const progress = useProgress();
  const myChallenges = useMyChallenges();
  const join = useJoinChallenge();

  const rows = pickArray<Challenge>(challenges.data, 'data');
  const mine = pickArray<MyChallenge>(myChallenges.data, 'data.challenges');
  const achievementRows = pickArray<Achievement>(achievements.data, 'data');

  // /auth/me populates challengeId, so it arrives as an object rather than an id.
  const joined = useMemo(() => {
    const active = user?.activeChallenges ?? [];
    return new Set(
      active.map((entry) => toId(pick<unknown>(entry, 'challengeId', null))).filter(Boolean)
    );
  }, [user]);

  const unlocked = useMemo(
    () =>
      new Set(
        (user?.achievements ?? [])
          .map((entry) => toId(pick<unknown>(entry, 'achievementId', null)))
          .filter(Boolean)
      ),
    [user]
  );

  const points = pick(progress.data, 'data.points.total', user?.totalPoints ?? 0);
  const level = pick(progress.data, 'data.level.current', user?.level ?? 0);
  const levelProgress = pick(progress.data, 'data.level.progress', 0);
  const streak = pick(progress.data, 'data.streak.current', user?.currentStreak ?? 0);

  return (
    <>
      <StatRow>
        <Stat label="Points" value={formatNumber(points)} />
        <Stat label="Level" value={formatNumber(level)} suffix={formatPercent(levelProgress)} />
        <Stat label="Streak" value={formatNumber(streak)} suffix="days" />
        <Stat
          label="Joined"
          value={formatNumber(mine.length)}
          suffix={mine.length ? `${mine.filter((c) => c.completed).length} done` : undefined}
        />
        <Stat label="Available" value={formatNumber(rows.length)} />
        <Stat
          label="Achievements"
          value={formatNumber(unlocked.size)}
          suffix={`/ ${achievementRows.length}`}
        />
      </StatRow>

      <Panel title="Your challenges" meta={`${mine.length}`}>
        <PanelState
          isLoading={myChallenges.isLoading}
          error={myChallenges.error}
          isEmpty={mine.length === 0}
          emptyMessage="You have not joined a challenge yet."
          onRetry={() => void myChallenges.refetch()}
        >
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="grow-col">Challenge</th>
                  <th className="text-right">Progress</th>
                  <th className="text-right">Target</th>
                  <th className="w-40">Complete</th>
                  <th>Ends</th>
                  <th className="w-20">State</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((challenge) => (
                  <tr key={challenge._id}>
                    <td className="font-medium">{challenge.title}</td>
                    <td className="num">
                      {formatNumber(challenge.progress.current)}
                      <span className="text-fg-subtle ml-1 text-[10px]">
                        {challenge.progress.unit}
                      </span>
                    </td>
                    <td className="num text-fg-muted">{formatNumber(challenge.progress.goal)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className={`meter flex-1 ${challenge.progress.percent >= 100 ? 'is-good' : ''}`}
                        >
                          <span style={{ width: `${Math.min(100, challenge.progress.percent)}%` }} />
                        </div>
                        <span className="mono tnum text-[11px] text-fg-muted w-8 text-right">
                          {challenge.progress.percent}%
                        </span>
                      </div>
                    </td>
                    <td className="mono text-[11px] text-fg-muted">{formatDate(challenge.endDate)}</td>
                    <td>
                      <span className={`tag ${challenge.completed ? 'tag-good' : ''}`}>
                        {challenge.completed ? 'done' : 'active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelState>
      </Panel>

      <Panel
        title="Browse challenges"
        meta={`${rows.length}`}
        actions={
          <select
            className="input w-32"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Category"
          >
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option === '' ? 'All categories' : humanise(option)}
              </option>
            ))}
          </select>
        }
      >
        <PanelState
          isLoading={challenges.isLoading}
          error={challenges.error}
          isEmpty={rows.length === 0}
          emptyMessage="No challenges match this filter."
          onRetry={() => void challenges.refetch()}
        >
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="grow-col">Challenge</th>
                  <th className="w-20">Category</th>
                  <th className="w-20">Level</th>
                  <th className="text-right">Points</th>
                  <th className="text-right">Joined</th>
                  <th>Ends</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {rows.map((challenge) => {
                  const isJoined = joined.has(challenge._id);
                  return (
                    <tr key={challenge._id}>
                      <td>
                        <div className="font-medium">{challenge.title}</div>
                        {challenge.description && (
                          <div className="text-[11px] text-fg-subtle truncate max-w-md">
                            {challenge.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="tag">{challenge.category}</span>
                      </td>
                      <td>
                        <span className={`tag ${DIFFICULTY_TAG[challenge.difficulty] ?? ''}`}>
                          {challenge.difficulty}
                        </span>
                      </td>
                      <td className="num">{formatNumber(challenge.points)}</td>
                      <td className="num text-fg-muted">
                        {formatNumber(challenge.stats?.totalParticipants ?? 0)}
                      </td>
                      <td className="mono text-[11px] text-fg-muted">
                        {formatDate(challenge.endDate)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={isJoined ? 'btn btn-ghost h-6' : 'btn h-6'}
                          disabled={isJoined || join.isPending}
                          onClick={() =>
                            join.mutate(challenge._id, { onSuccess: () => void refreshUser() })
                          }
                        >
                          {isJoined ? 'Joined' : 'Join'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PanelState>
      </Panel>

      <Panel title="Achievements" meta={`${unlocked.size} of ${achievementRows.length} unlocked`}>
        <PanelState
          isLoading={achievements.isLoading}
          error={achievements.error}
          isEmpty={achievementRows.length === 0}
          emptyMessage="No achievements published."
          onRetry={() => void achievements.refetch()}
        >
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="w-8" />
                  <th className="grow-col">Achievement</th>
                  <th className="w-24">Category</th>
                  <th className="w-24">Rarity</th>
                  <th className="text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {achievementRows.map((achievement) => {
                  const isUnlocked = unlocked.has(achievement._id);
                  return (
                    <tr key={achievement._id} className={isUnlocked ? '' : 'opacity-55'}>
                      <td className="text-center mono text-[11px]">{isUnlocked ? '✓' : '·'}</td>
                      <td>
                        <div className="font-medium">{achievement.title}</div>
                        {achievement.description && (
                          <div className="text-[11px] text-fg-subtle">{achievement.description}</div>
                        )}
                      </td>
                      <td>
                        <span className="tag">{achievement.category}</span>
                      </td>
                      <td>
                        <span className={`tag ${achievement.rarity === 'legendary' ? 'tag-warn' : ''}`}>
                          {achievement.rarity}
                        </span>
                      </td>
                      <td className="num">{formatNumber(achievement.points)}</td>
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
