import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';
import { useMockData } from '../contexts/MockDataContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const HEALTH_RESPONSES = [
  "Stay hydrated and monitor your glucose levels regularly.",
  "Consider checking your insulin dosage with your healthcare provider.",
  "Maintain a balanced diet with low glycemic index foods.",
  "Regular exercise can help regulate blood sugar levels.",
  "If symptoms persist, please consult your doctor immediately.",
  "Keep track of your carbohydrate intake throughout the day.",
  "Stress management is important for glucose control.",
];

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your GlucoSense AI assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentGlucose, alerts } = useMockData();

  useEffect(() => {
    if (alerts.length > 0 && alerts[0].severity === 'high') {
      setIsOpen(true);
      const latestAlert = alerts[0];
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: `⚠️ ${latestAlert.message}`,
        sender: 'bot',
        timestamp: new Date(),
      }]);
    }
  }, [alerts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    setTimeout(() => {
      let botResponse = HEALTH_RESPONSES[Math.floor(Math.random() * HEALTH_RESPONSES.length)];

      if (currentGlucose > 180) {
        botResponse = "Your glucose level is elevated. " + botResponse + " Consider reducing sugar intake.";
      } else if (currentGlucose < 70) {
        botResponse = "Your glucose level is low. " + botResponse + " Consume fast-acting carbs immediately.";
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    }, 500);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
          >
            <div className="bg-gradient-to-r from-primary-600 to-teal-500 p-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-6 h-6 text-white" />
                <h3 className="text-white font-semibold">AI Health Assistant</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleSend}
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-primary-600 to-teal-500 text-white rounded-full shadow-2xl hover:shadow-3xl transition-shadow z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>
    </>
  );
}
