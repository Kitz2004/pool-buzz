import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";

const T = {
  bg: "#0f0f13",
  surface: "#1a1a24",
  surfaceAlt: "#22222f",
  border: "#2e2e3e",
  accent: "#7c3aed",
  accentGlow: "rgba(124,58,237,0.18)",
  accentSoft: "#a78bfa",
  gold: "#f59e0b",
  silver: "#94a3b8",
  green: "#10b981",
  red: "#ef4444",
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#4b5563",
};

const RANKS = [
  { bg: "linear-gradient(135deg,#78350f,#f59e0b22)", border: "#f59e0b", medal: "🥇", color: "#f59e0b" },
  { bg: "linear-gradient(135deg,#1e293b,#94a3b822)", border: "#94a3b8", medal: "🥈", color: "#94a3b8" },
  { bg: "linear-gradient(135deg,#1c0a00,#b4590922)", border: "#b45309", medal: "🥉", color: "#cd7c3a" },
];

function Skeleton() {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", display: "flex", gap: 16 }}>
      {[40, 44, null, 160].map((w, i) => (
        <div key={i} style={{ width: w || "100%", flex: w ? undefined : 1, height: 36, borderRadius: 8, background: `linear-gradient(90deg,${T.surfaceAlt} 25%,${T.border} 50%,${T.surfaceAlt} 75%)`, backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "72px 24px", gap: 16 }}>
      <div style={{ fontSize: 64 }}>🎱</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary }}>No snooker matches yet</div>
      <div style={{ fontSize: 14, color: T.textSecondary, textAlign: "center", maxWidth: 300, lineHeight: 1.6 }}>
        Play your first snooker match to see the leaderboard come alive.
      </div>
    </div>
  );
}

