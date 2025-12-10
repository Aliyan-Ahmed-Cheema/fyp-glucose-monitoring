import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface GlucoseDataPoint {
  timestamp: string;
  value: number;
  type: 'normal' | 'high' | 'low';
}

export interface VitalSigns {
  heartRate: number;
  bloodPressure: { systolic: number; diastolic: number };
  temperature: number;
}

interface MockDataContextType {
  glucoseData: GlucoseDataPoint[];
  currentGlucose: number;
  vitals: VitalSigns;
  alerts: Array<{ id: string; message: string; severity: 'low' | 'medium' | 'high'; timestamp: string }>;
  simulateHypoglycemia: () => void;
  simulateHyperglycemia: () => void;
  resetToNormal: () => void;
  addAlert: (message: string, severity: 'low' | 'medium' | 'high') => void;
  clearAlert: (id: string) => void;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

const NORMAL_RANGE = { min: 80, max: 120 };
const HYPOGLYCEMIA_THRESHOLD = 70;
const HYPERGLYCEMIA_THRESHOLD = 180;

export function MockDataProvider({ children }: { children: React.ReactNode }) {
  const [glucoseData, setGlucoseData] = useState<GlucoseDataPoint[]>([]);
  const [currentGlucose, setCurrentGlucose] = useState(95);
  const [targetGlucose, setTargetGlucose] = useState(95);
  const [simulationMode, setSimulationMode] = useState<'normal' | 'high' | 'low'>('normal');
  const [alerts, setAlerts] = useState<Array<{ id: string; message: string; severity: 'low' | 'medium' | 'high'; timestamp: string }>>([]);

  const [vitals, setVitals] = useState<VitalSigns>({
    heartRate: 72,
    bloodPressure: { systolic: 120, diastolic: 80 },
    temperature: 98.6,
  });

  const addAlert = useCallback((message: string, severity: 'low' | 'medium' | 'high') => {
    const newAlert = {
      id: Date.now().toString(),
      message,
      severity,
      timestamp: new Date().toISOString(),
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 10));
  }, []);

  const clearAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  useEffect(() => {
    const initialData: GlucoseDataPoint[] = [];
    const now = Date.now();
    for (let i = 30; i >= 0; i--) {
      initialData.push({
        timestamp: new Date(now - i * 60000).toISOString(),
        value: NORMAL_RANGE.min + Math.random() * (NORMAL_RANGE.max - NORMAL_RANGE.min),
        type: 'normal',
      });
    }
    setGlucoseData(initialData);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const drift = (Math.random() - 0.5) * 3;
      const newValue = currentGlucose + (targetGlucose - currentGlucose) * 0.15 + drift;

      setCurrentGlucose(Math.max(40, Math.min(300, newValue)));

      let type: 'normal' | 'high' | 'low' = 'normal';
      if (newValue < HYPOGLYCEMIA_THRESHOLD) {
        type = 'low';
        if (simulationMode !== 'low') {
          addAlert(
            `Hypoglycemia Alert: Glucose level ${Math.round(newValue)} mg/dL is below safe threshold!`,
            'high'
          );
        }
      } else if (newValue > HYPERGLYCEMIA_THRESHOLD) {
        type = 'high';
        if (simulationMode !== 'high') {
          addAlert(
            `Hyperglycemia Alert: Glucose level ${Math.round(newValue)} mg/dL is above safe threshold!`,
            'high'
          );
        }
      }

      setGlucoseData(prev => {
        const newData = [...prev, {
          timestamp: new Date().toISOString(),
          value: newValue,
          type,
        }];
        return newData.slice(-50);
      });

      setVitals(prev => ({
        heartRate: Math.max(60, Math.min(100, prev.heartRate + (Math.random() - 0.5) * 2)),
        bloodPressure: {
          systolic: Math.max(100, Math.min(140, prev.bloodPressure.systolic + (Math.random() - 0.5) * 1)),
          diastolic: Math.max(60, Math.min(90, prev.bloodPressure.diastolic + (Math.random() - 0.5) * 1)),
        },
        temperature: Math.max(97.5, Math.min(99.5, prev.temperature + (Math.random() - 0.5) * 0.1)),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [currentGlucose, targetGlucose, simulationMode, addAlert]);

  const simulateHypoglycemia = useCallback(() => {
    setTargetGlucose(55);
    setSimulationMode('low');
    addAlert('Simulating Hypoglycemia (Low Glucose)', 'high');
  }, [addAlert]);

  const simulateHyperglycemia = useCallback(() => {
    setTargetGlucose(220);
    setSimulationMode('high');
    addAlert('Simulating Hyperglycemia (High Glucose)', 'high');
  }, [addAlert]);

  const resetToNormal = useCallback(() => {
    setTargetGlucose(95);
    setSimulationMode('normal');
  }, []);

  return (
    <MockDataContext.Provider value={{
      glucoseData,
      currentGlucose,
      vitals,
      alerts,
      simulateHypoglycemia,
      simulateHyperglycemia,
      resetToNormal,
      addAlert,
      clearAlert,
    }}>
      {children}
    </MockDataContext.Provider>
  );
}

export function useMockData() {
  const context = useContext(MockDataContext);
  if (context === undefined) {
    throw new Error('useMockData must be used within a MockDataProvider');
  }
  return context;
}
