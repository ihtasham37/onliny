import React from 'react';
import { Link } from 'react-router-dom';
import { Icons } from './icons/Icons';

export const FloatingActionButton = () => {
    return (
        <div className="fixed bottom-5 right-5 z-40">
            <Link
                to="/admin"
                className="bg-pink-500 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-colors duration-200"
                aria-label="Admin Panel"
            >
                <Icons.user className="w-8 h-8" />
            </Link>
        </div>
    );
};
