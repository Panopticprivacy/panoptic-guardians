import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicalCardProps {
  title?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const MedicalCard: React.FC<MedicalCardProps> = ({ 
  title, 
  icon: Icon, 
  action, 
  children, 
  className = "" 
}) => (
  <div className={cn(
    "bg-card rounded-2xl shadow-card border border-border p-4",
    className
  )}>
    {(title || Icon || action) && (
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);