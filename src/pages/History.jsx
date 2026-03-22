import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { useAuth } from '../context/AuthContext';

// ─── THEME (matches Pool Buzz design system) ──────────────────────────────────
const T = {
  bg:        "#090b0f",
  surface:   "#0f1218",
  card:      "#141820",
  border:    "rgba(255,255,255,0.06)",
  borderHi:  "rgba(255,255,255,0.11)",
  green:     "#00e5a0",
  greenGlow: "rgba(0,229,160,0.08)",
  red:       "#ff4d6d",
  redGlow:   "rgba(255,77,109,0.08)",
  gold:      "#ffc53d",
  text:      "#edf1f7",
  textSec:   "#7c8799",
  textMuted: "#4a5263",
  textFaint: "#2e3545",
  winText:   "#00e5a0",
  winBg:     "rgba(0,229,160,0.08)",
};

const FILTERS = ['All', 'Pool', 'Snooker'];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const normalise = gt => (gt || '').toLowerCase();

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d   = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  const day   = pad(d.getDate());
  const month = d.toLocaleString('default', { month: 'short' });
  const year  = d.getFullYear();
  const h     = d.getHours();
  const min   = pad(d.getMinutes());
  const ampm  = h >= 12 ? 'pm' : 'am';
  const hour  = h % 12 || 12;
  return `${day} ${month} ${year} · ${hour}:${min}${ampm}`;
}

function fmtElo(change) {
  if (change == null) return null;
  const n = Number(change);
  return (n > 0 ? '+' : '') + n;
}

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;600&display=swap');

  @keyframes shimmer {
    from { background-position: 200% 0; }
    to   { background-position: -200% 0; }
  }
  @keyframes fadeSlide {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: none; }
  }

  .hist-card {
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }
  .hist-card:hover {
    border-color: rgba(255,255,255,0.11) !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
  }

  @media (max-width: 520px) {
    .hist-header { padding: 22px 14px 0 !important; }
    .hist-body   { padding: 16px 12px 0 !important; }
    .hist-title  { font-size: 22px !important; }
  }
