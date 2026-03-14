import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';

const FILTERS = ['All', 'Pool', 'Snooker'];

const styles = {
  root: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0a0e1a 0%, #0f1623 50%, #0c1219 100%)',
    fontFamily: "'DM Mono', 'Fira Mono', 'Courier New', monospace",
    color: '#e2e8f0',
    padding: '0 0 60px 0',
  },
  header: {
    padding: '36px 28px 0 28px',
    borderBottom: '1px solid rgba(99,179,237,0.10)',
    marginBottom: '0',
    background: 'rgba(10,14,26,0.7)',
    backdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '14px',
    marginBottom: '18px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    color: '#f0f6ff',
    margin: 0,
    lineHeight: 1,
    fontFamily: "'DM Mono', monospace",
  },
  titleAccent: {
    color: '#38bdf8',
  },
  matchCount: {
    fontSize: '13px',
    color: '#64748b',
    fontVariantNumeric: 'tabular-nums',
    paddingBottom: '2px',
    letterSpacing: '0.04em',
  },
  filterBar: {
    display: 'flex',
    gap: '6px',
    paddingBottom: '18px',
  },
  filterBtn: (active) => ({
    padding: '6px 18px',
    borderRadius: '20px',
    border: active ? '1.5px solid #38bdf8' : '1.5px solid rgba(99,179,237,0.18)',
    background: active
      ? 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)'
      : 'rgba(14,20,36,0.7)',
    color: active ? '#f0f6ff' : '#64748b',
    fontFamily: 'inherit',
    fontSize: '12px',
    fontWeight: active ? '700' : '400',
    letterSpacing: '0.08em',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    outline: 'none',
    textTransform: 'uppercase',
  }),
  body: {
    padding: '24px 20px 0 20px',
    maxWidth: '720px',
    margin: '0 auto',
  },
  card: {
    background: 'linear-gradient(135deg, rgba(17,25,44,0.92) 0%, rgba(14,20,36,0.97) 100%)',
    border: '1px solid rgba(56,189,248,0.10)',
    borderRadius: '16px',
    marginBottom: '14px',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    position: 'relative',
  },
  cardTopBar: (gameType) => ({
    height: '3px',
    background: gameType === 'Snooker'
      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
      : 'linear-gradient(90deg, #38bdf8, #2563eb)',
    width: '100%',
  }),
  cardInner: {
    padding: '16px 20px 18px 20px',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  gameTypeBadge: (gameType) => ({
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '3px 10px',
    borderRadius: '20px',
    background: gameType === 'Snooker'
      ? 'rgba(34,197,94,0.13)'
      : 'rgba(56,189,248,0.12)',
    color: gameType === 'Snooker' ? '#4ade80' : '#38bdf8',
    border: gameType === 'Snooker'
      ? '1px solid rgba(74,222,128,0.25)'
      : '1px solid rgba(56,189,248,0.22)',
  }),
  dateTime: {
    fontSize: '11px',
    color: '#475569',
    letterSpacing: '0.04em',
  },
  playersRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
  },
  playerBlock: (isWinner) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: isWinner ? 'flex-start' : 'flex-end',
    gap: '5px',
    position: 'relative',
  }),
  playerName: (isWinner) => ({
    fontSize: '15px',
    fontWeight: isWinner ? '700' : '400',
    color: isWinner ? '#f0fdf4' : '#94a3b8',
    letterSpacing: '-0.01em',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  }),
  winnerIcon: {
    fontSize: '13px',
  },
  eloChange: (change) => ({
    fontSize: '12px',
    fontWeight: '600',
    color: change > 0 ? '#4ade80' : change < 0 ? '#f87171' : '#64748b',
    letterSpacing: '0.03em',
  }),
  highestBreak: {
    fontSize: '11px',
    color: '#fbbf24',
    letterSpacing: '0.04em',
  },
  scorePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(99,179,237,0.12)',
    borderRadius: '12px',
    padding: '6px 0',
    minWidth: '80px',
    justifyContent: 'center',
    margin: '0 12px',
    flexShrink: 0,
  },
  scoreNum: (isWinner) => ({
    fontSize: '22px',
    fontWeight: '800',
    color: isWinner ? '#38bdf8' : '#334155',
    fontVariantNumeric: 'tabular-nums',
    width: '28px',
    textAlign: 'center',
    lineHeight: 1,
  }),
  scoreDivider: {
    color: '#1e293b',
    fontSize: '16px',
    fontWeight: '300',
    margin: '0 2px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    color: '#334155',
  },
  emptyIcon: {
    fontSize: '52px',
    marginBottom: '16px',
    display: 'block',
    filter: 'grayscale(0.4)',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '8px',
  },
  emptySubtitle: {
    fontSize: '13px',
    color: '#334155',
  },
  loadingRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '4px',
  },
  skeletonCard: {
    height: '120px',
    borderRadius: '16px',
    background: 'linear-gradient(90deg, rgba(17,25,44,0.8) 0%, rgba(30,41,59,0.5) 50%, rgba(17,25,44,0.8) 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    border: '1px solid rgba(56,189,248,0.07)',
  },
  errorBox: {
    margin: '32px auto',
    maxWidth: '400px',
    background: 'rgba(127,29,29,0.3)',
    border: '1px solid rgba(248,113,113,0.2)',
    borderRadius: '12px',
    padding: '20px 24px',
    color: '#fca5a5',
    fontSize: '13px',
    textAlign: 'center',
  },
};

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatEloChange(change) {
  if (change == null) return null;
  const n = Number(change);
  if (n > 0) return `+${n}`;
  return `${n}`;
}

