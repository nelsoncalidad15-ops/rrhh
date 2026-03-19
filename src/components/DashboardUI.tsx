import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DashboardFrame: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden", className)}>
    {children}
  </div>
);

export const SkeletonLoader: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse bg-slate-200 rounded-lg", className)} />
);

export const StatusBadge: React.FC<{ status: 'approved' | 'pending' | 'failed'; text?: string }> = ({ status, text }) => {
  const configs = {
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', label: 'Aprobado' },
    pending: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', label: 'Pendiente' },
    failed: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', label: 'Desaprobado' }
  };
  const config = configs[status];
  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", config.bg, config.text, config.border)}>
      {text || config.label}
    </span>
  );
};

export const DataTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      {children}
    </table>
  </div>
);
