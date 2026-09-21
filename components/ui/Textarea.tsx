import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  className?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, className = '', ...props }) => {
  const baseClasses = 'mt-1 block w-full px-3 py-2 bg-white border border-rose-200/80 rounded-xl shadow-xs text-slate-900 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 sm:text-sm transition-all';
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <textarea className={`${baseClasses} ${className}`} {...props} />
    </div>
  );
};