export type CardValue = '0' | '1' | '2' | '3' | '5' | '8' | '13' | '21' | '?' | '☕'

export const FIBONACCI_DECK: { value: CardValue; label: string; description: string }[] = [
  { value: '0',  label: '0',  description: 'Already done / trivial' },
  { value: '1',  label: '1',  description: 'Extra small' },
  { value: '2',  label: '2',  description: 'Small' },
  { value: '3',  label: '3',  description: 'Medium-small' },
  { value: '5',  label: '5',  description: 'Medium' },
  { value: '8',  label: '8',  description: 'Large' },
  { value: '13', label: '13', description: 'Extra large' },
  { value: '21', label: '21', description: 'Epic / needs breakdown' },
  { value: '?',  label: '?',  description: 'Unsure / need info' },
  { value: '☕', label: '☕', description: 'Need a break' },
]

export interface Participant {
  id: string
  name: string
  vote: CardValue | null
  joinedAt: number
}

export interface Room {
  id: string
  name: string
  ownerId: string
  ownerName: string
  revealed: boolean
  round: number
  createdAt: number
  participants: Record<string, Participant>
}
