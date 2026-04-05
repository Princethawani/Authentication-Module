import { DataSource } from 'typeorm';
import { env, DB_PORT } from './env';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  synchronize: env.NODE_ENV === 'development',
  logging: env.NODE_ENV === 'development',

  // Dev — TypeScript source files
  // Prod — compiled JavaScript files
  entities:
    env.NODE_ENV === 'development'
      ? ['src/**/entities/*.ts']
      : ['dist/**/entities/*.js'],

  migrations:
    env.NODE_ENV === 'development'
      ? ['src/migrations/*.ts']
      : ['dist/migrations/*.js'],

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