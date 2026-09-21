
import React, { useState, useEffect } from 'react';
import { UpdatePost, ContentBlock } from '../../types';
import { useStore } from '../../hooks/useStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Spinner } from '../ui/Spinner';
import { Icons } from '../icons/Icons';
import { MediaPreview } from '../ui/MediaPreview';

interface UpdatePostEditorProps {
    post: UpdatePost | null;
    onClose: () => void;
}

export const UpdatePostEditor: React.FC<UpdatePostEditorProps> = ({ post, onClose }) => {
    const { addUpdatePost, updateUpdatePost, uploadFile } = useStore();
    const [title, setTitle] = useState('');
    const [blocks, setBlocks] = useState<ContentBlock[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (post) {
            setTitle(post.title);
            setBlocks(post.contentBlocks || []);
        } else {
            setTitle('');
            setBlocks([]);
        }
    }, [post]);

    const addBlock = (type: ContentBlock['type']) => {
        const newBlock: ContentBlock = {
            id: `block_${Date.now()}`,
            type,
            content: '',
        };
        if (type === 'ad' || type === 'link') newBlock.redirectUrl = '';
        setBlocks([...blocks, newBlock]);
    };

    const updateBlock = (id: string, newContent: Partial<ContentBlock>) => {
        setBlocks(blocks.map(b => (b.id === id ? { ...b, ...newContent } : b)));
    };
    
    const handleImageUpload = async (blockId: string, file: File) => {
        try {
            const url = await uploadFile(file);
            updateBlock(blockId, { imageUrl: url });
        } catch (error) {
            console.error(error);
            alert("Image upload failed.");
        }
    };

    const removeBlock = (id: string) => {
        setBlocks(blocks.filter(b => b.id !== id));
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        const newBlocks = [...blocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= blocks.length) return;
        [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
        setBlocks(newBlocks);
    };

    const handleSubmit = async () => {
        if (!title.trim()) { alert("Please enter a title."); return; }
        setIsSubmitting(true);
        try {
            const postData = { title, contentBlocks: blocks };
            if (post) await updateUpdatePost({ ...post, ...postData });
            else await addUpdatePost(postData);
            onClose();
        } catch (error) {
            console.error("Failed to save post:", error);
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="p-4 space-y-4">
            <Input label="Post Title" value={title} onChange={e => setTitle(e.target.value)} required />
            
            <div className="space-y-3">
                {blocks.map((block, index) => (
                    <div key={block.id} className="bg-gray-50 p-3 rounded-lg border relative">
                        <div className="absolute top-2 right-2 flex gap-1">
                             <Button size="xs" variant="ghost" onClick={() => moveBlock(index, 'up')} disabled={index === 0}><Icons.arrowUp className="w-4 h-4"/></Button>
                             <Button size="xs" variant="ghost" onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1}><Icons.chevronDown className="w-4 h-4"/></Button>
                             <Button size="xs" variant="danger" onClick={() => removeBlock(block.id)}><Icons.trash className="w-4 h-4"/></Button>
                        </div>

                        {block.type === 'heading' && <Input placeholder="Heading" value={block.content} onChange={e => updateBlock(block.id, { content: e.target.value })} className="text-xl font-bold"/>}
                        {block.type === 'text' && <Textarea placeholder="Text block..." value={block.content} onChange={e => updateBlock(block.id, { content: e.target.value })} rows={4}/>}
                        {(block.type === 'image' || block.type === 'ad') && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{block.type === 'image' ? 'Image/Video' : 'Ad Banner'}</label>
                                {block.imageUrl && <MediaPreview src={block.imageUrl} className="w-full h-auto max-h-40" />}
                                <div className="flex gap-2">
                                    <Input type="file" accept="image/*,video/*" onChange={e => e.target.files && handleImageUpload(block.id, e.target.files[0])}/>
                                    <Input type="url" placeholder="Or paste media URL" value={block.imageUrl || ''} onChange={e => updateBlock(block.id, { imageUrl: e.target.value })}/>
                                </div>
                                {block.type === 'ad' && <Input type="url" placeholder="Ad Redirect URL" value={block.redirectUrl || ''} onChange={e => updateBlock(block.id, { redirectUrl: e.target.value })}/>}
                            </div>
                        )}
                        {block.type === 'link' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Link Button</label>
                                <Input 
                                    placeholder="Button Text (e.g., Click Here)" 
                                    value={block.content} 
                                    onChange={e => updateBlock(block.id, { content: e.target.value })}
                                />
                                <Input 
                                    type="url"
                                    placeholder="URL (e.g., https://example.com)" 
                                    value={block.redirectUrl || ''} 
                                    onChange={e => updateBlock(block.id, { redirectUrl: e.target.value })}
                                />
                            </div>
                        )}
                        {block.type === 'youtube' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">YouTube Video URL</label>
                                <Input 
                                    placeholder="https://www.youtube.com/watch?v=..." 
                                    value={block.content} 
                                    onChange={e => updateBlock(block.id, { content: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button size="sm" variant="secondary" onClick={() => addBlock('heading')}>+ Add Heading</Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock('text')}>+ Add Text</Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock('image')}>+ Add Image</Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock('ad')}>+ Add Ad</Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock('link')}>+ Add Link</Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock('youtube')}>+ Add YouTube</Button>
            </div>
            
            <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm" /> : 'Save Article'}</Button>
            </div>
        </div>
    );
};