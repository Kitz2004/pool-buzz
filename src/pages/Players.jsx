import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase.js";

// ── Palette & tokens ──────────────────────────────────────────────────────────
const C = {
  bg:          "#0a0c0f",
  surface:     "#111418",
  card:        "#161b22",
  cardHover:   "#1c2330",
  border:      "#21262d",
  borderBright:"#30363d",
  accent:      "#00c896",
  accentDim:   "#00a07a",
  accentGlow:  "rgba(0,200,150,0.15)",
  gold:        "#f0a500",
  red:         "#f85149",
  blue:        "#388bfd",
  text:        "#e6edf3",
  textMuted:   "#8b949e",
  textFaint:   "#484f58",
  win:         "#1a3d2f",
  winText:     "#3fb950",
  loss:        "#3d1a1a",
  lossText:    "#f85149",
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const pct  = (w, t) => (t > 0 ? ((w / t) * 100).toFixed(1) : "0.0");
const pad2 = (n)    => String(n).padStart(2, "0");
const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const streakLabel = (n) => {
  if (!n) return { label: "—", color: C.textFaint };
  if (n > 0) return { label: `W${n}`, color: C.winText };
  return { label: `L${Math.abs(n)}`, color: C.lossText };
};
const eloColor = (v) => {
  if (v > 0)  return C.winText;
  if (v < 0)  return C.lossText;
  return C.textFaint;
};

// ── Spinner ───────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ display:"flex", justifyContent:"center", padding:"48px 0" }}>
    <div style={{
      width:36, height:36,
      border:`3px solid ${C.border}`,
      borderTop:`3px solid ${C.accent}`,
      borderRadius:"50%",
      animation:"spin 0.7s linear infinite",
    }}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

// ── ELO badge ─────────────────────────────────────────────────────────────────
const EloBadge = ({ rating }) => {
  let color = C.textMuted;
  if (rating >= 1600) color = C.gold;
  else if (rating >= 1400) color = C.accent;
  else if (rating >= 1200) color = C.blue;
  return (
    <span style={{
      fontFamily:"'Courier New', monospace",
      fontWeight:700,
      fontSize:15,
      color,
      letterSpacing:1,
    }}>
      {rating ?? "—"}
    </span>
  );
};

// ── Win-rate bar ──────────────────────────────────────────────────────────────
const WinBar = ({ wins, total, width = 80 }) => {
  const p = total > 0 ? (wins / total) * 100 : 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{
        width, height:5, background:C.border, borderRadius:3, overflow:"hidden",
      }}>
        <div style={{
          width:`${p}%`, height:"100%",
          background:`linear-gradient(90deg,${C.accentDim},${C.accent})`,
          borderRadius:3,
          transition:"width 0.4s ease",
        }}/>
      </div>
      <span style={{ fontSize:11, color:C.textMuted, minWidth:36 }}>
        {pct(wins, total)}%
      </span>
    </div>
  );
};

// ── Stat tile ─────────────────────────────────────────────────────────────────
const StatTile = ({ label, value, color, sub }) => (
  <div style={{
    background:C.surface,
    border:`1px solid ${C.border}`,
    borderRadius:10,
    padding:"14px 18px",
    display:"flex", flexDirection:"column", gap:2,
    minWidth:100,
  }}>
    <span style={{ fontSize:11, color:C.textFaint, textTransform:"uppercase", letterSpacing:1 }}>
      {label}
    </span>
    <span style={{ fontSize:22, fontWeight:800, color: color || C.text, fontFamily:"'Courier New',monospace" }}>
      {value ?? "—"}
    </span>
    {sub && <span style={{ fontSize:11, color:C.textMuted }}>{sub}</span>}
  </div>
);

