
import React from 'react';

export const Spinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-14 h-14',
  };
  return (
    <div className="flex justify-center items-center">
      <div className={`${sizeClasses[size]} border-3 border-rose-100 border-t-rose-600 rounded-full animate-spin shadow-xs`}></div>
    </div>
  );
};

export const FullPageSpinner = () => {
    return (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex justify-center items-center z-50">
            <Spinner size="lg" />
        </div>
    )
}