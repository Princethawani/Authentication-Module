import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('token_blacklist')
export class TokenBlacklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'text', unique: true })
  token: string;

  @Index()
  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}