// ── Match timeline row ────────────────────────────────────────────────────────
const MatchRow = ({ match, index }) => {
  const isWin = match.is_winner;
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:12,
      padding:"10px 14px",
      background: index % 2 === 0 ? C.surface : "transparent",
      borderRadius:8,
      borderLeft:`3px solid ${isWin ? C.winText : C.lossText}`,
      animation:`fadeSlide 0.25s ease both`,
      animationDelay:`${index * 30}ms`,
    }}>
      {/* Result badge */}
      <span style={{
        width:28, height:28,
        borderRadius:6,
        background: isWin ? C.win : C.loss,
        color: isWin ? C.winText : C.lossText,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontWeight:800, fontSize:12, flexShrink:0,
      }}>
        {isWin ? "W" : "L"}
      </span>

      {/* Opponent */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, color:C.text, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          vs {match.opponent_name || "Unknown"}
        </div>
        <div style={{ fontSize:11, color:C.textMuted }}>
          {match.game_type?.toUpperCase()} · {fmtDate(match.played_at)}
        </div>
      </div>

      {/* Score */}
      <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:"'Courier New',monospace", flexShrink:0 }}>
        {match.score ?? "—"}
      </div>

      {/* ELO change */}
      <div style={{
        fontSize:12, fontWeight:700,
        color: eloColor(match.elo_change),
        fontFamily:"'Courier New',monospace",
        width:46, textAlign:"right", flexShrink:0,
      }}>
        {match.elo_change > 0 ? "+" : ""}{match.elo_change ?? "—"}
      </div>
    </div>
  );
};

