import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  prefix?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({ label, prefix, helperText, className, ...props }) => {
  return (
    <div className="group flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-600 transition-colors group-focus-within:text-blue-600 dark:text-slate-300 dark:group-focus-within:text-blue-400">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-slate-400 sm:text-sm dark:text-slate-500">{prefix}</span>
          </div>
        )}
        <input
          className={`block w-full rounded-lg border border-slate-200 bg-white py-3 text-sm text-slate-900 placeholder:text-slate-300 shadow-sm transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-600 dark:focus:ring-blue-500/20 dark:disabled:bg-slate-900 dark:disabled:text-slate-600 ${
            prefix ? 'pl-10' : 'pl-3'
          } ${className}`}
          {...props}
        />
      </div>
      {helperText && <p className="text-[11px] text-slate-400 dark:text-slate-500">{helperText}</p>}
    </div>
  );
};