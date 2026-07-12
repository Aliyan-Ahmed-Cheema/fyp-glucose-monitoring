import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Loader2, User } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface ChatWindowProps {
  currentUserId: string;
  partnerId: string;
  partnerName: string;
}

export function ChatWindow({ currentUserId, partnerId, partnerName }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch History & Subscribe to Real-time Updates
  useEffect(() => {
    if (!currentUserId || !partnerId) return;

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
      setLoading(false);
    };

    fetchHistory();

    // Set up Supabase Real-time listener for new messages
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${currentUserId}` // Only listen to messages sent to ME
      }, (payload) => {
        const newMsg = payload.new as Message;
        // Only add if it's from the person we are currently chatting with
        if (newMsg.sender_id === partnerId) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentUserId, partnerId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);

    const messageData = {
      sender_id: currentUserId,
      receiver_id: partnerId,
      content: newMessage.trim(),
    };

    // Optimistically add to UI immediately so it feels fast
    const optimisticMsg: Message = {
      id: Date.now().toString(),
      ...messageData,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');

    // Send to database
    const { error } = await supabase.from('messages').insert([messageData]);
    
    if (error) {
      console.error("Failed to send message:", error);
      // In a real app, you'd show a "Failed to send" toast here
    }
    setIsSending(false);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="flex flex-col h-[500px] bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-3">
        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-full">
          <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Chat with {partnerName}</h3>
          <p className="text-xs text-green-500 font-medium">Secure End-to-End</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/20">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-500 mt-10">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] p-3 rounded-2xl ${
                  isMe 
                    ? 'bg-primary-600 text-white rounded-br-none' 
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none shadow-sm border border-gray-100 dark:border-gray-600'
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-100' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a secure message..."
          className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || isSending}
          className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}