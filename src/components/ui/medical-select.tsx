import React from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface MedicalSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}

export const MedicalSelect: React.FC<MedicalSelectProps> = ({ 
  label, 
  value, 
  onChange, 
  options,
  className = ""
}) => (
  <label className={cn("block", className)}>
    {label && <span className="text-xs font-medium text-foreground">{label}</span>}
    <select
      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);