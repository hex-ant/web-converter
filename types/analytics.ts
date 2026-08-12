import type { BackdropMode, Workflow } from './media'

export interface AnalyticsEvents {
  tool_selected: {
    workflow: Workflow
  }
  processing_started: {
    workflow: Workflow
    preset: string
    outputFormat: string
    backdrop?: BackdropMode
  }
  processing_completed: {
    workflow: Workflow
    outputFormat: string
  }
  processing_failed: {
    workflow: Workflow
  }
  download_clicked: {
    workflow: Workflow
    outputFormat: string
  }
}

export type AnalyticsEventName = keyof AnalyticsEvents

export interface UmamiTracker {
  track: (event: string, data?: Record<string, unknown>) => void
}

declare global {
  interface Window {
    umami?: UmamiTracker
  }
}
