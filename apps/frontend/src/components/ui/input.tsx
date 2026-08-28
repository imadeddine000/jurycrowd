import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          'flex h-10 w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-body-md text-ink ring-offset-background placeholder:text-muted-soft-ink file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:border-coral focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-coral/15 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
