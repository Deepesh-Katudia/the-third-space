export interface NotificationData {
  type?: string
  convId?: string
  eventId?: string
  uid?: string
}

export interface RouteObject {
  pathname: string
  params: Record<string, string>
}

export function routeForNotification(data: NotificationData): RouteObject | null {
  switch (data.type) {
    case 'dm':
      return data.convId ? { pathname: '/(app)/chat/[id]', params: { id: data.convId } } : null
    case 'announcement':
      return data.eventId ? { pathname: '/(app)/event/[id]', params: { id: data.eventId } } : null
    case 'follow':
      return data.uid ? { pathname: '/(app)/member/[uid]', params: { uid: data.uid } } : null
    default:
      return null
  }
}
