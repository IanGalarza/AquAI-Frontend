import type { SVGProps } from "react";

export type IconName = "plus" | "search" | "message" | "database" | "send" | "stop" | "check" | "sun" | "moon" | "menu" | "close" | "upload" | "refresh" | "arrow-left" | "arrow-up" | "chevron-right" | "chevron-down" | "file" | "file-pdf" | "file-csv" | "file-xlsx" | "file-docx" | "folder" | "calendar" | "clock" | "cloud-upload" | "eye" | "table" | "rows" | "columns" | "text" | "hash" | "description" | "check-circle" | "alert-triangle" | "alert-circle" | "calculator" | "pencil" | "trash";

type ChatIconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
};

const filePage = <><path d="M5 11V5a2 2 0 0 1 2-2h7l5 5v3" /><path d="M14 3v5h5" /></>;

const paths: Record<IconName, React.ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  message: <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 3V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4Z" />,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /><path d="M16 10h.01M16 17h.01" /></>,
  send: <><path d="m21 3-6.5 18-4-7.5L3 9.5 21 3Z" /><path d="m10.5 13.5 5-5" /></>,
  stop: <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
  moon: <path d="M20.9 13a9 9 0 1 1-9.9-9.9A7 7 0 0 0 20.9 13Z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 6a8 8 0 0 1 13 2l1 4M4 12l1 4a8 8 0 0 0 13 2" /></>,
  "arrow-left": <path d="M20 12H4m6-6-6 6 6 6" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "arrow-up": <path d="M12 20V4m-6 6 6-6 6 6" />,
  file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" /><path d="M14 3v6h6M9 13l6 5m0-5-6 5" /></>,
  "file-pdf": <>{filePage}<path d="M4.25 21v-7h1.5a2 2 0 0 1 0 4h-1.5M10.25 14v7h.5a3 3 0 0 0 3-3v-1a3 3 0 0 0-3-3ZM19.75 14h-3.5v7M16.25 17.5h2.75" /></>,
  "file-csv": <>{filePage}<path d="M7.75 15.2c-.44-.75-1.05-1.2-1.75-1.2c-.97 0-1.75 .78-1.75 1.75v3.5c0 .97 .78 1.75 1.75 1.75c.7 0 1.31-.45 1.75-1.2M13.75 15.2c-.44-.75-1.05-1.2-1.75-1.2c-.96 0-1.75 .75-1.75 1.75c0 1.15 .88 1.45 1.75 1.75c.88 .3 1.75 .6 1.75 1.75c0 1-.79 1.75-1.75 1.75c-.7 0-1.31-.45-1.75-1.2M16.25 14l1.75 7l1.75-7" /></>,
  "file-xlsx": <>{filePage}<path d="M1.25 14l3.5 7M4.75 14l-3.5 7M7.25 14v7h3.25M16.75 15.2c-.44-.75-1.05-1.2-1.75-1.2c-.96 0-1.75 .75-1.75 1.75c0 1.15 .88 1.45 1.75 1.75c.88 .3 1.75 .6 1.75 1.75c0 1-.79 1.75-1.75 1.75c-.7 0-1.31-.45-1.75-1.2M19.25 14l3.5 7M22.75 14l-3.5 7" /></>,
  "file-docx": <>{filePage}<path d="M1.25 14v7h.5a3 3 0 0 0 3-3v-1a3 3 0 0 0-3-3ZM9 14a1.75 1.75 0 0 1 1.75 1.75v3.5a1.75 1.75 0 0 1-1.75 1.75a1.75 1.75 0 0 1-1.75-1.75v-3.5a1.75 1.75 0 0 1 1.75-1.75ZM16.75 15.2c-.44-.75-1.05-1.2-1.75-1.2c-.97 0-1.75 .78-1.75 1.75v3.5c0 .97 .78 1.75 1.75 1.75c.7 0 1.31-.45 1.75-1.2M19.25 14l3.5 7M22.75 14l-3.5 7" /></>,
  folder: <path d="M3 7V5a2 2 0 0 1 2-2h4l3 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 0h7l2 3h9" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  "cloud-upload": <><path d="M7 18H6a4 4 0 0 1-1-7.9A7 7 0 0 1 18.5 8a5 5 0 0 1-.5 10h-1M12 21V11m-4 4 4-4 4 4" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 10v10M15 10v10" /></>,
  rows: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 15h18" /></>,
  columns: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></>,
  text: <path d="M5 7V4h14v3M12 4v16M8 20h8" />,
  hash: <path d="m10 3-4 18M18 3l-4 18M4 9h17M3 15h17" />,
  description: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
  "check-circle": <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  "alert-triangle": <><path d="m10.3 4-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  "alert-circle": <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 17h.01" /></>,
  calculator: <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M8 6h8M8 11h1M15 11h1M8 15h1M15 15h1M8 19h1M15 19h1" /></>,
  pencil: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />,
};

//
// Renderiza el ícono SVG correspondiente al nombre indicado.
//
export function ChatIcon({ name, className, ...props }: ChatIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "size-5"}
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
