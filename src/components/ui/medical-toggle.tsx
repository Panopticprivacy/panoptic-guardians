import React from 'react';
import { cn } from '@/lib/utils';

interface MedicalToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  hint?: string;
  className?: string;
}

export const MedicalToggle: React.FC<MedicalToggleProps> = ({ 
  checked, 
  onChange, 
  label, 
  hint,
  className = ""
}) => (
  <label className={cn("flex items-start justify-between gap-4 py-2", className)}>
    <div>
      {label && <div className="text-sm font-medium text-foreground">{label}</div>}
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "w-12 h-7 rounded-full relative transition-colors",
        checked ? "bg-primary" : "bg-muted"
      )}
      aria-pressed={checked}
    >
      <span className={cn(
        "absolute top-0.5 left-0.5 w-6 h-6 bg-background rounded-full shadow transition-transform",
        checked ? "translate-x-5" : ""
      )} />
    </button>
  </label>
);