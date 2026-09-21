import React, { useState } from 'react';
import { Icons } from '../icons/Icons';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
}

export const Accordion: React.FC<AccordionProps> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full py-5 text-left font-semibold text-gray-800 hover:bg-gray-50 px-2"
        aria-expanded={isOpen}
      >
        <span className="text-lg">{title}</span>
        <Icons.chevronDown
          className={`w-6 h-6 transition-transform duration-300 text-gray-500 ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-screen' : 'max-h-0'
        }`}
      >
        <div className="px-2 pb-4 pt-1">
          {children}
        </div>
      </div>
    </div>
  );
};