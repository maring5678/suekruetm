import React from 'react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  headerContent?: React.ReactNode;
}

export const MobileLayout = ({ 
  children, 
  className, 
  title,
  showBack,
  onBack,
  headerContent
}: MobileLayoutProps) => {
  return (
    <div className={cn("min-h-screen bg-background mobile-safe", className)}>
      <div className="container mx-auto px-2 py-4 pb-20 sm:px-4 max-w-full overflow-x-hidden">
        {(title || headerContent) && (
          <div className="mb-6 sm:mb-8">
            {title && (
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-4">
                {title}
              </h1>
            )}
            {headerContent}
          </div>
        )}
        
        <div className="space-y-4 sm:space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  clickable?: boolean;
  onClick?: () => void;
}

export const MobileCard = ({ children, className, clickable, onClick }: MobileCardProps) => {
  return (
    <div 
      className={cn(
        "card-elevated p-3 sm:p-4 rounded-lg",
        clickable && "cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 touch-target",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface MobileButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  vertical?: boolean;
}

export const MobileButtonGroup = ({ children, className, vertical = false }: MobileButtonGroupProps) => {
  return (
    <div className={cn(
      "flex gap-3 px-4 sm:px-0",
      vertical ? "flex-col" : "flex-col sm:flex-row",
      "justify-center",
      className
    )}>
      {children}
    </div>
  );
};