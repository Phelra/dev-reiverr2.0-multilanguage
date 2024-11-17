import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('carousels')
export class Carousel {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  carouselName: string;

  @ApiProperty({ type: [String], isArray: true })
  @Column('simple-json', { nullable: true })
  filterType: string[];

  @ApiProperty({ type: [String], isArray: true })
  @Column('simple-json', { nullable: true })
  genre: string[];

  @ApiProperty({ type: [String], isArray: true })
  @Column('simple-json', { nullable: true })
  tag: string[];

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ nullable: true })
  sortBy: string;

  @ApiProperty({ type: [String], isArray: true })
  @Column('simple-json', { nullable: true })
  libraryPath: string[];

  @ApiProperty({ type: [String], isArray: true })
  @Column('simple-json', { nullable: true })
  studio: string[];

  @ApiProperty({ type: 'datetime' })
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ApiProperty({ type: 'datetime' })
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
