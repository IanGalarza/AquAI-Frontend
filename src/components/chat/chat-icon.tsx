import type { SVGProps } from "react";

type IconName = "plus" | "search" | "message" | "database" | "send" | "sun" | "moon" | "menu" | "close" | "upload" | "refresh" | "arrow-left" | "chevron-right";

type ChatIconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
};

const paths: Record<IconName, React.ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  message: <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 3V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4Z" />,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /><path d="M16 10h.01M16 17h.01" /></>,
  send: <><path d="m21 3-6.5 18-4-7.5L3 9.5 21 3Z" /><path d="m10.5 13.5 5-5" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
  moon: <path d="M20.9 13a9 9 0 1 1-9.9-9.9A7 7 0 0 0 20.9 13Z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 6a8 8 0 0 1 13 2l1 4M4 12l1 4a8 8 0 0 0 13 2" /></>,
  "arrow-left": <path d="M20 12H4m6-6-6 6 6 6" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
};

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
