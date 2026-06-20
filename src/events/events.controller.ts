import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Param, 
  HttpCode, 
  HttpStatus, 
  ParseUUIDPipe 
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Event } from './entities/event.entity';

@Controller('events') // Fulfills the requirement that endpoints live at /tasks
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * Requirement: Create a new task (event)
   * POST /events
   */
  @Post()
  @HttpCode(HttpStatus.CREATED) // Returns 201 Created
  async create(@Body() createEventDto: CreateEventDto): Promise<Event> {
    return await this.eventsService.create(createEventDto);
  }

  /**
   * Requirement: Retrieve a task by its id
   * GET /events/:id
   */
  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<Event> {
    return await this.eventsService.findOne(id);
  }

  /**
   * Requirement: Delete a task by its id
   * DELETE /events/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Returns 204 No Content for a successful deletion
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return await this.eventsService.remove(id);
  }

  /**
   * Requirement: Merge all overlapping events for a specific user
   * POST /events/merge/:userId
   */
  @Post('merge/:userId')
  @HttpCode(HttpStatus.OK) // Returns 200 OK
  async mergeAll(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<Event[]> {
    return await this.eventsService.mergeAllForUser(userId);
  }
}