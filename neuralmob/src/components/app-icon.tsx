type AppIconName =
  | "add"
  | "admin"
  | "chat"
  | "close"
  | "error"
  | "expandDown"
  | "expandUp"
  | "help"
  | "key"
  | "logout"
  | "menu"
  | "person"
  | "robot"
  | "settings"
  | "verified";

const iconPaths: Record<AppIconName, React.ReactNode> = {
  add: <path d="M12 5v14M5 12h14" />,
  admin: (
    <>
      <path d="M12 3l7 4v5c0 4.2-2.8 7.7-7 9-4.2-1.3-7-4.8-7-9V7l7-4Z" />
      <path d="M12 9v6" />
      <path d="M9 12h6" />
    </>
  ),
  chat: (
    <>
      <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-4 3v-3H7.5A2.5 2.5 0 0 1 5 13.5v-6Z" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  error: (
    <>
      <path d="M12 4 4.5 18h15L12 4Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </>
  ),
  expandDown: <path d="m7 10 5 5 5-5" />,
  expandUp: <path d="m7 14 5-5 5 5" />,
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.75 9.5a2.4 2.4 0 1 1 4.34 1.43c-.4.54-1.1.98-1.58 1.31-.74.5-1.01.84-1.01 1.76" />
      <path d="M12 17h.01" />
    </>
  ),
  key: (
    <>
      <circle cx="8.5" cy="12" r="3.5" />
      <path d="M12 12h7" />
      <path d="M16 12v-2" />
      <path d="M18.5 12v-2" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H7.5A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19H10" />
      <path d="M14 8l4 4-4 4" />
      <path d="M9 12h9" />
    </>
  ),
  menu: (
    <>
      <path d="M5 8h14" />
      <path d="M5 12h14" />
      <path d="M5 16h14" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8.5" r="3" />
      <path d="M6.5 18a5.5 5.5 0 0 1 11 0" />
    </>
  ),
  robot: (
    <>
      <rect x="6" y="8" width="12" height="9" rx="2.5" />
      <path d="M12 4v4" />
      <path d="M9.5 12h.01" />
      <path d="M14.5 12h.01" />
      <path d="M9 16h6" />
    </>
  ),
  settings: (
    <>
      <path d="M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
      <path d="M12 3v2.5" />
      <path d="M12 18.5V21" />
      <path d="m4.93 4.93 1.77 1.77" />
      <path d="m17.3 17.3 1.77 1.77" />
      <path d="M3 12h2.5" />
      <path d="M18.5 12H21" />
      <path d="m4.93 19.07 1.77-1.77" />
      <path d="m17.3 6.7 1.77-1.77" />
    </>
  ),
  verified: (
    <>
      <path d="M12 3.5 14.5 5l3-.25.75 2.9L20.5 10 19 12.5l.25 3-2.9.75L14 18.5l-2.5-1.5L8.5 18.5l-2.25-2.25-2.9-.75.25-3L2 10l2.25-2.35.75-2.9L8 5l2.5-1.5Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
};

export function AppIcon({
  name,
  className = "",
  strokeWidth = 1.9,
}: {
  name: AppIconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
    >
      {iconPaths[name]}
    </svg>
  );
}
