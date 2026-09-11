import type { Config } from '@portfolio/types/payload-types'

declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}
