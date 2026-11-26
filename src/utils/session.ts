const USER_ID_KEY = 'scrum_poker_user_id'
const USER_NAME_KEY = 'scrum_poker_user_name'

/**
 * Persist the user ID in localStorage so returning to a room in a new tab
 * or after closing the browser restores the same seat (and Room Owner status).
 */
export function getOrCreateUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY) || sessionStorage.getItem(USER_ID_KEY)
  if (!id) {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    id = 'u_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  localStorage.setItem(USER_ID_KEY, id)
  sessionStorage.setItem(USER_ID_KEY, id)
  return id
}

export function getSavedUserName(): string {
  return localStorage.getItem(USER_NAME_KEY) || sessionStorage.getItem(USER_NAME_KEY) || ''
}

export function saveUserName(name: string): void {
  const trimmed = name.trim()
  localStorage.setItem(USER_NAME_KEY, trimmed)
  sessionStorage.setItem(USER_NAME_KEY, trimmed)
}
