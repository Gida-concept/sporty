import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  image?: { src: string; alt: string };
  header?: ReactNode;
  footer?: ReactNode;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className = '',
  image,
  header,
  footer,
  hover,
  onClick,
}: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${hover ? 'transition-shadow hover:shadow-md cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
    >
      {image && (
        <div className="aspect-video overflow-hidden bg-gray-100">
          <img
            src={image.src}
            alt={image.alt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      {header && <div className="border-b border-gray-100 px-5 py-4">{header}</div>}
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="border-t border-gray-100 px-5 py-3">{footer}</div>}
    </div>
  );
}
