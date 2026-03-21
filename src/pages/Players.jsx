import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase.js";
import { useAuth } from "../context/AuthContext";

const REFRESH_INTERVAL = 30000;

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg:        "#0D0F14",
  surface:   "#111418",
  card:      "#161b22",
  border:    "rgba(255,255,255,0.07)",
  borderHi:  "rgba(255,255,255,0.13)",
  green:     "#3DDC84",
  greenGlow: "rgba(61,220,132,0.15)",
  greenDim:  "#00A854",
  red:       "#FF5A5A",
  gold:      "#FFC53D",
  silver:    "#B4BCC8",
  bronze:    "#CD7F4E",
  text:      "#E8ECF0",
  textSec:   "#8892a4",
  textMuted: "#555E6B",
  textFaint: "#3a4450",
  winText:   "#3DDC84",
  winBg:     "rgba(61,220,132,0.10)",
  lossText:  "#FF5A5A",
  lossBg:    "rgba(255,90,90,0.10)",
};

const MEDAL = {
  0: { bg: "rgba(255,197,61,0.12)",  border: "rgba(255,197,61,0.45)",  text: "#FFC53D", emoji: "🥇" },
  1: { bg: "rgba(180,188,200,0.10)", border: "rgba(180,188,200,0.40)", text: "#B4BCC8", emoji: "🥈" },
  2: { bg: "rgba(186,120,76,0.10)",  border: "rgba(186,120,76,0.40)",  text: "#CD7F4E", emoji: "🥉" },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const winPct = (w, t) => (!t ? "—" : (w / t * 100).toFixed(1) + "%");
const winPctColor = p => {
  if (p === "—") return T.textMuted;
  const n = parseFloat(p);
  return n >= 60 ? T.winText : n >= 40 ? "#CDD4DC" : T.lossText;
};
const streakFmt = s => {
  if (!s) return { label: "—", color: T.textMuted };
  return s > 0 ? { label: `W${s}`, color: T.winText } : { label: `L${Math.abs(s)}`, color: T.lossText };
};
const eloColor = v => v > 0 ? T.winText : v < 0 ? T.lossText : T.textMuted;
const pad2 = n => String(n).padStart(2, "0");
const fmtDate = iso => { const d = new Date(iso); return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${String(d.getFullYear()).slice(2)}`; };
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString(); };
const monthLabel = () => new Date().toLocaleString("default", { month: "long", year: "numeric" });

// ─── LOADING DOTS ─────────────────────────────────────────────────────────────
function LoadingDots() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"72px 24px", gap:"16px" }}>
      <div style={{ display:"flex", gap:"6px" }}>
        {[0,1,2].map(i => <span key={i} style={{ width:8, height:8, borderRadius:"50%", background:T.green, display:"inline-block", animation:`dot-bounce 1.2s ease-in-out ${i*0.16}s infinite` }}/>)}
      </div>
      <span style={{ fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em" }}>LOADING</span>
    </div>
  );
}

// ─── STREAK CHIP ──────────────────────────────────────────────────────────────
function StreakChip({ streak }) {
  const { label, color } = streakFmt(streak);
  return (
    <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:"4px", fontSize:"11px", fontWeight:"700", letterSpacing:"0.04em", background: streak > 0 ? T.winBg : streak < 0 ? T.lossBg : "transparent", color }}>
      {label}
    </span>
  );
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36, fontSize = 14 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:Math.round(size*0.25), flexShrink:0, userSelect:"none", background:`linear-gradient(135deg,${T.greenDim},${T.green})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize, fontWeight:900, color:"#000" }}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ─── STAT TILE ────────────────────────────────────────────────────────────────
function StatTile({ label, value, color, sub }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"13px 15px", display:"flex", flexDirection:"column", gap:3 }}>
      <span style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.12em" }}>{label}</span>
      <span style={{ fontSize:21, fontWeight:800, color:color||T.text, fontFamily:"'Courier New',monospace", lineHeight:1.1 }}>{value ?? "—"}</span>
      {sub && <span style={{ fontSize:10, color:T.textFaint }}>{sub}</span>}
    </div>
  );
}

