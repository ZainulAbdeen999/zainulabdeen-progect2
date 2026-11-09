/**
 * Shared line-icon set.
 *
 * Every icon is a 24×24 stroke drawing that inherits `currentColor`, so it
 * follows the surrounding text colour and stays crisp at any size. Emoji were
 * deliberately avoided — they render differently on every operating system and
 * feel out of place in a restaurant brand.
 */

function Icon({ size = 24, strokeWidth = 1.7, className = "", children, ...props }) {
  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function CartIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2.5 3.5h2.3l2.4 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2L21 7H6.2" />
      <circle cx="9.2" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
    </Icon>
  );
}

export function WheatIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 21V8.5" />
      <path d="M12 9C12 6.6 13.3 4.4 15.6 3.2c.5 2.7-.5 5-3.6 5.8Z" />
      <path d="M12 9C12 6.6 10.7 4.4 8.4 3.2 7.9 5.9 8.9 8.2 12 9Z" />
      <path d="M12 14.5c0-2.1 1.2-4.1 3.3-5.1.4 2.4-.5 4.4-3.3 5.1Z" />
      <path d="M12 14.5c0-2.1-1.2-4.1-3.3-5.1-.4 2.4.5 4.4 3.3 5.1Z" />
      <path d="M12 20c0-2 1.1-3.8 3.1-4.7.4 2.2-.5 4-3.1 4.7Z" />
      <path d="M12 20c0-2-1.1-3.8-3.1-4.7-.4 2.2.5 4 3.1 4.7Z" />
    </Icon>
  );
}

export function TrackerIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <path d="M12 12l6.1-6.1" />
    </Icon>
  );
}

export function BoxIcon(props) {
  return (
    <Icon {...props}>
      <path d="M20.5 8.6 12 3.5 3.5 8.6v6.8L12 20.5l8.5-5.1V8.6Z" />
      <path d="M3.7 8.6 12 13.6l8.3-5" />
      <path d="M12 13.6v6.7" />
    </Icon>
  );
}

export function PizzaIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4.2 9.4C6.2 6.2 8.9 4.5 12 4.5s5.8 1.7 7.8 4.9c.5.8.3 1.8-.5 2.3L13 21a1.2 1.2 0 0 1-2 0L4.7 11.7c-.8-.5-1-1.5-.5-2.3Z" />
      <circle cx="9.6" cy="10.4" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="14.3" cy="12.2" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="11.2" cy="15.4" r="1.05" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function SliceMark(props) {
  return <PizzaIcon strokeWidth={2.2} {...props} />;
}

/* Delivery-tracking icons (added for the Mirpur Khas live tracker). */
export function BikeIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="5.4" cy="17.4" r="3.1" />
      <circle cx="18.6" cy="17.4" r="3.1" />
      <path d="M5.6 17.4h6.6l3.1-7.6h2.2" />
      <path d="M9.6 9.6h5.1l2.4 5.6" />
      <path d="M14.4 9.8 13.8 6h2.7" />
    </Icon>
  );
}

export function PhoneIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6.3 3.8h2.9l1.4 3.9-2 1.4a13.4 13.4 0 0 0 6.3 6.3l1.4-2 3.9 1.4v2.9a2.1 2.1 0 0 1-2.3 2.1A17.7 17.7 0 0 1 4.2 6.1a2.1 2.1 0 0 1 2.1-2.3Z" />
    </Icon>
  );
}

export function HomeIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.6V20h12V9.6" />
      <path d="M10 20v-5h4v5" />
    </Icon>
  );
}

export function CheckIcon(props) {
  return (
    <Icon {...props}>
      <path d="m5 12.6 4.4 4.4L19 7.4" />
    </Icon>
  );
}

export function ArrowRightIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 12h15" />
      <path d="M13.4 6.4 19 12l-5.6 5.6" />
    </Icon>
  );
}

export function GridIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </Icon>
  );
}

export function ReceiptIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2v-17Z" />
      <path d="M9 7.5h6M9 11h6M9 14.5h4" />
    </Icon>
  );
}

export function LayersIcon(props) {
  return (
    <Icon {...props}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 16.5 9 5 9-5" />
    </Icon>
  );
}

/* Admin Settings + payroll icons (added with the Settings page). */
export function SettingsIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 7h7" />
      <path d="M15 7h5" />
      <circle cx="13" cy="7" r="2.2" />
      <path d="M4 17h4" />
      <path d="M12 17h8" />
      <circle cx="10" cy="17" r="2.2" />
    </Icon>
  );
}

export function WalletIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4.5 7.5h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h10" />
      <path d="M2.5 10.5h17" />
      <circle cx="17" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function CalendarIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3.5v3M16 3.5v3" />
      <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" />
    </Icon>
  );
}

export function UsersIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6" />
      <path d="M17 14.4a5.2 5.2 0 0 1 3.5 4.9" />
    </Icon>
  );
}
