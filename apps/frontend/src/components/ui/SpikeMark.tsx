import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

interface SpikeMarkProps extends SVGProps<SVGSVGElement> {
  /** Render in the coral brand accent instead of inheriting currentColor. */
  accent?: boolean;
}

/**
 * Anthropic-style radial-spike mark — a 4-spoke sparkle glyph used as the
 * brand wordmark prefix and inline content marker (DESIGN.md). Rendered as
 * inline SVG so it inherits color via `currentColor` (or `accent` for coral).
 */
export function SpikeMark({ className, accent, ...props }: SpikeMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={cn('inline-block h-4 w-4', accent ? 'text-coral' : 'text-ink', className)}
      {...props}
    >
      <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
    </svg>
  );
}