// ─── MATCH ROW ────────────────────────────────────────────────────────────────
function MatchRow({ match, index }) {
  const isWin = match.is_winner;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"30px 1fr auto", gap:10, alignItems:"center", padding:"11px 14px", background:index%2===0?T.surface:"transparent", borderRadius:8, borderLeft:`3px solid ${isWin?T.winText:T.lossText}`, animation:"plFadeSlide 0.2s ease both", animationDelay:`${index*25}ms` }}>
      <div style={{ width:26, height:26, borderRadius:6, flexShrink:0, background:isWin?T.winBg:T.lossBg, color:isWin?T.winText:T.lossText, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:11 }}>
        {isWin ? "W" : "L"}
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:T.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          vs {match.opponent_name || "Unknown"}
        </div>
        <div style={{ fontSize:10, color:T.textMuted, marginTop:2 }}>
          {match.game_type?.toUpperCase()} · {fmtDate(match.played_at)}
        </div>
      </div>
      <span style={{ fontSize:12, fontWeight:700, color:eloColor(match.elo_change), fontFamily:"'Courier New',monospace", whiteSpace:"nowrap", flexShrink:0 }}>
        {match.elo_change > 0 ? "+" : ""}{match.elo_change ?? "—"}
      </span>
    </div>
  );
}

// ─── H2H ROW ──────────────────────────────────────────────────────────────────
function H2HRow({ name, wins, losses, index }) {
  const total = wins + losses;
  const p = total > 0 ? ((wins / total) * 100).toFixed(0) : 0;
  const dom = wins > losses;
  const even = wins === losses;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:12, alignItems:"center", padding:"10px 14px", background:index%2===0?T.surface:"transparent", borderRadius:8 }}>
      <span style={{ fontSize:13, fontWeight:600, color:T.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{name}</span>
      <span style={{ fontSize:12, color:T.textSec, fontFamily:"'Courier New',monospace", whiteSpace:"nowrap" }}>
        <span style={{ color:T.winText }}>{wins}W</span>{" / "}<span style={{ color:T.lossText }}>{losses}L</span>
      </span>
      <span style={{ fontSize:11, fontWeight:800, padding:"2px 8px", borderRadius:5, background:dom?T.winBg:even?"rgba(255,255,255,0.05)":T.lossBg, color:dom?T.winText:even?T.textMuted:T.lossText, whiteSpace:"nowrap" }}>
        {p}%
      </span>
    </div>
  );
}

