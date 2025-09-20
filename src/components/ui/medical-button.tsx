import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicalButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'subtle';
  icon?: LucideIcon;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const MedicalButton: React.FC<MedicalButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  icon: Icon, 
  className = "",
  type = 'button'
}) => {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    ghost: "bg-background text-foreground border border-border hover:bg-accent",
    subtle: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  };

  return (
    <button 
      type={type} 
      onClick={onClick} 
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
        variants[variant],
        className
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};