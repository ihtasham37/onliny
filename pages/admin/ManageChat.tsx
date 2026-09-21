import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { ChatMessage } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';

const ManageChat = () => {
    const { chatMessages, sendAdminReply, deleteChatMessage, isLoading } = useStore();
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const sessions = useMemo(() => {
        const sessionMap = new Map<string, { lastMessage: ChatMessage, count: number }>();
        chatMessages.forEach(msg => {
            const existing = sessionMap.get(msg.sessionId) || { count: 0, lastMessage: msg };
            sessionMap.set(msg.sessionId, {
                lastMessage: msg.timestamp > existing.lastMessage.timestamp ? msg : existing.lastMessage,
                count: existing.count + 1
            });
        });
        return Array.from(sessionMap.values()).sort((a,b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
    }, [chatMessages]);

    const currentMessages = useMemo(() => {
        if (!selectedSessionId) return [];
        return chatMessages.filter(msg => msg.sessionId === selectedSessionId);
    }, [chatMessages, selectedSessionId]);

    useEffect(() => {
        if (sessions.length > 0 && !selectedSessionId) {
            setSelectedSessionId(sessions[0].lastMessage.sessionId);
        }
    }, [sessions, selectedSessionId]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentMessages]);
    
    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if(replyText.trim() && selectedSessionId) {
            await sendAdminReply(selectedSessionId, replyText);
            setReplyText('');
        }
    }

    const handleDeleteMessage = (messageId: string) => {
        if (window.confirm('Are you sure you want to delete this message?')) {
            deleteChatMessage(messageId);
        }
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row bg-white rounded-lg shadow-sm">
            {/* Session List */}
            <div className="w-full md:w-1/3 border-r overflow-y-auto">
                <div className="p-3 border-b">
                    <h2 className="text-xl font-bold">Chat Sessions</h2>
                </div>
                 {isLoading && chatMessages.length === 0 ? <div className="p-4 text-center"><Spinner /></div> : (
                     <div>
                        {sessions.map(({ lastMessage, count }) => (
                            <button
                                key={lastMessage.sessionId}
                                onClick={() => setSelectedSessionId(lastMessage.sessionId)}
                                className={`w-full text-left p-3 border-b hover:bg-gray-50 ${selectedSessionId === lastMessage.sessionId ? 'bg-pink-50' : ''}`}
                            >
                                <p className="font-semibold truncate">Session: {lastMessage.sessionId.slice(0, 8)}...</p>
                                <p className="text-sm text-gray-500 truncate">{lastMessage.text}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(lastMessage.timestamp).toLocaleString()} ({count} msgs)</p>
                            </button>
                        ))}
                    </div>
                 )}
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col">
                {selectedSessionId ? (
                    <>
                        <div className="p-3 border-b">
                            <h3 className="font-bold">Conversation with {selectedSessionId.slice(0, 8)}...</h3>
                        </div>
                        <div className="flex-1 p-3 overflow-y-auto bg-gray-50">
                             {currentMessages.map((msg, index) => (
                                <div key={msg.id || index} className={`group flex mb-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.sender !== 'user' && (
                                         <button onClick={() => handleDeleteMessage(msg.id)} className="mr-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Icons.trash className="w-4 h-4"/>
                                        </button>
                                    )}
                                    <div className={`rounded-lg px-4 py-2 max-w-[80%]`}>
                                       <span className="text-xs text-gray-400 block mb-1 capitalize">{msg.sender}</span>
                                       <div className={`rounded-lg p-3 ${
                                            msg.sender === 'user' ? 'bg-pink-500 text-white' 
                                            : msg.sender === 'admin' ? 'bg-yellow-400 text-black'
                                            : 'bg-gray-200 text-gray-800'
                                        }`}>
                                         <p className="text-sm" style={{whiteSpace: 'pre-wrap'}}>{msg.text}</p>
                                        </div>
                                    </div>
                                    {msg.sender === 'user' && (
                                        <button onClick={() => handleDeleteMessage(msg.id)} className="ml-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Icons.trash className="w-4 h-4"/>
                                        </button>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleReply} className="p-3 border-t">
                            <div className="flex items-center gap-2">
                                <Input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your reply as admin..."
                                    className="flex-1"
                                    autoComplete="off"
                                />
                                <Button type="submit">Send Reply</Button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <p>Select a session to view the conversation.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageChat;