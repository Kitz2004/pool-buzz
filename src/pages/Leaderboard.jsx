import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase.js";

const REFRESH_INTERVAL = 30000;

const MEDAL = {
  0: { bg: "rgba(255,197,61,0.12)",  border: "rgba(255,197,61,0.45)",  text: "#FFC53D", label: "🥇" },
  1: { bg: "rgba(180,188,200,0.10)", border: "rgba(180,188,200,0.40)", text: "#B4BCC8", label: "🥈" },
  2: { bg: "rgba(186,120,76,0.10)",  border: "rgba(186,120,76,0.40)",  text: "#CD7F4E", label: "🥉" },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatStreak(streak) {
  if (!streak || streak === 0) return { label: "—", color: "#555E6B" };
  if (streak > 0) return { label: `W${streak}`,  color: "#3DDC84" };
  return           { label: `L${Math.abs(streak)}`, color: "#FF5A5A" };
}

function winPct(wins, total) {
  if (!total) return "—";
  return (wins / total * 100).toFixed(1) + "%";
}

function winPctColor(pct) {
  if (pct === "—") return "#555E6B";
  const n = parseFloat(pct);
  return n >= 60 ? "#3DDC84" : n >= 40 ? "#CDD4DC" : "#FF5A5A";
}

// ─── LOADING DOTS ─────────────────────────────────────────────────────────────
function LoadingDots() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", padding:"72px 24px", gap:"16px" }}>
      <div style={{ display:"flex", gap:"6px" }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width:8, height:8, borderRadius:"50%", background:"#3DDC84",
            display:"inline-block",
            animation:`dot-bounce 1.2s ease-in-out ${i*0.16}s infinite`,
          }}/>
        ))}
      </div>
      <span style={{ fontSize:"11px", color:"#555E6B", letterSpacing:"0.1em" }}>LOADING</span>
    </div>
  );
}

// ─── STREAK CHIP ──────────────────────────────────────────────────────────────
function StreakChip({ streak }) {
  const { label, color } = formatStreak(streak);
  return (
    <span style={{
      display:"inline-block", padding:"2px 8px", borderRadius:"4px", fontSize:"11px",
      fontWeight:"700", letterSpacing:"0.04em",
      background: streak > 0 ? "rgba(61,220,132,0.10)"
                : streak < 0 ? "rgba(255,90,90,0.10)" : "transparent",
      color,
    }}>
      {label}
    </span>
  );
}

// ─── MOBILE CARD — Pool ───────────────────────────────────────────────────────
function PoolCard({ player, idx }) {
  const isMedal = idx < 3;
  const pct     = winPct(player.total_wins, player.total_matches);
  const streak  = formatStreak(player.current_streak);

  return (
    <div className="lb-card" style={{
      background:   isMedal ? MEDAL[idx].bg  : "rgba(255,255,255,0.02)",
      borderLeft:   `3px solid ${isMedal ? MEDAL[idx].border : "rgba(255,255,255,0.06)"}`,
      borderTop:    "1px solid rgba(255,255,255,0.06)",
      borderRight:  "1px solid rgba(255,255,255,0.06)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px",
      padding:      "14px 16px",
      display:      "flex",
      alignItems:   "center",
      gap:          "14px",
    }}>
      {/* Rank badge */}
      <div style={{
        flexShrink: 0, width:"34px", height:"34px", borderRadius:"8px",
        display:"flex", alignItems:"center", justifyContent:"center",
        background: isMedal ? "transparent" : "rgba(255,255,255,0.05)",
        fontSize: isMedal ? "20px" : "13px",
        fontWeight:"800",
        color: isMedal ? MEDAL[idx].text : "#555E6B",
      }}>
        {isMedal ? MEDAL[idx].label : idx + 1}
      </div>

      {/* Name + record */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontSize:"15px", fontWeight: isMedal ? "700" : "600",
          color: isMedal ? MEDAL[idx].text : "#E8ECF0",
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
          marginBottom:"4px",
        }}>
          {player.name}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
          <span style={{ fontSize:"11px", color:"#555E6B" }}>
            <span style={{ color:"#3DDC84", fontWeight:"700" }}>{player.total_wins ?? 0}W</span>
            {" "}<span style={{ color:"#FF5A5A", fontWeight:"700" }}>{player.total_losses ?? 0}L</span>
          </span>
          <span style={{ fontSize:"11px", color: winPctColor(pct), fontWeight:"600" }}>{pct}</span>
          <StreakChip streak={player.current_streak} />
        </div>
      </div>

      {/* ELO — right side */}
      <div style={{ flexShrink:0, textAlign:"right" }}>
        <div style={{
          fontSize:"18px", fontWeight:"800", letterSpacing:"-0.02em",
          color: isMedal ? MEDAL[idx].text : "#3DDC84",
          fontVariantNumeric:"tabular-nums",
        }}>
          {player.elo_rating ?? "—"}
        </div>
        <div style={{ fontSize:"9px", color:"#555E6B", letterSpacing:"0.1em", textTransform:"uppercase", marginTop:"1px" }}>
          ELO
        </div>
      </div>
    </div>
  );
}