// ─── PLAYER PROFILE OVERLAY ───────────────────────────────────────────────────
function PlayerProfile({ player, onClose }) {
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [h2h,     setH2h]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      const { data: breakData } = await supabase
        .from("match_players")
        .select("highest_break, matches!inner(game_type)")
        .eq("player_id", player.id).eq("is_winner", true).eq("matches.game_type", "snooker")
        .order("highest_break", { ascending:false }).limit(1);
      const highestBreak = breakData?.[0]?.highest_break ?? null;

      const { data: mpData } = await supabase
        .from("match_players")
        .select(`id, match_id, is_winner, elo_change, matches!inner(id, game_type, played_at)`)
        .eq("player_id", player.id)
        .order("matches(played_at)", { ascending:false }).limit(10);

      const enriched = [];
      if (mpData) {
        await Promise.all(mpData.map(async mp => {
          const { data: opps } = await supabase.from("match_players").select("players!inner(name)").eq("match_id", mp.match_id).neq("player_id", player.id).limit(1);
          enriched.push({ ...mp, opponent_name:opps?.[0]?.players?.name ?? "Unknown", game_type:mp.matches?.game_type, played_at:mp.matches?.played_at });
        }));
        enriched.sort((a, b) => new Date(b.played_at) - new Date(a.played_at));
      }

      const { data: allMp } = await supabase.from("match_players").select(`match_id, is_winner, matches!inner(id)`).eq("player_id", player.id);
      const h2hMap = {};
      if (allMp) {
        await Promise.all(allMp.map(async mp => {
          const { data: opps } = await supabase.from("match_players").select("player_id, players!inner(name)").eq("match_id", mp.match_id).neq("player_id", player.id).limit(1);
          const opp = opps?.[0];
          if (!opp) return;
          if (!h2hMap[opp.player_id]) h2hMap[opp.player_id] = { name:opp.players.name, wins:0, losses:0 };
          if (mp.is_winner) h2hMap[opp.player_id].wins++;
          else              h2hMap[opp.player_id].losses++;
        }));
      }
      const h2hSorted = Object.values(h2hMap).sort((a, b) => (b.wins+b.losses) - (a.wins+a.losses));

      if (!cancelled) {
        setProfile({ ...player, highestBreak });
        setMatches(enriched);
        setH2h(h2hSorted);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [player.id]);

  const wp     = player.total_matches > 0 ? ((player.total_wins/player.total_matches)*100).toFixed(1)+"%" : "0.0%";
  const streak = streakFmt(player.current_streak);
  const favourite  = h2h.length ? [...h2h].sort((a,b) => b.wins-a.wins)[0]    : null;
  const nemesis    = h2h.length ? [...h2h].sort((a,b) => b.losses-a.losses)[0] : null;
  const mostPlayed = h2h.length ? h2h[0] : null;

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-start", justifyContent:"center", overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
      <div className="profile-panel" onClick={e => e.stopPropagation()} style={{ background:T.card, width:"100%", maxWidth:620, margin:"40px auto", borderRadius:16, border:`1px solid ${T.borderHi}`, overflow:"hidden", boxShadow:"0 24px 80px rgba(0,0,0,0.7)", animation:"plProfileIn 0.22s ease" }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,#0d1117,${T.card})`, borderBottom:`1px solid ${T.border}`, padding:"20px 20px 18px", position:"relative" }}>
          <button onClick={onClose} style={{ position:"absolute", top:14, right:14, background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, cursor:"pointer", borderRadius:8, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, lineHeight:1, zIndex:1 }}>✕</button>
          <div style={{ display:"flex", alignItems:"center", gap:14, paddingRight:44 }}>
            <Avatar name={player.name} size={52} fontSize={22} />
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:20, fontWeight:800, color:T.text, letterSpacing:"-0.3px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{player.name}</div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4, flexWrap:"wrap" }}>
                <span style={{ fontSize:15, fontWeight:800, color:T.green, fontFamily:"'Courier New',monospace" }}>{player.elo_rating}</span>
                <span style={{ fontSize:11, color:T.textMuted }}>ELO</span>
                <span style={{ background:T.winBg, color:T.winText, border:`1px solid rgba(61,220,132,0.3)`, borderRadius:6, padding:"1px 8px", fontSize:11, fontWeight:700 }}>{wp} WR</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:"20px 20px 32px" }}>
          {loading ? <LoadingDots /> : (<>

            <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.14em", color:T.textMuted, marginBottom:10 }}>Overall Stats</div>
            <div className="stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:24 }}>
              <StatTile label="Matches"    value={profile.total_matches}                               />
              <StatTile label="Wins"       value={profile.total_wins}        color={T.winText}         />
              <StatTile label="Losses"     value={profile.total_losses}      color={T.lossText}        />
              <StatTile label="Win %"      value={wp}                        color={T.green}           />
              <StatTile label="Streak"     value={streak.label}              color={streak.color}      />
              <StatTile label="Best W run" value={profile.longest_win_streak}  color={T.winText}  sub="wins"    />
              <StatTile label="Best L run" value={profile.longest_loss_streak} color={T.lossText} sub="losses"  />
              <StatTile label="Hi Break"   value={profile.highestBreak ?? "—"} color={T.gold}     sub="snooker" />
            </div>

            {h2h.length > 0 && (<>
              <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.14em", color:T.textMuted, marginBottom:10 }}>Player Insights</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10, marginBottom:24 }}>
                {favourite?.wins > 0 && (
                  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Favourite victim</div>
                    <div style={{ fontSize:14, fontWeight:700, color:T.winText, marginBottom:2 }}>{favourite.name}</div>
                    <div style={{ fontSize:11, color:T.textFaint }}>{favourite.wins} wins against</div>
                  </div>
                )}
                {nemesis?.losses > 0 && (
                  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Nemesis</div>
                    <div style={{ fontSize:14, fontWeight:700, color:T.lossText, marginBottom:2 }}>{nemesis.name}</div>
                    <div style={{ fontSize:11, color:T.textFaint }}>{nemesis.losses} losses to</div>
                  </div>
                )}
                {mostPlayed && (
                  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Most played</div>
                    <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:2 }}>{mostPlayed.name}</div>
                    <div style={{ fontSize:11, color:T.textFaint }}>{mostPlayed.wins+mostPlayed.losses} matches</div>
                  </div>
                )}
              </div>

              <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.14em", color:T.textMuted, marginBottom:10 }}>Head-to-Head</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:24 }}>
                {h2h.map((row, i) => <H2HRow key={row.name} name={row.name} wins={row.wins} losses={row.losses} index={i} />)}
              </div>
            </>)}

            <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.14em", color:T.textMuted, marginBottom:10 }}>Last 10 Matches</div>
            {matches.length === 0
              ? <div style={{ color:T.textMuted, fontSize:13, padding:"12px 0" }}>No matches recorded yet.</div>
              : <div style={{ display:"flex", flexDirection:"column", gap:4 }}>{matches.map((m,i) => <MatchRow key={m.id} match={m} index={i} />)}</div>
            }
          </>)}
        </div>
      </div>
    </div>
  );
}

