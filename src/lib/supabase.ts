import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'patient' | 'doctor' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface GlucoseReading {
  id: string;
  patient_id: string;
  glucose_level: number;
  reading_type: 'normal' | 'simulated_high' | 'simulated_low';
  heart_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  temperature?: number;
  recorded_at: string;
}

export interface Alert {
  id: string;
  patient_id: string;
  alert_type: 'hypoglycemia' | 'hyperglycemia';
  glucose_level: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DoctorPatientAssignment {
  id: string;
  doctor_id: string;
  patient_id: string;
  assigned_at: string;
}