// ── Player profile panel ──────────────────────────────────────────────────────
const PlayerProfile = ({ player, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // ── Highest break (snooker wins only) ──
      const { data: breakData } = await supabase
        .from("match_players")
        .select("highest_break, matches!inner(game_type)")
        .eq("player_id", player.id)
        .eq("is_winner", true)
        .eq("matches.game_type", "snooker")
        .order("highest_break", { ascending: false })
        .limit(1);

      const highestBreak = breakData?.[0]?.highest_break ?? null;

      // ── Last 10 matches ──
      const { data: mpData } = await supabase
        .from("match_players")
        .select(`
          id, match_id, score, is_winner, elo_change, elo_before, elo_after, highest_break,
          matches!inner(id, game_type, played_at)
        `)
        .eq("player_id", player.id)
        .order("matches(played_at)", { ascending: false })
        .limit(10);

      // For each match, find the opponent
      const enriched = [];
      if (mpData) {
        for (const mp of mpData) {
          const { data: opps } = await supabase
            .from("match_players")
            .select("player_id, score, players!inner(name)")
            .eq("match_id", mp.match_id)
            .neq("player_id", player.id)
            .limit(1);

          enriched.push({
            ...mp,
            opponent_name: opps?.[0]?.players?.name ?? "Unknown",
            game_type: mp.matches?.game_type,
            played_at: mp.matches?.played_at,
          });
        }
      }

      if (!cancelled) {
        setProfile({ ...player, highestBreak });
        setMatches(enriched);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [player]);

  const streak = streakLabel(player.current_streak);
  const winPct = pct(player.total_wins, player.total_matches);

  return (
    <div style={{
      position:"fixed", inset:0,
      background:"rgba(0,0,0,0.85)",
      backdropFilter:"blur(6px)",
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      zIndex:999, overflowY:"auto", padding:"24px 16px",
    }} onClick={onClose}>
      <div style={{
        background:C.card,
        border:`1px solid ${C.borderBright}`,
        borderRadius:16,
        width:"100%", maxWidth:640,
        overflow:"hidden",
        boxShadow:`0 0 60px rgba(0,0,0,0.6), 0 0 0 1px ${C.borderBright}`,
        animation:"profileIn 0.2s ease",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          background:`linear-gradient(135deg, #0d1117 0%, #161b22 100%)`,
          borderBottom:`1px solid ${C.border}`,
          padding:"24px 24px 20px",
          position:"relative",
        }}>
          <button onClick={onClose} style={{
            position:"absolute", top:16, right:16,
            background:"transparent", border:`1px solid ${C.border}`,
            color:C.textMuted, cursor:"pointer", borderRadius:8,
            width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, lineHeight:1,
          }}>✕</button>

          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{
              width:52, height:52, borderRadius:14,
              background:`linear-gradient(135deg,${C.accentDim},${C.accent})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:22, fontWeight:900, color:"#000", flexShrink:0,
            }}>
              {player.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:C.text, letterSpacing:-0.5 }}>
                {player.name}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
                <EloBadge rating={player.elo_rating} />
                <span style={{ color:C.textFaint, fontSize:12 }}>ELO</span>
                <span style={{
                  background:C.accentGlow, color:C.accent,
                  border:`1px solid ${C.accentDim}`,
                  borderRadius:6, padding:"1px 8px", fontSize:11, fontWeight:700,
                }}>
                  {winPct}% WR
                </span>
              </div>
            </div>
          </div>
        </div>

        {loading ? <Spinner /> : (
          <div style={{ padding:"20px 24px" }}>
            {/* Stat grid */}
            <div style={{
              display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",
              gap:10, marginBottom:24,
            }}>
              <StatTile label="Matches"  value={profile.total_matches}  />
              <StatTile label="Wins"     value={profile.total_wins}     color={C.winText} />
              <StatTile label="Losses"   value={profile.total_losses}   color={C.lossText} />
              <StatTile label="Win %"    value={`${winPct}%`}           color={C.accent} />
              <StatTile label="Streak"   value={streak.label}           color={streak.color} />
              <StatTile label="Best Win" value={profile.longest_win_streak}  sub="streak" color={C.winText} />
              <StatTile label="Worst L"  value={profile.longest_loss_streak} sub="streak" color={C.lossText} />
              <StatTile label="Hi Break" value={profile.highestBreak ?? "—"} color={C.gold} sub="snooker" />
            </div>

            {/* Timeline */}
            <div>
              <div style={{
                fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:2, color:C.textFaint, marginBottom:10,
              }}>
                Last 10 Matches
              </div>
              {matches.length === 0 ? (
                <div style={{ color:C.textFaint, fontSize:13, padding:"12px 0" }}>No matches recorded.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {matches.map((m, i) => <MatchRow key={m.id} match={m} index={i} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes profileIn { from { opacity:0; transform:translateY(20px) scale(0.97) } to { opacity:1; transform:none } }
        @keyframes fadeSlide { from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:none } }
      `}</style>
    </div>
  );
};

// ── Player list row ───────────────────────────────────────────────────────────
const PlayerRow = ({ player, rank, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const winPct = pct(player.total_wins, player.total_matches);
  const streak = streakLabel(player.current_streak);

  return (
    <div
      onClick={() => onClick(player)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:"grid",
        gridTemplateColumns:"40px 1fr 90px 90px 90px 100px",
        alignItems:"center",
        gap:12,
        padding:"12px 16px",
        cursor:"pointer",
        background: hovered ? C.cardHover : "transparent",
        borderRadius:10,
        borderBottom:`1px solid ${C.border}`,
        transition:"background 0.15s ease",
      }}
    >
      {/* Rank */}
      <span style={{
        fontSize:12, fontWeight:700, color: rank <= 3 ? C.gold : C.textFaint,
        fontFamily:"'Courier New',monospace",
      }}>
        #{rank}
      </span>

      {/* Name */}
      <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
        <div style={{
          width:32, height:32, borderRadius:9,
          background:`linear-gradient(135deg,${C.accentDim},${C.accent})`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:13, fontWeight:900, color:"#000", flexShrink:0,
        }}>
          {player.name?.[0]?.toUpperCase()}
        </div>
        <span style={{
          fontSize:14, fontWeight:600, color: hovered ? C.accent : C.text,
          transition:"color 0.15s", whiteSpace:"nowrap",
          overflow:"hidden", textOverflow:"ellipsis",
        }}>
          {player.name}
        </span>
      </div>

      {/* ELO */}
      <div style={{ textAlign:"right" }}>
        <EloBadge rating={player.elo_rating} />
      </div>

      {/* W / L */}
      <div style={{ textAlign:"center", fontSize:13, color:C.textMuted, fontFamily:"'Courier New',monospace" }}>
        <span style={{ color:C.winText }}>{player.total_wins}</span>
        <span style={{ color:C.textFaint }}> / </span>
        <span style={{ color:C.lossText }}>{player.total_losses}</span>
      </div>

      {/* Streak */}
      <div style={{ textAlign:"center" }}>
        <span style={{
          fontSize:12, fontWeight:700, color:streak.color,
          fontFamily:"'Courier New',monospace",
        }}>
          {streak.label}
        </span>
      </div>

      {/* Win % bar */}
      <div>
        <WinBar wins={player.total_wins} total={player.total_matches} width={72} />
      </div>
    </div>
  );
};

// ── Column header ─────────────────────────────────────────────────────────────
const ColHeader = ({ children, style }) => (
  <span style={{
    fontSize:10, fontWeight:700, textTransform:"uppercase",
    letterSpacing:1.5, color:C.textFaint, ...style,
  }}>
    {children}
  </span>
);

// ── Main Players component ────────────────────────────────────────────────────
export default function Players() {
  const [players,       setPlayers]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Fetch players ordered by ELO desc
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("players")
        .select("id, name, elo_rating, total_matches, total_wins, total_losses, current_streak, longest_win_streak, longest_loss_streak")
        .order("elo_rating", { ascending: false });

      if (error) setError(error.message);
      else setPlayers(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = players.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      minHeight:"100vh",
      background:C.bg,
      fontFamily:"'Segoe UI', system-ui, sans-serif",
      color:C.text,
    }}>
      {/* Top bar */}
      <div style={{
        borderBottom:`1px solid ${C.border}`,
        background:C.surface,
        padding:"20px 24px",
        display:"flex", flexDirection:"column", gap:16,
      }}>
        {/* Title row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:38, height:38, borderRadius:10,
              background:`linear-gradient(135deg,${C.accentDim},${C.accent})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:20,
            }}>🎱</div>
            <div>
              <div style={{ fontSize:20, fontWeight:800, letterSpacing:-0.5, color:C.text }}>
                Pool Buzz
              </div>
              <div style={{ fontSize:11, color:C.textFaint, letterSpacing:1, textTransform:"uppercase" }}>
                Player Rankings
              </div>
            </div>
          </div>

          {/* Player count */}
          {!loading && (
            <div style={{
              background:C.card, border:`1px solid ${C.border}`,
              borderRadius:10, padding:"8px 16px",
              display:"flex", flexDirection:"column", alignItems:"center",
            }}>
              <span style={{ fontSize:20, fontWeight:800, color:C.accent, fontFamily:"'Courier New',monospace", lineHeight:1 }}>
                {players.length}
              </span>
              <span style={{ fontSize:10, color:C.textFaint, textTransform:"uppercase", letterSpacing:1 }}>
                Players
              </span>
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ position:"relative", maxWidth:360 }}>
          <span style={{
            position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
            color:C.textFaint, fontSize:14, pointerEvents:"none",
          }}>🔍</span>
          <input
            type="text"
            placeholder="Search players…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width:"100%", boxSizing:"border-box",
              background:C.card, border:`1px solid ${C.border}`,
              borderRadius:10, padding:"9px 14px 9px 36px",
              color:C.text, fontSize:14, outline:"none",
              transition:"border-color 0.15s",
            }}
            onFocus={e  => e.target.style.borderColor = C.accent}
            onBlur={e   => e.target.style.borderColor = C.border}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
              background:"transparent", border:"none", color:C.textFaint,
              cursor:"pointer", fontSize:14, lineHeight:1, padding:2,
            }}>✕</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ padding:"16px 24px" }}>
        {/* Column headers */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"40px 1fr 90px 90px 90px 100px",
          gap:12, padding:"6px 16px 8px",
          borderBottom:`1px solid ${C.border}`,
          marginBottom:4,
        }}>
          <ColHeader>#</ColHeader>
          <ColHeader>Player</ColHeader>
          <ColHeader style={{ textAlign:"right" }}>ELO</ColHeader>
          <ColHeader style={{ textAlign:"center" }}>W / L</ColHeader>
          <ColHeader style={{ textAlign:"center" }}>Streak</ColHeader>
          <ColHeader>Win %</ColHeader>
        </div>

        {/* States */}
        {loading && <Spinner />}

        {error && (
          <div style={{
            margin:"24px 0", padding:"14px 18px",
            background:"rgba(248,81,73,0.1)", border:`1px solid ${C.red}`,
            borderRadius:10, color:C.red, fontSize:13,
          }}>
            ⚠ {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 0", color:C.textFaint, fontSize:14 }}>
            {search ? `No players matching "${search}"` : "No players found."}
          </div>
        )}

        {!loading && !error && filtered.map((p, i) => (
          <PlayerRow
            key={p.id}
            player={p}
            rank={players.indexOf(p) + 1}
            onClick={setSelectedPlayer}
          />
        ))}
      </div>

      {/* Profile modal */}
      {selectedPlayer && (
        <PlayerProfile
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
