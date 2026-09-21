
import React from 'react';
import { useStore } from '../hooks/useStore';
import { Icons } from '../components/icons/Icons';

interface CommunityLinkProps {
    href: string;
    icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
    label: string;
    color: string;
}

const CommunityLink: React.FC<CommunityLinkProps> = ({ href, icon: Icon, label, color }) => {
    return (
        <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`flex items-center p-4 bg-white rounded-xl shadow-md border hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
        >
            <Icon className={`w-8 h-8 mr-4 ${color}`} />
            <div>
                <h3 className="font-bold text-lg text-gray-800">{label}</h3>
                <p className="text-sm text-gray-500">Join the conversation</p>
            </div>
            <Icons.chevronRight className="w-6 h-6 ml-auto text-gray-400" />
        </a>
    );
};

const CommunityPage = () => {
    const { settings } = useStore();

    const links = [
        { href: settings?.whatsappGroupUrl, icon: Icons.whatsapp, label: 'WhatsApp Group', color: 'text-green-500' },
        { href: settings?.whatsappChannelUrl, icon: Icons.whatsapp, label: 'WhatsApp Channel', color: 'text-green-600' },
        { href: settings?.telegramChannelUrl, icon: Icons.telegram, label: 'Telegram Channel', color: 'text-blue-500' },
        { href: settings?.youtubeChannelUrl, icon: Icons.youtube, label: 'YouTube Channel', color: 'text-red-500' },
        { href: settings?.instagramChannelUrl, icon: Icons.instagram, label: 'Instagram Page', color: 'text-pink-500' },
        { href: settings?.facebookPageUrl, icon: Icons.facebook, label: 'Facebook Page', color: 'text-blue-700' },
    ].filter((link): link is CommunityLinkProps => !!link.href);

    return (
        <div className="container mx-auto">
            <div className="text-center mb-8">
                 <Icons.users className="w-16 h-16 mx-auto text-teal-500 mb-2" />
                 <h1 className="text-4xl font-bold text-gray-800">Join Our Community</h1>
                 <p className="text-gray-600 mt-2">Stay connected with us for the latest updates, offers, and more!</p>
            </div>

            {links.length > 0 ? (
                <div className="max-w-2xl mx-auto space-y-4">
                    {links.map(link => (
                        <CommunityLink key={link.label} {...link} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500">
                    <h3 className="text-lg font-semibold">No community links available yet.</h3>
                    <p className="text-sm">Please check back later.</p>
                </div>
            )}
        </div>
    );
};

export default CommunityPage;
