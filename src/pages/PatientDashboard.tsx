import { motion } from 'framer-motion';
import { Activity, Heart, Droplet, Thermometer, MapPin, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useMockData } from '../contexts/MockDataContext';
import { useAuth } from '../contexts/AuthContext';
import { ChatBot } from '../components/ChatBot';

export function PatientDashboard() {
  const { glucoseData, currentGlucose, vitals, simulateHypoglycemia, simulateHyperglycemia, resetToNormal, alerts } = useMockData();
  const { profile } = useAuth();

  const getGlucoseStatus = (value: number) => {
    if (value < 70) return { status: 'Low', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20', icon: TrendingDown };
    if (value > 180) return { status: 'High', color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20', icon: TrendingUp };
    return { status: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20', icon: Minus };
  };

  const glucoseStatus = getGlucoseStatus(currentGlucose);
  const StatusIcon = glucoseStatus.icon;

  const chartData = glucoseData.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    glucose: Math.round(d.value),
  }));

  const hospitals = [
    { name: 'City General Hospital', distance: '2.3 km', time: '8 min' },
    { name: 'St. Mary Medical Center', distance: '3.1 km', time: '12 min' },
    { name: 'Community Health Clinic', distance: '4.5 km', time: '15 min' },
  ];

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
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
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
                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 5" label="Low" />
                    <ReferenceLine y={180} stroke="#f97316" strokeDasharray="5 5" label="High" />
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

              <div className="flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={simulateHypoglycemia}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Simulate Hypoglycemia (Low)
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={simulateHyperglycemia}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                >
                  Simulate Hyperglycemia (High)
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetToNormal}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Reset to Normal
                </motion.button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Vital Signs
              </h3>
              <div className="space-y-4">
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

                <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Activity className="w-8 h-8 text-primary-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Blood Pressure</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {Math.round(vitals.bloodPressure.systolic)}/{Math.round(vitals.bloodPressure.diastolic)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Thermometer className="w-8 h-8 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Temperature</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {vitals.temperature.toFixed(1)}°F
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <MapPin className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Nearest Hospitals
                </h3>
              </div>
              <div className="space-y-3">
                {hospitals.map((hospital, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                      {hospital.name}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{hospital.distance}</span>
                      <span>{hospital.time}</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full mt-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors"
                    >
                      Navigate
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <ChatBot />
    </div>
  );
}
