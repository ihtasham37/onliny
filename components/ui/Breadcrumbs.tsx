
import React from 'react';
import { Link } from 'react-router-dom';
import { Icons } from '../icons/Icons';

interface BreadcrumbItem {
    label: string;
    href: string;
}

export const Breadcrumbs: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
    return (
        <nav className="flex mb-4 overflow-x-auto whitespace-nowrap scrollbar-hide py-1" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2">
                <li className="inline-flex items-center">
                    <Link to="/" className="inline-flex items-center text-xs font-medium text-slate-700 hover:text-rose-600">
                        <Icons.home className="w-3 h-3 mr-1 text-rose-500" />
                        Home
                    </Link>
                </li>
                {items.map((item, index) => (
                    <li key={index}>
                        <div className="flex items-center">
                            <Icons.chevronRight className="w-3 h-3 text-rose-300 mx-1" />
                            <Link
                                to={item.href}
                                className={`ml-1 text-xs font-medium ${
                                    index === items.length - 1
                                        ? 'text-rose-900 font-bold cursor-default pointer-events-none'
                                        : 'text-slate-700 hover:text-rose-600'
                                }`}
                                aria-current={index === items.length - 1 ? 'page' : undefined}
                            >
                                {item.label}
                            </Link>
                        </div>
                    </li>
                ))}
            </ol>
        </nav>
    );
};
