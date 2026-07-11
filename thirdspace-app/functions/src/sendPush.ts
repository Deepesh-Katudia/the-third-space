import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk'

const expo = new Expo()

export interface PushMessage {
  to: string
  title: string
  body: string
  data: Record<string, unknown>
}

export function truncateBody(text: string, max = 140): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

// Sends the messages and returns the tokens that Expo reported as no longer registered.
export async function sendPush(messages: PushMessage[]): Promise<string[]> {
  const valid = messages.filter((m) => Expo.isExpoPushToken(m.to))
  if (valid.length === 0) return []

  const dead: string[] = []
  const chunks = expo.chunkPushNotifications(valid as unknown as ExpoPushMessage[])
  for (const chunk of chunks) {
    const tickets = (await expo.sendPushNotificationsAsync(chunk)) as ExpoPushTicket[]
    tickets.forEach((ticket, i) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        dead.push((chunk[i] as unknown as PushMessage).to)
      }
    })
  }
  return dead
}
