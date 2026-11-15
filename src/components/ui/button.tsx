import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-charcoal text-ivory hover:bg-ink",
        outline: "border border-charcoal/25 text-charcoal hover:border-charcoal hover:bg-charcoal hover:text-ivory",
        ghost: "text-charcoal hover:bg-charcoal/5",
        light: "bg-ivory text-charcoal hover:bg-white",
        "outline-light": "border border-ivory/50 text-ivory hover:bg-ivory hover:text-charcoal",
        olive: "bg-olive text-white hover:bg-olive-deep",
        danger: "bg-danger text-white hover:bg-danger/90",
        link: "text-charcoal underline-offset-4 hover:underline px-0",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[2px]",
        md: "h-10 px-5 text-[13px] tracking-wide rounded-[2px]",
        lg: "h-12 px-7 text-[13px] tracking-[0.14em] uppercase rounded-[2px]",
        icon: "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { buttonVariants };
