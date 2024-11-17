import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Request } from './request.entity';

export class RequestDto extends OmitType(Request, [
  'created_at',
  'updated_at',
  'user',
] as const) {
  @ApiProperty({ type: 'number' })
  media_id: number;

  @ApiProperty({ type: 'string' })
  user_id: string;

  @ApiProperty({ type: 'string' })
  status: string;

  @ApiProperty({ type: 'number' })
  media_type: number;

  @ApiProperty({ type: 'number', required: false })
  season?: number;

  static fromEntity(entity: Request): RequestDto {
    return {
      id: entity.id,
      media_id: entity.media_id,
      user_id: entity.user_id,
      status: entity.status,
      media_type: entity.media_type,
      season: entity.season,
    };
  }
}

export class CreateRequestDto extends PickType(Request, [
  'media_id',
  'user_id',
  'status',
  'media_type',
  'season',
] as const) {}

export class UpdateRequestDto extends PartialType(
  PickType(Request, [
    'status',
    'media_type',
    'season',
  ] as const),
) {}
