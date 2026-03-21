import { useLocation, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const tabs = [
  {
    label: "Home",
    path: "/",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <polyline points="9 21 9 12 15 12 15 21" />
      </svg>
    ),
  },
  {
    label: "Leaderboard",
    path: "/leaderboard",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="14" width="4" height="7" rx="1" />
        <rect x="9" y="9" width="4" height="12" rx="1" />
        <rect x="16" y="4" width="4" height="17" rx="1" />
      </svg>
    ),
  },
  {
    label: "History",
    path: "/history",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 15" />
      </svg>
    ),
  },
  {
    label: "Players",
    path: "/players",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <circle cx="18" cy="7" r="2.5" />
        <path d="M21 21v-1.5a3.5 3.5 0 0 0-2.5-3.35" />
      </svg>
    ),
  },
];

// Sign-out icon
const SignOutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default function BottomNav() {
  const location        = useLocation();
  const { group, signOut } = useAuth();

  return (
    <>
      {/* Group name banner — sits just above the nav */}
      {group && (
        <div style={{
          position: "fixed",
          bottom: 64,
          left: 0, right: 0,
          height: "24px",
          background: "#0d0f14",
          borderTop: "1px solid #1a1d24",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          zIndex: 999,
        }}>
          <span style={{ fontSize: 9, color: "#3a4255", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "system-ui" }}>
            Group:
          </span>
          <span style={{ fontSize: 10, color: "#555e6b", fontWeight: 600, fontFamily: "system-ui", letterSpacing: "0.04em" }}>
            {group.name}
          </span>
          <span style={{ fontSize: 9, color: "#2a3045", margin: "0 2px" }}>·</span>
          <span style={{ fontSize: 9, color: "#3a4255", letterSpacing: "0.1em", fontFamily: "'Courier New',monospace" }}>
            {group.invite_code}
          </span>
        </div>
      )}

      <nav style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        height: "64px",
        backgroundColor: "#111214",
        borderTop: "1px solid #2a2d31",
        display: "flex",
        alignItems: "stretch",
        zIndex: 1000,
        boxShadow: "0 -4px 20px rgba(0,0,0,0.5)",
      }}>
        {tabs.map(tab => {
          const isActive =
            tab.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(tab.path);

          return (
            <Link
              key={tab.path}
              to={tab.path}
              style={{
                flex: 1,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "3px", textDecoration: "none",
                color: isActive ? "#22c55e" : "#6b7280",
                backgroundColor: "transparent",
                borderTop: isActive ? "2px solid #22c55e" : "2px solid transparent",
                transition: "color 0.2s ease, border-color 0.2s ease",
                paddingBottom: "2px",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "transform 0.2s ease",
                transform: isActive ? "translateY(-1px)" : "translateY(0)",
              }}>
                {tab.icon}
              </span>
              <span style={{
                fontSize: "10px",
                fontWeight: isActive ? 600 : 400,
                letterSpacing: "0.02em", lineHeight: 1,
                fontFamily: "system-ui, -apple-system, sans-serif",
                whiteSpace: "nowrap",
              }}>
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* Sign out tab */}
        <button
          onClick={signOut}
          style={{
            flex: 1,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "3px", background: "transparent", border: "none",
            borderTop: "2px solid transparent",
            color: "#6b7280", cursor: "pointer",
            paddingBottom: "2px",
            WebkitTapHighlightColor: "transparent",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ff4d6d")}
          onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SignOutIcon />
          </span>
          <span style={{
            fontSize: "10px", fontWeight: 400,
            letterSpacing: "0.02em", lineHeight: 1,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}>
            Sign Out
          </span>
        </button>
      </nav>
    </>
  );
}
