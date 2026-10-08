// Envelope used on the "Check your email" screen. Single brand-green stroke; the flap settles and the badge fades in.
export function MailCheck() {
  return (<svg className="mail-art" viewBox="0 0 96 80" width="96" height="80" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <rect className="m-body" x="8" y="14" width="80" height="54" rx="6" />
    <path className="m-flap" d="M10 18 L48 46 L86 18" />
    <circle className="m-dot" cx="82" cy="16" r="7" fill="currentColor" stroke="none" /></svg>)
}
export function CheckBadge() {
  return (<svg className="check-art" viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <circle className="c-ring" cx="40" cy="40" r="34" /><path className="c-tick" d="M26 41 L36 51 L55 30" /></svg>)
}
