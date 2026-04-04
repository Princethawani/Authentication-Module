import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env, DB_PORT } from './env';

import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { UserRole } from '../entities/UserRole';
import { RefreshToken } from '../entities/RefreshToken';
import { TokenBlacklist } from '../entities/TokenBlacklist';
import { AppEmailConfig } from '../entities/AppEmailConfig';
import { ActivityLog } from '../entities/ActivityLog';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,

  // In production set this to false and use migrations instead
  synchronize: env.NODE_ENV === 'development',

  logging: env.NODE_ENV === 'development',

  entities: [
    User,
    Role,
    UserRole,
    RefreshToken,
    TokenBlacklist,
    AppEmailConfig,
    ActivityLog,
  ],

  migrations: ['dist/migrations/*.js'],

  ssl: env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

export async function connectDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Database disconnected cleanly');
  }
}