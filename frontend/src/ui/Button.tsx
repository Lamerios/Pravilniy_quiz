import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  isLoading?: boolean;
}

const sizeToClassName: Record<ButtonSize, string> = {
  sm: 'btn',
  md: 'btn',
  lg: 'btn',
};

const variantToClassName: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  icon: 'btn btn-icon',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  startIcon,
  endIcon,
  isLoading = false,
  disabled,
  className,
  children,
  ...rest
}) => {
  const classes = [
    sizeToClassName[size],
    variantToClassName[variant],
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || isLoading} {...rest}>
      {isLoading ? (
        <span className="muted">Загрузка...</span>
      ) : (
        <>
          {startIcon ? <span aria-hidden style={{ display: 'inline-flex' }}>{startIcon}</span> : null}
          <span>{children}</span>
          {endIcon ? <span aria-hidden style={{ display: 'inline-flex' }}>{endIcon}</span> : null}
        </>
      )}
    </button>
  );
};

export default Button;