// ─── MOBILE CARD — Snooker ────────────────────────────────────────────────────
function SnookerCard({ row, idx }) {
  const isMedal = idx < 3;
  const pct     = winPct(row.wins, row.played);

  return (
    <div className="lb-card" style={{
      background:   isMedal ? MEDAL[idx].bg  : "rgba(255,255,255,0.02)",
      borderLeft:   `3px solid ${isMedal ? MEDAL[idx].border : "rgba(255,255,255,0.06)"}`,
      borderTop:    "1px solid rgba(255,255,255,0.06)",
      borderRight:  "1px solid rgba(255,255,255,0.06)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px",
      padding:      "14px 16px",
      display:      "flex",
      alignItems:   "center",
      gap:          "14px",
    }}>
      {/* Rank badge */}
      <div style={{
        flexShrink:0, width:"34px", height:"34px", borderRadius:"8px",
        display:"flex", alignItems:"center", justifyContent:"center",
        background: isMedal ? "transparent" : "rgba(255,255,255,0.05)",
        fontSize: isMedal ? "20px" : "13px",
        fontWeight:"800",
        color: isMedal ? MEDAL[idx].text : "#555E6B",
      }}>
        {isMedal ? MEDAL[idx].label : idx + 1}
      </div>

      {/* Name + stats */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontSize:"15px", fontWeight: isMedal ? "700" : "600",
          color: isMedal ? MEDAL[idx].text : "#E8ECF0",
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
          marginBottom:"4px",
        }}>
          {row.name}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
          <span style={{ fontSize:"11px", color:"#555E6B" }}>
            <span style={{ color:"#3DDC84", fontWeight:"700" }}>{row.wins}W</span>
            {" / "}{row.played} played
          </span>
          <span style={{ fontSize:"11px", color: winPctColor(pct), fontWeight:"600" }}>{pct}</span>
          {row.highest_break != null && (
            <span style={{ fontSize:"11px", color:"#FFC53D", fontWeight:"700" }}>
              🎱 {row.highest_break}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DESKTOP TABLE — Pool ─────────────────────────────────────────────────────
function PoolTable({ players }) {
  return (
    <div style={{
      borderRadius:"12px", border:"1px solid rgba(255,255,255,0.07)",
      overflow:"hidden", background:"rgba(255,255,255,0.02)",
    }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead style={{ background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <tr>
            {["#","Player","ELO","W","L","Win %","Streak"].map((h, i) => (
              <th key={h} style={{
                padding:"12px 16px", fontSize:"10px", fontWeight:"700",
                letterSpacing:"0.14em", textTransform:"uppercase", color:"#555E6B",
                textAlign: i <= 1 ? "left" : "right", whiteSpace:"nowrap",
                width: i === 0 ? "52px" : undefined,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((player, idx) => {
            const pct    = winPct(player.total_wins, player.total_matches);
            const streak = formatStreak(player.current_streak);
            const isMedal = idx < 3;
            return (
              <tr key={player.id} style={{
                background:   isMedal ? MEDAL[idx].bg : idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                borderLeft:   `2px solid ${isMedal ? MEDAL[idx].border : "transparent"}`,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                transition:   "background 0.15s ease",
              }}>
                {/* Rank */}
                <td style={{ padding:"14px 16px", textAlign:"center", verticalAlign:"middle" }}>
                  <span style={{
                    display:"inline-flex", alignItems:"center", justifyContent:"center",
                    width:"28px", height:"28px", borderRadius:"6px",
                    fontSize: isMedal ? "16px" : "12px", fontWeight:"700",
                    background: isMedal ? "transparent" : "rgba(255,255,255,0.05)",
                    color: isMedal ? MEDAL[idx].text : "#555E6B",
                  }}>
                    {isMedal ? MEDAL[idx].label : idx + 1}
                  </span>
                </td>
                {/* Name */}
                <td style={{ padding:"14px 16px", fontSize:"13px", verticalAlign:"middle" }}>
                  <span style={{ fontWeight: isMedal?"700":"500", color: isMedal?MEDAL[idx].text:"#E8ECF0", fontSize:"14px" }}>
                    {player.name}
                  </span>
                </td>
                {/* ELO */}
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle" }}>
                  <span style={{ fontWeight:"700", fontSize:"14px", color: isMedal?MEDAL[idx].text:"#3DDC84", fontVariantNumeric:"tabular-nums" }}>
                    {player.elo_rating ?? "—"}
                  </span>
                </td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle", fontVariantNumeric:"tabular-nums", fontSize:"13px", color:"#CDD4DC" }}>{player.total_wins ?? 0}</td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle", fontVariantNumeric:"tabular-nums", fontSize:"13px", color:"#CDD4DC" }}>{player.total_losses ?? 0}</td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle" }}>
                  <span style={{ color: winPctColor(pct), fontWeight:"600", fontVariantNumeric:"tabular-nums", fontSize:"13px" }}>{pct}</span>
                </td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle" }}>
                  <StreakChip streak={player.current_streak} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── DESKTOP TABLE — Snooker ──────────────────────────────────────────────────
function SnookerTable({ rows }) {
  return (
    <div style={{
      borderRadius:"12px", border:"1px solid rgba(255,255,255,0.07)",
      overflow:"hidden", background:"rgba(255,255,255,0.02)",
    }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead style={{ background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <tr>
            {["#","Player","Played","Wins","Win %","Hi Break"].map((h, i) => (
              <th key={h} style={{
                padding:"12px 16px", fontSize:"10px", fontWeight:"700",
                letterSpacing:"0.14em", textTransform:"uppercase", color:"#555E6B",
                textAlign: i <= 1 ? "left" : "right", whiteSpace:"nowrap",
                width: i === 0 ? "52px" : undefined,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const pct     = winPct(row.wins, row.played);
            const isMedal = idx < 3;
            return (
              <tr key={row.player_id} style={{
                background:   isMedal ? MEDAL[idx].bg : idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                borderLeft:   `2px solid ${isMedal ? MEDAL[idx].border : "transparent"}`,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                transition:   "background 0.15s ease",
              }}>
                <td style={{ padding:"14px 16px", textAlign:"center", verticalAlign:"middle" }}>
                  <span style={{
                    display:"inline-flex", alignItems:"center", justifyContent:"center",
                    width:"28px", height:"28px", borderRadius:"6px",
                    fontSize: isMedal ? "16px" : "12px", fontWeight:"700",
                    background: isMedal ? "transparent" : "rgba(255,255,255,0.05)",
                    color: isMedal ? MEDAL[idx].text : "#555E6B",
                  }}>
                    {isMedal ? MEDAL[idx].label : idx + 1}
                  </span>
                </td>
                <td style={{ padding:"14px 16px", fontSize:"13px", verticalAlign:"middle" }}>
                  <span style={{ fontWeight: isMedal?"700":"500", color: isMedal?MEDAL[idx].text:"#E8ECF0", fontSize:"14px" }}>
                    {row.name}
                  </span>
                </td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle", fontVariantNumeric:"tabular-nums", fontSize:"13px", color:"#CDD4DC" }}>{row.played}</td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle", fontVariantNumeric:"tabular-nums", fontSize:"13px", color:"#CDD4DC" }}>{row.wins}</td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle" }}>
                  <span style={{ color: winPctColor(pct), fontWeight:"600", fontVariantNumeric:"tabular-nums", fontSize:"13px" }}>{pct}</span>
                </td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle" }}>
                  {row.highest_break != null
                    ? <span style={{ fontWeight:"700", color:"#FFC53D", fontVariantNumeric:"tabular-nums", fontSize:"13px" }}>{row.highest_break}</span>
                    : <span style={{ color:"#555E6B" }}>—</span>
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

// ─── POOL PANEL ───────────────────────────────────────────────────────────────
function PoolLeaderboard({ players, loading, error }) {
  if (loading) return <LoadingDots />;
  if (error)   return <div style={{ textAlign:"center", padding:"60px 24px", color:"#FF5A5A", fontSize:"14px" }}>⚠ {error}</div>;
  if (players.length === 0) return (
    <div style={{ textAlign:"center", padding:"60px 24px", color:"#555E6B", fontSize:"14px", letterSpacing:"0.04em" }}>
      No players yet. Record a match to get started.
    </div>
  );
  return (
    <>
      {/* Mobile cards */}
      <div className="lb-cards">
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {players.map((p, i) => <PoolCard key={p.id} player={p} idx={i} />)}
        </div>
      </div>
      {/* Desktop table */}
      <div className="lb-table">
        <PoolTable players={players} />
      </div>
    </>
  );
}

// ─── SNOOKER PANEL ────────────────────────────────────────────────────────────
function SnookerLeaderboard({ rows, loading, error }) {
  if (loading) return <LoadingDots />;
  if (error)   return <div style={{ textAlign:"center", padding:"60px 24px", color:"#FF5A5A", fontSize:"14px" }}>⚠ {error}</div>;
  if (rows.length === 0) return (
    <div style={{ textAlign:"center", padding:"72px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:"16px" }}>
      <span style={{ fontSize:"48px", lineHeight:1, filter:"drop-shadow(0 0 18px rgba(255,80,80,0.35))" }}>🔴</span>
      <div>
        <div style={{ color:"#CDD4DC", fontWeight:"700", fontSize:"16px", marginBottom:"8px" }}>No snooker matches yet</div>
        <div style={{ color:"#555E6B", fontSize:"13px", lineHeight:1.6 }}>Record a snooker match to see the rankings here.</div>
      </div>
    </div>
  );
  return (
    <>
      {/* Mobile cards */}
      <div className="lb-cards">
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {rows.map((r, i) => <SnookerCard key={r.player_id} row={r} idx={i} />)}
        </div>
      </div>
      {/* Desktop table */}
      <div className="lb-table">
        <SnookerTable rows={rows} />
      </div>
    </>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Leaderboard() {
  const [tab, setTab] = useState("pool");

  const [players,        setPlayers]        = useState([]);
  const [poolLoading,    setPoolLoading]    = useState(true);
  const [poolError,      setPoolError]      = useState(null);

  const [snookerRows,    setSnookerRows]    = useState([]);
  const [snookerLoading, setSnookerLoading] = useState(true);
  const [snookerError,   setSnookerError]   = useState(null);

  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown,   setCountdown]   = useState(30);

  const fetchPool = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("elo_rating", { ascending: false });
      if (error) throw error;
      setPlayers(data || []);
      setPoolError(null);
    } catch (e) {
      setPoolError(e.message || "Failed to load pool rankings.");
    } finally {
      setPoolLoading(false);
    }
  }, []);

  const fetchSnooker = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("match_players")
        .select(`player_id, is_winner, highest_break, players!inner(name), matches!inner(game_type)`)
        .eq("matches.game_type", "snooker");
      if (error) throw error;

      const map = {};
      for (const row of data || []) {
        const pid = row.player_id;
        if (!map[pid]) map[pid] = { player_id:pid, name:row.players.name, played:0, wins:0, highest_break:null };
        map[pid].played += 1;
        if (row.is_winner) map[pid].wins += 1;
        if (row.highest_break != null)
          map[pid].highest_break = Math.max(map[pid].highest_break ?? 0, row.highest_break);
      }

      const sorted = Object.values(map).sort((a, b) => {
        const pA = a.played ? a.wins / a.played : 0;
        const pB = b.played ? b.wins / b.played : 0;
        if (pB !== pA)           return pB - pA;
        if (b.wins !== a.wins)   return b.wins - a.wins;
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
    const tick = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000);
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
      fontFamily: "'DM Mono','Fira Mono','Courier New',monospace",
      color: "#E8ECF0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap');

        @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes dot-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }

        /* Desktop: show table, hide cards */
        .lb-cards { display: none; }
        .lb-table { display: block; }

        /* Mobile (≤ 599px): show cards, hide table */
        @media (max-width: 599px) {
          .lb-cards { display: block; }
          .lb-table { display: none; }

          /* Tighter page padding on mobile */
          .lb-page  { padding: 20px 14px 60px !important; }

          /* Slightly smaller title on mobile */
          .lb-title { font-size: 24px !important; }

          /* Stack meta row vertically on very small screens */
          .lb-meta  { flex-direction: column; align-items: flex-start !important; gap: 6px !important; }

          /* Full-width tab buttons on mobile */
          .lb-tabs  { width: 100% !important; }
          .lb-tab   { flex: 1; justify-content: center !important; }

          /* Nav: hide text labels, keep brand */
          .nav-link-label { display: none; }
          .nav-link { padding: 7px 10px !important; }
        }

        /* Table row hover */
        tr:hover td { background: rgba(61,220,132,0.04) !important; }

        /* Card tap highlight on mobile */
        @media (max-width: 599px) {
          .lb-card:active { background: rgba(61,220,132,0.06) !important; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 20px", height:"56px",
        background:"rgba(13,15,20,0.92)", backdropFilter:"blur(12px)",
        borderBottom:"1px solid rgba(255,255,255,0.07)",
        position:"sticky", top:0, zIndex:100,
      }}>
        <a href="/" style={{ display:"flex", alignItems:"center", gap:"10px", textDecoration:"none", flexShrink:0 }}>
          <span style={{ width:"10px", height:"10px", borderRadius:"50%",
            background:"radial-gradient(circle,#3DDC84 0%,#00A854 100%)",
            boxShadow:"0 0 8px rgba(61,220,132,0.7)", flexShrink:0 }}/>
          <span style={{ fontSize:"14px", fontWeight:"700", letterSpacing:"0.15em",
            color:"#E8ECF0", textTransform:"uppercase" }}>Pool Buzz</span>
        </a>
        <div style={{ display:"flex", gap:"4px" }}>
          {[{ href:"/", label:"Record" }, { href:"/leaderboard", label:"Leaderboard" }].map(({ href, label }) => {
            const active = currentPath === href;
            return (
              <a key={href} href={href} className="nav-link" style={{
                textDecoration:"none", padding:"7px 14px", borderRadius:"6px",
                fontSize:"11px", fontWeight:"600", letterSpacing:"0.1em", textTransform:"uppercase",
                color:      active ? "#0D0F14" : "#8A96A3",
                background: active ? "#3DDC84" : "transparent",
                border:`1px solid ${active ? "#3DDC84" : "rgba(255,255,255,0.08)"}`,
                transition:"all 0.15s ease",
                display:"flex", alignItems:"center", gap:"5px",
              }}>
                <span>{href === "/" ? "🎱" : "🏆"}</span>
                <span className="nav-link-label">{label}</span>
              </a>
            );
          })}
        </div>
      </nav>

      {/* ── Page ── */}
      <div className="lb-page" style={{ maxWidth:"900px", margin:"0 auto", padding:"40px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom:"28px" }}>
          <h1 className="lb-title" style={{
            fontSize:"clamp(24px,5vw,40px)", fontWeight:"800", letterSpacing:"-0.02em",
            lineHeight:1, color:"#E8ECF0", margin:"0 0 12px",
          }}>
            <span style={{ color:"#3DDC84" }}>/ </span>Leaderboard
          </h1>
          <div className="lb-meta" style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
            <span style={{
              display:"inline-flex", alignItems:"center", gap:"6px",
              padding:"4px 10px", borderRadius:"20px",
              background:"rgba(61,220,132,0.08)", border:"1px solid rgba(61,220,132,0.2)",
              fontSize:"11px", color:"#3DDC84", letterSpacing:"0.06em",
            }}>
              <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#3DDC84", animation:"pulse 2s infinite" }}/>
              Live
            </span>
            {lastUpdated && (
              <span style={{ fontSize:"11px", color:"#555", letterSpacing:"0.04em" }}>
                Refreshes in {countdown}s · {lastUpdated.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
              </span>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="lb-tabs" style={{
          display:"inline-flex", gap:"3px", marginBottom:"20px",
          background:"rgba(255,255,255,0.03)",
          border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:"10px", padding:"4px",
        }}>
          {[
            { key:"pool",    icon:"🎱", label:"Pool",    count:players.length,     cl:poolLoading    },
            { key:"snooker", icon:"🔴", label:"Snooker", count:snookerRows.length, cl:snookerLoading },
          ].map(({ key, icon, label, count, cl }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)} className="lb-tab" style={{
                display:"inline-flex", alignItems:"center", justifyContent:"flex-start", gap:"7px",
                padding:"9px 20px", borderRadius:"7px", border:"none",
                cursor:"pointer", fontFamily:"inherit",
                fontSize:"12px", fontWeight:"700", letterSpacing:"0.1em", textTransform:"uppercase",
                transition:"all 0.18s ease",
                background: active ? "#3DDC84" : "transparent",
                color:      active ? "#0D0F14" : "#555E6B",
                boxShadow:  active ? "0 2px 14px rgba(61,220,132,0.22)" : "none",
              }}>
                <span style={{ fontSize:"14px" }}>{icon}</span>
                {label}
                {!cl && count > 0 && (
                  <span style={{
                    fontSize:"10px", fontWeight:"800", padding:"1px 6px", borderRadius:"20px",
                    background: active ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.06)",
                    color:      active ? "rgba(0,0,0,0.55)" : "#3a4450",
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Panels ── */}
        {tab === "pool"    && <PoolLeaderboard    players={players}  loading={poolLoading}    error={poolError}    />}
        {tab === "snooker" && <SnookerLeaderboard rows={snookerRows} loading={snookerLoading} error={snookerError} />}
      </div>
    </div>
  );
}
