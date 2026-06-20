import {
  IsString,IsNotEmpty,
} from 'class-validator';

/**
 * {
 *   "name": "meursault"
 * }
 */

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}