import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

@Entity('two_factor_secrets')
export class TwoFactorSecret {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  userId: string;

  @Column({ type: 'text' })
  secret: string;

  @Column({ default: false })
  isEnabled: boolean;

  // Backup codes — stored as comma separated hashed values
  @Column({ type: 'text', nullable: true })
  backupCodes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}