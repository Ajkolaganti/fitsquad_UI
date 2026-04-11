"use client";

interface StickySectionLabelProps {
  children: React.ReactNode;
  /** Extra classes on the sticky bar (e.g. different bg on non-mesh pages). */
  className?: string;
}

/**
 * Sticks under the viewport top while its section scrolls — lightweight “fitness app” section chrome.
 */
export function StickySectionLabel({
  children,
  className = "",
}: StickySectionLabelProps) {
  return (
    <div
      className={`sticky top-0 z-20 -mx-5 mb-3 border-b border-pacer-border/80 bg-pacer-cream/92 px-5 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-pacer-cream/78 ${className}`}
    >
      <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-pacer-muted">
        {children}
      </h2>
    </div>
  );
}
