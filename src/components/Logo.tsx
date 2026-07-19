export function Logo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12 Q14 3 25 12 Q14 21 4 12 Z" />
      <path d="M25 12 L36 4 M25 12 L36 20" />
      <path d="M12 8 Q14.5 12 12 16" />
      <circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