function PlayerCard({ player, rank }) {
  const rs = RANKS[rank - 1] || null;
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: rs ? rs.bg : T.surface,
        border: `1px solid ${rs ? rs.border : T.border}`,
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hov ? `0 8px 32px ${T.accentGlow}` : rs ? `0 0 24px ${rs.border}22` : "none",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Rank */}
      <div style={{ minWidth: 40, textAlign: "center" }}>
        {rs ? <span style={{ fontSize: 26 }}>{rs.medal}</span>
             : <span style={{ fontSize: 16, fontWeight: 700, color: T.textMuted }}>#{rank}</span>}
      </div>

      {/* Avatar */}
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${T.accent},#16653444)`, border: `2px solid ${rs ? rs.border : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: T.textPrimary, flexShrink: 0 }}>
        {player.name.slice(0, 2).toUpperCase()}
      </div>

      {/* Name + win-rate bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: rs ? rs.color : T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 6 }}>
          {player.name}
        </div>
        <div style={{ width: "100%", height: 4, background: T.border, borderRadius: 99, overflow: "hidden" }}>
          <div style={{ width: `${player.winPct}%`, height: "100%", background: `linear-gradient(90deg,${T.accent},${T.accentSoft})`, borderRadius: 99, boxShadow: `0 0 8px ${T.accentGlow}` }} />
        </div>
        <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3 }}>{player.winPct.toFixed(1)}% win rate</div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexShrink: 0 }}>
        {[
          { label: "Matches", value: player.matches, color: T.textPrimary },
          { label: "Wins",    value: player.wins,    color: T.green },
          {
            label: "High Break",
            value: player.highestBreak > 0 ? player.highestBreak : "—",
            color: player.highestBreak >= 100 ? T.gold : player.highestBreak > 0 ? T.accentSoft : T.textMuted,
          },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: "-0.5px" }}>{value}</span>
            <span style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Century badge */}
      {player.highestBreak >= 100 && (
        <div style={{ position: "absolute", top: 8, right: 8, background: "linear-gradient(135deg,#78350f,#f59e0b)", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 6, padding: "2px 6px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          💯 Century
        </div>
      )}
    </div>
  );
}

export default function SnookerLeaderboard() {
  const [players, setPlayers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1️⃣ Fetch snooker match IDs
        const { data: matches, error: mErr } = await supabase
          .from("matches")
          .select("id")
          .eq("game_type", "snooker");
        if (mErr) throw mErr;
        if (!matches?.length) { setPlayers([]); return; }

        // 2️⃣ Fetch match_players rows + player names in one query
        const { data: rows, error: rErr } = await supabase
          .from("match_players")
          .select("player_id, is_winner, highest_break, players(id, name)")
          .in("match_id", matches.map((m) => m.id));
        if (rErr) throw rErr;
        if (!rows?.length) { setPlayers([]); return; }

        // 3️⃣ Aggregate per player
        const map = {};
        for (const row of rows) {
          const pid = row.player_id;
          if (!map[pid]) map[pid] = { id: pid, name: row.players?.name || "Unknown", matches: 0, wins: 0, highestBreak: 0 };
          map[pid].matches += 1;
          if (row.is_winner) map[pid].wins += 1;
          if (row.highest_break != null && row.highest_break > map[pid].highestBreak)
            map[pid].highestBreak = row.highest_break;
        }

        // 4️⃣ Sort: wins ↓ → win% ↓ → highestBreak ↓
        const result = Object.values(map)
          .map((p) => ({ ...p, winPct: p.matches > 0 ? (p.wins / p.matches) * 100 : 0 }))
          .sort((a, b) => b.wins - a.wins || b.winPct - a.winPct || b.highestBreak - a.highestBreak);

        setPlayers(result);
        setUpdatedAt(new Date());
      } catch (err) {
        console.error("SnookerLeaderboard:", err);
        setError(err.message || "Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: T.textPrimary, padding: "32px 16px" }}>
      <style>{`
        @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${T.accent},#16653488)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: `0 0 20px ${T.accentGlow}` }}>🎱</div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, background: `linear-gradient(90deg,${T.textPrimary},${T.accentSoft})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.5px" }}>
                Snooker Leaderboard
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: T.textMuted }}>Ranked by snooker wins · Pool Buzz</p>
          </div>
          {updatedAt && (
            <div style={{ fontSize: 11, color: T.textMuted }}>
              Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>

        {/* ── Summary chips ── */}
        {!loading && !error && players.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", animation: "fadeInUp 0.4s ease both" }}>
            {[
              { icon: "👤", value: players.length,                                         label: "Players"    },
              { icon: "🏆", value: players.reduce((s, p) => s + p.wins, 0),               label: "Total Wins" },
              { icon: "💯", value: Math.max(...players.map((p) => p.highestBreak)) || "—", label: "Top Break"  },
            ].map((c) => (
              <div key={c.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 99, padding: "6px 14px", fontSize: 12, color: T.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{c.icon}</span>
                <span style={{ fontWeight: 700, color: T.textPrimary }}>{c.value}</span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ background: "#1f0a0a", border: `1px solid ${T.red}44`, borderRadius: 12, padding: "20px 24px", color: "#fca5a5", fontSize: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚠️</span><span>{error}</span>
          </div>
        )}

        {/* ── Skeleton loading ── */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} />)}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && players.length === 0 && <EmptyState />}

        {/* ── Player cards ── */}
        {!loading && !error && players.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {players.map((p, i) => (
              <div key={p.id} style={{ animation: `fadeInUp 0.35s ease ${i * 0.06}s both` }}>
                <PlayerCard player={p} rank={i + 1} />
              </div>
            ))}
          </div>
        )}

        {/* ── Legend ── */}
        {!loading && !error && players.length > 0 && (
          <div style={{ marginTop: 28, padding: "14px 18px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, display: "flex", gap: 20, flexWrap: "wrap", fontSize: 11, color: T.textMuted, alignItems: "center" }}>
            <span style={{ fontWeight: 600, color: T.textSecondary }}>Legend:</span>
            <span><span style={{ color: T.gold }}>Gold border</span> = 1st</span>
            <span>Bar = win rate</span>
            <span><span style={{ color: T.gold }}>💯 Century</span> = break ≥ 100</span>
          </div>
        )}

      </div>
    </div>
  );
}