import type { AnalyticsEventName, AnalyticsEvents } from '~/types/analytics'

export function useAnalytics() {
  const track = <Event extends AnalyticsEventName>(event: Event, data: AnalyticsEvents[Event]) => {
    if (!import.meta.client) return
    window.umami?.track(event, data)
  }

  return { track }
}
