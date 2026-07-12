import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface GlucoseDataPoint {
  timestamp: string;
  value: number;
  type: 'normal' | 'high' | 'low';
  motion_state: string;
}

export interface VitalSigns {
  heartRate: number;
  bloodPressure: { systolic: number; diastolic: number };
  temperature: number;
}

interface RealDataContextType {
  glucoseData: GlucoseDataPoint[];
  currentGlucose: number;
  currentMotion: string;
  vitals: VitalSigns;
  alerts: Array<{ id: string; message: string; severity: 'low' | 'medium' | 'high'; timestamp: string }>;
  hypoLimit: number;
  hyperLimit: number;
  updateThresholds: (hypo: number, hyper: number) => Promise<void>;
  addAlert: (message: string, severity: 'low' | 'medium' | 'high') => void;
  clearAlert: (id: string) => void;
}

const RealDataContext = createContext<RealDataContextType | undefined>(undefined);

export function RealDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [glucoseData, setGlucoseData] = useState<GlucoseDataPoint[]>([]);
  const [currentGlucose, setCurrentGlucose] = useState(0);
  const [currentMotion, setCurrentMotion] = useState('Resting / Standing');
  const [alerts, setAlerts] = useState<Array<{ id: string; message: string; severity: 'low' | 'medium' | 'high'; timestamp: string }>>([]);
  
  // Dynamic Limits State
  const [hypoLimit, setHypoLimit] = useState(70);
  const [hyperLimit, setHyperLimit] = useState(180);

  // Added setVitals here so we can update it dynamically!
  const [vitals, setVitals] = useState<VitalSigns>({
    heartRate: 72,
    bloodPressure: { systolic: 120, diastolic: 80 },
    temperature: 98.6,
  });

  const addAlert = useCallback((message: string, severity: 'low' | 'medium' | 'high') => {
    const newAlert = { id: Date.now().toString(), message, severity, timestamp: new Date().toISOString() };
    setAlerts(prev => [newAlert, ...prev].slice(0, 10));
  }, []);

  const clearAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  // Function to permanently update limits in DB and State
  const updateThresholds = async (hypo: number, hyper: number) => {
    if (!user) return;
    setHypoLimit(hypo);
    setHyperLimit(hyper);
    
    await supabase
      .from('profiles')
      .update({ hypo_limit: hypo, hyper_limit: hyper })
      .eq('id', user.id);
  };

  useEffect(() => {
    if (!user) return;

    const fetchInitialData = async () => {
      // 1. Fetch user's personal limits
      const { data: profile } = await supabase
        .from('profiles')
        .select('hypo_limit, hyper_limit')
        .eq('id', user.id)
        .single();

      const currentHypo = profile?.hypo_limit || 70;
      const currentHyper = profile?.hyper_limit || 180;
      setHypoLimit(currentHypo);
      setHyperLimit(currentHyper);

      // 2. Fetch history including the new heart_rate column
      const { data, error } = await supabase
        .from('glucose_readings')
        .select('created_at, glucose_level, motion_state, heart_rate')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        // Update vitals with the absolute latest heart rate (data[0] is the newest)
        const latestHR = data[0].heart_rate || 72;
        setVitals(prev => ({ ...prev, heartRate: latestHR }));

        const formattedData = data.reverse().map(reading => {
          let type: 'normal' | 'high' | 'low' = 'normal';
          if (reading.glucose_level < currentHypo) type = 'low';
          if (reading.glucose_level > currentHyper) type = 'high';

          return {
            timestamp: reading.created_at,
            value: reading.glucose_level,
            type,
            motion_state: reading.motion_state || 'Resting / Standing'
          };
        });

        setGlucoseData(formattedData);
        setCurrentGlucose(formattedData[formattedData.length - 1].value);
        setCurrentMotion(formattedData[formattedData.length - 1].motion_state);
      }
    };

    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime_glucose')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'glucose_readings', filter: `patient_id=eq.${user.id}` },
        (payload) => {
          const newReading = payload.new;
          const newValue = newReading.glucose_level;
          const newMotion = newReading.motion_state || 'Resting / Standing';
          const newHR = newReading.heart_rate || 0; // Grab the live BPM
          
          let type: 'normal' | 'high' | 'low' = 'normal';
          
          if (newValue < hypoLimit) {
            type = 'low';
            addAlert(`Hypoglycemia Alert: Glucose level ${Math.round(newValue)} mg/dL is below your safe threshold of ${hypoLimit}!`, 'high');
          } else if (newValue > hyperLimit) {
            type = 'high';
            addAlert(`Hyperglycemia Alert: Glucose level ${Math.round(newValue)} mg/dL is above your safe threshold of ${hyperLimit}!`, 'high');
          }

          setGlucoseData(prev => [...prev, { timestamp: newReading.created_at, value: newValue, type, motion_state: newMotion }].slice(-50));
          setCurrentGlucose(newValue);
          setCurrentMotion(newMotion);

          // Update the UI Heart Rate card instantly
          if (newHR > 0) {
            setVitals(prev => ({ ...prev, heartRate: newHR }));
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, hypoLimit, hyperLimit, addAlert]);

  return (
    <RealDataContext.Provider value={{ glucoseData, currentGlucose, currentMotion, vitals, alerts, hypoLimit, hyperLimit, updateThresholds, addAlert, clearAlert }}>
      {children}
    </RealDataContext.Provider>
  );
}

export function useData() {
  const context = useContext(RealDataContext);
  if (context === undefined) throw new Error('useData must be used within a RealDataProvider');
  return context;
}