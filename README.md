# GlucoSense AI - Non-Invasive Glucose Monitoring System

A modern, responsive web dashboard for AI-driven non-invasive glucose monitoring using PPG (photoplethysmography) technology. Built with React, TypeScript, Tailwind CSS, Framer Motion, and Supabase.

## Features

### Authentication & Role-Based Access
- **Three User Roles**: Patient, Doctor, and Admin
- Secure authentication with Supabase
- Role-specific dashboards with tailored features

### Patient Dashboard
- **Live Glucose Monitoring**: Real-time glucose level visualization with Recharts
- **Simulation Controls**: Buttons to simulate hypoglycemia (low) and hyperglycemia (high) conditions
- **Vital Signs**: Display heart rate, blood pressure, and temperature
- **Nearest Hospitals**: Quick access to nearby medical facilities
- **AI Chatbot**: Floating chatbot widget with health advice and automatic alerts

### Doctor Dashboard
- **Patient Management**: View all assigned patients with risk status
- **Patient Detail View**: Click any patient to see their glucose history
- **Alert Center**: Real-time notifications for abnormal patient readings
- **Statistics Overview**: Quick stats on patient count and alerts

### Admin Dashboard
- **System Overview**: Total users, active sensors, and system statistics
- **User Management**: View and manage all users in the system
- **Patient Assignment**: Assign patients to doctors with modal interface

### UI/UX Features
- **Dark/Light Mode**: Toggle theme with persistent state
- **Responsive Design**: Mobile-first design that works on all screen sizes
- **Smooth Animations**: Framer Motion animations throughout
- **Medical-Grade Aesthetic**: Clean, professional design with blues and teals
- **Toast Notifications**: Visual alerts for critical glucose levels

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom color palette
- **Animations**: Framer Motion
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Routing**: React Router v6

## Database Schema

The application uses Supabase with the following tables:

1. **profiles** - User profiles with roles
2. **doctor_patient_assignments** - Links patients to doctors
3. **glucose_readings** - Historical glucose data
4. **alerts** - System alerts for abnormal readings

All tables have Row Level Security (RLS) policies ensuring:
- Patients can only access their own data
- Doctors can access their assigned patients' data
- Admins have full system access

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Supabase account and project

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. The database schema is already set up via migrations. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Usage Guide

### Creating Accounts

1. Navigate to the registration page
2. Enter your details and select a role (Patient, Doctor, or Admin)
3. Submit to create your account

### Patient Workflow

1. Log in as a patient
2. View your live glucose monitoring chart
3. Use simulation buttons to test alert system:
   - Click "Simulate Hypoglycemia" to drop glucose levels
   - Click "Simulate Hyperglycemia" to spike glucose levels
   - Click "Reset to Normal" to return to normal range
4. Monitor vital signs in the sidebar
5. Use the AI chatbot for health advice

### Doctor Workflow

1. Log in as a doctor
2. View all assigned patients in the patient list
3. Click on any patient to view their glucose history
4. Monitor the alert center for abnormal readings
5. Track statistics on your patient panel

### Admin Workflow

1. Log in as an admin
2. View system statistics on the dashboard
3. Browse the user management table
4. Click "Assign Patient to Doctor" to create assignments
5. Select a patient and doctor from the dropdowns
6. Confirm to create the assignment

## Mock Data System

The application includes a robust MockDataManager that:
- Generates continuous "live" glucose data every 2 seconds
- Simulates realistic vital signs fluctuations
- Triggers alerts when glucose levels are abnormal
- Supports manual simulation of high/low glucose scenarios

## Key Features Implementation

### Real-Time Glucose Monitoring
The glucose chart updates every 2 seconds with new data points, creating a live monitoring experience. The chart includes reference lines at 70 mg/dL (low threshold) and 180 mg/dL (high threshold).

### Alert System
When glucose levels go below 70 or above 180 mg/dL:
1. A toast notification appears
2. The chatbot automatically opens with a warning
3. Alerts are logged to the database
4. Doctors can see these alerts in their dashboard

### Theme Persistence
The dark/light mode preference is saved to localStorage and persists across sessions.

### Responsive Design
The application adapts to all screen sizes with:
- Mobile-friendly navigation menu
- Responsive grid layouts
- Touch-optimized controls

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.tsx
│   └── ChatBot.tsx
├── contexts/           # React contexts
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── MockDataContext.tsx
├── lib/                # Utilities and configurations
│   └── supabase.ts
├── pages/              # Page components
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── PatientDashboard.tsx
│   ├── DoctorDashboard.tsx
│   └── AdminDashboard.tsx
├── App.tsx            # Main app with routing
└── main.tsx           # Application entry point
```

## Security

- All database tables use Row Level Security (RLS)
- Passwords are hashed by Supabase Auth
- API keys are stored in environment variables
- Role-based access control on all routes

## Future Enhancements

- WebSocket integration for real-time multi-user updates
- Push notifications for mobile devices
- Historical data export (CSV/PDF)
- Integration with actual PPG sensors
- Machine learning predictions for glucose trends
- Medication tracking and reminders

## License

This project is part of a health technology demonstration and is not intended for medical use without proper certification and testing.

## Support

For questions or issues, please contact your system administrator.