`;

// ─── SKELETON LOADING ─────────────────────────────────────────────────────────
function SkeletonCards() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
      {[110, 110, 100].map((h, i) => (
        <div key={i} style={{
          height: h, borderRadius: 14,
          background: 'linear-gradient(90deg, rgba(20,24,32,0.9) 0%, rgba(30,36,48,0.5) 50%, rgba(20,24,32,0.9) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          border: `1px solid ${T.border}`,
        }} />
      ))}
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ filter }) {
  const isFiltered = filter !== 'All';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 24px', gap: 16, textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32,
      }}>
        {filter === 'Snooker' ? '🔴' : '🎱'}
      </div>
      <div>
        <div style={{
          color: T.text, fontWeight: 700, fontSize: 16, marginBottom: 6,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {isFiltered ? `No ${filter} matches yet` : 'No matches yet'}
        </div>
        <div style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.6, maxWidth: 260 }}>
          {isFiltered
            ? `Switch to "All" or record a ${filter} match to see results.`
            : 'Start playing and your match history will appear here.'}
        </div>
      </div>
    </div>
  );
}

// ─── PLAYER SIDE ──────────────────────────────────────────────────────────────
function PlayerSide({ mp, isSnooker, align }) {
  if (!mp) return <div style={{ flex: 1 }} />;
  const isWinner = !!mp.is_winner;
  const name     = mp.players?.name ?? `Player ${mp.player_id}`;
  const eloStr   = fmtElo(mp.elo_change);
  const eloNum   = Number(mp.elo_change);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: align === 'left' ? 'flex-start' : 'flex-end',
      gap: 4, minWidth: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        flexDirection: align === 'left' ? 'row' : 'row-reverse',
      }}>
        {isWinner && <span style={{ fontSize: 12, flexShrink: 0 }}>🏆</span>}
        <span style={{
          fontSize: 14, fontWeight: isWinner ? 700 : 500,
          color: isWinner ? T.text : T.textSec,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {name}
        </span>
      </div>
      {eloStr != null && (
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: eloNum > 0 ? T.winText : eloNum < 0 ? T.red : T.textMuted,
          fontFamily: "'DM Mono', monospace",
        }}>
          {eloStr} ELO
        </span>
      )}
      {isSnooker && mp.highest_break != null && (
        <span style={{
          fontSize: 11, color: T.gold, fontWeight: 600,
          fontFamily: "'DM Mono', monospace",
        }}>
          🎱 {mp.highest_break}
        </span>
      )}
    </div>
  );
}

// ─── CENTRE WIDGET ────────────────────────────────────────────────────────────
function CentreWidget({ match, isSnooker, p1, p2 }) {
  const winner     = [p1, p2].find(p => p?.is_winner);
  const winnerName = winner?.players?.name ?? '—';

  if (isSnooker) {
    return (
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center',
        gap: 4, margin: '0 10px',
        background: 'rgba(0,0,0,0.25)',
        border: `1px solid ${T.border}`,
        borderRadius: 10, padding: '6px 10px',
      }}>
        <span style={{
          fontSize: 20, fontWeight: 800,
          color: p1?.is_winner ? T.text : T.textFaint,
          fontFamily: "'DM Mono', monospace",
          fontVariantNumeric: 'tabular-nums',
          width: 22, textAlign: 'center', lineHeight: 1,
        }}>
          {p1?.score ?? '?'}
        </span>
        <span style={{ color: T.textFaint, fontSize: 14, fontWeight: 300 }}>–</span>
        <span style={{
          fontSize: 20, fontWeight: 800,
          color: p2?.is_winner ? T.text : T.textFaint,
          fontFamily: "'DM Mono', monospace",
          fontVariantNumeric: 'tabular-nums',
          width: 22, textAlign: 'center', lineHeight: 1,
        }}>
          {p2?.score ?? '?'}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      flexShrink: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 3, margin: '0 10px',
      background: T.winBg,
      border: `1px solid rgba(0,229,160,0.18)`,
      borderRadius: 10, padding: '7px 12px',
    }}>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: T.winText,
        fontFamily: "'DM Mono', monospace",
      }}>
        Winner
      </span>
      <span style={{
        fontSize: 13, fontWeight: 700, color: T.winText,
        whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif",
      }}>
        {winnerName}
      </span>
    </div>
  );
}

// ─── 3-PLAYER LAYOUT ─────────────────────────────────────────────────────────
function ThreePlayerMatch({ players }) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const ranks  = ['🥇', '🥈', '🥉'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {sorted.map((mp, i) => {
        const name   = mp.players?.name ?? `Player ${mp.player_id}`;
        const eloStr = fmtElo(mp.elo_change);
        const eloNum = Number(mp.elo_change);
        return (
          <div key={mp.id} style={{
            display: 'grid', gridTemplateColumns: '24px 1fr auto auto',
            alignItems: 'center', gap: 10,
            background: i === 0 ? 'rgba(255,197,61,0.04)' : 'transparent',
            borderRadius: 8, padding: '6px 4px',
          }}>
            <span style={{ fontSize: 15, lineHeight: 1, textAlign: 'center' }}>{ranks[i]}</span>
            <span style={{
              fontSize: 13, fontWeight: i === 0 ? 700 : 500,
              color: i === 0 ? T.text : T.textSec,
              fontFamily: "'DM Sans', sans-serif",
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {name}
            </span>
            {mp.highest_break != null && (
              <span style={{
                fontSize: 11, color: T.gold, fontWeight: 600,
                fontFamily: "'DM Mono', monospace",
              }}>
                🎱 {mp.highest_break}
              </span>
            )}
            {eloStr != null && (
              <span style={{
                fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                color: eloNum > 0 ? T.winText : eloNum < 0 ? T.red : T.textMuted,
                fontFamily: "'DM Mono', monospace",
              }}>
                {eloStr}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MATCH CARD ───────────────────────────────────────────────────────────────
function MatchCard({ match, index }) {
  const isSnooker = normalise(match.game_type) === 'snooker';
  const players   = match.match_players || [];
  const isThree   = players.length > 2;
  const sorted    = [...players].sort((a, b) => (b.is_winner ? 1 : 0) - (a.is_winner ? 1 : 0));
  const p1 = sorted[0];
  const p2 = sorted[1];

  return (
    <div className="hist-card" style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      animation: 'fadeSlide 0.25s ease both',
      animationDelay: `${Math.min(index * 30, 200)}ms`,
    }}>
      {/* Top accent bar */}
      <div style={{
        height: 2,
        background: isSnooker
          ? 'linear-gradient(90deg, #ff4d6d, #c2185b)'
          : 'linear-gradient(90deg, #00e5a0, #00b87e)',
      }} />

      <div style={{ padding: '13px 15px 15px' }}>
        {/* Meta row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 12,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20,
            background: isSnooker ? T.redGlow : T.greenGlow,
            color: isSnooker ? T.red : T.green,
            border: `1px solid ${isSnooker ? 'rgba(255,77,109,0.22)' : 'rgba(0,229,160,0.2)'}`,
            fontFamily: "'DM Mono', monospace",
          }}>
            {isSnooker ? '🔴 Snooker' : '🎱 Pool'}{isThree ? ' · 3P' : ''}
          </span>
          <span style={{
            fontSize: 11, color: T.textMuted,
            fontFamily: "'DM Mono', monospace",
          }}>
            {formatDateTime(match.played_at)}
          </span>
        </div>

        {/* Players section */}
        {isThree ? (
          <ThreePlayerMatch players={players} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlayerSide mp={p1} isSnooker={isSnooker} align="left" />
            <CentreWidget match={match} isSnooker={isSnooker} p1={p1} p2={p2} />
            <PlayerSide mp={p2} isSnooker={isSnooker} align="right" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function History() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState('All');

  const { group } = useAuth();
  const groupId   = group?.id;

  useEffect(() => {
    async function fetchMatches() {
      setLoading(true); setError(null);
      try {
        const { data, error: sbError } = await supabase
          .from('matches')
          .select(`
            id, game_type, played_at, is_deleted,
            match_players (
              id, player_id, score, is_winner,
              elo_before, elo_after, elo_change, highest_break,
              players ( id, name, elo_rating )
            )
          `)
          .eq('group_id', groupId)
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
    if (groupId) fetchMatches();
  }, [groupId]);

  const filtered = matches.filter(m =>
    filter === 'All' || normalise(m.game_type) === filter.toLowerCase()
  );

  const poolCount    = matches.filter(m => normalise(m.game_type) === 'pool').length;
  const snookerCount = matches.filter(m => normalise(m.game_type) === 'snooker').length;

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      backgroundImage: [
        'radial-gradient(ellipse 80% 35% at 50% 0%, rgba(0,229,160,0.04) 0%, transparent 60%)',
        'repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.012) 60px)',
        'repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.012) 60px)',
      ].join(', '),
      fontFamily: "'DM Sans', system-ui, sans-serif",
      color: T.text,
      paddingBottom: 80,
    }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Sticky header ── */}
      <div className="hist-header" style={{
        padding: '26px 22px 0',
        borderBottom: `1px solid ${T.border}`,
        background: 'rgba(9,11,15,0.92)',
        backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Title + count */}
          <div style={{
            display: 'flex', alignItems: 'baseline',
            gap: 10, marginBottom: 14, flexWrap: 'wrap',
          }}>
            <h1 className="hist-title" style={{
              fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em',
              color: T.text, margin: 0, lineHeight: 1,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              History
            </h1>
            {!loading && !error && (
              <span style={{
                fontSize: 12, color: T.textMuted,
                fontFamily: "'DM Mono', monospace",
              }}>
                {matches.length} match{matches.length !== 1 ? 'es' : ''}
                {poolCount    > 0 && ` · ${poolCount} Pool`}
                {snookerCount > 0 && ` · ${snookerCount} Snooker`}
              </span>
            )}
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 6, paddingBottom: 14 }}>
            {FILTERS.map(f => {
              const active = filter === f;
              return (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '6px 16px', borderRadius: 999, border: 'none',
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', transition: 'all 0.18s ease',
                  background: active ? T.green : 'rgba(255,255,255,0.04)',
                  color: active ? '#071a13' : T.textMuted,
                  boxShadow: active ? '0 0 14px rgba(0,229,160,0.18)' : 'none',
                  outline: active ? 'none' : `1px solid ${T.border}`,
                }}>
                  {f === 'Pool' ? '🎱 ' : f === 'Snooker' ? '🔴 ' : ''}{f}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="hist-body" style={{ padding: '18px 20px 0', maxWidth: 720, margin: '0 auto' }}>
        {loading && <SkeletonCards />}

        {error && (
          <div style={{
            margin: '32px auto', maxWidth: 400,
            background: 'rgba(255,77,109,0.07)',
            border: '1px solid rgba(255,77,109,0.2)',
            borderRadius: 12, padding: '16px 20px',
            color: T.red, fontSize: 13, textAlign: 'center',
            display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center',
          }}>
            <span>⚠</span> {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState filter={filter} />
        )}

        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((match, i) => (
              <MatchCard key={match.id} match={match} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
