import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ header, footer, className, children, ...rest }) => {
  return (
    <div className={["card", className || ''].filter(Boolean).join(' ')} {...rest}>
      {header ? <div className="card-header">{header}</div> : null}
      <div className="card-body">{children}</div>
      {footer ? <div className="card-footer" style={{ padding: '12px 16px', borderTop: '1px solid var(--purple-100)' }}>{footer}</div> : null}
    </div>
  );
};

export default Card;
