
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { Spinner } from '../components/ui/Spinner';
import { Icons } from '../components/icons/Icons';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { ContentBlock } from '../types';
import { SEO } from '../components/SEO';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

const BlockRenderer: React.FC<{ block: ContentBlock }> = ({ block }) => {
    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    switch (block.type) {
        case 'heading':
            return <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-3">{block.content}</h2>;
        case 'text':
            return <p className="text-gray-700 my-4 whitespace-pre-wrap leading-relaxed">{block.content}</p>;
        case 'image':
            return <ImageWithFallback src={block.imageUrl} alt="Content Image" className="w-full h-auto object-cover rounded-md my-4" />;
        case 'ad':
            return (
                <a href={block.redirectUrl} target="_blank" rel="noopener noreferrer" className="block my-6">
                    <ImageWithFallback src={block.imageUrl} alt="Advertisement" className="w-full h-auto object-cover rounded-md shadow-md border" />
                </a>
            );
        case 'link':
            return (
                <div className="my-6">
                    <a 
                        href={block.redirectUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-block bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 transition-colors"
                    >
                        {block.content}
                    </a>
                </div>
            );
        case 'youtube':
            const videoId = getYoutubeId(block.content);
            if (!videoId) return null;
            return (
                <div className="my-6 aspect-video">
                    <iframe 
                        className="w-full h-full rounded-md"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            );
        default:
            return null;
    }
};

const BlogPostPage = () => {
    const { postId } = useParams<{ postId: string }>();
    const { updatePosts, isLoading, settings } = useStore();

    const post = updatePosts.find(p => p.id === postId);

    if (isLoading && !post) {
        return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    }

    if (!post) {
        return (
            <div className="text-center py-16 text-gray-500">
                <h3 className="text-lg font-semibold">Post not found.</h3>
                <Link to="/blog" className="text-teal-600 hover:underline">Back to all blog posts</Link>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4">
            <SEO 
                title={post.title} 
                description={post.contentBlocks.find(b => b.type === 'text')?.content.substring(0, 160)}
                image={post.contentBlocks.find(b => b.type === 'image')?.imageUrl}
                article={true}
                schema={{
                    "@context": "https://schema.org",
                    "@type": "BlogPosting",
                    "headline": post.title,
                    "image": post.contentBlocks.find(b => b.type === 'image')?.imageUrl || settings?.logoUrl,
                    "datePublished": new Date(post.createdAt).toISOString(),
                    "author": {
                        "@type": "Organization",
                        "name": settings?.appName || "Zivio"
                    }
                }}
            />

            <Breadcrumbs items={[
                { label: 'Blog', href: '/blog' },
                { label: post.title, href: `/blog/${post.id}` }
            ]} />

            <div className="bg-white p-4 sm:p-8 rounded-lg shadow-md">
                <Link to="/blog" className="text-sm text-gray-600 hover:text-teal-600 mb-4 inline-block">
                    &larr; Back to Blog
                </Link>
                
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{post.title}</h1>
                <p className="text-sm text-gray-400 mt-2 mb-6 border-b pb-4">
                    Posted on {new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                
                <div className="prose max-w-none">
                    {post.contentBlocks.map(block => (
                        <BlockRenderer key={block.id} block={block} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BlogPostPage;