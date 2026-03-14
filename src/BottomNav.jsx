import { useLocation, useNavigate } from "react-router-dom";

const PoolBallIcon = ({ number, active }) => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id={`ball-grad-${number}`} cx="38%" cy="32%" r="60%">
        <stop offset="0%" stopColor={active ? "#b6ffb0" : "#555"} />
        <stop offset="100%" stopColor={active ? "#22c55e" : "#2a2a2a"} />
      </radialGradient>
      <radialGradient id={`shine-${number}`} cx="35%" cy="28%" r="35%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>
    </defs>
    <circle cx="13" cy="13" r="11.5" fill={`url(#ball-grad-${number})`} />
    <circle cx="13" cy="13" r="11.5" fill={`url(#shine-${number})`} />
    {/* White stripe band */}
    {number > 8 && (
      <rect x="1.5" y="9.5" width="23" height="7" fill="white" opacity="0.85" rx="1" />
    )}
    {/* Number circle */}
    <circle cx="13" cy="13" r="5" fill="white" opacity={active ? 1 : 0.7} />
    <text
      x="13"
      y="17"
      textAnchor="middle"
      fontSize="6.5"
      fontWeight="800"
      fontFamily="'Courier New', monospace"
      fill={active ? "#15803d" : "#444"}
    >
      {number}
    </text>
    {/* Rim shadow */}
    <circle cx="13" cy="13" r="11.5" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
  </svg>
);

const CueIcon = ({ active }) => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cue stick */}
    <line
      x1="3" y1="22" x2="21" y2="5"
      stroke={active ? "#22c55e" : "#666"}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Cue tip */}
    <ellipse
      cx="21.5" cy="4.5" rx="2" ry="1.2"
      transform="rotate(-45 21.5 4.5)"
      fill={active ? "#22c55e" : "#888"}
    />
    {/* Cue butt wrap */}
    <line
      x1="3" y1="22" x2="6.5" y2="18.5"
      stroke={active ? "#4ade80" : "#555"}
      strokeWidth="4"
      strokeLinecap="round"
    />
    {/* Ball being hit */}
    <defs>
      <radialGradient id="cue-ball-grad" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor={active ? "#dcfce7" : "#555"} />
        <stop offset="100%" stopColor={active ? "#16a34a" : "#333"} />
      </radialGradient>
    </defs>
    <circle cx="8" cy="19" r="4.5" fill="url(#cue-ball-grad)" />
    <circle cx="8" cy="19" r="4.5" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
    <circle cx="6.8" cy="17.8" r="1.5" fill="rgba(255,255,255,0.45)" />
  </svg>
);

const EightBallIcon = ({ active }) => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="eight-ball-grad" cx="36%" cy="30%" r="62%">
        <stop offset="0%" stopColor={active ? "#4ade80" : "#444"} />
        <stop offset="100%" stopColor={active ? "#166534" : "#111"} />
      </radialGradient>
      <radialGradient id="eight-shine" cx="33%" cy="27%" r="35%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>
    </defs>
    <circle cx="13" cy="13" r="11.5" fill={`url(#eight-ball-grad)`} />
    <circle cx="13" cy="13" r="11.5" fill="url(#eight-shine)" />
    <circle cx="13" cy="13" r="5" fill="white" opacity={active ? 1 : 0.75} />
    <text
      x="13" y="17"
      textAnchor="middle"
      fontSize="7"
      fontWeight="900"
      fontFamily="'Courier New', monospace"
      fill={active ? "#15803d" : "#333"}
    >
      8
    </text>
    <circle cx="13" cy="13" r="11.5" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
  </svg>
);

const RackIcon = ({ active }) => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Triangle rack of balls — 3 rows */}
    {[
      { cx: 13, cy: 7 },
      { cx: 10.5, cy: 11.2 }, { cx: 15.5, cy: 11.2 },
      { cx: 8, cy: 15.4 }, { cx: 13, cy: 15.4 }, { cx: 18, cy: 15.4 },
    ].map((pos, i) => (
      <g key={i}>
        <defs>
          <radialGradient id={`rack-ball-${i}`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor={active ? "#bbf7d0" : "#555"} />
            <stop offset="100%" stopColor={
              active
                ? ["#22c55e","#16a34a","#15803d","#14532d","#22c55e","#16a34a"][i]
                : "#2a2a2a"
            } />
          </radialGradient>
        </defs>
        <circle cx={pos.cx} cy={pos.cy} r="3.2" fill={`url(#rack-ball-${i})`} />
        <circle cx={pos.cx} cy={pos.cy} r="3.2" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
      </g>
    ))}
  </svg>
);

const tabs = [
  {
    label: "Home",
    path: "/",
    icon: (active) => <CueIcon active={active} />,
  },
  {
    label: "Leaderboard",
    path: "/leaderboard",
    icon: (active) => <EightBallIcon active={active} />,
  },
  {
    label: "History",
    path: "/history",
    icon: (active) => <PoolBallIcon number={9} active={active} />,
  },
  {
    label: "Players",
    path: "/players",
    icon: (active) => <RackIcon active={active} />,
  },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-around",
        background: "linear-gradient(180deg, #0f1a12 0%, #0a120c 100%)",
        borderTop: "1px solid #1a3322",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.55), 0 -1px 0 rgba(34,197,94,0.08)",
        height: "64px",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Felt texture overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 3px,
              rgba(255,255,255,0.012) 3px,
              rgba(255,255,255,0.012) 4px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(255,255,255,0.012) 3px,
              rgba(255,255,255,0.012) 4px
            )
          `,
          pointerEvents: "none",
        }}
      />

      {tabs.map((tab) => {
        const active = isActive(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px 4px",
              position: "relative",
              WebkitTapHighlightColor: "transparent",
              outline: "none",
              transition: "transform 0.12s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
            onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {/* Active indicator bar */}
            <span
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: active ? "36px" : "0px",
                height: "2px",
                borderRadius: "0 0 3px 3px",
                background: "linear-gradient(90deg, #22c55e, #4ade80)",
                boxShadow: active ? "0 0 8px rgba(34,197,94,0.7)" : "none",
                transition: "width 0.2s ease, box-shadow 0.2s ease",
              }}
            />

            {/* Active glow halo behind icon */}
            {active && (
              <span
                style={{
                  position: "absolute",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)",
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Icon */}
            <span style={{ position: "relative", display: "flex" }}>
              {tab.icon(active)}
            </span>

            {/* Label */}
            <span
              style={{
                fontSize: "10px",
                fontWeight: active ? "700" : "500",
                fontFamily: "'Courier New', 'Lucida Console', monospace",
                letterSpacing: "0.04em",
                color: active ? "#4ade80" : "#4b6358",
                textTransform: "uppercase",
                transition: "color 0.2s ease",
                textShadow: active ? "0 0 8px rgba(74,222,128,0.5)" : "none",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
