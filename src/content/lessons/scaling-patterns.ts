import type { Lesson } from '../types'
import { shardingTopic } from './sharding'
import { consistentHashingTopic } from './consistent-hashing'
import { capTopic } from './cap'

/**
 * Scaling Patterns group — one file per topic, assembled here in sidebar order.
 */
export const scalingPatterns: Lesson[] = [
  ...shardingTopic,
  ...consistentHashingTopic,
  ...capTopic,
]
