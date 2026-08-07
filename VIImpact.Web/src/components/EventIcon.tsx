import type { GtaEventIconKey } from '../utils/gtaEventPresentation'

interface EventIconProps {
  iconKey: GtaEventIconKey
  className?: string
  title?: string
}

/**
 * Renders a platform-independent SVG for GTA VI event categories.
 */
export function EventIcon({
  iconKey,
  className,
  title,
}: EventIconProps) {
  const accessibilityProps = title
    ? {
        role: 'img' as const,
        'aria-label': title,
      }
    : {
        'aria-hidden': true as const,
      }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      {...accessibilityProps}
    >
      {iconKey === 'trailer' && (
        <path
          d="M8.25 5.5 18 12l-9.75 6.5v-13Z"
          fill="currentColor"
        />
      )}

      {iconKey === 'delay' && (
        <>
          <path
            d="M12 5v8"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle
            cx="12"
            cy="17.5"
            r="1.35"
            fill="currentColor"
          />
        </>
      )}

      {(iconKey === 'financial' ||
        iconKey === 'market-analysis') && (
        <>
          <rect
            x="4"
            y="13"
            width="3.5"
            height="7"
            rx="1"
            fill="currentColor"
          />
          <rect
            x="10.25"
            y="8"
            width="3.5"
            height="12"
            rx="1"
            fill="currentColor"
          />
          <rect
            x="16.5"
            y="4"
            width="3.5"
            height="16"
            rx="1"
            fill="currentColor"
          />
        </>
      )}

      {iconKey === 'pre-order' && (
        <>
          <path
            d="M5 9h14l-1.8 10H6.8L5 9Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M8 9a4 4 0 0 1 8 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}

      {iconKey === 'pricing' && (
        <path
          d="M15.6 7.1c-.8-.8-2-1.3-3.5-1.3-2 0-3.5 1-3.5 2.6 0 1.5 1.2 2.2 3.7 2.8 2.2.5 3.2 1.1 3.2 2.5 0 1.7-1.5 2.8-3.7 2.8-1.7 0-3.1-.6-4-1.7M12 3.5v17"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}

      {iconKey === 'distribution' && (
        <>
          <path
            d="m4 8 8-4 8 4-8 4-8-4Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M4 8v9l8 4 8-4V8M12 12v9"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </>
      )}

      {iconKey === 'launch' && (
        <path
          d="m12 3 2.4 5.3 5.6.6-4.2 3.8 1.2 5.6-5-2.8-5 2.8 1.2-5.6L4 8.9l5.6-.6L12 3Z"
          fill="currentColor"
        />
      )}

      {iconKey === 'leak' && (
        <>
          <path
            d="M3 12s3.2-5 9-5 9 5 9 5-3.2 5-9 5-9-5-9-5Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle
            cx="12"
            cy="12"
            r="2.8"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </>
      )}

      {iconKey === 'security' && (
        <path
          d="m12 3 7 3.2v5.2c0 4.3-2.8 7.4-7 9.6-4.2-2.2-7-5.3-7-9.6V6.2L12 3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      )}

      {iconKey === 'labor-legal' && (
        <>
          <path
            d="M12 4v15M6 8h12M7 8l-3 6h6L7 8Zm10 0-3 6h6l-3-6ZM8 20h8"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {iconKey === 'development' && (
        <path
          d="m9 6-6 6 6 6M15 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {iconKey === 'corporate' && (
        <>
          <rect
            x="5"
            y="3.5"
            width="14"
            height="17"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M9 8h1M14 8h1M9 12h1M14 12h1M10 20v-4h4v4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}

      {iconKey === 'release-window' && (
        <>
          <rect
            x="4"
            y="6"
            width="16"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M4 10h16M8 3.5V8M16 3.5V8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}

      {iconKey === 'game-information' && (
        <>
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M12 10.5V17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle
            cx="12"
            cy="7.3"
            r="1.15"
            fill="currentColor"
          />
        </>
      )}

      {iconKey === 'announcement' && (
        <>
          <path
            d="M4 9.5h4l8-3.5v12l-8-3.5H4v-5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="m7 14.5 1.5 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M19 8.5c1 .8 1.5 2 1.5 3.5s-.5 2.7-1.5 3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}
