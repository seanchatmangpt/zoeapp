import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobType: text('job_type').notNull(),
  payload: text('payload').notNull(), // JSON stringified payload
  status: text('status')
    .notNull()
    .$type<'pending' | 'processing' | 'failed' | 'quarantined'>()
    .default('pending'),
  attempts: integer('attempts').notNull().default(0),
  entityId: text('entity_id'), // Serialization key to group/sequence actions on same entity
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type SyncJob = typeof syncQueue.$inferSelect;
export type NewSyncJob = typeof syncQueue.$inferInsert;
