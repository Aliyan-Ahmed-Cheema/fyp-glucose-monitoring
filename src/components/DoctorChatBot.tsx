import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Stethoscope } from 'lucide-react';
import OpenAI from 'openai';
import { Alert } from '../lib/supabase';

// --- TYPES (Match your Dashboard) ---
interface PatientWithStatus {
  id: string;
  full_name: string;
  riskStatus: 'normal' | 'high' | 'low';
  latestGlucose: number;
}

interface DoctorChatBotProps {
  patients: PatientWithStatus[];
  alerts: Alert[];
}

// --- CONFIG ---
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_GROQ_API_KEY, 
  baseURL: 'https://api.groq.com/openai/v1',
  dangerouslyAllowBrowser: true
});

const SOUNDS = {
  ding: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  alert: 'https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3'
};

const playSound = (type: 'ding' | 'alert') => {
  try {
    const audio = new Audio(SOUNDS[type]);
    audio.volume = type === 'alert' ? 1.0 : 0.5;
    audio.play().catch(e => console.log("Audio play failed", e));
  } catch (error) {
    console.error("Audio error:", error);
  }
};

export function DoctorChatBot({ patients, alerts }: DoctorChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      text: "Dr. AI Assistant online. I have analyzed your patient list. How can I assist you?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- AUTO-ALERT ON HIGH RISK ---
  // If a new high-severity alert comes in, notify the doctor immediately
  useEffect(() => {
    const highRiskAlerts = alerts.filter(a => a.severity === 'high');
    if (highRiskAlerts.length > 0) {
      const latest = highRiskAlerts[0];
      const alreadyNotified = messages.some(m => m.text.includes(latest.message));
      
      if (!alreadyNotified) {
        playSound('alert');
        setIsOpen(true);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: `🚨 CRITICAL ALERT: ${latest.message}. Please review immediately.`,
          sender: 'bot',
          timestamp: new Date(),
        }]);
      }
    }
  }, [alerts]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input;
    setInput('');

    // 1. Add User Message
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: new Date(),
    }]);
    setIsTyping(true);

    try {
      // 2. PREPARE CONTEXT FOR AI
      // We convert the patient list to a simple string so the AI can "read" it
      const patientContext = patients.map(p => 
        `- ${p.full_name}: ${Math.round(p.latestGlucose)}mg/dL (${p.riskStatus})`
      ).join('\n');

      const alertContext = alerts.map(a => 
        `- ${a.alert_type} alert: ${a.message} (${a.severity})`
      ).join('\n');

      // 3. CALL AI
      const response = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a Medical Assistant AI for a Doctor.
            
            HERE IS YOUR CURRENT PATIENT DATA:
            ${patientContext || "No patients assigned."}

            HERE ARE ACTIVE ALERTS:
            ${alertContext || "No active alerts."}

            YOUR JOB:
            1. Answer questions about specific patients (e.g., "How is John doing?").
            2. Identify high-risk patients when asked (e.g., "Who needs attention?").
            3. Summarize the overall ward status.
            4. Be professional, concise, and accurate. Do not make up data.`
          },
          ...messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          })),
          { role: "user", content: userText }
        ],
        temperature: 0.5, // Lower temperature for more factual accuracy
      });

      const aiText = response.choices[0]?.message?.content || "I couldn't process that request.";

      playSound('ding');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: aiText,
        sender: 'bot',
        timestamp: new Date(),
      }]);

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "System Error: Unable to reach AI analysis service.",
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
            className="fixed bottom-24 left-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200 dark:border-gray-700"
          >
            {/* Doctor Header - Different Color (Blue/Indigo) */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-4 flex justify-between items-center shadow-md">
              <div className="flex items-center space-x-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                    <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm">Doctor's Assistant</h3>
                    <p className="text-white/80 text-xs">Patient Analysis Active</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${
                      message.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-600'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                    <p className={`text-[10px] mt-1.5 ${message.sender === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
              {isTyping && <div className="text-xs text-gray-400 ml-2">Analyzing patient data...</div>}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about high risk patients..."
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white outline-none"
                  disabled={isTyping}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button (Left Side for Doctor) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 p-4 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-full shadow-2xl z-50 group"
      >
        <Stethoscope className="w-7 h-7" />
        {alerts.length > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </motion.button>
    </>
  );
}