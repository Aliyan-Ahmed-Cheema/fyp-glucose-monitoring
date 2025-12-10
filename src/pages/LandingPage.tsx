import { motion } from 'framer-motion';
import { Activity, Heart, Brain, Shield, Zap, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Heart,
      title: 'Non-Invasive PPG Technology',
      description: 'Monitor glucose levels without painful finger pricks using advanced photoplethysmography sensors.',
    },
    {
      icon: Brain,
      title: 'AI-Powered Predictions',
      description: 'Machine learning algorithms predict glucose trends and provide proactive health insights.',
    },
    {
      icon: Zap,
      title: 'Real-Time Monitoring',
      description: 'Get instant updates on glucose levels with continuous 24/7 monitoring and alerts.',
    },
    {
      icon: Shield,
      title: 'Medical-Grade Accuracy',
      description: 'Clinically validated technology ensuring reliable and precise glucose measurements.',
    },
    {
      icon: Users,
      title: 'Doctor-Patient Portal',
      description: 'Seamless collaboration between patients and healthcare providers for better care.',
    },
    {
      icon: Activity,
      title: 'Comprehensive Analytics',
      description: 'Track vital signs, glucose patterns, and receive personalized health recommendations.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-primary-600 to-teal-500 rounded-3xl">
              <Activity className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            GlucoSense AI
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-300 mb-4">
            Next-Generation Non-Invasive Glucose Monitoring
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Revolutionary AI-driven platform for continuous glucose monitoring using advanced PPG technology.
            Experience pain-free monitoring with medical-grade accuracy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-gradient-to-r from-primary-600 to-teal-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Get Started
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border-2 border-primary-600 dark:border-primary-400 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Create Account
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 * index, duration: 0.5 }}
              whileHover={{ y: -10 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all"
            >
              <div className="p-3 bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-900 dark:to-teal-900 rounded-xl w-fit mb-4">
                <feature.icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="bg-gradient-to-r from-primary-600 to-teal-500 rounded-3xl p-12 text-center text-white"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Health Monitoring?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of patients and healthcare providers using GlucoSense AI
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/register')}
            className="px-10 py-4 bg-white text-primary-600 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Start Free Trial
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
