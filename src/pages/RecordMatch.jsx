import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase.js";

// ─── ELO ────────────────────────────────────────────────────────────────────
function calcElo(ratingA, ratingB, aWon, K = 32) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const actualA = aWon ? 1 : 0;
  const actualB = aWon ? 0 : 1;
  return {
    newA: Math.round(ratingA + K * (actualA - expectedA)),
    newB: Math.round(ratingB + K * (actualB - expectedB)),
    changeA: Math.round(K * (actualA - expectedA)),
    changeB: Math.round(K * (actualB - expectedB)),
  };
}

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  bg:        "#0a0c10",
  surface:   "#111318",
  card:      "#161920",
  border:    "#1e2330",
  borderHi:  "#2a3045",
  green:     "#00e5a0",
  greenDim:  "#00c88a",
  greenGlow: "rgba(0,229,160,0.15)",
  red:       "#ff4d6d",
  redGlow:   "rgba(255,77,109,0.15)",
  gold:      "#ffd166",
  textPrim:  "#f0f4ff",
  textSec:   "#8892a4",
  textMuted: "#4a5568",
  radius:    "12px",
  radiusSm:  "8px",
};

// ─── TINY COMPONENTS ─────────────────────────────────────────────────────────
const Label = ({ children, style }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
    textTransform: "uppercase", color: T.textSec, marginBottom: 6, ...style
  }}>
    {children}
  </div>
);

const Input = ({ style, ...props }) => (
  <input
    style={{
      background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
      color: T.textPrim, padding: "10px 14px", fontSize: 14, width: "100%",
      outline: "none", boxSizing: "border-box", fontFamily: "inherit",
      transition: "border-color 0.2s",
      ...style,
    }}
    onFocus={e => (e.target.style.borderColor = T.green)}
    onBlur={e => (e.target.style.borderColor = T.border)}
    {...props}
  />
);

const Pill = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: "8px 20px", borderRadius: 999, border: "none", cursor: "pointer",
    fontFamily: "inherit", fontSize: 13, fontWeight: 600, letterSpacing: "0.04em",
    transition: "all 0.18s",
    background: active ? T.green : "transparent",
    color: active ? "#000" : T.textSec,
    outline: active ? `0` : `1px solid ${T.border}`,
  }}>
    {children}
  </button>
);

const Divider = () => (
  <div style={{ height: 1, background: T.border, margin: "24px 0" }} />
);

