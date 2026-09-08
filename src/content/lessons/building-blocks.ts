import type { Lesson } from '../types'
import { caching } from './caching'
import { loadBalancerTopic } from './load-balancer'
import { apiGatewayTopic } from './api-gateway'
import { messageQueueTopic } from './message-queue'
import { rateLimiterTopic } from './rate-limiter'
import { replicationTopic } from './replication'

/**
 * Building Blocks group — one file per topic, assembled here in sidebar order.
 */
export const buildingBlocks: Lesson[] = [
  ...loadBalancerTopic,
  ...caching,
  ...apiGatewayTopic,
  ...messageQueueTopic,
  ...rateLimiterTopic,
  ...replicationTopic,
]
