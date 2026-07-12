import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, AlertCircle, TrendingUp, TrendingDown, Activity, Eye, Bell, MessageSquare } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DoctorChatBot } from '../components/DoctorChatBot';
import { ChatWindow } from '../components/ChatWindow';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';

// 1. Added personalized limits to the Patient interface
interface PatientWithStatus extends Profile {
  riskStatus: 'normal' | 'high' | 'low';
  latestGlucose: number;
  hypoLimit: number;
  hyperLimit: number;
}

interface ChartDataPoint {
  time: string;
  glucose: number;
}

interface LocalAlert {
  id: string;
  patientName: string;
  message: string;
  severity: 'high' | 'low';
  timestamp: Date;
}

export function DoctorDashboard() {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<PatientWithStatus[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithStatus | null>(null);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<ChartDataPoint[]>([]);
  const [alerts, setAlerts] = useState<LocalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showChat, setShowChat] = useState(false);

  // Close chat and fetch new history when doctor selects a different patient
  useEffect(() => {
    setShowChat(false);
    if (selectedPatient) {
      fetchPatientHistory(selectedPatient.id);
    }
  }, [selectedPatient]);

  // Initial Data Load
  useEffect(() => {
    if (profile?.id) {
      fetchPatientsAndLatestReadings();
    }
  }, [profile]);

  // Realtime Subscription for ALL assigned patients
  useEffect(() => {
    if (!profile?.id || patients.length === 0) return;

    const patientIds = patients.map(p => p.id);

    const channel = supabase
      .channel('doctor_realtime_view')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'glucose_readings' },
        (payload) => {
          const newReading = payload.new;
          
          if (patientIds.includes(newReading.patient_id)) {
            const val = newReading.glucose_level;
            
            // Grab the specific patient to check THEIR custom limits
            const patient = patients.find(p => p.id === newReading.patient_id);
            if (!patient) return;

            const hypo = patient.hypoLimit;
            const hyper = patient.hyperLimit;
            
            // 1. Update the Patient List's latest reading & risk status dynamically
            setPatients(prev => prev.map(p => {
              if (p.id === newReading.patient_id) {
                let risk: 'normal' | 'high' | 'low' = 'normal';
                if (val < hypo) risk = 'low';
                if (val > hyper) risk = 'high';
                return { ...p, latestGlucose: val, riskStatus: risk };
              }
              return p;
            }));

            // 2. Generate an alert if it's out of THEIR specific bounds
            if (val < hypo || val > hyper) {
              const newAlert: LocalAlert = {
                id: Date.now().toString(),
                patientName: patient.full_name || 'Unknown',
                message: val < hypo ? `${val} mg/dL - Hypoglycemia` : `${val} mg/dL - Hyperglycemia`,
                severity: val < hypo ? 'low' : 'high',
                timestamp: new Date()
              };
              setAlerts(prev => [newAlert, ...prev].slice(0, 10)); // Keep last 10
            }

            // 3. Update currently selected patient's chart
            if (selectedPatient && selectedPatient.id === newReading.patient_id) {
              setSelectedPatientHistory(prev => {
                const newPoint = {
                  time: new Date(newReading.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  glucose: Math.round(val)
                };
                return [...prev, newPoint].slice(-24);
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, patients, selectedPatient]);


  const fetchPatientsAndLatestReadings = async () => {
    try {
      const { data: assignments } = await supabase
        .from('doctor_patient_assignments')
        .select('patient_id')
        .eq('doctor_id', profile!.id);

      if (assignments && assignments.length > 0) {
        const patientIds = assignments.map(a => a.patient_id);
        
        // Fetch profiles, which now includes the dynamic limits
        const { data: patientsData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', patientIds);

        const patientsWithStatus = await Promise.all((patientsData || []).map(async (p) => {
          const { data: reading } = await supabase
            .from('glucose_readings')
            .select('glucose_level')
            .eq('patient_id', p.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const glucose = reading ? reading.glucose_level : 0;
          
          // 2. Default to 70/180 if the patient hasn't customized their limits yet
          const hypo = p.hypo_limit || 70;
          const hyper = p.hyper_limit || 180;
          
          let riskStatus: 'normal' | 'high' | 'low' = 'normal';
          if (glucose > 0 && glucose < hypo) riskStatus = 'low';
          else if (glucose > hyper) riskStatus = 'high';

          return {
            ...p,
            riskStatus,
            latestGlucose: glucose,
            hypoLimit: hypo,
            hyperLimit: hyper
          };
        }));

        setPatients(patientsWithStatus);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientHistory = async (patientId: string) => {
    const { data, error } = await supabase
      .from('glucose_readings')
      .select('created_at, glucose_level')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(24);

    if (error) {
      console.error("Error fetching history", error);
      return;
    }

    if (data) {
      const formatted = data.reverse().map(d => ({
        time: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        glucose: Math.round(d.glucose_level)
      }));
      setSelectedPatientHistory(formatted);
    }
  };

  const getRiskBadge = (status: string) => {
    switch (status) {
      case 'high':
        return { text: 'High Risk', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: TrendingUp };
      case 'low':
        return { text: 'Low Risk', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: TrendingDown };
      default:
        return { text: 'Normal', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: Activity };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading live patient data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Doctor Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your patients and monitor their health
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{patients.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Live Alerts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{alerts.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Normal Status</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {patients.filter(p => p.riskStatus === 'normal' && p.latestGlucose > 0).length}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Patient List
            </h2>

            {patients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No patients assigned yet
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {patients.map((patient) => {
                  const badge = getRiskBadge(patient.riskStatus);
                  const BadgeIcon = badge.icon;

                  return (
                    <motion.div
                      key={patient.id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 border rounded-xl hover:shadow-md transition-all cursor-pointer ${
                        selectedPatient?.id === patient.id 
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {patient.full_name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${badge.color}`}>
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.text}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{patient.email}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-900 dark:text-white font-medium">
                            {patient.latestGlucose > 0 ? `${Math.round(patient.latestGlucose)} mg/dL` : 'No Data'}
                          </span>
                          <Eye className={`w-4 h-4 ${selectedPatient?.id === patient.id ? 'text-primary-600' : 'text-gray-400'}`} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Bell className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Live Actionable Alerts
                </h2>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    No active alerts at this time
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg ${
                        alert.severity === 'high'
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                          : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                      }`}
                    >
                      <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                        {alert.patientName} - {alert.severity === 'low' ? 'Low Glucose' : 'High Glucose'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <AnimatePresence>
              {selectedPatient && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    {selectedPatient.full_name}'s Recent History
                  </h3>
                  
                  {selectedPatientHistory.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-10">No readings available yet.</p>
                  ) : (
                    <div className="h-64 mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedPatientHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} />
                          <YAxis domain={[40, 300]} stroke="#6b7280" tick={{ fontSize: 10 }} />
                          <Tooltip />
                          {/* 3. The reference lines now pull directly from the selected patient's custom limits! */}
                          <ReferenceLine y={selectedPatient.hypoLimit} stroke="#ef4444" strokeDasharray="5 5" label="Low" />
                          <ReferenceLine y={selectedPatient.hyperLimit} stroke="#f97316" strokeDasharray="5 5" label="High" />
                          <Line
                            type="monotone"
                            dataKey="glucose"
                            stroke="#1890ff"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <button
                      onClick={() => setShowChat(!showChat)}
                      className="w-full p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 flex justify-between items-center hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                          <MessageSquare className="w-5 h-5 text-indigo-700 dark:text-indigo-300" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">
                            Message {selectedPatient.full_name}
                          </h3>
                          <p className="text-sm text-indigo-600 dark:text-indigo-300/70">
                            Send direct clinical instructions
                          </p>
                        </div>
                      </div>
                      <span className="text-indigo-700 dark:text-indigo-300 font-medium bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm">
                        {showChat ? 'Hide Chat' : 'Open Chat'}
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
                            partnerId={selectedPatient.id}
                            partnerName={selectedPatient.full_name}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
      <DoctorChatBot patients={patients as any} alerts={alerts as any} />
    </div>
  );
}