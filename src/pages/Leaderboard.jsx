import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase.js";

const REFRESH_INTERVAL = 30000;

const MEDAL = {
  0: { bg: "rgba(255, 197, 61, 0.12)", border: "rgba(255, 197, 61, 0.5)", text: "#FFC53D", label: "🥇" },
  1: { bg: "rgba(180, 188, 200, 0.10)", border: "rgba(180, 188, 200, 0.45)", text: "#B4BCC8", label: "🥈" },
  2: { bg: "rgba(186, 120, 76, 0.10)", border: "rgba(186, 120, 76, 0.45)", text: "#CD7F4E", label: "🥉" },
};

function formatStreak(streak) {
  if (!streak || streak === 0) return { label: "—", color: "#666" };
  if (streak > 0) return { label: `+${streak} W`, color: "#3DDC84" };
  return { label: `${streak} L`, color: "#FF5A5A" };
}

function winPct(wins, total) {
  if (!total || total === 0) return "—";
  return (wins / total * 100).toFixed(1) + "%";
}

// ─── LOADING DOTS ─────────────────────────────────────────────────────────────
function LoadingDots() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: "16px" }}>
      <div style={{ display: "flex", gap: "6px" }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 8, height: 8, borderRadius: "50%", background: "#3DDC84",
            display: "inline-block",
            animation: `dot-bounce 1.2s ease-in-out ${i * 0.16}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: "12px", color: "#555E6B", letterSpacing: "0.08em" }}>LOADING</span>
    </div>
  );
}

// ─── RANK CELL ────────────────────────────────────────────────────────────────
function RankCell({ idx }) {
  return (
    <td style={{ padding: "14px 16px", width: "52px", textAlign: "center", verticalAlign: "middle" }}>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "28px", height: "28px", borderRadius: "6px",
        fontSize: idx < 3 ? "16px" : "12px", fontWeight: "700",
        background: idx < 3 ? "transparent" : "rgba(255,255,255,0.05)",
        color: idx < 3 ? MEDAL[idx].text : "#555E6B",
      }}>
        {idx < 3 ? MEDAL[idx].label : idx + 1}
      </span>
    </td>
  );
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const S = {
  tableWrap: { borderRadius: "12px", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", background: "rgba(255,255,255,0.02)" },
  table:     { width: "100%", borderCollapse: "collapse" },
  thead:     { background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" },
  th:        { padding: "12px 16px", fontSize: "10px", fontWeight: "700", letterSpacing: "0.14em", textTransform: "uppercase", color: "#555E6B", textAlign: "left",  whiteSpace: "nowrap" },
  thR:       { padding: "12px 16px", fontSize: "10px", fontWeight: "700", letterSpacing: "0.14em", textTransform: "uppercase", color: "#555E6B", textAlign: "right", whiteSpace: "nowrap" },
  td:        { padding: "14px 16px", fontSize: "13px", color: "#CDD4DC", textAlign: "left",  verticalAlign: "middle" },
  tdR:       { padding: "14px 16px", fontSize: "13px", color: "#CDD4DC", textAlign: "right", verticalAlign: "middle" },
  row: (idx) => ({
    background:  idx < 3 ? MEDAL[idx].bg : idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
    borderLeft:  idx < 3 ? `2px solid ${MEDAL[idx].border}` : "2px solid transparent",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    transition:  "background 0.15s ease",
  }),
  playerName: (idx) => ({
    fontWeight: idx < 3 ? "700" : "500",
    color:      idx < 3 ? MEDAL[idx].text : "#E8ECF0",
    fontSize:   "14px",
  }),
  winPct: (pct) => {
    if (pct === "—") return { color: "#555E6B" };
    const n = parseFloat(pct);
    return { color: n >= 60 ? "#3DDC84" : n >= 40 ? "#CDD4DC" : "#FF5A5A", fontWeight: "600", fontVariantNumeric: "tabular-nums" };
  },
  emptyState: { textAlign: "center", padding: "60px 24px", color: "#555E6B", fontSize: "14px", letterSpacing: "0.04em" },
  errorState: { textAlign: "center", padding: "60px 24px", color: "#FF5A5A", fontSize: "14px" },
};

// ─── POOL LEADERBOARD ─────────────────────────────────────────────────────────
function PoolLeaderboard({ players, loading, error }) {
  if (loading) return <LoadingDots />;
  if (error)   return <div style={S.errorState}>⚠ {error}</div>;
  if (players.length === 0) return (
    <div style={S.emptyState}>No players found. Record a match to get started.</div>
  );

  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead style={S.thead}>
          <tr>
            <th style={{ ...S.th, textAlign: "center", width: "52px" }}>#</th>
            <th style={S.th}>Player</th>
            <th style={S.thR}>ELO</th>
            <th style={S.thR}>W</th>
            <th style={S.thR}>L</th>
            <th style={S.thR}>Win %</th>
            <th style={S.thR}>Streak</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, idx) => {
            const streak = formatStreak(player.current_streak);
            const pct    = winPct(player.total_wins, player.total_matches);
            return (
              <tr key={player.id} style={S.row(idx)}>
                <RankCell idx={idx} />
                <td style={S.td}>
                  <span style={S.playerName(idx)}>{player.name}</span>
                </td>
                <td style={S.tdR}>
                  <span style={{ fontWeight: "700", fontSize: "14px", color: idx < 3 ? MEDAL[idx].text : "#3DDC84", fontVariantNumeric: "tabular-nums" }}>
                    {player.elo_rating ?? "—"}
                  </span>
                </td>
                <td style={{ ...S.tdR, fontVariantNumeric: "tabular-nums" }}>{player.total_wins   ?? 0}</td>
                <td style={{ ...S.tdR, fontVariantNumeric: "tabular-nums" }}>{player.total_losses ?? 0}</td>
                <td style={S.tdR}><span style={S.winPct(pct)}>{pct}</span></td>
                <td style={S.tdR}>
                  <span style={{
                    display: "inline-block", padding: "3px 8px", borderRadius: "4px",
                    background: player.current_streak > 0 ? "rgba(61,220,132,0.1)" : player.current_streak < 0 ? "rgba(255,90,90,0.1)" : "transparent",
                    color: streak.color, fontWeight: "600", fontSize: "12px", letterSpacing: "0.04em",
                  }}>
                    {streak.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── SNOOKER LEADERBOARD ──────────────────────────────────────────────────────
function SnookerLeaderboard({ rows, loading, error }) {
  if (loading) return <LoadingDots />;
  if (error)   return <div style={S.errorState}>⚠ {error}</div>;

  if (rows.length === 0) return (
    <div style={{
      textAlign: "center", padding: "72px 24px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
    }}>
      <span style={{ fontSize: "52px", lineHeight: 1, filter: "drop-shadow(0 0 18px rgba(255,80,80,0.35))" }}>🔴</span>
      <div>
        <div style={{ color: "#CDD4DC", fontWeight: "700", fontSize: "16px", marginBottom: "8px", letterSpacing: "-0.01em" }}>
          No snooker matches yet
        </div>
        <div style={{ color: "#555E6B", fontSize: "13px", lineHeight: 1.6 }}>
          Record a snooker match to see the<br />rankings appear here.
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead style={S.thead}>
          <tr>
            <th style={{ ...S.th, textAlign: "center", width: "52px" }}>#</th>
            <th style={S.th}>Player</th>
            <th style={S.thR}>Played</th>
            <th style={S.thR}>Wins</th>
            <th style={S.thR}>Win %</th>
            <th style={S.thR}>Hi Break</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const pct = winPct(row.wins, row.played);
            return (
              <tr key={row.player_id} style={S.row(idx)}>
                <RankCell idx={idx} />
                <td style={S.td}>
                  <span style={S.playerName(idx)}>{row.name}</span>
                </td>
                <td style={{ ...S.tdR, fontVariantNumeric: "tabular-nums" }}>{row.played}</td>
                <td style={{ ...S.tdR, fontVariantNumeric: "tabular-nums" }}>{row.wins}</td>
                <td style={S.tdR}><span style={S.winPct(pct)}>{pct}</span></td>
                <td style={S.tdR}>
                  {row.highest_break != null
                    ? <span style={{ fontWeight: "700", color: "#FFC53D", fontVariantNumeric: "tabular-nums" }}>{row.highest_break}</span>
                    : <span style={{ color: "#555E6B" }}>—</span>
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Leaderboard() {
  const [tab, setTab] = useState("pool"); // "pool" | "snooker"

  // Pool state
  const [players,     setPlayers]     = useState([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [poolError,   setPoolError]   = useState(null);

  // Snooker state
  const [snookerRows,    setSnookerRows]    = useState([]);
  const [snookerLoading, setSnookerLoading] = useState(true);
  const [snookerError,   setSnookerError]   = useState(null);

  // Refresh meta
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown,   setCountdown]   = useState(30);

  // ── Pool fetch ──────────────────────────────────────────────────────────────
  const fetchPool = useCallback(async () => {
    try {
      const { data, error: sbError } = await supabase
        .from("players")
        .select("*")
        .order("elo_rating", { ascending: false });
      if (sbError) throw sbError;
      setPlayers(data || []);
      setPoolError(null);
    } catch (e) {
      setPoolError(e.message || "Failed to load pool rankings.");
    } finally {
      setPoolLoading(false);
    }
  }, []);

  // ── Snooker fetch ───────────────────────────────────────────────────────────
  // Fetches all snooker match_players rows and aggregates in JS —
  // no RPC/custom functions needed, works on any Supabase plan.
  const fetchSnooker = useCallback(async () => {
    try {
      const { data, error: sbError } = await supabase
        .from("match_players")
        .select(`
          player_id,
          is_winner,
          highest_break,
          players!inner ( name ),
          matches!inner ( game_type )
        `)
        .eq("matches.game_type", "snooker");

      if (sbError) throw sbError;

      // Aggregate per player
      const map = {};
      for (const row of data || []) {
        const pid = row.player_id;
        if (!map[pid]) {
          map[pid] = { player_id: pid, name: row.players.name, played: 0, wins: 0, highest_break: null };
        }
        map[pid].played += 1;
        if (row.is_winner) map[pid].wins += 1;
        if (row.highest_break != null) {
          map[pid].highest_break = Math.max(map[pid].highest_break ?? 0, row.highest_break);
        }
      }

      // Sort: win % desc → wins desc → played desc → name asc
      const sorted = Object.values(map).sort((a, b) => {
        const pA = a.played ? a.wins / a.played : 0;
        const pB = b.played ? b.wins / b.played : 0;
        if (pB !== pA)       return pB - pA;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.played !== a.played) return b.played - a.played;
        return a.name.localeCompare(b.name);
      });

      setSnookerRows(sorted);
      setSnookerError(null);
    } catch (e) {
      setSnookerError(e.message || "Failed to load snooker rankings.");
    } finally {
      setSnookerLoading(false);
    }
  }, []);

  // ── Combined refresh ────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    await Promise.all([fetchPool(), fetchSnooker()]);
    setLastUpdated(new Date());
    setCountdown(30);
  }, [fetchPool, fetchSnooker]);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(iv);
  }, [refresh]);

  useEffect(() => {
    const tick = setInterval(() => setCountdown(c => (c <= 1 ? 30 : c - 1)), 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  const currentPath = window.location.pathname;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0D0F14",
      backgroundImage:
        "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,180,100,0.08) 0%, transparent 70%), " +
        "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.02) 40px), " +
        "repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.02) 40px)",
      fontFamily: "'DM Mono', 'Fira Mono', 'Courier New', monospace",
      color: "#E8ECF0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap');
        @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes dot-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        tr:hover td { background: rgba(61,220,132,0.04) !important; }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: "60px",
        background: "rgba(13,15,20,0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "radial-gradient(circle,#3DDC84 0%,#00A854 100%)", boxShadow: "0 0 8px rgba(61,220,132,0.7)" }} />
          <span style={{ fontSize: "15px", fontWeight: "700", letterSpacing: "0.15em", color: "#E8ECF0", textTransform: "uppercase" }}>Pool Buzz</span>
        </a>
        <div style={{ display: "flex", gap: "4px" }}>
          {[{ href: "/", label: "Record Match" }, { href: "/leaderboard", label: "Leaderboard" }].map(({ href, label }) => {
            const active = currentPath === href;
            return (
              <a key={href} href={href} style={{
                textDecoration: "none", padding: "7px 16px", borderRadius: "6px",
                fontSize: "12px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase",
                color: active ? "#0D0F14" : "#8A96A3",
                background: active ? "#3DDC84" : "transparent",
                border: `1px solid ${active ? "#3DDC84" : "rgba(255,255,255,0.08)"}`,
                transition: "all 0.15s ease",
              }}>{label}</a>
            );
          })}
        </div>
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "clamp(26px,5vw,40px)", fontWeight: "800", letterSpacing: "-0.02em", lineHeight: 1, color: "#E8ECF0", margin: "0 0 12px", fontFamily: "'DM Mono',monospace" }}>
            <span style={{ color: "#3DDC84" }}>/ </span>Leaderboard
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "20px", background: "rgba(61,220,132,0.08)", border: "1px solid rgba(61,220,132,0.2)", fontSize: "11px", color: "#3DDC84", letterSpacing: "0.06em" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3DDC84", animation: "pulse 2s infinite" }} />
              Live Rankings
            </span>
            {lastUpdated && (
              <span style={{ fontSize: "11px", color: "#555", letterSpacing: "0.05em" }}>
                Refreshes in {countdown}s · Last updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        {/* ── Tab switcher ── */}
        <div style={{
          display: "inline-flex", gap: "3px", marginBottom: "24px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px", padding: "4px",
        }}>
          {[
            { key: "pool",    icon: "🎱", label: "Pool",    count: players.length,     countLoading: poolLoading },
            { key: "snooker", icon: "🔴", label: "Snooker", count: snookerRows.length, countLoading: snookerLoading },
          ].map(({ key, icon, label, count, countLoading }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "7px",
                  padding: "8px 22px", borderRadius: "7px", border: "none",
                  cursor: "pointer", fontFamily: "inherit",
                  fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em",
                  textTransform: "uppercase", transition: "all 0.18s ease",
                  background: active ? "#3DDC84" : "transparent",
                  color:      active ? "#0D0F14" : "#555E6B",
                  boxShadow:  active ? "0 2px 14px rgba(61,220,132,0.22)" : "none",
                }}
              >
                <span style={{ fontSize: "14px" }}>{icon}</span>
                {label}
                {!countLoading && count > 0 && (
                  <span style={{
                    fontSize: "10px", fontWeight: "800",
                    padding: "1px 6px", borderRadius: "20px",
                    background: active ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.06)",
                    color:      active ? "rgba(0,0,0,0.55)" : "#3a4450",
                    marginLeft: "1px",
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Panels ── */}
        {tab === "pool"    && <PoolLeaderboard    players={players}    loading={poolLoading}    error={poolError}    />}
        {tab === "snooker" && <SnookerLeaderboard rows={snookerRows}   loading={snookerLoading} error={snookerError} />}
      </div>
    </div>
  );
}
