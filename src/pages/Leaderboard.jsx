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

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown, setCountdown] = useState(30);

  const fetchPlayers = useCallback(async () => {
    try {
      const { data, error: sbError } = await supabase
        .from("players")
        .select("*")
        .order("elo_rating", { ascending: false });
      if (sbError) throw sbError;
      setPlayers(data || []);
      setLastUpdated(new Date());
      setCountdown(30);
      setError(null);
    } catch (e) {
      setError(e.message || "Failed to load players.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPlayers]);

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 30 : c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  const styles = {
    root: {
      minHeight: "100vh",
      background: "#0D0F14",
      backgroundImage:
        "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,180,100,0.08) 0%, transparent 70%), " +
        "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.02) 40px), " +
        "repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.02) 40px)",
      fontFamily: "'DM Mono', 'Fira Mono', 'Courier New', monospace",
      color: "#E8ECF0",
    },
    nav: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 32px",
      height: "60px",
      background: "rgba(13, 15, 20, 0.9)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    },
    navBrand: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      textDecoration: "none",
    },
    navDot: {
      width: "10px",
      height: "10px",
      borderRadius: "50%",
      background: "radial-gradient(circle, #3DDC84 0%, #00A854 100%)",
      boxShadow: "0 0 8px rgba(61, 220, 132, 0.7)",
    },
    navBrandText: {
      fontSize: "15px",
      fontWeight: "700",
      letterSpacing: "0.15em",
      color: "#E8ECF0",
      textTransform: "uppercase",
    },
    navLinks: {
      display: "flex",
      gap: "4px",
    },
    navLink: (active) => ({
      textDecoration: "none",
      padding: "7px 16px",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: "600",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: active ? "#0D0F14" : "#8A96A3",
      background: active ? "#3DDC84" : "transparent",
      border: `1px solid ${active ? "#3DDC84" : "rgba(255,255,255,0.08)"}`,
      transition: "all 0.15s ease",
    }),
    page: {
      maxWidth: "900px",
      margin: "0 auto",
      padding: "48px 24px 80px",
    },
    header: {
      marginBottom: "36px",
    },
    titleRow: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: "16px",
      flexWrap: "wrap",
    },
    title: {
      fontSize: "clamp(26px, 5vw, 40px)",
      fontWeight: "800",
      letterSpacing: "-0.02em",
      lineHeight: 1,
      color: "#E8ECF0",
      margin: 0,
      fontFamily: "'DM Mono', monospace",
    },
    titleAccent: {
      color: "#3DDC84",
    },
    metaRow: {
      display: "flex",
      alignItems: "center",
      gap: "14px",
      marginTop: "12px",
      flexWrap: "wrap",
    },
    pill: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 10px",
      borderRadius: "20px",
      background: "rgba(61, 220, 132, 0.08)",
      border: "1px solid rgba(61, 220, 132, 0.2)",
      fontSize: "11px",
      color: "#3DDC84",
      letterSpacing: "0.06em",
    },
    pillDot: {
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      background: "#3DDC84",
      animation: "pulse 2s infinite",
    },
    countdownText: {
      fontSize: "11px",
      color: "#555",
      letterSpacing: "0.05em",
    },
    tableWrap: {
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.07)",
      overflow: "hidden",
      background: "rgba(255,255,255,0.02)",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    thead: {
      background: "rgba(255,255,255,0.03)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
    },
    th: {
      padding: "12px 16px",
      fontSize: "10px",
      fontWeight: "700",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#555E6B",
      textAlign: "left",
      whiteSpace: "nowrap",
    },
    thRight: {
      padding: "12px 16px",
      fontSize: "10px",
      fontWeight: "700",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#555E6B",
      textAlign: "right",
      whiteSpace: "nowrap",
    },
    row: (idx) => ({
      background:
        idx < 3
          ? MEDAL[idx].bg
          : idx % 2 === 0
          ? "transparent"
          : "rgba(255,255,255,0.012)",
      borderLeft: idx < 3 ? `2px solid ${MEDAL[idx].border}` : "2px solid transparent",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      transition: "background 0.15s ease",
    }),
    td: {
      padding: "14px 16px",
      fontSize: "13px",
      color: "#CDD4DC",
      textAlign: "left",
      verticalAlign: "middle",
    },
    tdRight: {
      padding: "14px 16px",
      fontSize: "13px",
      color: "#CDD4DC",
      textAlign: "right",
      verticalAlign: "middle",
    },
    rankCell: (idx) => ({
      padding: "14px 16px",
      width: "52px",
      textAlign: "center",
      verticalAlign: "middle",
    }),
    rankBadge: (idx) => ({
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "28px",
      height: "28px",
      borderRadius: "6px",
      fontSize: idx < 3 ? "16px" : "12px",
      fontWeight: "700",
      background: idx < 3 ? "transparent" : "rgba(255,255,255,0.05)",
      color: idx < 3 ? MEDAL[idx].text : "#555E6B",
      letterSpacing: idx < 3 ? "0" : "0",
    }),
    playerName: (idx) => ({
      fontWeight: idx < 3 ? "700" : "500",
      color: idx < 3 ? MEDAL[idx].text : "#E8ECF0",
      fontSize: "14px",
    }),
    eloValue: (idx) => ({
      fontWeight: "700",
      fontSize: "14px",
      color: idx < 3 ? MEDAL[idx].text : "#3DDC84",
      fontVariantNumeric: "tabular-nums",
    }),
    streakChip: (streak) => {
      const { color } = formatStreak(streak);
      return {
        display: "inline-block",
        padding: "3px 8px",
        borderRadius: "4px",
        background: streak > 0
          ? "rgba(61, 220, 132, 0.1)"
          : streak < 0
          ? "rgba(255, 90, 90, 0.1)"
          : "transparent",
        color,
        fontWeight: "600",
        fontSize: "12px",
        letterSpacing: "0.04em",
      };
    },
    emptyState: {
      textAlign: "center",
      padding: "60px 24px",
      color: "#555E6B",
      fontSize: "14px",
      letterSpacing: "0.04em",
    },
    errorState: {
      textAlign: "center",
      padding: "60px 24px",
      color: "#FF5A5A",
      fontSize: "14px",
    },
    loadingWrap: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 24px",
      gap: "16px",
    },
    loadingDots: {
      display: "flex",
      gap: "6px",
    },
    numericCell: {
      fontVariantNumeric: "tabular-nums",
    },
    winPct: (pct) => {
      if (pct === "—") return { color: "#555E6B" };
      const n = parseFloat(pct);
      return {
        color: n >= 60 ? "#3DDC84" : n >= 40 ? "#CDD4DC" : "#FF5A5A",
        fontWeight: "600",
        fontVariantNumeric: "tabular-nums",
      };
    },
  };

  const currentPath = window.location.pathname;

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes dot-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        tr:hover td, tr:hover [data-cell] { background: rgba(61,220,132,0.04) !important; }
      `}</style>

      {/* Nav */}
      <nav style={styles.nav}>
        <a href="/" style={styles.navBrand}>
          <span style={styles.navDot} />
          <span style={styles.navBrandText}>Pool Buzz</span>
        </a>
        <div style={styles.navLinks}>
          <a href="/" style={styles.navLink(currentPath === "/")}>Record Match</a>
          <a href="/leaderboard" style={styles.navLink(currentPath === "/leaderboard")}>Leaderboard</a>
        </div>
      </nav>

      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>
              <span style={styles.titleAccent}>/ </span>Leaderboard
            </h1>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.pill}>
              <span style={styles.pillDot} />
              Live Rankings
            </span>
            {lastUpdated && (
              <span style={styles.countdownText}>
                Refreshes in {countdown}s · Last updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {players.length > 0 && (
              <span style={{ ...styles.countdownText, color: "#3a4450" }}>
                {players.length} player{players.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={styles.loadingWrap}>
            <div style={styles.loadingDots}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#3DDC84",
                    display: "inline-block",
                    animation: `dot-bounce 1.2s ease-in-out ${i * 0.16}s infinite`,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: "12px", color: "#555E6B", letterSpacing: "0.08em" }}>LOADING PLAYERS</span>
          </div>
        ) : error ? (
          <div style={styles.errorState}>⚠ {error}</div>
        ) : players.length === 0 ? (
          <div style={styles.emptyState}>No players found. Record a match to get started.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  <th style={{ ...styles.th, textAlign: "center", width: "52px" }}>#</th>
                  <th style={styles.th}>Player</th>
                  <th style={styles.thRight}>ELO</th>
                  <th style={styles.thRight}>W</th>
                  <th style={styles.thRight}>L</th>
                  <th style={styles.thRight}>Win %</th>
                  <th style={styles.thRight}>Streak</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, idx) => {
                  const streak = formatStreak(player.current_streak);
                  const pct = winPct(player.total_wins, player.total_matches);
                  return (
                    <tr key={player.id} style={styles.row(idx)}>
                      <td style={styles.rankCell(idx)}>
                        <span style={styles.rankBadge(idx)}>
                          {idx < 3 ? MEDAL[idx].label : idx + 1}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.playerName(idx)}>{player.name}</span>
                      </td>
                      <td style={styles.tdRight}>
                        <span style={styles.eloValue(idx)}>
                          {player.elo_rating ?? "—"}
                        </span>
                      </td>
                      <td style={{ ...styles.tdRight, ...styles.numericCell }}>
                        {player.total_wins ?? 0}
                      </td>
                      <td style={{ ...styles.tdRight, ...styles.numericCell }}>
                        {player.total_losses ?? 0}
                      </td>
                      <td style={styles.tdRight}>
                        <span style={styles.winPct(pct)}>{pct}</span>
                      </td>
                      <td style={styles.tdRight}>
                        <span style={styles.streakChip(player.current_streak)}>
                          {streak.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
