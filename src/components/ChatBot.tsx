import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Volume2 } from 'lucide-react';
import { useData } from '../contexts/RealDataContext';
import OpenAI from 'openai';

// Configure OpenAI SDK (Groq/DeepSeek)
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
  dangerouslyAllowBrowser: true
});

// --- SOUND UTILS ---
const SOUNDS = {
  ding: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  alert: 'https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3'
};

const playSound = (type: 'ding' | 'alert') => {
  try {
    const audio = new Audio(SOUNDS[type]);
    audio.volume = type === 'alert' ? 1.0 : 0.5;
    audio.play().catch(e => console.log("Audio play failed (user interaction needed first):", e));
  } catch (error) {
    console.error("Audio error:", error);
  }
};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm GlucoSense AI. I can analyze your glucose trends and answer health questions. How can I help?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { currentGlucose, currentMotion, alerts, hypoLimit, hyperLimit, updateThresholds } = useData();

  // --- 1. HANDLE HIGH GLUCOSE ALERTS (LOUD SOUND) ---
  useEffect(() => {
    if (alerts.length > 0 && alerts[0].severity === 'high') {
      const latestAlert = alerts[0];
      const alreadyShown = messages.some(m => m.text.includes(latestAlert.message));

      if (!alreadyShown) {
        playSound('alert');
        setIsOpen(true);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: `⚠️ ALERT: ${latestAlert.message}. Do you need guidance on how to handle this?`,
          sender: 'bot',
          timestamp: new Date(),
        }]);
      }
    }
  }, [alerts, messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input;
    setInput('');

    const userMessage: Message = { id: Date.now().toString(), text: userText, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are GlucoSense AI, an advanced medical assistant for a diabetic patient.
            CURRENT GLUCOSE: ${Math.round(currentGlucose)} mg/dL.
            CURRENT ACTIVITY: ${currentMotion}.
            CURRENT LIMITS: Hypoglycemia < ${hypoLimit}, Hyperglycemia > ${hyperLimit}.
            
            STRICT INSTRUCTIONS:
            1. CONTEXTUAL ADVICE: Always analyze the patient's CURRENT ACTIVITY and CURRENT GLUCOSE before answering. (e.g., If they ask for a snack while 'Running' with dropping glucose, advise quick carbs. If 'Resting' with high glucose, advise water/movement).
            2. DEMOGRAPHIC INFERENCE: If the patient provides their age, height, and weight and asks for limit recommendations, calculate estimated safe clinical thresholds for BOTH hypoglycemia and hyperglycemia based on standard medical guidelines for their body type.
            3. TOOL USE: If the patient asks to change limits (or asks you to set them based on their demographics), YOU MUST use the 'update_glucose_thresholds' tool. If they only mention one limit, keep the other at its current value.
            
            Keep all text answers concise (under 3 sentences). Never prescribe exact medication dosages.`
          },
          ...messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          } as any)),
          { role: "user", content: userText }
        ],
        temperature: 0.7,
        tools: [
          {
            type: "function",
            function: {
              name: "update_glucose_thresholds",
              description: "Updates the patient's personal hypoglycemia and hyperglycemia thresholds.",
              parameters: {
                type: "object",
                properties: {
                  hypo_limit: { type: "number", description: "The new low threshold (e.g., 70)" },
                  hyper_limit: { type: "number", description: "The new high threshold (e.g., 170)" }
                },
                required: ["hypo_limit", "hyper_limit"]
              }
            }
          }
        ],
        tool_choice: "auto",
      });

      const responseMessage = response.choices[0]?.message;

      // Intercept Tool Calls
      if (responseMessage?.tool_calls) {
        const toolCall = responseMessage.tool_calls[0];
        const args = JSON.parse((toolCall as any).function.arguments);

        // 1. Actually update the database and the React Context!
        await updateThresholds(args.hypo_limit, args.hyper_limit);
        playSound('ding');

        // 2. Generate a manual confirmation message
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: `Got it! Based on your profile and request, I have updated your personal limits. Hypoglycemia is now set to ${args.hypo_limit} mg/dL and Hyperglycemia to ${args.hyper_limit} mg/dL. The dashboard will use these numbers for all future alerts.`,
          sender: 'bot',
          timestamp: new Date(),
        }]);

      } else {
        // Standard Text Response
        const aiText = responseMessage?.content || "I'm having trouble thinking right now.";
        playSound('ding');
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: aiText,
          sender: 'bot',
          timestamp: new Date(),
        }]);
      }

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "I'm having trouble connecting to the AI. Please check your internet or API Key.",
        sender: 'bot',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-teal-500 p-4 flex justify-between items-center shadow-md">
              <div className="flex items-center space-x-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">GlucoSense AI</h3>
                  <p className="text-white/80 text-xs">Voice & Sound Enabled</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${message.sender === 'user'
                    ? 'bg-primary-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-600'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p className={`text-[10px] mt-1.5 ${message.sender === 'user' ? 'text-primary-100' : 'text-gray-400'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <div className="flex justify-start text-xs text-gray-400 ml-2">
                  GlucoSense is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about your glucose levels..."
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white outline-none"
                  disabled={isTyping}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                >
                  {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-primary-600 to-teal-500 text-white rounded-full shadow-2xl z-50 group"
      >
        <MessageCircle className="w-7 h-7" />
        {alerts.length > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </motion.button>
    </>
  );
}