// ─── PLAYER SEARCH ───────────────────────────────────────────────────────────
function PlayerSearch({ label, value, onChange, exclude }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();
  const committingRef = useRef(false);

  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        committingRef.current = false;
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setOpen(true);
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("players")
        .select("id, name, elo_rating")
        .ilike("name", `%${query}%`)
        .limit(6);
      setResults(data || []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const select = (player) => {
    committingRef.current = false;
    onChange(player);
    setQuery(player.name);
    setOpen(false);
  };

  const addNew = async () => {
    const name = query.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from("players")
      .insert({
        name, elo_rating: 1200, total_matches: 0, total_wins: 0,
        total_losses: 0, current_streak: 0,
        longest_win_streak: 0, longest_loss_streak: 0,
      })
      .select()
      .single();
    if (!error && data) select(data);
  };

  const filtered = results.filter(r => !exclude || r.id !== exclude.id);
  const exactMatch = filtered.some(
    r => r.name.toLowerCase() === query.trim().toLowerCase()
  );
  const showAddButton = open && !value && !loading && query.trim() && !exactMatch;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Label>{label}</Label>
      <div style={{ position: "relative" }}>
        <Input
          placeholder="Search player name…"
          value={value ? value.name : query}
          onChange={e => {
            setQuery(e.target.value);
            if (value) onChange(null);
          }}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          onBlur={() => { if (!committingRef.current) setOpen(false); }}
        />
        {value && (
          <button
            onPointerDown={() => { onChange(null); setQuery(""); }}
            style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: T.textMuted, cursor: "pointer",
              fontSize: 18, lineHeight: 1, padding: 2,
            }}
          >×</button>
        )}
      </div>

      {open && !value && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: T.card, border: `1px solid ${T.borderHi}`,
          borderRadius: T.radiusSm, zIndex: 100, overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          {loading && (
            <div style={{ padding: "12px 14px", color: T.textMuted, fontSize: 13 }}>
              Searching…
            </div>
          )}
          {!loading && filtered.map(p => (
            <div
              key={p.id}
              onPointerDown={() => { committingRef.current = true; }}
              onClick={() => select(p)}
              style={{
                padding: "11px 14px", cursor: "pointer",
                borderBottom: `1px solid ${T.border}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = T.surface)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ color: T.textPrim, fontSize: 14 }}>{p.name}</span>
              <span style={{ color: T.textMuted, fontSize: 12 }}>ELO {p.elo_rating}</span>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: "10px 14px", color: T.textMuted, fontSize: 13 }}>
              No players found
            </div>
          )}
          {showAddButton && (
            <div
              onPointerDown={() => { committingRef.current = true; }}
              onClick={() => addNew()}
              style={{
                padding: "11px 14px", cursor: "pointer", color: T.green,
                fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8,
                borderTop: filtered.length > 0 ? `1px solid ${T.border}` : "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = T.greenGlow)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
              Add "{query.trim()}" as new player
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── POOL WIN BUTTONS ────────────────────────────────────────────────────────
function PoolWinButtons({ player1, player2, winner, onSelect }) {
  const buttons = [
    { key: "p1", label: player1 ? player1.name : "Player 1", color: T.green, glow: T.greenGlow },
    { key: "p2", label: player2 ? player2.name : "Player 2", color: T.red,   glow: T.redGlow   },
  ];

  return (
    <div>
      <Label>Winner</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {buttons.map(({ key, label, color, glow }) => {
          const active = winner === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(active ? null : key)}
              style={{
                padding: "20px 12px",
                borderRadius: T.radius,
                border: `2px solid ${active ? color : T.border}`,
                background: active ? glow : T.surface,
                color: active ? color : T.textSec,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: "0.02em",
                textAlign: "center",
                transition: "all 0.18s",
                boxShadow: active ? `0 0 20px ${glow}` : "none",
                lineHeight: 1.3,
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.borderColor = color;
                  e.currentTarget.style.color = color;
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.borderColor = T.border;
                  e.currentTarget.style.color = T.textSec;
                }
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 8 }}>
                {active ? "🏆" : "🎱"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                {label}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
                textTransform: "uppercase", opacity: 0.7, marginTop: 4,
              }}>
                Wins
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── RESULT CARD ─────────────────────────────────────────────────────────────
function ResultCard({ result, onReset }) {
  const { p1, p2, winner, score1, score2, gameType, highBreak1, highBreak2 } = result;

  const EloChip = ({ change }) => (
    <span style={{
      padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: change >= 0 ? "rgba(0,229,160,0.12)" : "rgba(255,77,109,0.12)",
      color: change >= 0 ? T.green : T.red,
    }}>
      {change >= 0 ? "+" : ""}{change}
    </span>
  );

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div style={{
        textAlign: "center", marginBottom: 24,
        padding: "20px 0 16px",
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ fontSize: 11, letterSpacing: "0.18em", color: T.green, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
          Match Recorded
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: T.textPrim, letterSpacing: "-0.02em" }}>
          {winner} wins
        </div>
        <div style={{ marginTop: 4, color: T.textSec, fontSize: 14 }}>
          {gameType}
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12,
        alignItems: "center", marginBottom: 20,
      }}>
        {[p1, p2].map((p, i) => {
          const isWinner = p.name === winner;
          const score = i === 0 ? score1 : score2;
          const change = i === 0 ? result.eloChange1 : result.eloChange2;
          const hb = i === 0 ? highBreak1 : highBreak2;
          return (
            <div key={p.id} style={{
              background: isWinner ? T.greenGlow : T.surface,
              border: `1px solid ${isWinner ? T.green : T.border}`,
              borderRadius: T.radius, padding: "16px 12px", textAlign: "center",
            }}>
              <div style={{ fontSize: 13, color: T.textSec, marginBottom: 4, fontWeight: 600 }}>{p.name}</div>
              <div style={{
                fontSize: 40, fontWeight: 900, lineHeight: 1,
                color: isWinner ? T.green : T.textPrim,
              }}>{score}</div>
              <div style={{ marginTop: 8 }}><EloChip change={change} /></div>
              {gameType === "Snooker" && hb !== "" && hb !== undefined && (
                <div style={{ marginTop: 8, fontSize: 11, color: T.gold, fontWeight: 600 }}>
                  🎱 Break {hb}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ textAlign: "center", color: T.textMuted, fontWeight: 800, fontSize: 18 }}>VS</div>
      </div>

      <div style={{
        background: T.surface, borderRadius: T.radiusSm, padding: "14px 16px",
        marginBottom: 24, fontSize: 13,
      }}>
        {[p1, p2].map((p, i) => {
          const before = i === 0 ? result.elo1Before : result.elo2Before;
          const after = i === 0 ? result.elo1After : result.elo2After;
          return (
            <div key={p.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "4px 0",
              borderBottom: i === 0 ? `1px solid ${T.border}` : "none",
              marginBottom: i === 0 ? 8 : 0, paddingBottom: i === 0 ? 8 : 0,
            }}>
              <span style={{ color: T.textSec }}>{p.name}</span>
              <span style={{ color: T.textPrim, fontVariantNumeric: "tabular-nums" }}>
                {before} <span style={{ color: T.textMuted }}>→</span> {after}
              </span>
            </div>
          );
        })}
      </div>

      <button onClick={onReset} style={{
        width: "100%", padding: "13px", borderRadius: T.radius,
        background: T.green, border: "none", color: "#000",
        fontWeight: 700, fontSize: 14, letterSpacing: "0.04em",
        cursor: "pointer", fontFamily: "inherit",
        transition: "opacity 0.2s",
      }}
        onMouseEnter={e => (e.target.style.opacity = 0.85)}
        onMouseLeave={e => (e.target.style.opacity = 1)}
      >
        Record Another Match
      </button>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function RecordMatch() {
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [gameType, setGameType] = useState("Pool");

  // Pool: track which player won ("p1" | "p2" | null)
  const [poolWinner, setPoolWinner] = useState(null);

  // Snooker: score inputs
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");

  // Snooker: highest break inputs
  const [highBreak1, setHighBreak1] = useState("");
  const [highBreak2, setHighBreak2] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Reset pool winner when game type changes
  const handleGameType = (type) => {
    setGameType(type);
    setPoolWinner(null);
    setScore1(""); setScore2("");
    setHighBreak1(""); setHighBreak2("");
    setError("");
  };

  const reset = () => {
    setPlayer1(null); setPlayer2(null);
    setPoolWinner(null);
    setScore1(""); setScore2("");
    setHighBreak1(""); setHighBreak2("");
    setGameType("Pool");
    setError(""); setResult(null);
  };

  const validate = () => {
    if (!player1 || !player2) return "Please select both players.";
    if (player1.id === player2.id) return "Players must be different.";

    if (gameType === "Pool") {
      if (!poolWinner) return "Please select a winner.";
    } else {
      const s1 = parseInt(score1), s2 = parseInt(score2);
      if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return "Enter valid scores.";
      if (s1 === s2) return "Match cannot end in a draw.";
    }
    return null;
  };

  const saveMatch = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(""); setSaving(true);

    try {
      // Resolve final scores & winner
      let s1, s2;
      if (gameType === "Pool") {
        s1 = poolWinner === "p1" ? 1 : 0;
        s2 = poolWinner === "p2" ? 1 : 0;
      } else {
        s1 = parseInt(score1);
        s2 = parseInt(score2);
      }

      const p1Won = s1 > s2;
      const elo = calcElo(player1.elo_rating, player2.elo_rating, p1Won);

      const matchPayload = {
        game_type: gameType,
        format: "race_to",
        race_to: 1,
        played_at: new Date().toISOString(),
        is_deleted: false,
      };
      const { data: match, error: matchErr } = await supabase.from("matches").insert(matchPayload).select().single();
      if (matchErr) throw matchErr;

      const mpRows = [
        {
          match_id: match.id, player_id: player1.id, score: s1,
          is_winner: p1Won, elo_before: player1.elo_rating,
          elo_after: elo.newA, elo_change: elo.changeA,
          ...(gameType === "Snooker" && highBreak1 !== "" ? { highest_break: parseInt(highBreak1) } : {}),
        },
        {
          match_id: match.id, player_id: player2.id, score: s2,
          is_winner: !p1Won, elo_before: player2.elo_rating,
          elo_after: elo.newB, elo_change: elo.changeB,
          ...(gameType === "Snooker" && highBreak2 !== "" ? { highest_break: parseInt(highBreak2) } : {}),
        },
      ];
      const { error: mpErr } = await supabase.from("match_players").insert(mpRows);
      if (mpErr) throw mpErr;

      const updatePlayer = async (player, won) => {
        const newElo = won ? elo.newA : elo.newB;
        const { data: fresh } = await supabase.from("players").select("*").eq("id", player.id).single();
        const p = fresh || player;
        const streak = won
          ? (p.current_streak >= 0 ? p.current_streak + 1 : 1)
          : (p.current_streak <= 0 ? p.current_streak - 1 : -1);
        const longestWin = won ? Math.max(p.longest_win_streak || 0, streak) : (p.longest_win_streak || 0);
        const longestLoss = !won ? Math.max(p.longest_loss_streak || 0, Math.abs(streak)) : (p.longest_loss_streak || 0);

        await supabase.from("players").update({
          elo_rating: newElo,
          total_matches: (p.total_matches || 0) + 1,
          total_wins: (p.total_wins || 0) + (won ? 1 : 0),
          total_losses: (p.total_losses || 0) + (won ? 0 : 1),
          current_streak: streak,
          longest_win_streak: longestWin,
          longest_loss_streak: longestLoss,
        }).eq("id", player.id);
      };

      await updatePlayer(player1, p1Won);
      await updatePlayer(player2, !p1Won);

      setResult({
        p1: player1, p2: player2,
        winner: p1Won ? player1.name : player2.name,
        score1: s1, score2: s2,
        gameType,
        eloChange1: elo.changeA, eloChange2: elo.changeB,
        elo1Before: player1.elo_rating, elo1After: elo.newA,
        elo2Before: player2.elo_rating, elo2After: elo.newB,
        highBreak1, highBreak2,
      });
    } catch (e) {
      setError(e.message || "Failed to save match.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, display: "flex",
      alignItems: "flex-start", justifyContent: "center",
      padding: "40px 16px", fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: T.textPrim,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input::placeholder { color: #3a4255; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #2a3045; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: T.surface, borderRadius: 999, padding: "8px 18px",
            border: `1px solid ${T.border}`, marginBottom: 16,
          }}>
            <span style={{ fontSize: 18 }}>🎱</span>
            <span style={{ fontWeight: 800, letterSpacing: "0.12em", fontSize: 13, color: T.green, textTransform: "uppercase" }}>
              Pool Buzz
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", color: T.textPrim }}>
            Record Match
          </h1>
        </div>

        {/* Card */}
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 16, padding: 24, boxShadow: "0 4px 40px rgba(0,0,0,0.5)",
        }}>
          {result ? (
            <ResultCard result={result} onReset={reset} />
          ) : (
            <>
              {/* Players */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
                <PlayerSearch label="Player 1" value={player1} onChange={setPlayer1} exclude={player2} />
                <PlayerSearch label="Player 2" value={player2} onChange={setPlayer2} exclude={player1} />
              </div>

              <Divider />

              {/* Game type */}
              <div style={{ marginBottom: 20 }}>
                <Label>Game Type</Label>
                <div style={{ display: "flex", gap: 8 }}>
                  <Pill active={gameType === "Pool"} onClick={() => handleGameType("Pool")}>🎱 Pool</Pill>
                  <Pill active={gameType === "Snooker"} onClick={() => handleGameType("Snooker")}>🔴 Snooker</Pill>
                </div>
              </div>

              <Divider />

              {/* ── POOL: big winner buttons ── */}
              {gameType === "Pool" && (
                <div style={{ marginBottom: 24 }}>
                  <PoolWinButtons
                    player1={player1}
                    player2={player2}
                    winner={poolWinner}
                    onSelect={setPoolWinner}
                  />
                </div>
              )}

              {/* ── SNOOKER: score inputs + highest break ── */}
              {gameType === "Snooker" && (
                <>
                  {/* Scores */}
                  <div style={{ marginBottom: 20 }}>
                    <Label>Score</Label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>
                          {player1 ? player1.name : "Player 1"}
                        </div>
                        <Input
                          type="number" min="0"
                          placeholder="0"
                          value={score1}
                          onChange={e => setScore1(e.target.value)}
                          style={{ textAlign: "center", fontSize: 20, fontWeight: 800, padding: "12px 8px" }}
                        />
                      </div>
                      <div style={{ color: T.textMuted, fontWeight: 700, paddingTop: 20 }}>–</div>
                      <div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>
                          {player2 ? player2.name : "Player 2"}
                        </div>
                        <Input
                          type="number" min="0"
                          placeholder="0"
                          value={score2}
                          onChange={e => setScore2(e.target.value)}
                          style={{ textAlign: "center", fontSize: 20, fontWeight: 800, padding: "12px 8px" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Highest break */}
                  <div style={{ marginBottom: 24 }}>
                    <Label>Highest Break</Label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>
                          {player1 ? player1.name : "Player 1"}
                        </div>
                        <Input
                          type="number" min="0" max="147"
                          placeholder="0"
                          value={highBreak1}
                          onChange={e => setHighBreak1(e.target.value)}
                          style={{ textAlign: "center", padding: "10px 8px" }}
                        />
                      </div>
                      <div style={{ paddingTop: 20, color: T.textMuted, fontWeight: 700 }}>–</div>
                      <div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>
                          {player2 ? player2.name : "Player 2"}
                        </div>
                        <Input
                          type="number" min="0" max="147"
                          placeholder="0"
                          value={highBreak2}
                          onChange={e => setHighBreak2(e.target.value)}
                          style={{ textAlign: "center", padding: "10px 8px" }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Error */}
              {error && (
                <div style={{
                  background: "rgba(255,77,109,0.1)", border: `1px solid rgba(255,77,109,0.3)`,
                  borderRadius: T.radiusSm, padding: "10px 14px",
                  color: T.red, fontSize: 13, marginBottom: 16, fontWeight: 500,
                }}>
                  {error}
                </div>
              )}

              {/* Save */}
              <button
                onClick={saveMatch}
                disabled={saving}
                style={{
                  width: "100%", padding: "14px", borderRadius: T.radius,
                  background: saving ? T.surface : T.green,
                  border: saving ? `1px solid ${T.border}` : "none",
                  color: saving ? T.textMuted : "#000",
                  fontWeight: 800, fontSize: 15, letterSpacing: "0.04em",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "inherit", transition: "all 0.2s",
                  boxShadow: saving ? "none" : `0 0 24px ${T.greenGlow}`,
                }}
                onMouseEnter={e => { if (!saving) e.target.style.opacity = 0.88; }}
                onMouseLeave={e => { e.target.style.opacity = 1; }}
              >
                {saving ? "Saving…" : "Save Match"}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 16, color: T.textMuted, fontSize: 12 }}>
          Pool Buzz · Match Tracker
        </div>
      </div>
    </div>
  );
}
