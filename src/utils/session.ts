const USER_ID_KEY = 'scrum_poker_user_id'
const USER_NAME_KEY = 'scrum_poker_user_name'

/**
 * Note: We store the user ID in sessionStorage by default so opening a second tab
 * on the same desktop lets you test multiple participants easily, while persisting across page reloads.
 */
export function getOrCreateUserId(): string {
  let id = sessionStorage.getItem(USER_ID_KEY)
  if (!id) {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    id = 'u_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    sessionStorage.setItem(USER_ID_KEY, id)
  }
  return id
}

export function getSavedUserName(): string {
  return sessionStorage.getItem(USER_NAME_KEY) || localStorage.getItem(USER_NAME_KEY) || ''
}

export function saveUserName(name: string): void {
  const trimmed = name.trim()
  sessionStorage.setItem(USER_NAME_KEY, trimmed)
  localStorage.setItem(USER_NAME_KEY, trimmed)
}
