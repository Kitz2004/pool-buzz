import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase.js";

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  bg:         "#0a0c0f",
  surface:    "#111418",
  card:       "#161b22",
  cardHover:  "#1c2330",
  border:     "#21262d",
  borderHi:   "#30363d",
  accent:     "#00c896",
  accentDim:  "#00a07a",
  accentGlow: "rgba(0,200,150,0.15)",
  gold:       "#f0a500",
  red:        "#f85149",
  blue:       "#388bfd",
  text:       "#e6edf3",
  textMuted:  "#8b949e",
  textFaint:  "#484f58",
  winBg:      "rgba(63,185,80,0.12)",
  winText:    "#3fb950",
  lossBg:     "rgba(248,81,73,0.12)",
  lossText:   "#f85149",
};

const MEDAL = {
  1: { color: "#f0a500", emoji: "🥇" },
  2: { color: "#B4BCC8", emoji: "🥈" },
  3: { color: "#CD7F4E", emoji: "🥉" },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const pct       = (w, t) => t > 0 ? ((w / t) * 100).toFixed(1) + "%" : "0.0%";
const pad2      = n => String(n).padStart(2, "0");
const fmtDate   = iso => {
  const d = new Date(iso);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
};
const eloColor  = v  => v > 0 ? C.winText : v < 0 ? C.lossText : C.textFaint;
const streakInfo = n => {
  if (!n) return { label: "—", color: C.textFaint };
  return n > 0
    ? { label: `W${n}`,         color: C.winText  }
    : { label: `L${Math.abs(n)}`, color: C.lossText };
};
const eloTierColor = r => {
  if (r >= 1600) return C.gold;
  if (r >= 1400) return C.accent;
  if (r >= 1200) return C.blue;
  return C.textMuted;
};
const pctColor = p => {
  const n = parseFloat(p);
  return n >= 60 ? C.winText : n >= 40 ? C.textMuted : C.lossText;
};

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 40, fontSize = 16 }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: Math.round(size * 0.25),
      flexShrink: 0, userSelect: "none",
      background: `linear-gradient(135deg,${C.accentDim},${C.accent})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize, fontWeight: 900, color: "#000",
    }}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
function Spinner({ pad = 48 }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: `${pad}px 0` }}>
      <div style={{
        width: 32, height: 32,
        border: `3px solid ${C.border}`,
        borderTop: `3px solid ${C.accent}`,
        borderRadius: "50%",
        animation: "plSpin 0.7s linear infinite",
      }} />
    </div>
  );
}

// ─── WIN-RATE BAR ─────────────────────────────────────────────────────────────
function WinBar({ wins, total, height = 4 }) {
  const p = total > 0 ? (wins / total) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height, background: C.border, borderRadius: 2, overflow: "hidden", minWidth: 40 }}>
        <div style={{
          width: `${p}%`, height: "100%",
          background: `linear-gradient(90deg,${C.accentDim},${C.accent})`,
          borderRadius: 2, transition: "width 0.5s ease",
        }} />
      </div>
      <span style={{ fontSize: 11, color: C.textMuted, minWidth: 38, textAlign: "right" }}>
        {p.toFixed(1)}%
      </span>
    </div>
  );
}

// ─── STAT TILE ────────────────────────────────────────────────────────────────
function StatTile({ label, value, color, sub }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 3,
    }}>
      <span style={{ fontSize: 10, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </span>
      <span style={{
        fontSize: 22, fontWeight: 800, color: color || C.text,
        fontFamily: "'Courier New',monospace", lineHeight: 1.1,
      }}>
        {value ?? "—"}
      </span>
      {sub && <span style={{ fontSize: 10, color: C.textMuted }}>{sub}</span>}
    </div>
  );
}

// ─── MATCH ROW (timeline) ─────────────────────────────────────────────────────
function MatchRow({ match, index }) {
  const isWin = match.is_winner;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "30px 1fr auto",
      gap: 10, alignItems: "center",
      padding: "11px 14px",
      background: index % 2 === 0 ? C.surface : "transparent",
      borderRadius: 8,
      borderLeft: `3px solid ${isWin ? C.winText : C.lossText}`,
      animation: "plFadeSlide 0.2s ease both",
      animationDelay: `${index * 25}ms`,
    }}>
      {/* W / L badge */}
      <div style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        background: isWin ? C.winBg : C.lossBg,
        color: isWin ? C.winText : C.lossText,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: 11,
      }}>
        {isWin ? "W" : "L"}
      </div>

      {/* Opponent + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: C.text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          vs {match.opponent_name || "Unknown"}
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
          {match.game_type?.toUpperCase()} · {fmtDate(match.played_at)}
        </div>
      </div>

      {/* ELO change */}
      <span style={{
        fontSize: 12, fontWeight: 700,
        color: eloColor(match.elo_change),
        fontFamily: "'Courier New',monospace",
        whiteSpace: "nowrap", flexShrink: 0,
      }}>
        {match.elo_change > 0 ? "+" : ""}{match.elo_change ?? "—"}
      </span>
    </div>
  );
}

// ─── PLAYER PROFILE OVERLAY ───────────────────────────────────────────────────
function PlayerProfile({ player, onClose }) {
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Highest snooker break (winner rows only)
      const { data: breakData } = await supabase
        .from("match_players")
        .select("highest_break, matches!inner(game_type)")
        .eq("player_id", player.id)
        .eq("is_winner", true)
        .eq("matches.game_type", "snooker")
        .order("highest_break", { ascending: false })
        .limit(1);

      const highestBreak = breakData?.[0]?.highest_break ?? null;

      // Last 10 matches
      const { data: mpData } = await supabase
        .from("match_players")
        .select(`id, match_id, is_winner, elo_change,
                 matches!inner(id, game_type, played_at)`)
        .eq("player_id", player.id)
        .order("matches(played_at)", { ascending: false })
        .limit(10);

      // Resolve opponents in parallel
      const enriched = [];
      if (mpData) {
        await Promise.all(mpData.map(async mp => {
          const { data: opps } = await supabase
            .from("match_players")
            .select("players!inner(name)")
            .eq("match_id", mp.match_id)
            .neq("player_id", player.id)
            .limit(1);
          enriched.push({
            ...mp,
            opponent_name: opps?.[0]?.players?.name ?? "Unknown",
            game_type:     mp.matches?.game_type,
            played_at:     mp.matches?.played_at,
          });
        }));
        // Re-sort by played_at desc after parallel resolution
        enriched.sort((a, b) => new Date(b.played_at) - new Date(a.played_at));
      }

      if (!cancelled) {
        setProfile({ ...player, highestBreak });
        setMatches(enriched);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [player.id]);

  const winPct      = player.total_matches > 0
    ? ((player.total_wins / player.total_matches) * 100).toFixed(1) + "%"
    : "0.0%";
  const streak      = streakInfo(player.current_streak);

  return (
    /* Full-screen backdrop — clicking it closes the overlay */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/*
        profile-panel:
          desktop → centred card, max-width 600px, margin 40px auto, rounded
          mobile  → full-screen sheet (see CSS below)
      */}
      <div
        className="profile-panel"
        onClick={e => e.stopPropagation()}
        style={{
          background: C.card,
          width: "100%",
          maxWidth: 600,
          margin: "40px auto",
          borderRadius: 16,
          border: `1px solid ${C.borderHi}`,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          animation: "plProfileIn 0.22s ease",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(135deg,#0d1117,${C.card})`,
          borderBottom: `1px solid ${C.border}`,
          padding: "20px 20px 18px",
          position: "relative",
        }}>
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close profile"
            style={{
              position: "absolute", top: 14, right: 14,
              background: "transparent", border: `1px solid ${C.border}`,
              color: C.textMuted, cursor: "pointer",
              borderRadius: 8, width: 34, height: 34,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, lineHeight: 1, zIndex: 1,
            }}
          >✕</button>

          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingRight: 44 }}>
            <Avatar name={player.name} size={52} fontSize={22} />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 20, fontWeight: 800, color: C.text,
                letterSpacing: "-0.3px",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {player.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 15, fontWeight: 800, color: eloTierColor(player.elo_rating),
                  fontFamily: "'Courier New',monospace",
                }}>
                  {player.elo_rating}
                </span>
                <span style={{ fontSize: 11, color: C.textFaint }}>ELO</span>
                <span style={{
                  background: C.accentGlow, color: C.accent,
                  border: `1px solid ${C.accentDim}`,
                  borderRadius: 6, padding: "1px 8px",
                  fontSize: 11, fontWeight: 700,
                }}>
                  {winPct} WR
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: "20px 20px 28px" }}>
          {loading ? <Spinner pad={36} /> : (
            <>
              {/* Stats grid — 2 cols on mobile, 4 on desktop via CSS */}
              <div
                className="stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)", /* mobile default */
                  gap: 10,
                  marginBottom: 24,
                }}
              >
                <StatTile label="Matches"   value={profile.total_matches}      />
                <StatTile label="Wins"      value={profile.total_wins}      color={C.winText} />
                <StatTile label="Losses"    value={profile.total_losses}    color={C.lossText} />
                <StatTile label="Win %"     value={winPct}                  color={C.accent} />
                <StatTile label="Streak"    value={streak.label}            color={streak.color} />
                <StatTile label="Best W run" value={profile.longest_win_streak}  color={C.winText}  sub="wins" />
                <StatTile label="Best L run" value={profile.longest_loss_streak} color={C.lossText} sub="losses" />
                <StatTile label="Hi Break"  value={profile.highestBreak ?? "—"} color={C.gold}  sub="snooker" />
              </div>

              {/* Match timeline */}
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.12em", color: C.textFaint, marginBottom: 10,
              }}>
                Last 10 Matches
              </div>

              {matches.length === 0 ? (
                <div style={{ color: C.textFaint, fontSize: 13, padding: "12px 0" }}>
                  No matches recorded yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {matches.map((m, i) => <MatchRow key={m.id} match={m} index={i} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MOBILE PLAYER CARD ───────────────────────────────────────────────────────
function PlayerCard({ player, rank, onClick }) {
  const isMedal  = rank <= 3;
  const winP     = pct(player.total_wins, player.total_matches);
  const streak   = streakInfo(player.current_streak);

  return (
    <div
      className="player-card"
      onClick={() => onClick(player)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onClick(player)}
      style={{
        background:   C.card,
        border:       `1px solid ${isMedal ? "rgba(255,255,255,0.12)" : C.border}`,
        borderLeft:   `3px solid ${isMedal ? MEDAL[rank].color : C.borderHi}`,
        borderRadius: 12,
        padding:      "14px 16px",
        display:      "flex",
        alignItems:   "center",
        gap:          14,
        cursor:       "pointer",
        transition:   "background 0.15s, border-color 0.15s",
        userSelect:   "none",
      }}
    >
      {/* Rank */}
      <div style={{
        flexShrink: 0, width: 32, height: 32, borderRadius: 8,
        background: isMedal ? "transparent" : "rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: isMedal ? 20 : 13, fontWeight: 800,
        color: isMedal ? MEDAL[rank].color : C.textFaint,
      }}>
        {isMedal ? MEDAL[rank].emoji : rank}
      </div>

      {/* Avatar + name */}
      <Avatar name={player.name} size={38} fontSize={15} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: isMedal ? 700 : 600,
          color: isMedal ? MEDAL[rank].color : C.text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          marginBottom: 4,
        }}>
          {player.name}
        </div>
        {/* Win bar */}
        <WinBar wins={player.total_wins} total={player.total_matches} height={3} />
      </div>

      {/* Right stats */}
      <div style={{ flexShrink: 0, textAlign: "right", display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{
          fontSize: 17, fontWeight: 800,
          color: eloTierColor(player.elo_rating),
          fontFamily: "'Courier New',monospace",
        }}>
          {player.elo_rating}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: streak.color,
          letterSpacing: "0.02em",
        }}>
          {streak.label}
        </span>
      </div>

      {/* Chevron */}
      <span style={{ color: C.textFaint, fontSize: 14, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ─── DESKTOP TABLE ROW ────────────────────────────────────────────────────────
function PlayerRow({ player, rank, onClick }) {
  const isMedal = rank <= 3;
  const winP    = pct(player.total_wins, player.total_matches);
  const streak  = streakInfo(player.current_streak);

  return (
    <tr
      className="player-row"
      onClick={() => onClick(player)}
      style={{ cursor: "pointer", borderBottom: `1px solid ${C.border}`, transition: "background 0.12s" }}
    >
      {/* Rank */}
      <td style={{ padding: "13px 16px", textAlign: "center", width: 52 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: 7,
          background: isMedal ? "transparent" : "rgba(255,255,255,0.05)",
          fontSize: isMedal ? 16 : 12, fontWeight: 800,
          color: isMedal ? MEDAL[rank].color : C.textFaint,
        }}>
          {isMedal ? MEDAL[rank].emoji : rank}
        </span>
      </td>

      {/* Player */}
      <td style={{ padding: "13px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={player.name} size={30} fontSize={12} />
          <span style={{ fontSize: 14, fontWeight: isMedal ? 700 : 500, color: isMedal ? MEDAL[rank].color : C.text }}>
            {player.name}
          </span>
        </div>
      </td>

      {/* ELO */}
      <td style={{ padding: "13px 16px", textAlign: "right" }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: eloTierColor(player.elo_rating), fontFamily: "'Courier New',monospace" }}>
          {player.elo_rating}
        </span>
      </td>

      {/* W / L */}
      <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 13, color: C.textMuted, fontFamily: "'Courier New',monospace" }}>
        <span style={{ color: C.winText }}>{player.total_wins}</span>
        <span style={{ color: C.textFaint }}> / </span>
        <span style={{ color: C.lossText }}>{player.total_losses}</span>
      </td>

      {/* Win % with bar */}
      <td style={{ padding: "13px 16px", textAlign: "right", minWidth: 120 }}>
        <WinBar wins={player.total_wins} total={player.total_matches} />
      </td>

      {/* Streak */}
      <td style={{ padding: "13px 16px", textAlign: "right" }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: streak.color,
          background: player.current_streak > 0 ? C.winBg : player.current_streak < 0 ? C.lossBg : "transparent",
          padding: "3px 8px", borderRadius: 5,
        }}>
          {streak.label}
        </span>
      </td>

      {/* Chevron */}
      <td style={{ padding: "13px 12px", textAlign: "right", color: C.textFaint, fontSize: 16 }}>›</td>
    </tr>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Players() {
  const [players,        setPlayers]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [search,         setSearch]         = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const { data, error: sbErr } = await supabase
      .from("players")
      .select("id, name, elo_rating, total_matches, total_wins, total_losses, current_streak, longest_win_streak, longest_loss_streak")
      .order("elo_rating", { ascending: false });
    if (sbErr) setError(sbErr.message);
    else       setPlayers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  const filtered = players.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      {/* ── Global CSS ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes plSpin       { to { transform: rotate(360deg) } }
        @keyframes plFadeSlide  { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:none} }
        @keyframes plProfileIn  { from{opacity:0;transform:translateY(14px) scale(0.98)} to{opacity:1;transform:none} }

        /* ── Desktop defaults ── */
        .pl-cards { display: none; }
        .pl-table { display: block; }

        /* Profile: centred floating card on desktop */
        .profile-panel {
          margin: 40px auto !important;
          min-height: unset !important;
          border-radius: 16px !important;
          border: 1px solid ${C.borderHi} !important;
          max-height: calc(100vh - 80px);
          overflow-y: auto;
        }

        /* Stats grid: 4 columns on desktop */
        .stats-grid { grid-template-columns: repeat(4, 1fr) !important; }

        /* Table hover */
        .player-row:hover td { background: rgba(0,200,150,0.04) !important; }
        .player-card:hover    { background: ${C.cardHover} !important; border-color: ${C.borderHi} !important; }

        /* ── Mobile ≤ 599px ── */
        @media (max-width: 599px) {
          /* Swap cards / table */
          .pl-cards { display: flex; flex-direction: column; gap: 10px; }
          .pl-table { display: none; }

          /* Stats grid: 2 columns */
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }

          /* Profile: true full-screen sheet — no border, no radius, full height */
          .profile-panel {
            margin: 0 !important;
            min-height: 100dvh !important;
            min-height: 100vh !important;
            max-height: none !important;
            border-radius: 0 !important;
            border: none !important;
            overflow-y: auto;
          }

          /* Search: full width */
          .search-wrap { max-width: 100% !important; }

          /* Page padding */
          .pl-page   { padding: 14px 12px 80px !important; }
          .pl-header { padding: 14px 14px 12px !important; }
        }

        /* Active tap feedback for cards */
        .player-card:active { background: rgba(0,200,150,0.07) !important; }
      `}</style>

      {/* ── Sticky header ── */}
      <div className="pl-header" style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: "16px 20px",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          {/* Brand + count row */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 12, marginBottom: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: `linear-gradient(135deg,${C.accentDim},${C.accent})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>🎱</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: "-0.3px" }}>
                  Pool Buzz
                </div>
                <div style={{ fontSize: 10, color: C.textFaint, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Players
                </div>
              </div>
            </div>

            {!loading && (
              <div style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "6px 14px",
                display: "flex", alignItems: "baseline", gap: 5, flexShrink: 0,
              }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: C.accent, fontFamily: "'Courier New',monospace", lineHeight: 1 }}>
                  {players.length}
                </span>
                <span style={{ fontSize: 10, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  players
                </span>
              </div>
            )}
          </div>

          {/* Search — full width on mobile via .search-wrap */}
          <div className="search-wrap" style={{ position: "relative", maxWidth: 400 }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: C.textFaint, fontSize: 14, pointerEvents: "none",
            }}>🔍</span>
            <input
              type="text"
              placeholder="Search players…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%",
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "10px 36px 10px 36px",
                color: C.text, fontSize: 15, outline: "none",
                fontFamily: "inherit", transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = C.accent)}
              onBlur={e  => (e.target.style.borderColor = C.border)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", color: C.textFaint,
                  cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 2,
                }}
              >✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="pl-page" style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 80px" }}>

        {loading && <Spinner pad={72} />}

        {error && (
          <div style={{
            background: "rgba(248,81,73,0.1)", border: `1px solid ${C.red}`,
            borderRadius: 10, padding: "14px 18px", color: C.red, fontSize: 13,
          }}>
            ⚠ {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 20px", color: C.textFaint, fontSize: 14 }}>
            {search ? `No players matching "${search}"` : "No players found."}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            {/* ── Mobile cards ── */}
            <div className="pl-cards">
              {filtered.map((p, i) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  rank={players.indexOf(p) + 1}
                  onClick={setSelectedPlayer}
                />
              ))}
            </div>

            {/* ── Desktop table ── */}
            <div className="pl-table">
              {/* Column headers */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "52px 1fr 90px 90px 140px 90px 30px",
                padding: "8px 16px",
                borderBottom: `1px solid ${C.border}`,
                marginBottom: 2,
              }}>
                {["#", "Player", "ELO", "W / L", "Win %", "Streak", ""].map((h, i) => (
                  <div key={i} style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.12em", color: C.textFaint,
                    textAlign: i === 0 ? "center" : i >= 2 ? "right" : "left",
                  }}>{h}</div>
                ))}
              </div>
              <div style={{
                borderRadius: 12, border: `1px solid ${C.border}`,
                overflow: "hidden", background: "rgba(255,255,255,0.01)",
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {filtered.map(p => (
                      <PlayerRow
                        key={p.id}
                        player={p}
                        rank={players.indexOf(p) + 1}
                        onClick={setSelectedPlayer}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Profile overlay ── */}
      {selectedPlayer && (
        <PlayerProfile
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
