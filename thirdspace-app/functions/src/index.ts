import { initializeApp } from 'firebase-admin/app'

initializeApp()

// Trigger functions are exported here as they are implemented:
export { onNewDirectMessage } from './onNewDirectMessage'
export { onNewAnnouncement } from './onNewAnnouncement'
// export { onNewFollow } from './onNewFollow'
