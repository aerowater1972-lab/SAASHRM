import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Card({ children, className = '', title, ...props }: CardProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`} {...props}>
      {title && <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>}
      {children}
    </div>
  );
}
