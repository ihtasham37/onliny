
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './icons/Icons';
import { useStore } from '../hooks/useStore';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { generateSessionId } from '../utils/helpers';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useLocalStorage('chat_session_id', '');
  const { sendChatMessage, chatMessages } = useStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) {
      setSessionId(generateSessionId());
    }
  }, [sessionId, setSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      await sendChatMessage(message, sessionId);
      setMessage('');
    }
  };

  const filteredMessages = chatMessages.filter(msg => msg.sessionId === sessionId);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-5 bg-gradient-to-r from-rose-500 to-amber-500 text-white w-13 h-13 sm:w-14 sm:h-14 rounded-full shadow-xl flex items-center justify-center z-40 hover:scale-105 transition-all"
        aria-label="Open Chat"
      >
        <Icons.messageCircle className="w-7 h-7 sm:w-8 sm:h-8" />
      </button>

      {isOpen && (
        <div className="fixed bottom-5 right-5 w-[calc(100vw-2.5rem)] max-w-sm h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col z-50 animate-fade-in-up border border-rose-100 overflow-hidden">
          <header className="bg-gradient-to-r from-rose-600 to-amber-600 text-white p-4 flex justify-between items-center">
            <h3 className="font-bold text-base font-serif">Customer Support</h3>
            <button onClick={() => setIsOpen(false)} aria-label="Close Chat">
                <Icons.x className="w-5 h-5 text-white/90 hover:text-white" />
            </button>
          </header>
          
          <div className="flex-1 p-4 overflow-y-auto bg-rose-50/30">
            {filteredMessages.map((msg, index) => (
              <div key={index} className={`flex mb-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-2xl px-4 py-2 max-w-[80%] ${
                    msg.sender === 'user' ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-xs' 
                    : msg.sender === 'admin' ? 'bg-amber-400 text-slate-900 font-medium shadow-xs'
                    : 'bg-white text-slate-800 border border-rose-100 shadow-xs'
                }`}>
                  <p className="text-xs sm:text-sm" style={{whiteSpace: 'pre-wrap'}}>{msg.text}</p>
                </div>
              </div>
            ))}
             <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-rose-100 bg-white">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about sizes, fabrics..."
                className="flex-1 text-xs"
                autoComplete="off"
              />
              <Button type="submit" size="sm">Send</Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};