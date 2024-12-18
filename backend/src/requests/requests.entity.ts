import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.entity';

@Entity('requests')
export class Request {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  user_id: string;

  @ApiProperty()
  @Column()
  media_id: number;

  @ApiProperty()
  @Column()
  media_type: number;

  @ApiProperty()
  @Column({ type: 'int', nullable: true })
  season?: number;

  @ApiProperty()
  @Column({ type: 'int', nullable: true })
  episode?: number;

  @ApiProperty()
  @Column({ default: 'Pending' })
  status: string;

  @ApiProperty()
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ApiProperty()
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.requests)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
