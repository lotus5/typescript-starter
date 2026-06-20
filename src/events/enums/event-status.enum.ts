export enum EventStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export const STATUS_PRIORITY: Record<EventStatus, number> = {
  [EventStatus.COMPLETED]: 2,
  [EventStatus.IN_PROGRESS]: 1,
  [EventStatus.TODO]: 0,
};
