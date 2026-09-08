import type { Lesson } from '../types'
import { urlShortenerTopic } from './url-shortener'

/**
 * Case Studies group — one file per topic, assembled here in sidebar order.
 */
export const caseStudies: Lesson[] = [...urlShortenerTopic]
