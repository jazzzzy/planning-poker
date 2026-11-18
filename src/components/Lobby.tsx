import { useState, type FormEvent } from 'react'
import { isFirebaseConfigured } from '../firebase'

interface LobbyProps {
  initialRoomCode: string
  initialUserName: string
  error: string | null
  loading: boolean
  onCreateRoom: (roomName: string, userName: string) => Promise<void>
  onJoinRoom: (roomCode: string, userName: string) => Promise<void>
}

export function Lobby({
  initialRoomCode,
  initialUserName,
  error,
  loading,
  onCreateRoom,
  onJoinRoom,
}: LobbyProps) {
  const [mode, setMode] = useState<'join' | 'create'>(initialRoomCode ? 'join' : 'create')
  const [userName, setUserName] = useState(initialUserName)
  const [roomName, setRoomName] = useState('Sprint Planning')
  const [roomCode, setRoomCode] = useState(initialRoomCode)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!userName.trim()) {
      setValidationError('Please enter your display name.')
      return
    }

    if (mode === 'create') {
      await onCreateRoom(roomName.trim() || 'Sprint Planning', userName.trim())
    } else {
      if (!roomCode.trim()) {
        setValidationError('Please enter a 6-character room code.')
        return
      }
      await onJoinRoom(roomCode.trim().toUpperCase(), userName.trim())
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#090d16] text-slate-100 relative overflow-hidden">
      {/* Subtle ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[130px]" />
        <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[130px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 font-extrabold text-lg text-white">
            8
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white">ScrumPoker</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
              Agile Estimation
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span
            className={`w-2 h-2 rounded-full ${
              isFirebaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span>
            {isFirebaseConfigured ? 'Connected to GCP Firestore' : 'Local Multi-Tab Sync Mode'}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left column: Hero description */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/70 text-xs font-medium text-indigo-300">
            <span>⚡ Real-time Fibonacci story point estimation</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Estimate stories with your team in{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              real time.
            </span>
          </h1>

          <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
            Join a planning room with your name, pick your Fibonacci card face-down, and let the room owner reveal everyone&apos;s estimates simultaneously to avoid anchoring bias.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-2 max-w-xl">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="text-indigo-400 font-bold text-sm mb-1">1. Create or Join</div>
              <div className="text-xs text-slate-400">
                Enter your name and share the room link or 6-letter code with your team.
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="text-indigo-400 font-bold text-sm mb-1">2. Pick a Card</div>
              <div className="text-xs text-slate-400">
                Everyone selects from the standard Fibonacci deck while cards stay face-down.
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="text-indigo-400 font-bold text-sm mb-1">3. Owner Reveals</div>
              <div className="text-xs text-slate-400">
                The room owner flips the cards and starts the next round with one click.
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Card Form */}
        <div className="lg:col-span-5">
          <div className="glass-panel rounded-2xl p-8">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('create')
                  setValidationError(null)
                }}
                className={`py-2.5 text-sm font-semibold rounded-lg transition cursor-pointer ${
                  mode === 'create'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create New Room
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('join')
                  setValidationError(null)
                }}
                className={`py-2.5 text-sm font-semibold rounded-lg transition cursor-pointer ${
                  mode === 'join'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Join with Code
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="userName"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                >
                  Your Display Name
                </label>
                <input
                  id="userName"
                  type="text"
                  maxLength={32}
                  placeholder="e.g. Alex"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>

              {mode === 'create' ? (
                <div>
                  <label
                    htmlFor="roomName"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                  >
                    Room / Sprint Name
                  </label>
                  <input
                    id="roomName"
                    type="text"
                    maxLength={60}
                    placeholder="e.g. Sprint 42 Refinement"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    You will be the <span className="text-indigo-300 font-medium">Room Owner</span> and can reveal cards &amp; start new rounds.
                  </p>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="roomCode"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                  >
                    Room Code
                  </label>
                  <input
                    id="roomCode"
                    type="text"
                    maxLength={10}
                    placeholder="e.g. K7X9P2"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white font-mono tracking-widest uppercase placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              )}

              {(validationError || error) && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {validationError || error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Connecting...</span>
                ) : mode === 'create' ? (
                  <span>Create Room &amp; Enter Table →</span>
                ) : (
                  <span>Join Planning Table →</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-8 py-5 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/60">
        <span>Scrum Planning Poker • Standard Fibonacci Deck</span>
        <span>Hosted on Google Cloud / Firebase</span>
      </footer>
    </div>
  )
}
