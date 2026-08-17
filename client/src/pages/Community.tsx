import { useState, type FormEvent } from 'react';
import { Panel, PanelState } from '@/components/Panel';
import { Stat, StatRow } from '@/components/Stat';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCommunityFeed,
  useCommunityLeaderboard,
  useJoinTeam,
  useShareToCommunity,
  useTeams
} from '@/hooks/useApi';
import { formatNumber, humanise, pick, pickArray, relativeTime } from '@/lib/format';

/**
 * The community module is an activity feed. The API exposes the recent shared
 * milestones of people you follow and lets you push your own onto it; there is
 * no post entity, so this reads and writes activities rather than posts.
 */

interface FeedItem {
  _id?: string;
  type?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
  user?: { username?: string; firstName?: string; level?: number };
}

interface Team {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  memberCount?: number;
  maxMembers?: number;
  stats?: { totalPoints?: number };
}

interface LeaderRow {
  _id: string;
  username: string;
  firstName?: string;
  level: number;
  totalPoints: number;
}

const SHARE_TYPES = [
  ['milestone', 'Milestone'],
  ['achievement', 'Achievement'],
  ['challenge_completion', 'Challenge done'],
  ['level_up', 'Level up']
];

function ShareForm() {
  const [type, setType] = useState('milestone');
  const [message, setMessage] = useState('');
  const share = useShareToCommunity();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    // The API requires `content` to be an object; the note also goes in
    // `message`, which it caps at 280 characters.
    share.mutate(
      { type, content: { note: trimmed }, message: trimmed },
      { onSuccess: () => setMessage('') }
    );
  };

  return (
    <form onSubmit={submit} className="px-3 py-2 flex flex-wrap items-end gap-2">
      <label className="w-36">
        <span className="field-label">Type</span>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {SHARE_TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex-1 min-w-0">
        <span className="field-label">Message ({message.length}/280)</span>
        <input
          className="input"
          maxLength={280}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ran my first 5k this morning"
        />
      </label>

      <button type="submit" className="btn btn-accent" disabled={share.isPending}>
        {share.isPending ? 'Sharing' : 'Share'}
      </button>
    </form>
  );
}

function Teams() {
  const teams = useTeams();
  const join = useJoinTeam();
  const { user } = useAuth();
  const rows = pickArray<Team>(teams.data, 'data');

  const myTeamIds = new Set(
    (user?.teams ?? []).map((entry) => String(pick(entry, 'teamId._id', pick(entry, 'teamId', ''))))
  );

  return (
    <Panel title="Teams" meta={`${rows.length}`}>
      <PanelState
        isLoading={teams.isLoading}
        error={teams.error}
        isEmpty={rows.length === 0}
        emptyMessage="No public teams yet."
        onRetry={() => void teams.refetch()}
      >
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="grow-col">Team</th>
                <th className="w-24">Category</th>
                <th className="text-right">Members</th>
                <th className="text-right">Points</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.map((team) => {
                const isMember = myTeamIds.has(team._id);
                return (
                  <tr key={team._id}>
                    <td>
                      <div className="font-medium">{team.name}</div>
                      {team.description && (
                        <div className="text-[11px] text-fg-subtle truncate max-w-md">
                          {team.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="tag">{team.category ?? 'mixed'}</span>
                    </td>
                    <td className="num text-fg-muted">
                      {formatNumber(team.memberCount ?? 0)}
                      {team.maxMembers ? (
                        <span className="text-[10px] text-fg-subtle"> / {team.maxMembers}</span>
                      ) : null}
                    </td>
                    <td className="num">{formatNumber(team.stats?.totalPoints ?? 0)}</td>
                    <td>
                      <button
                        type="button"
                        className={isMember ? 'btn btn-ghost h-6' : 'btn h-6'}
                        disabled={isMember || join.isPending}
                        onClick={() => join.mutate(team._id)}
                      >
                        {isMember ? 'Member' : 'Join'}
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
  );
}

export function Community() {
  const { user } = useAuth();
  const feed = useCommunityFeed(30);
  const leaderboard = useCommunityLeaderboard();

  const items = pickArray<FeedItem>(feed.data, 'data');
  const leaders = pickArray<LeaderRow>(leaderboard.data, 'data.leaderboard');

  const myRank = leaders.findIndex((row) => row._id === user?._id);
  const topScore = leaders[0]?.totalPoints ?? 0;

  return (
    <>
      <StatRow>
        <Stat label="Feed items" value={formatNumber(items.length)} />
        <Stat label="Members ranked" value={formatNumber(leaders.length)} />
        <Stat
          label="Your rank"
          value={myRank >= 0 ? `#${myRank + 1}` : '-'}
          tone={myRank === 0 ? 'good' : 'default'}
        />
        <Stat label="Your points" value={formatNumber(user?.totalPoints)} />
        <Stat label="Top score" value={formatNumber(topScore)} />
        <Stat
          label="Gap to top"
          value={formatNumber(Math.max(0, topScore - (user?.totalPoints ?? 0)))}
        />
      </StatRow>

      <Panel title="Share an update">
        <ShareForm />
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Activity feed" meta={`${items.length}`}>
          <PanelState
            isLoading={feed.isLoading}
            error={feed.error}
            isEmpty={items.length === 0}
            emptyMessage="Quiet in here. Share an update or follow other members."
            onRetry={() => void feed.refetch()}
          >
            <div className="max-h-[420px] overflow-auto">
              <table className="tbl">
                <thead className="sticky top-0">
                  <tr>
                    <th>Who</th>
                    <th className="w-28">What</th>
                    <th className="grow-col">Note</th>
                    <th className="text-right w-24">When</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item._id ?? index}>
                      <td className="font-medium">
                        {item.user?.firstName ?? item.user?.username ?? 'Member'}
                      </td>
                      <td>
                        <span className="tag">{humanise(item.type).toLowerCase()}</span>
                      </td>
                      <td className="text-fg-muted truncate max-w-[280px]">
                        {String(pick(item.data, 'message', pick(item.data, 'note', '-')))}
                      </td>
                      <td className="mono text-[11px] text-fg-subtle text-right whitespace-nowrap">
                        {relativeTime(item.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelState>
        </Panel>

        <Panel title="Leaderboard" meta="by total points">
          <PanelState
            isLoading={leaderboard.isLoading}
            error={leaderboard.error}
            isEmpty={leaders.length === 0}
            emptyMessage="No ranked members yet."
            onRetry={() => void leaderboard.refetch()}
          >
            <div className="max-h-[420px] overflow-auto">
              <table className="tbl">
                <thead className="sticky top-0">
                  <tr>
                    <th className="w-10 text-right">#</th>
                    <th className="grow-col">Member</th>
                    <th className="text-right w-16">Level</th>
                    <th className="text-right">Points</th>
                    <th className="w-24">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.map((row, index) => (
                    <tr
                      key={row._id}
                      className={row._id === user?._id ? 'bg-accent-subtle/40' : undefined}
                    >
                      <td className="num text-fg-subtle">{index + 1}</td>
                      <td className="font-medium">
                        {row.username}
                        {row._id === user?._id && <span className="tag ml-1.5">you</span>}
                      </td>
                      <td className="num text-fg-muted">{row.level}</td>
                      <td className="num">{formatNumber(row.totalPoints)}</td>
                      <td>
                        <div className="meter">
                          <span
                            style={{
                              width: `${topScore ? (row.totalPoints / topScore) * 100 : 0}%`
                            }}
                          />
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

      <Teams />
    </>
  );
}
