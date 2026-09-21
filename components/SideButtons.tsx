
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icons } from './icons/Icons';
import { useStore } from '../hooks/useStore';

type Action = {
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    href: string;
    isLink: boolean;
    color: string;
    show: boolean;
    download?: string;
};

const ActionItem: React.FC<{ action: Action }> = ({ action }) => {
    const commonClasses = "flex items-center gap-3 group";
    
    const content = (
        <>
            <span className="bg-white text-gray-800 text-sm font-semibold px-4 py-2 rounded-md shadow-sm transition-transform duration-200 group-hover:-translate-x-1">
                {action.label}
            </span>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${action.color} text-white transition-transform duration-200 group-hover:scale-110`}>
                <action.icon className="w-6 h-6" />
            </div>
        </>
    );
    
    if (action.isLink) {
        return (
            <Link to={action.href} className={commonClasses} aria-label={action.label}>
                {content}
            </Link>
        );
    }

    const anchorProps = action.download
        ? { href: action.href, download: action.download }
        : { href: action.href, target: '_blank', rel: 'noopener noreferrer' };

    return (
        <a {...anchorProps} className={commonClasses} aria-label={action.label}>
            {content}
        </a>
    );
}

export const SideButtons = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { settings } = useStore();

    const toggleMenu = () => setIsOpen(!isOpen);

    const whatsappLink = settings?.whatsappNumber ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}` : '';

    const actions: Action[] = [
        {
            label: 'Home',
            icon: Icons.home,
            href: '/',
            isLink: true,
            color: 'bg-blue-500',
            show: true
        },
        {
            label: 'Get App',
            icon: Icons.getApp,
            href: '/download-app', // Changed to internal route
            isLink: true,          // Changed to true
            color: 'bg-orange-500',
            show: !!settings?.appDownloadUrl,
        },
        {
            label: 'Track Order',
            icon: Icons.package,
            href: '/track-order',
            isLink: true,
            color: 'bg-purple-500',
            show: true
        },
        {
            label: 'Admin',
            icon: Icons.user,
            href: '/admin',
            isLink: true,
            color: 'bg-blue-800',
            show: true
        },
        {
            label: 'WhatsApp',
            icon: Icons.whatsapp,
            href: whatsappLink,
            isLink: false,
            color: 'bg-green-500',
            show: !!settings?.whatsappNumber
        }
    ].filter(a => a.show);

    return (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-4 pointer-events-none">
            <div
                className={`transition-all duration-300 ease-in-out flex flex-col items-end gap-4 ${
                    isOpen 
                        ? 'opacity-100 pointer-events-auto' 
                        : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}
            >
                {actions.map((action, index) => (
                    <ActionItem key={index} action={action} />
                ))}
            </div>

            <button
                onClick={toggleMenu}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ease-in-out hover:scale-105 relative pointer-events-auto
                    ${isOpen 
                        ? 'bg-rose-800 text-white ring-rose-400 ring-2' 
                        : 'bg-gradient-to-tr from-rose-600 to-amber-500 text-white ring-rose-300'
                    }`}
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isOpen}
            >
                 <div className={`transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-45' : 'rotate-0'}`}>
                    <Icons.plus className="w-7 h-7 sm:w-8 sm:h-8" />
                 </div>
            </button>
        </div>
    );
};
