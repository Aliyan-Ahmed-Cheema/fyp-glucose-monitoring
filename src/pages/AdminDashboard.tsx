import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Activity, Link2, X, UserMinus, HeartPulse } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';

// 1. Extend the profile to include the new physical demographics
interface ExtendedProfile extends Profile {
  age?: number;
  gender?: number;
  height?: number;
  weight?: number;
}

export function AdminDashboard() {
  const [users, setUsers] = useState<ExtendedProfile[]>([]);
  const [doctors, setDoctors] = useState<ExtendedProfile[]>([]);
  const [patients, setPatients] = useState<ExtendedProfile[]>([]);
  const [assignedPatientIds, setAssignedPatientIds] = useState<Set<string>>(new Set());
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all users
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch existing assignments to find out who is unassigned
      const { data: assignments } = await supabase
        .from('doctor_patient_assignments')
        .select('patient_id');

      if (allUsers) {
        setUsers(allUsers);
        setDoctors(allUsers.filter(u => u.role === 'doctor'));
        setPatients(allUsers.filter(u => u.role === 'patient'));
      }

      if (assignments) {
        setAssignedPatientIds(new Set(assignments.map(a => a.patient_id)));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPatient = async () => {
    if (!selectedPatient || !selectedDoctor) return;

    try {
      const { error } = await supabase
        .from('doctor_patient_assignments')
        .insert({
          doctor_id: selectedDoctor,
          patient_id: selectedPatient,
        });

      if (error) {
        if (error.code === '23505') throw new Error("This patient is already assigned to a doctor!");
        throw error;
      }

      setShowAssignModal(false);
      setSelectedPatient('');
      setSelectedDoctor('');
      alert('Patient assigned successfully!');
      fetchData(); // Refresh the stats and list
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const unassignedCount = patients.length - assignedPatientIds.size;

  const stats = [
    {
      title: 'Total Users',
      value: users.length,
      icon: Users,
      color: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    },
    {
      title: 'Active Doctors',
      value: doctors.length,
      icon: Activity,
      color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
    },
    {
      title: 'Total Patients',
      value: patients.length,
      icon: HeartPulse,
      color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    },
    {
      title: 'Unassigned Patients', // Replaced the fake sensor stat!
      value: unassignedCount > 0 ? unassignedCount : 0,
      icon: UserMinus,
      color: unassignedCount > 0 
        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' // Turns red if action needed!
        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', 
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                System overview and user management
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAssignModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-teal-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <Link2 className="w-5 h-5" />
              <span>Assign Patient to Doctor</span>
            </motion.button>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              User Management
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  {/* NEW DEMOGRAPHICS COLUMN */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Demographics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.full_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        user.role === 'doctor' ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400' :
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    
                    {/* DEMOGRAPHICS LOGIC */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.role === 'patient' ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.age ? `${user.age} yrs` : 'N/A'} • {user.gender?.toString() === '1' ? 'Male' : user.gender?.toString() === '0' ? 'Female' : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Ht: {user.height ? `${user.height}cm` : '-'} | Wt: {user.weight ? `${user.weight}kg` : '-'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-600">-</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Assign Patient to Doctor
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Patient
                </label>
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Choose a patient...</option>
                  {patients.map((patient) => {
                    const isAssigned = assignedPatientIds.has(patient.id);
                    return (
                      <option key={patient.id} value={patient.id}>
                        {isAssigned ? '✓ ' : '⚠️ '} {patient.full_name} {isAssigned ? '(Assigned)' : '(Needs Doctor)'}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Doctor
                </label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Choose a doctor...</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignPatient}
                  disabled={!selectedPatient || !selectedDoctor}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}