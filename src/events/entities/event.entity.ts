import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { EventStatus } from '../../events/enums/event-status.enum';


@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
    id!: string;

  @Column()
    title!: string;

  @Column({
    nullable: true,
  })
  description?: string;

  @Column({
        type: 'enum',
        enum: EventStatus,
        default: EventStatus.TODO,
    })
    status!: EventStatus;

  @Column({
        name: 'start_time',
        type: 'timestamp',
    })
    startTime!: Date;

  @Column({
        name: 'end_time',
        type: 'timestamp',
    })
    endTime!: Date;

  @ManyToMany(() => User, (user) => user.events, {
        eager: false,
    })
    @JoinTable({
        name: 'event_invitees',
        joinColumn: {
            name: 'event_id',
            referencedColumnName: 'id',
        },
        inverseJoinColumn: {
            name: 'user_id',
            referencedColumnName: 'id',
        },
    })
    invitees!: User[];

  @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

  @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;
}
