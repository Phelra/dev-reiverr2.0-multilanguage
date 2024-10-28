import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { User } from './user.entity';
import { Request } from '../requests/request.entity';

export class UserDto extends OmitType(User, [
  'password',
  'profilePicture',
] as const) {
  @ApiProperty({ type: 'string' })
  profilePicture: string | null;

  @ApiProperty({ type: () => [Request], required: false }) 
  requests?: Request[];

  static fromEntity(entity: User): UserDto {
    return {
      id: entity.id,
      name: entity.name,
      isAdmin: entity.isAdmin,
      settings: entity.settings,
      onboardingDone: entity.onboardingDone,
      profilePicture:
        'data:image;base64,' + entity.profilePicture?.toString('base64'),
      requests: entity.requests,
    };
  }
}

export class CreateUserDto extends PickType(User, [
  'name',
  'password',
  'isAdmin',
] as const) {
  @ApiProperty({ type: 'string', required: false })
  profilePicture?: string;
}

export class UpdateUserDto extends PartialType(
  PickType(User, [
    'settings',
    'onboardingDone',
    'name',
    'password',
    'isAdmin',
  ] as const),
) {
  @ApiProperty({ type: 'string', required: false })
  profilePicture?: string;

  @ApiProperty({ type: 'string', required: false })
  oldPassword?: string;
}

export class SignInDto extends PickType(User, ['name', 'password'] as const) {}
