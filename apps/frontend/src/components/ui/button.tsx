import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-button font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-coral text-white active:bg-coral-active disabled:bg-coral-disabled disabled:text-muted-ink',
        destructive: 'bg-error text-white active:bg-error/90',
        outline:
          'border border-hairline bg-canvas text-ink hover:bg-surface-soft active:bg-surface-cream-strong',
        secondary:
          'border border-hairline bg-canvas text-ink hover:bg-surface-soft active:bg-surface-cream-strong',
        secondaryOnDark:
          'border border-hairline-soft bg-surface-dark-elevated text-on-dark hover:bg-surface-dark-soft',
        ghost: 'text-ink hover:bg-surface-soft hover:text-ink',
        ghostOnDark: 'text-on-dark/80 hover:bg-surface-dark-soft hover:text-on-dark',
        link: 'text-coral underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 py-2.5',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-6',
        icon: 'h-10 w-10',
        circular: 'h-9 w-9 rounded-full border border-hairline bg-canvas',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
