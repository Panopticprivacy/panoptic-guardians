import React from 'react';
import { cn } from '@/lib/utils';

interface MedicalInputProps {
  label?: string;
  placeholder?: string;
  value: string | number;
  onChange?: (value: string) => void;
  type?: 'text' | 'number';
  className?: string;
}

export const MedicalInput: React.FC<MedicalInputProps> = ({ 
  label, 
  placeholder, 
  value, 
  onChange,
  type = 'text',
  className = ""
}) => (
  <label className={cn("block", className)}>
    {label && <span className="text-xs font-medium text-foreground">{label}</span>}
    <input
      type={type}
      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  </label>
);