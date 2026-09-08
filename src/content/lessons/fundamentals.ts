import type { Lesson } from '../types'
import { clientServerModel } from './client-server'
import { latencyThroughputTopic } from './latency'
import { scalingStrategies } from './scaling'

/**
 * Fundamentals group — one file per topic, assembled here in sidebar order.
 */
export const fundamentals: Lesson[] = [
  ...clientServerModel,
  ...latencyThroughputTopic,
  ...scalingStrategies,
]
