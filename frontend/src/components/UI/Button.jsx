import "../../assets/styles/components/button.css";

/**
 * Reusable button. variant: "primary" | "secondary" | "ghost" | "danger" | "icon"
 */
const Button = ({
  children,
  variant = "primary",
  size,
  icon,
  block,
  className = "",
  ...rest
}) => {
  const classes = [
    variant === "icon" ? "btn-icon" : "btn",
    variant !== "icon" ? `btn-${variant}` : "",
    size === "sm" ? "btn-sm" : "",
    block ? "btn-block" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button className={classes} {...rest}>
      {icon && <i className={icon} aria-hidden="true"></i>}
      {children}
    </button>
  );
};

export default Button;
