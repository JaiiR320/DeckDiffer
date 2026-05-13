import type { ComponentPropsWithoutRef, ReactNode } from "react";

type AlertTone = "danger" | "warning" | "info";

type AlertBaseProps = {
  children: ReactNode;
  className?: string;
  tone?: AlertTone;
};

type AlertProps = AlertBaseProps &
  (
    | ({ as?: "div" } & ComponentPropsWithoutRef<"div">)
    | ({ as: "p" } & ComponentPropsWithoutRef<"p">)
    | ({ as: "section" } & ComponentPropsWithoutRef<"section">)
  );

const toneClassNames: Record<AlertTone, string> = {
  danger: "border-rose-900/50 bg-rose-950/30 text-rose-300",
  warning: "border-amber-900/60 bg-amber-950/20 text-amber-200",
  info: "border-cyan-900/50 bg-cyan-950/20 text-cyan-300",
};

export function Alert(props: AlertProps) {
  const { children, className = "", tone = "danger" } = props;
  const alertClassName = `rounded-xl border px-4 py-3 text-sm ${toneClassNames[tone]} ${className}`;

  if (props.as === "p") {
    const {
      as: _as,
      children: _children,
      className: _className,
      tone: _tone,
      ...elementProps
    } = props;
    return (
      <p className={alertClassName} {...elementProps}>
        {children}
      </p>
    );
  }

  if (props.as === "section") {
    const {
      as: _as,
      children: _children,
      className: _className,
      tone: _tone,
      ...elementProps
    } = props;
    return (
      <section className={alertClassName} {...elementProps}>
        {children}
      </section>
    );
  }

  const {
    as: _as,
    children: _children,
    className: _className,
    tone: _tone,
    ...elementProps
  } = props;
  return (
    <div className={alertClassName} {...elementProps}>
      {children}
    </div>
  );
}