// ─── POOL TABLE (desktop) ─────────────────────────────────────────────────────
function PoolTable({ players, period, onRowClick }) {
  const cols = period === "all"
    ? ["#","Player","ELO","W","L","Win %","Streak"]
    : ["#","Player","W","L","Win %"];
  return (
    <div style={{ borderRadius:"12px", border:`1px solid ${T.border}`, overflow:"hidden", background:"rgba(255,255,255,0.02)" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead style={{ background:"rgba(255,255,255,0.03)", borderBottom:`1px solid ${T.border}` }}>
          <tr>{cols.map((h,i) => <th key={h} style={{ padding:"12px 16px", fontSize:"10px", fontWeight:"700", letterSpacing:"0.14em", textTransform:"uppercase", color:T.textMuted, textAlign:i<=1?"left":"right", whiteSpace:"nowrap", width:i===0?"52px":undefined }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {players.map((p, idx) => {
            const wins   = period==="month" ? (p.month_wins??0)   : (p.total_wins??0);
            const losses = period==="month" ? (p.month_losses??0) : (p.total_losses??0);
            const pct    = winPct(wins, wins+losses);
            const isMedal = idx < 3;
            return (
              <tr key={p.id} onClick={() => onRowClick(p)} style={{ cursor:"pointer", background:isMedal?MEDAL[idx].bg:idx%2===0?"transparent":"rgba(255,255,255,0.012)", borderLeft:`2px solid ${isMedal?MEDAL[idx].border:"transparent"}`, borderBottom:`1px solid rgba(255,255,255,0.04)`, transition:"background 0.15s ease" }}>
                <td style={{ padding:"14px 16px", textAlign:"center", verticalAlign:"middle" }}>
                  <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:"28px", height:"28px", borderRadius:"6px", fontSize:isMedal?"16px":"12px", fontWeight:"700", background:isMedal?"transparent":"rgba(255,255,255,0.05)", color:isMedal?MEDAL[idx].text:T.textMuted }}>
                    {isMedal ? MEDAL[idx].emoji : idx+1}
                  </span>
                </td>
                <td style={{ padding:"14px 16px", verticalAlign:"middle" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <Avatar name={p.name} size={28} fontSize={11} />
                    <span style={{ fontSize:"14px", fontWeight:isMedal?"700":"500", color:isMedal?MEDAL[idx].text:T.text }}>{p.name}</span>
                  </div>
                </td>
                {period==="all" && <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle" }}><span style={{ fontWeight:"700", fontSize:"14px", color:isMedal?MEDAL[idx].text:T.green, fontVariantNumeric:"tabular-nums" }}>{p.elo_rating??"—"}</span></td>}
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle", fontVariantNumeric:"tabular-nums", fontSize:"13px", color:"#CDD4DC" }}>{wins}</td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle", fontVariantNumeric:"tabular-nums", fontSize:"13px", color:"#CDD4DC" }}>{losses}</td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle" }}><span style={{ color:winPctColor(pct), fontWeight:"600", fontVariantNumeric:"tabular-nums", fontSize:"13px" }}>{pct}</span></td>
                {period==="all" && <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle" }}><StreakChip streak={p.current_streak} /></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── POOL CARD (mobile) ───────────────────────────────────────────────────────
function PoolCard({ player, idx, period, onClick }) {
  const isMedal = idx < 3;
  const wins    = period==="month" ? (player.month_wins??0)   : (player.total_wins??0);
  const losses  = period==="month" ? (player.month_losses??0) : (player.total_losses??0);
  const pct     = winPct(wins, wins+losses);
  const streak  = streakFmt(player.current_streak);
  return (
    <div onClick={() => onClick(player)} className="lb-card" style={{ background:isMedal?MEDAL[idx].bg:"rgba(255,255,255,0.02)", borderLeft:`3px solid ${isMedal?MEDAL[idx].border:"rgba(255,255,255,0.06)"}`, borderTop:`1px solid rgba(255,255,255,0.06)`, borderRight:`1px solid rgba(255,255,255,0.06)`, borderBottom:`1px solid rgba(255,255,255,0.06)`, borderRadius:"12px", padding:"14px 16px", display:"flex", alignItems:"center", gap:"12px", cursor:"pointer" }}>
      <div style={{ flexShrink:0, width:"32px", height:"32px", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", background:isMedal?"transparent":"rgba(255,255,255,0.05)", fontSize:isMedal?"20px":"13px", fontWeight:"800", color:isMedal?MEDAL[idx].text:T.textMuted }}>
        {isMedal ? MEDAL[idx].emoji : idx+1}
      </div>
      <Avatar name={player.name} size={36} fontSize={14} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:"14px", fontWeight:isMedal?"700":"600", color:isMedal?MEDAL[idx].text:T.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:"3px" }}>{player.name}</div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
          <span style={{ fontSize:"11px", color:T.textMuted }}><span style={{ color:T.winText, fontWeight:"700" }}>{wins}W</span>{" "}<span style={{ color:T.lossText, fontWeight:"700" }}>{losses}L</span></span>
          <span style={{ fontSize:"11px", color:winPctColor(pct), fontWeight:"600" }}>{pct}</span>
          {period==="all" && <StreakChip streak={player.current_streak} />}
        </div>
      </div>
      <div style={{ flexShrink:0, textAlign:"right" }}>
        <div style={{ fontSize:"17px", fontWeight:"800", color:isMedal?MEDAL[idx].text:T.green, fontVariantNumeric:"tabular-nums" }}>{period==="all" ? (player.elo_rating??"—") : wins}</div>
        <div style={{ fontSize:"9px", color:T.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginTop:"1px" }}>{period==="all" ? "ELO" : "WINS"}</div>
      </div>
      <span style={{ color:T.textMuted, fontSize:14, flexShrink:0 }}>›</span>
    </div>
  );
}

// ─── SNOOKER TABLE (desktop) ──────────────────────────────────────────────────
function SnookerTable({ rows, onRowClick }) {
  return (
    <div style={{ borderRadius:"12px", border:`1px solid ${T.border}`, overflow:"hidden", background:"rgba(255,255,255,0.02)" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead style={{ background:"rgba(255,255,255,0.03)", borderBottom:`1px solid ${T.border}` }}>
          <tr>{["#","Player","Played","Wins","Win %","Hi Break"].map((h,i) => <th key={h} style={{ padding:"12px 16px", fontSize:"10px", fontWeight:"700", letterSpacing:"0.14em", textTransform:"uppercase", color:T.textMuted, textAlign:i<=1?"left":"right", whiteSpace:"nowrap", width:i===0?"52px":undefined }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const pct = winPct(row.wins, row.played);
            const isMedal = idx < 3;
            return (
              <tr key={row.player_id} onClick={() => row.playerObj && onRowClick(row.playerObj)} style={{ cursor:row.playerObj?"pointer":"default", background:isMedal?MEDAL[idx].bg:idx%2===0?"transparent":"rgba(255,255,255,0.012)", borderLeft:`2px solid ${isMedal?MEDAL[idx].border:"transparent"}`, borderBottom:`1px solid rgba(255,255,255,0.04)`, transition:"background 0.15s ease" }}>
                <td style={{ padding:"14px 16px", textAlign:"center", verticalAlign:"middle" }}><span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:"28px", height:"28px", borderRadius:"6px", fontSize:isMedal?"16px":"12px", fontWeight:"700", background:isMedal?"transparent":"rgba(255,255,255,0.05)", color:isMedal?MEDAL[idx].text:T.textMuted }}>{isMedal?MEDAL[idx].emoji:idx+1}</span></td>
                <td style={{ padding:"14px 16px", verticalAlign:"middle" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <Avatar name={row.name} size={28} fontSize={11} />
                    <span style={{ fontSize:"14px", fontWeight:isMedal?"700":"500", color:isMedal?MEDAL[idx].text:T.text }}>{row.name}</span>
                  </div>
                </td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle", fontVariantNumeric:"tabular-nums", fontSize:"13px", color:"#CDD4DC" }}>{row.played}</td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle", fontVariantNumeric:"tabular-nums", fontSize:"13px", color:"#CDD4DC" }}>{row.wins}</td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle" }}><span style={{ color:winPctColor(pct), fontWeight:"600", fontVariantNumeric:"tabular-nums", fontSize:"13px" }}>{pct}</span></td>
                <td style={{ padding:"14px 16px", textAlign:"right", verticalAlign:"middle" }}>{row.highest_break!=null?<span style={{ fontWeight:"700", color:T.gold, fontVariantNumeric:"tabular-nums", fontSize:"13px" }}>{row.highest_break}</span>:<span style={{ color:T.textMuted }}>—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── SNOOKER CARD (mobile) ────────────────────────────────────────────────────
function SnookerCard({ row, idx, onClick }) {
  const isMedal = idx < 3;
  const pct = winPct(row.wins, row.played);
  return (
    <div onClick={() => row.playerObj && onClick(row.playerObj)} className="lb-card" style={{ background:isMedal?MEDAL[idx].bg:"rgba(255,255,255,0.02)", borderLeft:`3px solid ${isMedal?MEDAL[idx].border:"rgba(255,255,255,0.06)"}`, borderTop:`1px solid rgba(255,255,255,0.06)`, borderRight:`1px solid rgba(255,255,255,0.06)`, borderBottom:`1px solid rgba(255,255,255,0.06)`, borderRadius:"12px", padding:"14px 16px", display:"flex", alignItems:"center", gap:"12px", cursor:row.playerObj?"pointer":"default" }}>
      <div style={{ flexShrink:0, width:"32px", height:"32px", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", background:isMedal?"transparent":"rgba(255,255,255,0.05)", fontSize:isMedal?"20px":"13px", fontWeight:"800", color:isMedal?MEDAL[idx].text:T.textMuted }}>{isMedal?MEDAL[idx].emoji:idx+1}</div>
      <Avatar name={row.name} size={36} fontSize={14} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:"14px", fontWeight:isMedal?"700":"600", color:isMedal?MEDAL[idx].text:T.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:"3px" }}>{row.name}</div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
          <span style={{ fontSize:"11px", color:T.textMuted }}><span style={{ color:T.winText, fontWeight:"700" }}>{row.wins}W</span>{" / "}{row.played} played</span>
          <span style={{ fontSize:"11px", color:winPctColor(pct), fontWeight:"600" }}>{pct}</span>
          {row.highest_break!=null && <span style={{ fontSize:"11px", color:T.gold, fontWeight:"700" }}>🎱 {row.highest_break}</span>}
        </div>
      </div>
      {row.playerObj && <span style={{ color:T.textMuted, fontSize:14, flexShrink:0 }}>›</span>}
    </div>
  );
}

// ─── PERIOD TOGGLE ────────────────────────────────────────────────────────────
function PeriodToggle({ value, onChange }) {
  return (
    <div style={{ display:"inline-flex", gap:3, marginBottom:20, background:"rgba(255,255,255,0.03)", border:`1px solid ${T.border}`, borderRadius:8, padding:3 }}>
      {[{ key:"all", label:"All Time" }, { key:"month", label:monthLabel() }].map(({ key, label }) => {
        const active = value === key;
        return (
          <button key={key} onClick={() => onChange(key)} style={{ padding:"7px 16px", borderRadius:6, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:"11px", fontWeight:"700", letterSpacing:"0.08em", textTransform:"uppercase", transition:"all 0.18s ease", background:active?"#3DDC84":"transparent", color:active?"#0D0F14":T.textMuted, boxShadow:active?"0 2px 10px rgba(61,220,132,0.2)":"none" }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Players() {
  const [tab,    setTab]    = useState("pool");
  const [period, setPeriod] = useState("all");

  const [poolPlayers,    setPoolPlayers]    = useState([]);
  const [poolLoading,    setPoolLoading]    = useState(true);
  const [poolError,      setPoolError]      = useState(null);

  const [snookerRows,    setSnookerRows]    = useState([]);
  const [snookerLoading, setSnookerLoading] = useState(true);
  const [snookerError,   setSnookerError]   = useState(null);

  // All players map — used to resolve playerObj for profile tapping in snooker tab
  const [allPlayers, setAllPlayers] = useState({});

  const [lastUpdated,    setLastUpdated]    = useState(null);
  const [countdown,      setCountdown]      = useState(30);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const { group } = useAuth();
  const groupId   = group?.id;

  const fetchPool = useCallback(async () => {
    try {
      const { data: playerData, error: pErr } = await supabase
        .from("players")
        .select("id, name, elo_rating, total_wins, total_losses, total_matches, current_streak, longest_win_streak, longest_loss_streak")
        .eq("group_id", groupId)
        .order("elo_rating", { ascending:false });
      if (pErr) throw pErr;

      const { data: monthData } = await supabase
        .from("match_players")
        .select(`player_id, is_winner, matches!inner(game_type, played_at)`)
        .eq("group_id", groupId)
        .eq("matches.game_type", "Pool")
        .gte("matches.played_at", monthStart());

      const monthMap = {};
      for (const row of monthData || []) {
        if (!monthMap[row.player_id]) monthMap[row.player_id] = { wins:0, losses:0 };
        if (row.is_winner) monthMap[row.player_id].wins++;
        else               monthMap[row.player_id].losses++;
      }

      const merged = (playerData || []).map(p => ({ ...p, month_wins:monthMap[p.id]?.wins??0, month_losses:monthMap[p.id]?.losses??0 }));
      setPoolPlayers(merged);

      // Build allPlayers map for profile lookup
      const map = {};
      for (const p of playerData || []) map[p.id] = p;
      setAllPlayers(map);
      setPoolError(null);
    } catch (e) {
      setPoolError(e.message || "Failed to load pool rankings.");
    } finally {
      setPoolLoading(false);
    }
  }, [groupId]);

  const fetchSnooker = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("match_players")
        .select(`player_id, is_winner, highest_break, players!inner(name), matches!inner(game_type)`)
        .eq("group_id", groupId)
        .eq("matches.game_type", "snooker");
      if (error) throw error;

      const map = {};
      for (const row of data || []) {
        const pid = row.player_id;
        if (!map[pid]) map[pid] = { player_id:pid, name:row.players.name, played:0, wins:0, highest_break:null };
        map[pid].played += 1;
        if (row.is_winner) map[pid].wins += 1;
        if (row.highest_break != null) map[pid].highest_break = Math.max(map[pid].highest_break??0, row.highest_break);
      }

      const sorted = Object.values(map).sort((a, b) => {
        const pA = a.played?a.wins/a.played:0, pB = b.played?b.wins/b.played:0;
        if (pB!==pA) return pB-pA;
        if (b.wins!==a.wins) return b.wins-a.wins;
        if (b.played!==a.played) return b.played-a.played;
        return a.name.localeCompare(b.name);
      });

      setSnookerRows(sorted);
      setSnookerError(null);
    } catch (e) {
      setSnookerError(e.message || "Failed to load snooker rankings.");
    } finally {
      setSnookerLoading(false);
    }
  }, [groupId]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchPool(), fetchSnooker()]);
    setLastUpdated(new Date());
    setCountdown(30);
  }, [fetchPool, fetchSnooker]);

  useEffect(() => {
    if (!groupId) return;
    refresh();
    const iv = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(iv);
  }, [refresh, groupId]);

  useEffect(() => {
    const tick = setInterval(() => setCountdown(c => c<=1?30:c-1), 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  // Sort pool players for "this month" view
  const displayPool = period === "month"
    ? [...poolPlayers].sort((a,b) => {
        const aw=a.month_wins??0, bw=b.month_wins??0;
        if (bw!==aw) return bw-aw;
        const ap=(a.month_wins??0)/((a.month_wins??0)+(a.month_losses??0)||1);
        const bp=(b.month_wins??0)/((b.month_wins??0)+(b.month_losses??0)||1);
        return bp-ap;
      })
    : poolPlayers;

  // Attach playerObj to snooker rows so profile can be opened
  const snookerWithObj = snookerRows.map(r => ({ ...r, playerObj: allPlayers[r.player_id] ?? null }));

  return (
    <div style={{ minHeight:"100vh", background:T.bg, backgroundImage:"radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,180,100,0.08) 0%, transparent 70%), repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.02) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.02) 40px)", fontFamily:"'DM Mono','Fira Mono','Courier New',monospace", color:T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap');
        @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes dot-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes plFadeSlide { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:none} }
        @keyframes plProfileIn { from{opacity:0;transform:translateY(14px) scale(0.98)} to{opacity:1;transform:none} }

        .lb-cards { display:none; } .lb-table { display:block; }
        .profile-panel { margin:40px auto !important; min-height:unset !important; border-radius:16px !important; max-height:calc(100vh - 80px); overflow-y:auto; }
        .stats-grid { grid-template-columns:repeat(4,1fr) !important; }
        tr:hover td { background:rgba(61,220,132,0.04) !important; }

        @media (max-width:599px) {
          .lb-cards { display:block; } .lb-table { display:none; }
          .stats-grid { grid-template-columns:repeat(2,1fr) !important; }
          .profile-panel { margin:0 !important; min-height:100dvh !important; min-height:100vh !important; max-height:none !important; border-radius:0 !important; border:none !important; overflow-y:auto; }
          .lb-page { padding:20px 14px 80px !important; }
          .lb-title { font-size:24px !important; }
          .lb-tabs { width:100% !important; }
          .lb-tab { flex:1; justify-content:center !important; }
          .lb-card:active { opacity:0.8; }
        }
      `}</style>

      {/* ── Page ── */}
      <div className="lb-page" style={{ maxWidth:"900px", margin:"0 auto", padding:"32px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom:"24px" }}>
          <h1 className="lb-title" style={{ fontSize:"clamp(24px,5vw,40px)", fontWeight:"800", letterSpacing:"-0.02em", lineHeight:1, color:T.text, margin:"0 0 12px" }}>
            <span style={{ color:T.green }}>/ </span>Players
          </h1>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"4px 10px", borderRadius:"20px", background:"rgba(61,220,132,0.08)", border:"1px solid rgba(61,220,132,0.2)", fontSize:"11px", color:T.green, letterSpacing:"0.06em" }}>
              <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:T.green, animation:"pulse 2s infinite" }}/>
              Live
            </span>
            {lastUpdated && (
              <span style={{ fontSize:"11px", color:T.textFaint, letterSpacing:"0.04em" }}>
                Refreshes in {countdown}s · {lastUpdated.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
              </span>
            )}
            {!poolLoading && poolPlayers.length > 0 && (
              <span style={{ fontSize:"11px", color:T.textFaint }}>{poolPlayers.length} players</span>
            )}
          </div>
        </div>

        {/* Game type tabs */}
        <div className="lb-tabs" style={{ display:"inline-flex", gap:"3px", marginBottom:"16px", background:"rgba(255,255,255,0.03)", border:`1px solid ${T.border}`, borderRadius:"10px", padding:"4px" }}>
          {[
            { key:"pool",    icon:"🎱", label:"Pool",    count:poolPlayers.length,  cl:poolLoading    },
            { key:"snooker", icon:"🔴", label:"Snooker", count:snookerRows.length,  cl:snookerLoading },
          ].map(({ key, icon, label, count, cl }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)} className="lb-tab" style={{ display:"inline-flex", alignItems:"center", justifyContent:"flex-start", gap:"7px", padding:"9px 20px", borderRadius:"7px", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:"12px", fontWeight:"700", letterSpacing:"0.1em", textTransform:"uppercase", transition:"all 0.18s ease", background:active?"#3DDC84":"transparent", color:active?"#0D0F14":T.textMuted, boxShadow:active?"0 2px 14px rgba(61,220,132,0.22)":"none" }}>
                <span style={{ fontSize:"14px" }}>{icon}</span>
                {label}
                {!cl && count > 0 && <span style={{ fontSize:"10px", fontWeight:"800", padding:"1px 6px", borderRadius:"20px", background:active?"rgba(0,0,0,0.15)":"rgba(255,255,255,0.06)", color:active?"rgba(0,0,0,0.55)":T.textFaint }}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Period toggle — Pool only */}
        {tab === "pool" && <PeriodToggle value={period} onChange={setPeriod} />}

        {/* Pool panel */}
        {tab === "pool" && (
          poolLoading ? <LoadingDots /> :
          poolError   ? <div style={{ textAlign:"center", padding:"60px 24px", color:T.lossText, fontSize:"14px" }}>⚠ {poolError}</div> :
          displayPool.length === 0 ? <div style={{ textAlign:"center", padding:"60px 24px", color:T.textMuted, fontSize:"14px" }}>No players yet. Record a match to get started.</div> :
          <>
            <div className="lb-cards">
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {displayPool.map((p,i) => <PoolCard key={p.id} player={p} idx={i} period={period} onClick={setSelectedPlayer} />)}
              </div>
            </div>
            <div className="lb-table">
              <PoolTable players={displayPool} period={period} onRowClick={setSelectedPlayer} />
            </div>
          </>
        )}

        {/* Snooker panel */}
        {tab === "snooker" && (
          snookerLoading ? <LoadingDots /> :
          snookerError   ? <div style={{ textAlign:"center", padding:"60px 24px", color:T.lossText, fontSize:"14px" }}>⚠ {snookerError}</div> :
          snookerWithObj.length === 0 ? (
            <div style={{ textAlign:"center", padding:"72px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:"16px" }}>
              <span style={{ fontSize:"48px", lineHeight:1, filter:"drop-shadow(0 0 18px rgba(255,80,80,0.35))" }}>🔴</span>
              <div>
                <div style={{ color:"#CDD4DC", fontWeight:"700", fontSize:"16px", marginBottom:"8px" }}>No snooker matches yet</div>
                <div style={{ color:T.textMuted, fontSize:"13px", lineHeight:1.6 }}>Record a snooker match to see rankings here.</div>
              </div>
            </div>
          ) : (
            <>
              <div className="lb-cards">
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {snookerWithObj.map((r,i) => <SnookerCard key={r.player_id} row={r} idx={i} onClick={setSelectedPlayer} />)}
                </div>
              </div>
              <div className="lb-table">
                <SnookerTable rows={snookerWithObj} onRowClick={setSelectedPlayer} />
              </div>
            </>
          )
        )}
      </div>

      {selectedPlayer && <PlayerProfile player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}
