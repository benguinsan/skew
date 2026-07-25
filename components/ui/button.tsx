import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-text-primary text-bg-primary hover:opacity-90 disabled:bg-bg-secondary disabled:text-text-secondary disabled:opacity-100",
  secondary:
    "bg-bg-primary text-text-primary border border-border hover:bg-surface disabled:bg-bg-secondary disabled:text-text-secondary",
  outline:
    "bg-transparent text-text-primary border border-border hover:bg-surface disabled:bg-bg-secondary disabled:text-text-secondary",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={[
        "inline-flex h-10 min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-body-md font-medium transition-opacity",
        "disabled:cursor-not-allowed",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
