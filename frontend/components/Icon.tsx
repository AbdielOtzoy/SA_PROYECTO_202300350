import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'grid'
  | 'catalog'
  | 'history'
  | 'book'
  | 'settings'
  | 'users'
  | 'user'
  | 'video'
  | 'upload'
  | 'audit'
  | 'bell'
  | 'search'
  | 'filter'
  | 'loader'
  | 'alert'
  | 'play'
  | 'check'
  | 'thumbUp'
  | 'thumbDown'
  | 'shield'
  | 'mail'
  | 'lock'
  | 'eye'
  | 'chevron'
  | 'pause'
  | 'volume'
  | 'expand'
  | 'userAdd'
  | 'database'
  | 'message'
  | 'logout';
const paths: Record<IconName, ReactNode> = {
  grid: (
    <g>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </g>
  ),
  catalog: <path d="M5 4v16M10 4v16M15 4l4 16" />,
  history: (
    <g>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5M12 7v6l4 2" />
    </g>
  ),
  book: (
    <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v16H5.5A2.5 2.5 0 0 0 3 21.5zM21 5.5A2.5 2.5 0 0 0 18.5 3H13v16h5.5a2.5 2.5 0 0 1 2.5 2.5z" />
  ),
  settings: (
    <g>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </g>
  ),
  users: (
    <g>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M19 20v-1a6 6 0 0 0-3-5.2" />
    </g>
  ),
  user: (
    <g>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 21v-1a7 7 0 0 1 14 0v1" />
    </g>
  ),
  video: (
    <g>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3z" />
    </g>
  ),
  upload: <path d="M12 15V3M8 7l4-4 4 4M5 13v7h14v-7" />,
  audit: (
    <g>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2h6v2M8 10h8M8 15h8" />
    </g>
  ),
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  search: (
    <g>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </g>
  ),
  filter: (
    <g>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
    </g>
  ),
  loader: <circle cx="12" cy="12" r="8" strokeDasharray="24 12" />,
  alert: (
    <g>
      <path d="m12 3 9 17H3z" />
      <path d="M12 9v4M12 17h.01" />
    </g>
  ),
  play: <path d="m9 6 10 6-10 6z" />,
  check: <path d="m5 12 4 4L19 6" />,
  thumbUp: (
    <path d="M7 10v11H4V10zM7 21h9.5a2 2 0 0 0 1.9-1.4l1.4-5A2 2 0 0 0 17.9 12H14l.7-3.4A2.5 2.5 0 0 0 12.3 6L7 10z" />
  ),
  thumbDown: (
    <path d="M7 14V3H4v11zM7 3h9.5a2 2 0 0 1 1.9 1.4l1.4 5a2 2 0 0 1-1.9 2.6H14l.7 3.4a2.5 2.5 0 0 1-2.4 2.6L7 14z" />
  ),
  shield: <path d="M12 3 19 6v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4" />,
  mail: (
    <g>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </g>
  ),
  lock: (
    <g>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </g>
  ),
  eye: (
    <g>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </g>
  ),
  chevron: <path d="m7 10 5 5 5-5" />,
  pause: <path d="M7 5h3v14H7zM14 5h3v14h-3z" />,
  volume: (
    <g>
      <path d="M4 10h4l5-4v12l-5-4H4z" />
      <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
    </g>
  ),
  expand: <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />,
  userAdd: (
    <g>
      <circle cx="10" cy="8" r="3" />
      <path d="M3 20v-1a7 7 0 0 1 14 0v1M19 8v6M16 11h6" />
    </g>
  ),
  database: (
    <g>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />
    </g>
  ),
  message: <path d="M20 11.5a8 8 0 0 1-8 8H7l-4 3 1-4.5A8 8 0 1 1 20 11.5z" />,
  logout: <path d="M10 17l5-5-5-5M15 12H3M21 4v16H10" />,
};
export function Icon({ name, size = 22, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
