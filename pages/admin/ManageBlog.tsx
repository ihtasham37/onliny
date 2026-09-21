import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { UpdatePost } from '../../types';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { UpdatePostEditor } from '../../components/admin/UpdatePostEditor';

const UpdatePostModal = ({ isOpen, onClose, post }: { isOpen: boolean; onClose: () => void; post: UpdatePost | null; }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-2xl font-bold">{post ? 'Edit Article' : 'Add New Article'}</h2>
                </div>
                <div className="overflow-y-auto flex-grow">
                    <UpdatePostEditor post={post} onClose={onClose} />
                </div>
            </div>
        </div>
    );
};

const ManageBlog = () => {
    const { updatePosts, deleteUpdatePost, isLoading } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<UpdatePost | null>(null);

    const openModal = (post: UpdatePost | null = null) => {
        setSelectedPost(post);
        setIsModalOpen(true);
    };

    const handleDelete = (post: UpdatePost) => {
        if (window.confirm(`Are you sure you want to delete this article titled "${post.title}"?`)) {
            deleteUpdatePost(post);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Manage Articles</h1>
                <Button onClick={() => openModal()} size="md"><Icons.plus className="w-5 h-5 mr-2" /> Add Article</Button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <tr><th className="p-3">Title</th><th className="p-3">Date</th><th className="p-3">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading && updatePosts.length === 0 ? (
                            <tr><td colSpan={3} className="text-center p-8"><Spinner/></td></tr>
                        ) : updatePosts.map(post => (
                            <tr key={post.id} className="hover:bg-gray-50 text-sm">
                                <td className="p-3 font-medium">{post.title}</td>
                                <td className="p-3 text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</td>
                                <td className="p-3 whitespace-nowrap"><div className="flex gap-3"><button onClick={() => openModal(post)} className="text-blue-500"><Icons.edit className="w-5 h-5"/></button><button onClick={() => handleDelete(post)} className="text-red-500"><Icons.trash className="w-5 h-5"/></button></div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {updatePosts.length === 0 && !isLoading && <p className="text-center p-8 text-gray-500">No articles found.</p>}
            </div>
            <UpdatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} post={selectedPost} />
        </div>
    );
};

export default ManageBlog;