export default function History() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    async function fetchMatches() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: sbError } = await supabase
          .from('matches')
          .select(`
            id,
            game_type,
            played_at,
            is_deleted,
            match_players (
              id,
              player_id,
              score,
              is_winner,
              elo_before,
              elo_after,
              elo_change,
              highest_break,
              players (
                id,
                name,
                elo_rating
              )
            )
          `)
          .eq('is_deleted', false)
          .order('played_at', { ascending: false });

        if (sbError) throw sbError;
        setMatches(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load matches.');
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, []);

  const filtered = matches.filter((m) => {
    if (filter === 'All') return true;
    return m.game_type === filter;
  });

  const poolCount = matches.filter((m) => m.game_type === 'Pool').length;
  const snookerCount = matches.filter((m) => m.game_type === 'Snooker').length;

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap');
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        *:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }
      `}</style>

      {/* Sticky Header */}
      <div style={styles.header}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>
              <span style={styles.titleAccent}>●</span> Match History
            </h1>
            {!loading && !error && (
              <span style={styles.matchCount}>
                {matches.length} match{matches.length !== 1 ? 'es' : ''} total
                {poolCount > 0 && ` · ${poolCount} Pool`}
                {snookerCount > 0 && ` · ${snookerCount} Snooker`}
              </span>
            )}
          </div>
          <div style={styles.filterBar}>
            {FILTERS.map((f) => (
              <button
                key={f}
                style={styles.filterBtn(filter === f)}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={styles.body}>
        {loading && (
          <div style={styles.loadingRow}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={styles.skeletonCard} />
            ))}
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            ⚠ {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🎱</span>
            <div style={styles.emptyTitle}>
              {filter === 'All'
                ? 'No matches yet'
                : `No ${filter} matches found`}
            </div>
            <div style={styles.emptySubtitle}>
              {filter === 'All'
                ? 'Start playing and your match history will appear here.'
                : `Switch to "All" or log a ${filter} match to see results.`}
            </div>
          </div>
        )}

        {!loading && !error && filtered.map((match) => {
          const players = match.match_players || [];
          // Sort so winner is always first (left)
          const sorted = [...players].sort((a, b) => (b.is_winner ? 1 : 0) - (a.is_winner ? 1 : 0));
          const p1 = sorted[0];
          const p2 = sorted[1];
          const isSnooker = match.game_type === 'Snooker';

          return (
            <div key={match.id} style={styles.card}>
              <div style={styles.cardTopBar(match.game_type)} />
              <div style={styles.cardInner}>
                {/* Meta row */}
                <div style={styles.cardMeta}>
                  <span style={styles.gameTypeBadge(match.game_type)}>
                    {isSnooker ? '🔴 Snooker' : '🎱 Pool'}
                  </span>
                  <span style={styles.dateTime}>
                    {formatDateTime(match.played_at)}
                  </span>
                </div>

                {/* Players + Score */}
                <div style={styles.playersRow}>
                  {/* Player 1 (winner) — left aligned */}
                  {p1 && (
                    <div style={styles.playerBlock(true)}>
                      <span style={styles.playerName(true)}>
                        {p1.is_winner && <span style={styles.winnerIcon}>🏆</span>}
                        {p1.players?.name ?? `Player ${p1.player_id}`}
                      </span>
                      {p1.elo_change != null && (
                        <span style={styles.eloChange(Number(p1.elo_change))}>
                          {formatEloChange(p1.elo_change)} ELO
                        </span>
                      )}
                      {isSnooker && p1.highest_break != null && (
                        <span style={styles.highestBreak}>
                          ⚡ Break: {p1.highest_break}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Score pill */}
                  <div style={styles.scorePill}>
                    <span style={styles.scoreNum(p1?.is_winner)}>
                      {p1?.score ?? '?'}
                    </span>
                    <span style={styles.scoreDivider}>–</span>
                    <span style={styles.scoreNum(p2?.is_winner)}>
                      {p2?.score ?? '?'}
                    </span>
                  </div>

                  {/* Player 2 — right aligned */}
                  {p2 && (
                    <div style={styles.playerBlock(false)}>
                      <span style={styles.playerName(false)}>
                        {p2.players?.name ?? `Player ${p2.player_id}`}
                        {p2.is_winner && <span style={styles.winnerIcon}>🏆</span>}
                      </span>
                      {p2.elo_change != null && (
                        <span style={styles.eloChange(Number(p2.elo_change))}>
                          {formatEloChange(p2.elo_change)} ELO
                        </span>
                      )}
                      {isSnooker && p2.highest_break != null && (
                        <span style={styles.highestBreak}>
                          ⚡ Break: {p2.highest_break}
                        </span>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
