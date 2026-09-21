
import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { Spinner } from '../components/ui/Spinner';
import { Icons } from '../components/icons/Icons';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { SEO } from '../components/SEO';

const BlogPage = () => {
    const { updatePosts, isLoading } = useStore();

    return (
        <div className="container mx-auto">
            <SEO 
                title="Our Blog" 
                description="Stay updated with the latest trends, news, and announcements from our store."
            />
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Blog</h1>

            {isLoading && updatePosts.length === 0 ? (
                <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
            ) : updatePosts.length > 0 ? (
                <div className="max-w-2xl mx-auto space-y-6">
                    {updatePosts.map(post => {
                        // FIX: Default to an empty array if contentBlocks is undefined to prevent crashes with old data.
                        const blocks = post.contentBlocks || [];
                        const firstImage = blocks.find(b => b.type === 'image' && b.imageUrl);
                        const firstText = blocks.find(b => b.type === 'text');
                        
                        return (
                            <Link 
                                to={`/blog/${post.id}`} 
                                key={post.id} 
                                className="group block bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                            >
                                {firstImage && (
                                    <div className="w-full h-48 overflow-hidden rounded-md mb-4">
                                        <ImageWithFallback 
                                            src={firstImage.imageUrl} 
                                            alt={post.title} 
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                )}
                                <h2 className="text-2xl font-bold text-gray-800 group-hover:text-teal-600">{post.title}</h2>
                                <p className="text-xs text-gray-400 mt-1 mb-3">{new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                {firstText && <p className="text-gray-600 whitespace-pre-wrap line-clamp-3">{firstText.content}</p>}
                                <span className="text-teal-600 font-semibold text-sm mt-4 inline-block">
                                    Read More &rarr;
                                </span>
                            </Link>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500">
                    <Icons.star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <h3 className="text-lg font-semibold">No Blog Posts Yet</h3>
                    <p className="text-sm">Check back later for new articles and news.</p>
                </div>
            )}
        </div>
    );
};

export default BlogPage;