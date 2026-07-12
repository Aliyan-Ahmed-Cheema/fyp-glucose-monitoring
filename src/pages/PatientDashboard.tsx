import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Heart, TrendingUp, TrendingDown, Minus, MessageSquare, Footprints, User as UserIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useData } from '../contexts/RealDataContext'; 
import { useAuth } from '../contexts/AuthContext';
import { ChatBot } from '../components/ChatBot';
import { ChatWindow } from '../components/ChatWindow';
import { supabase } from '../lib/supabase';

export function PatientDashboard() {
  const { glucoseData, currentGlucose, currentMotion, vitals, alerts, hypoLimit, hyperLimit } = useData();
  const { profile } = useAuth();
  
  const [assignedDoctor, setAssignedDoctor] = useState<{ id: string, full_name: string } | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      const fetchDoctor = async () => {
        const { data: assignment } = await supabase
          .from('doctor_patient_assignments')
          .select('doctor_id')
          .eq('patient_id', profile.id)
          .single();

        if (assignment?.doctor_id) {
          const { data: doctorInfo } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', assignment.doctor_id)
            .single();

          if (doctorInfo) {
            setAssignedDoctor({ id: doctorInfo.id, full_name: doctorInfo.full_name });
          }
        }
      };
      fetchDoctor();
    }
  }, [profile]);

  const getGlucoseStatus = (value: number) => {
    if (value < hypoLimit) return { status: 'Low', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20', icon: TrendingDown };
    if (value > hyperLimit) return { status: 'High', color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20', icon: TrendingUp };
    return { status: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20', icon: Minus };
  };

  const getMotionUI = (motionType: string) => {
    if (motionType === 'Running') return { icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' };
    if (motionType === 'Walking') return { icon: Footprints, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' };
    return { icon: UserIcon, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' };
  };

  const glucoseStatus = getGlucoseStatus(currentGlucose);
  const StatusIcon = glucoseStatus.icon;
  
  const motionUI = getMotionUI(currentMotion);
  const MotionIcon = motionUI.icon;

  const chartData = glucoseData.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    glucose: Math.round(d.value),
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {profile?.full_name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's your health overview for today
          </p>
        </motion.div>

        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 space-y-2"
          >
            {alerts.slice(0, 2).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg ${
                  alert.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                  alert.severity === 'medium' ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
                  'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <p className={`text-sm font-medium ${
                  alert.severity === 'high' ? 'text-red-800 dark:text-red-200' :
                  alert.severity === 'medium' ? 'text-orange-800 dark:text-orange-200' :
                  'text-yellow-800 dark:text-yellow-200'
                }`}>
                  {alert.message}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          
          {/* LEFT COLUMN: Main Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 h-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Live Glucose Monitoring
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className={`px-4 py-2 rounded-full ${glucoseStatus.bgColor} flex items-center space-x-2`}>
                      <StatusIcon className={`w-5 h-5 ${glucoseStatus.color}`} />
                      <span className={`font-semibold ${glucoseStatus.color}`}>
                        {Math.round(currentGlucose)} mg/dL
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${glucoseStatus.color}`}>
                      {glucoseStatus.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-80 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="time"
                      stroke="#6b7280"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      tick={{ fontSize: 12 }}
                      domain={[40, 300]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <ReferenceLine y={hypoLimit} stroke="#ef4444" strokeDasharray="5 5" label="Low" />
                    <ReferenceLine y={hyperLimit} stroke="#f97316" strokeDasharray="5 5" label="High" />
                    <Line
                      type="monotone"
                      dataKey="glucose"
                      stroke="#1890ff"
                      strokeWidth={3}
                      dot={false}
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: Vitals and Chat */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Vitals Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Vital Signs & Activity
              </h3>
              <div className="space-y-4">
                <div className={`flex items-center justify-between p-4 rounded-xl ${motionUI.bg}`}>
                  <div className="flex items-center space-x-3">
                    <MotionIcon className={`w-8 h-8 ${motionUI.color}`} />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Current Activity</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {currentMotion}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Heart className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Heart Rate</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {Math.round(vitals.heartRate)} BPM
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Doctor Chat Section moved up to the right column! */}
            {assignedDoctor && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Clinical Support
                </h3>
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Contact Doctor</h3>
                      <p className="text-xs text-gray-500">{assignedDoctor.full_name}</p>
                    </div>
                  </div>
                  <span className="text-primary-600 text-sm font-medium bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg">
                    {showChat ? 'Close' : 'Open'}
                  </span>
                </button>

                <AnimatePresence>
                  {showChat && profile && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 overflow-hidden"
                    >
                      <ChatWindow
                        currentUserId={profile.id}
                        partnerId={assignedDoctor.id}
                        partnerName={assignedDoctor.full_name}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

        </div>
      </div>

      <ChatBot />
    </div>
  );
}