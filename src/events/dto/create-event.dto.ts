import {
  IsString,IsNotEmpty,IsOptional,IsEnum,
  IsDateString,IsArray,IsUUID,
} from 'class-validator';
import { EventStatus } from '../enums/event-status.enum';

/** Example format
 * {
      "title": "test",
      "description": "test" (optional),
      "status": "TODO"/"COMPLETED"/"IN_PROGRESS",
      "startTime": "2026-06-20T10:00:00Z",
      "endTime": "2026-06-20T11:30:00Z",
      "inviteeIds": [] (exact UUIDs)
    }
 * 
 */

export class CreateEventDto {

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(EventStatus) // Pass the enum object — not an array
  @IsNotEmpty() // Status is required per assignment spec
  status!: EventStatus;

  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  @IsDateString()
  @IsNotEmpty()
  endTime!: string;

  @IsArray()
  @IsOptional() // Optional so you can create an event first and invite people later
  @IsUUID('4', { each: true, message: 'Each invitee ID must be a valid UUIDv4' })
  inviteeIds?: string[];
}