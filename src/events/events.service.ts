import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { User } from '../users/entities/users.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { EventStatus } from './enums/event-status.enum';
import { In } from 'typeorm';


@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Requirement: Create a new task (event)
   */
  async create(createEventDto: CreateEventDto): Promise<Event> {
    try {
      const { inviteeIds, ...eventDetails } = createEventDto;
      const event = this.eventsRepository.create(eventDetails);

      if (inviteeIds && inviteeIds.length > 0) {
        // Fetch real User entities matching the incoming array of UUIDs
        const users = await this.usersRepository.findBy({ id: In(inviteeIds) });
        event.invitees = users;
      } else {
        event.invitees = [];
      }

      return await this.eventsRepository.save(event);
    } catch (error) {
      throw new InternalServerErrorException(`Failed to create event: ${error}`);
    }
  }

  /**
   * Requirement: Retrieve a task (event) by its id
   */
  async findOne(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: { invitees: true }, // Eagerly load the users invited to this event
    });
    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }
    return event;
  }

  /**
   * Requirement: Delete a task (event) by its id
   */
  async remove(id: string): Promise<void> {
    const result = await this.eventsRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }
  }

async mergeAllForUser(userId: string): Promise<Event[]> {
    // 1. Fetch user and their events (with invitees eagerly loaded)
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: {
        events: {
          invitees: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const userEvents = user.events;
    if (!userEvents || userEvents.length <= 1) {
      return userEvents || []; // Nothing to merge
    }

    // 2. Sort events strictly ascending by start time
    const sortedEvents = [...userEvents].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Helpers to track what needs to go to the database
    const untouchedEvents: Event[] = [];
    const eventsToSaveAsNew: Event[] = [];
    const eventIdsToDelete: string[] = [];

    // Helper to get priority (lower number = higher priority)
    const getStatusPriority = (status: EventStatus): number => {
      switch (status) {
        case EventStatus.TODO: return 0;
        case EventStatus.IN_PROGRESS: return 1;
        case EventStatus.COMPLETED: return 2;
        default: return 99; // Fallback
      }
    };

    // 3. Sliding window to cluster overlaps
    let currentCluster = [sortedEvents[0]];
    let clusterEnd = new Date(sortedEvents[0].endTime).getTime();

    const processCluster = (cluster: Event[]) => {
      if (cluster.length === 1) {
        // REQUIREMENT: Events that do not overlap remain completely untouched
        untouchedEvents.push(cluster[0]);
      } else {
        // REQUIREMENT: Merge overlapping events into a brand new event
        const mergedEvent = new Event();
        
        // Calculate bounds
        const startTimes = cluster.map(e => new Date(e.startTime).getTime());
        const endTimes = cluster.map(e => new Date(e.endTime).getTime());
        mergedEvent.startTime = new Date(Math.min(...startTimes));
        mergedEvent.endTime = new Date(Math.max(...endTimes));

        // REQUIREMENT: Append titles and descriptions
        mergedEvent.title = cluster.map(e => e.title).join(' + ');
        mergedEvent.description = cluster
          .map(e => e.description)
          .filter(desc => desc && desc.trim() !== '') // Ignore empty descriptions
          .join('\n\n');

        // REQUIREMENT: Status priority logic (0: TODO, 1: IN_PROGRESS, 2: COMPLETED)
        const highestPriorityEvent = cluster.reduce((prev, curr) => {
          return getStatusPriority(curr.status) < getStatusPriority(prev.status) ? curr : prev;
        });
        mergedEvent.status = highestPriorityEvent.status;

        // REQUIREMENT: Combine all invitees
        const uniqueInviteesMap = new Map<string, User>();
        cluster.forEach((e) => {
          e.invitees?.forEach((u) => uniqueInviteesMap.set(u.id, u));
        });
        mergedEvent.invitees = Array.from(uniqueInviteesMap.values());

        // Queue for database operations
        eventsToSaveAsNew.push(mergedEvent);
        cluster.forEach(e => eventIdsToDelete.push(e.id));
      }
    };

    // 4. Iterate and group into clusters
    for (let i = 1; i < sortedEvents.length; i++) {
      const nextEvent = sortedEvents[i];
      const nextStart = new Date(nextEvent.startTime).getTime();
      const nextEnd = new Date(nextEvent.endTime).getTime();

      // REQUIREMENT: STRICT OVERLAP (nextStart < clusterEnd). 
      // Boundary touching (e.g., 5:45 and 5:45) is NOT an overlap.
      if (nextStart < clusterEnd) {
        currentCluster.push(nextEvent);
        if (nextEnd > clusterEnd) clusterEnd = nextEnd;
      } else {
        // No overlap. Process the finalized cluster, and start a new one.
        processCluster(currentCluster);
        currentCluster = [nextEvent];
        clusterEnd = nextEnd;
      }
    }
    // Don't forget to process the final cluster after the loop ends
    processCluster(currentCluster);

    // 5. Database Transaction to execute safely
    return await this.eventsRepository.manager.transaction(async (manager) => {
      // Destroy the old fragments
      if (eventIdsToDelete.length > 0) {
        await manager.delete(Event, eventIdsToDelete);
      }

      // Save the newly merged events
      const savedMergedEvents: Event[] = [];
      for (const ev of eventsToSaveAsNew) {
        // TypeORM will automatically generate new IDs and set fresh createdAt/updatedAt 
        savedMergedEvents.push(await manager.save(Event, ev));
      }

      // Re-sort the final returned list so it looks clean to the user
      const finalResult = [...untouchedEvents, ...savedMergedEvents];
      return finalResult.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    });
  }

}