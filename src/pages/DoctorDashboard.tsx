import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, AlertCircle, TrendingUp, TrendingDown, Activity, Eye, Bell } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DoctorChatBot } from '../components/DoctorChatBot';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile, Alert } from '../lib/supabase';

interface PatientWithStatus extends Profile {
  riskStatus: 'normal' | 'high' | 'low';
  latestGlucose: number;
}

export function DoctorDashboard() {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<PatientWithStatus[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithStatus | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchPatients();
      fetchAlerts();
    }
  }, [profile]);

  const fetchPatients = async () => {
    try {
      const { data: assignments } = await supabase
        .from('doctor_patient_assignments')
        .select('patient_id')
        .eq('doctor_id', profile!.id);

      if (assignments && assignments.length > 0) {
        const patientIds = assignments.map(a => a.patient_id);
        const { data: patientsData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', patientIds);

        const patientsWithStatus: PatientWithStatus[] = (patientsData || []).map(p => {
          const glucose = 80 + Math.random() * 120;
          let riskStatus: 'normal' | 'high' | 'low' = 'normal';
          if (glucose < 70) riskStatus = 'low';
          else if (glucose > 180) riskStatus = 'high';

          return {
            ...p,
            riskStatus,
            latestGlucose: glucose,
          };
        });

        setPatients(patientsWithStatus);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const { data: assignments } = await supabase
        .from('doctor_patient_assignments')
        .select('patient_id')
        .eq('doctor_id', profile!.id);

      if (assignments && assignments.length > 0) {
        const patientIds = assignments.map(a => a.patient_id);
        const { data: alertsData } = await supabase
          .from('alerts')
          .select('*')
          .in('patient_id', patientIds)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(10);

        setAlerts(alertsData || []);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const mockGlucoseHistory = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    glucose: 80 + Math.random() * 80,
  }));

  const getRiskBadge = (status: string) => {
    switch (status) {
      case 'high':
        return {
          text: 'High Risk',
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
          icon: TrendingUp,
        };
      case 'low':
        return {
          text: 'Low Risk',
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
          icon: TrendingDown,
        };
      default:
        return {
          text: 'Normal',
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
          icon: Activity,
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading patients...</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Alerts</p>
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
                  {patients.filter(p => p.riskStatus === 'normal').length}
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
              <div className="space-y-4">
                {patients.map((patient) => {
                  const badge = getRiskBadge(patient.riskStatus);
                  const BadgeIcon = badge.icon;

                  return (
                    <motion.div
                      key={patient.id}
                      whileHover={{ scale: 1.02 }}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-all cursor-pointer"
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
                            {Math.round(patient.latestGlucose)} mg/dL
                          </span>
                          <Eye className="w-4 h-4 text-primary-600" />
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
                  Recent Alerts
                </h2>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    No active alerts
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg ${
                        alert.severity === 'high'
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                          : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {alert.alert_type === 'hypoglycemia' ? 'Low Glucose' : 'High Glucose'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {new Date(alert.created_at).toLocaleString()}
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
                    {selectedPatient.full_name}'s Glucose History
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockGlucoseHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                        <Tooltip />
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
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
      <DoctorChatBot patients={patients} alerts={alerts} />
    </div>
  );
}
