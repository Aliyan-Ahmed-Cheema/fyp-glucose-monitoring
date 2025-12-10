/*
  # Glucose Monitoring System Database Schema

  ## Overview
  Creates a complete database schema for the AI-Driven Non-Invasive Glucose Monitoring System
  with support for three user roles: Patient, Doctor, and Admin.

  ## New Tables
  
  ### `profiles`
  User profile information extending Supabase auth.users
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'patient', 'doctor', or 'admin'
  - `phone` (text, optional) - Contact number
  - `avatar_url` (text, optional) - Profile picture URL
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `doctor_patient_assignments`
  Maps patients to their assigned doctor (one patient per doctor)
  - `id` (uuid, primary key) - Unique assignment ID
  - `doctor_id` (uuid) - References profiles(id) for doctor
  - `patient_id` (uuid) - References profiles(id) for patient
  - `assigned_at` (timestamptz) - Assignment timestamp
  - Unique constraint on patient_id (one doctor per patient)

  ### `glucose_readings`
  Historical glucose readings from sensors
  - `id` (uuid, primary key) - Unique reading ID
  - `patient_id` (uuid) - References profiles(id)
  - `glucose_level` (numeric) - Glucose level in mg/dL
  - `reading_type` (text) - 'normal', 'simulated_high', 'simulated_low'
  - `heart_rate` (integer, optional) - Heart rate in BPM
  - `blood_pressure_systolic` (integer, optional) - Systolic BP
  - `blood_pressure_diastolic` (integer, optional) - Diastolic BP
  - `temperature` (numeric, optional) - Body temperature in °F
  - `recorded_at` (timestamptz) - Reading timestamp

  ### `alerts`
  System alerts for abnormal readings
  - `id` (uuid, primary key) - Unique alert ID
  - `patient_id` (uuid) - References profiles(id)
  - `alert_type` (text) - 'hypoglycemia' or 'hyperglycemia'
  - `glucose_level` (numeric) - Glucose level that triggered alert
  - `severity` (text) - 'low', 'medium', 'high'
  - `message` (text) - Alert message
  - `is_read` (boolean) - Whether alert has been acknowledged
  - `created_at` (timestamptz) - Alert creation timestamp

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Patients can only access their own data
  - Doctors can access their assigned patients' data
  - Admins have full access to all data
  - All policies check authentication and role-based permissions
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create doctor_patient_assignments table
CREATE TABLE IF NOT EXISTS doctor_patient_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(patient_id)
);

-- Create glucose_readings table
CREATE TABLE IF NOT EXISTS glucose_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  glucose_level numeric NOT NULL,
  reading_type text DEFAULT 'normal' CHECK (reading_type IN ('normal', 'simulated_high', 'simulated_low')),
  heart_rate integer,
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  temperature numeric,
  recorded_at timestamptz DEFAULT now()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('hypoglycemia', 'hyperglycemia')),
  glucose_level numeric NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_doctor_patient_doctor ON doctor_patient_assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_patient ON doctor_patient_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_glucose_patient ON glucose_readings(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_patient ON alerts(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(patient_id, is_read) WHERE is_read = false;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_patient_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Doctors can view their patients"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_assignments dpa
      INNER JOIN profiles doc ON dpa.doctor_id = doc.id
      WHERE dpa.patient_id = profiles.id 
      AND doc.id = auth.uid() 
      AND doc.role = 'doctor'
    )
  );

-- RLS Policies for doctor_patient_assignments
CREATE POLICY "Doctors can view their assignments"
  ON doctor_patient_assignments FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Patients can view their assignment"
  ON doctor_patient_assignments FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Admins can view all assignments"
  ON doctor_patient_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create assignments"
  ON doctor_patient_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update assignments"
  ON doctor_patient_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete assignments"
  ON doctor_patient_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for glucose_readings
CREATE POLICY "Patients can view own readings"
  ON glucose_readings FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Patients can insert own readings"
  ON glucose_readings FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Doctors can view their patients' readings"
  ON glucose_readings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_assignments dpa
      WHERE dpa.patient_id = glucose_readings.patient_id 
      AND dpa.doctor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all readings"
  ON glucose_readings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for alerts
CREATE POLICY "Patients can view own alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Patients can update own alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can insert own alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Doctors can view their patients' alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_assignments dpa
      WHERE dpa.patient_id = alerts.patient_id 
      AND dpa.doctor_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can update their patients' alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_assignments dpa
      WHERE dpa.patient_id = alerts.patient_id 
      AND dpa.doctor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();