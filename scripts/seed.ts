import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    const users = [
      {
        email: 'admin@gmail.com',
        password: 'password123',
        full_name: 'Admin User',
        role: 'admin' as const,
      },
      {
        email: 'doctortest@gmail.com',
        password: 'password123',
        full_name: 'Dr. Test Doctor',
        role: 'doctor' as const,
      },
      {
        email: 'patienttest@gmail.com',
        password: 'password123',
        full_name: 'John Patient',
        role: 'patient' as const,
      },
    ];

    const createdUsers: Record<string, string> = {};

    for (const user of users) {
      console.log(`Creating ${user.role}: ${user.email}...`);

      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (error) {
        console.error(`❌ Error creating user ${user.email}:`, error.message);
        continue;
      }

      if (data.user) {
        createdUsers[user.role] = data.user.id;
        console.log(`✓ Created auth user with ID: ${data.user.id}`);

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
          });

        if (profileError) {
          console.error(`❌ Error creating profile for ${user.email}:`, profileError.message);
        } else {
          console.log(`✓ Created profile for ${user.email}\n`);
        }
      }
    }

    if (createdUsers.doctor && createdUsers.patient) {
      console.log('Creating doctor-patient assignment...');

      const { error: assignmentError } = await supabase
        .from('doctor_patient_assignments')
        .insert({
          doctor_id: createdUsers.doctor,
          patient_id: createdUsers.patient,
        });

      if (assignmentError) {
        console.error('❌ Error creating assignment:', assignmentError.message);
      } else {
        console.log('✓ Created doctor-patient assignment\n');
      }
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📝 Test Account Credentials:\n');
    console.log('Admin:');
    console.log('  Email: admin@gmail.com');
    console.log('  Password: password123\n');
    console.log('Doctor:');
    console.log('  Email: doctortest@gmail.com');
    console.log('  Password: password123\n');
    console.log('Patient:');
    console.log('  Email: patienttest@gmail.com');
    console.log('  Password: password123\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
