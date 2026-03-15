import type { Config } from '@saiver/types/payload-types'

declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}
