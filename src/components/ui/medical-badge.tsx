import React from 'react';
import { cn } from '@/lib/utils';

interface MedicalBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export const MedicalBadge: React.FC<MedicalBadgeProps> = ({ 
  children, 
  variant = 'default',
  className = "" 
}) => {
  const variants = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-compliance-success/10 text-compliance-success",
    warning: "bg-compliance-warning/10 text-compliance-warning",
    error: "bg-compliance-error/10 text-compliance-error",
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};