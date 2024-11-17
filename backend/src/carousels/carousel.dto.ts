import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Carousel } from './carousel.entity';

export class CarouselDto extends OmitType(Carousel, ['id'] as const) {
  @ApiProperty({ type: 'string' })
  carouselName: string;

  @ApiProperty({ type: [String], required: false })
  filterType: string[];

  @ApiProperty({ type: [String], required: false })
  genre: string[];

  @ApiProperty({ type: [String], required: false })
  tag: string[];  

  @ApiProperty({ type: [String], required: false })
  libraryPath: string[];

  @ApiProperty({ type: [String], required: false })
  studio: string[];

  @ApiProperty({ type: 'string', required: false })
  sortBy: string;

  @ApiProperty({ type: 'datetime' })
  created_at: Date;

  @ApiProperty({ type: 'datetime' })
  updated_at: Date;

  static fromEntity(entity: Carousel): CarouselDto {
    return {
      carouselName: entity.carouselName,
      filterType: entity.filterType,
      genre: entity.genre,
      tag: entity.tag,
      sortBy: entity.sortBy,
      libraryPath: entity.libraryPath,
      studio: entity.studio,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }
}

export class CreateCarouselDto extends PickType(Carousel, [
  'carouselName',
  'filterType',
  'genre',
  'tag',
  'sortBy',
  'libraryPath',
  'studio',
] as const) {}

export class UpdateCarouselDto extends PartialType(
  PickType(Carousel, [
    'carouselName',
    'filterType',
    'genre',
    'tag',
    'sortBy',
    'libraryPath',
    'studio',
  ] as const),
) {}
