export const QUEUE_NAMES = {
  EMAILS: 'emails',
  WEBHOOKS: 'webhooks',
  ANALYTICS: 'analytics',
  NOTIFICATIONS: 'notifications',
  CLEANUP: 'cleanup',
} as const;

export const QUEUE_EVENTS = {
  JOB_COMPLETED: 'completed',
  JOB_FAILED: 'failed',
  JOB_PROGRESS: 'progress',
  JOB_STALLED: 'stalled',
} as const;

export const QUEUE_JOB_NAMES = {
  EMAILS: {
    SEND_EMAIL: 'send-email',
  },
  WEBHOOKS: {
    DELIVER_WEBHOOK: 'deliver-webhook',
  },
  ANALYTICS: {
    ROLLUP: 'rollup',
  },
  NOTIFICATIONS: {
    SEND_NOTIFICATION: 'send-notification',
  },
  CLEANUP: {
    CLEANUP: 'cleanup',
  },
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
