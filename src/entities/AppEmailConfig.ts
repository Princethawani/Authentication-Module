import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('app_email_configs')
export class AppEmailConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  appId: string;

  @Column()
  appName: string;

  @Column()
  fromEmail: string;

  @Column()
  fromName: string;

  @Column()
  smtpHost: string;

  @Column({ default: 587 })
  smtpPort: number;

  @Column()
  smtpUsername: string;

  @Column()
  smtpPassword: string;

  @Column({ default: true })
  useTls: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}