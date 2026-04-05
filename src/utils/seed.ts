import 'reflect-metadata';
import { AppDataSource, connectDatabase, closeDatabase } from '../config/database';
import { Role } from '../entities/Role';
import { User } from '../entities/User';
import { UserRole } from '../entities/UserRole';
import { AppEmailConfig } from '../entities/AppEmailConfig';
import { env, BCRYPT_ROUNDS } from '../config/env';
import bcrypt from 'bcryptjs';

async function seed(): Promise<void> {
  console.log('Starting database seed...');

  await connectDatabase();

  const roleRepo = AppDataSource.getRepository(Role);
  const userRepo = AppDataSource.getRepository(User);
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const emailConfigRepo = AppDataSource.getRepository(AppEmailConfig);

  // ── Roles ─────────────────────────────────────────────────────────────────────

  console.log('Creating roles...');

  const roles = [
    { name: 'Admin', description: 'Full system access' },
    { name: 'User', description: 'Standard user access' },
    { name: 'Moderator', description: 'Moderation access' },
  ];

  for (const roleData of roles) {
    const existing = await roleRepo.findOne({
      where: { name: roleData.name },
    });

    if (!existing) {
      const role = roleRepo.create(roleData);
      await roleRepo.save(role);
      console.log(`Role created: ${roleData.name}`);
    } else {
      console.log(`Role already exists: ${roleData.name}`);
    }
  }

  // ── Admin User ────────────────────────────────────────────────────────────────

  console.log('Creating admin user...');

  const adminEmail = env.ADMIN_EMAIL || 'admin@authserver.com';
  const adminPassword = env.ADMIN_PASSWORD || 'Admin@123';

  const existingAdmin = await userRepo.findOne({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

    const admin = userRepo.create({
      email: adminEmail,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      isEmailVerified: true,
      isActive: true,
    });

    await userRepo.save(admin);

    // Assign Admin role
    const adminRole = await roleRepo.findOne({
      where: { name: 'Admin' },
    });

    if (adminRole) {
      const userRole = userRoleRepo.create({
        userId: admin.id,
        roleId: adminRole.id,
      });
      await userRoleRepo.save(userRole);
    }

    console.log(`Admin user created: ${adminEmail}`);
    console.log(`Default password: ${adminPassword}`);
    console.log(`Change this immediately in production!`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  // ── Default Email Config ───────────────────────────────────────────────────────

  console.log('Creating default email config...');

  const existingConfig = await emailConfigRepo.findOne({
    where: { appId: 'default' },
  });

  if (!existingConfig) {
    const emailConfig = emailConfigRepo.create({
      appId: 'default',
      appName: 'Auth Server',
      fromEmail: env.DEFAULT_FROM_EMAIL,
      fromName: 'Auth Server',
      smtpHost: env.SMTP_HOST,
      smtpPort: parseInt(env.SMTP_PORT),
      smtpUsername: env.SMTP_USERNAME,
      smtpPassword: env.SMTP_PASSWORD,
      useTls: true,
      isActive: true,
    });

    await emailConfigRepo.save(emailConfig);
    console.log('Default email config created');
  } else {
    console.log('Default email config already exists');
  }

  // ── Done ──────────────────────────────────────────────────────────────────────

  await closeDatabase();

  console.log('');
  console.log('Seed complete!');
  console.log('');
  console.log('  You can now run: npm run dev');
  console.log(`  Swagger UI:      http://localhost:${env.PORT}/docs`);
  console.log(`  Admin login:     ${adminEmail}`);
  console.log('');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});