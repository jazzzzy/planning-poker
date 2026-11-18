import { useState } from 'react'
import { FIBONACCI_DECK, type CardValue, type Participant, type Room } from '../types'
import { isFirebaseConfigured } from '../firebase'

interface PokerRoomProps {
  room: Room
  currentUserId: string
  onSelectCard: (vote: CardValue | null) => Promise<void>
  onRevealCards: () => Promise<void>
  onNewRound: () => Promise<void>
  onLeaveRoom: () => Promise<void>
}

export function PokerRoom({
  room,
  currentUserId,
  onSelectCard,
  onRevealCards,
  onNewRound,
  onLeaveRoom,
}: PokerRoomProps) {
  const [copiedType, setCopiedType] = useState<'link' | 'code' | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  const isOwner = room.ownerId === currentUserId
  const currentParticipant = room.participants[currentUserId]
  const currentVote = currentParticipant?.vote ?? null

  const participantsList: Participant[] = Object.values(room.participants).sort(
    (a, b) => a.joinedAt - b.joinedAt
  )

  const votedCount = participantsList.filter((p) => p.vote !== null).length
  const totalParticipants = participantsList.length

  // Compute numeric statistics when cards are revealed
  const numericVotes = participantsList
    .map((p) => p.vote)
    .filter((v): v is CardValue => v !== null && !Number.isNaN(Number(v)))
    .map((v) => Number(v))

  const averageVote =
    numericVotes.length > 0
      ? (numericVotes.reduce((acc, n) => acc + n, 0) / numericVotes.length).toFixed(1)
      : null

  const allAgree =
    numericVotes.length > 1 && numericVotes.every((v) => v === numericVotes[0])

  // Vote breakdown counts for revealed summary
  const voteCounts = participantsList.reduce<Record<string, number>>((acc, p) => {
    if (p.vote !== null) {
      acc[p.vote] = (acc[p.vote] || 0) + 1
    }
    return acc
  }, {})

  const handleCopyInviteLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${room.id}`
    await navigator.clipboard.writeText(url)
    setCopiedType('link')
    setTimeout(() => setCopiedType(null), 2000)
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(room.id)
    setCopiedType('code')
    setTimeout(() => setCopiedType(null), 2000)
  }

  const handleCardClick = async (value: CardValue) => {
    if (room.revealed) return
    const nextValue = currentVote === value ? null : value
    await onSelectCard(nextValue)
  }

  const handleOwnerAction = async (action: 'reveal' | 'reset') => {
    if (!isOwner || actionBusy) return
    setActionBusy(true)
    try {
      if (action === 'reveal') {
        await onRevealCards()
      } else {
        await onNewRound()
      }
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#090d16] text-slate-100 select-none">
      {/* Top Header Bar */}
      <header className="w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between gap-4">
          {/* Left: Room Title & Round Badge */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-extrabold text-lg text-white shadow-md shadow-indigo-600/30">
              8
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-bold text-lg text-white">{room.name}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold">
                  Round #{room.round || 1}
                </span>
                {!isFirebaseConfigured && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Local Tab Sync
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Room Owner:{' '}
                <span className="text-slate-200 font-medium">{room.ownerName}</span>
                {isOwner && (
                  <span className="ml-1.5 text-indigo-400 font-semibold">(You)</span>
                )}
              </p>
            </div>
          </div>

          {/* Right: Shareable Room Code, Copy Invite Link & Leave */}
          <div className="flex items-center gap-3">
            {/* Room Code Pill */}
            <button
              type="button"
              onClick={handleCopyCode}
              title="Click to copy Room Code"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-medium transition cursor-pointer"
            >
              <span className="text-slate-400">Code:</span>
              <span className="font-mono font-bold text-sm tracking-wider text-indigo-300">
                {room.id}
              </span>
              <span className="text-[11px] text-slate-400">
                {copiedType === 'code' ? '✓ Copied' : 'Copy'}
              </span>
            </button>

            {/* Copy Direct Invite URL */}
            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-xs font-semibold transition cursor-pointer"
            >
              {copiedType === 'link' ? '✓ Invite Link Copied!' : '🔗 Copy Invite Link'}
            </button>

            {/* Current user badge */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-medium">
                {currentParticipant?.name}
              </span>
            </div>

            <button
              type="button"
              onClick={onLeaveRoom}
              className="px-3.5 py-2 rounded-xl bg-slate-800/70 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 border border-slate-700/80 text-slate-400 text-xs font-medium transition cursor-pointer"
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      {/* Center Section: Poker Table & Participants Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-8 flex flex-col items-center justify-center gap-8">
        {/* The Central Poker Table */}
        <div className="w-full max-w-4xl poker-table-felt rounded-[48px] px-10 py-8 flex flex-col items-center justify-between gap-6 border border-slate-700/60">
          {/* Table Status Header */}
          <div className="w-full flex items-center justify-between text-xs text-slate-400">
            <span>
              Participants ({totalParticipants}) •{' '}
              <strong className="text-slate-200">
                {votedCount} of {totalParticipants}
              </strong>{' '}
              ready
            </span>
            <span className="uppercase tracking-widest font-semibold text-[11px] text-indigo-300">
              {room.revealed ? 'Cards Revealed' : 'Voting in Progress'}
            </span>
          </div>

          {/* Center of the Table: Action / Results Console */}
          <div className="my-2 flex flex-col items-center text-center gap-3">
            {!room.revealed ? (
              <>
                <div className="text-sm font-medium text-slate-300">
                  {votedCount === 0
                    ? 'Waiting for team members to pick a card...'
                    : votedCount < totalParticipants
                    ? `${votedCount} / ${totalParticipants} players have placed their card on the table`
                    : 'All players have locked in a card! Ready to reveal.'}
                </div>

                {isOwner ? (
                  <button
                    type="button"
                    disabled={actionBusy || votedCount === 0}
                    onClick={() => handleOwnerAction('reveal')}
                    className="mt-1 px-7 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-xl shadow-indigo-600/40 transition cursor-pointer flex items-center gap-2"
                  >
                    <span>👁️ Reveal Cards</span>
                  </button>
                ) : (
                  <div className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/70 text-xs text-slate-300">
                    Waiting for room owner (<strong className="text-white">{room.ownerName}</strong>) to reveal cards...
                  </div>
                )}
              </>
            ) : (
              /* Revealed Statistics & Owner Reset Button */
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-wrap items-center justify-center gap-6">
                  {averageVote !== null && (
                    <div className="px-5 py-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-center">
                      <div className="text-[11px] uppercase tracking-wider text-indigo-300 font-semibold">
                        Average
                      </div>
                      <div className="text-2xl font-extrabold text-white">
                        {averageVote}
                      </div>
                    </div>
                  )}

                  {/* Vote Distribution Pills */}
                  <div className="flex items-center gap-2">
                    {Object.entries(voteCounts).map(([cardVal, count]) => (
                      <div
                        key={cardVal}
                        className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-center"
                      >
                        <div className="text-base font-extrabold text-indigo-300">
                          {cardVal}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {count} {count === 1 ? 'vote' : 'votes'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {allAgree && (
                    <div className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                      🎉 Consensus!
                    </div>
                  )}
                </div>

                {isOwner ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => handleOwnerAction('reset')}
                    className="px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition cursor-pointer flex items-center gap-2"
                  >
                    <span>🔄 New Round / Reset Cards</span>
                  </button>
                ) : (
                  <div className="text-xs text-slate-400">
                    Waiting for <strong className="text-slate-200">{room.ownerName}</strong> to start the next round...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Participants Seated at the Table */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-2">
            {participantsList.map((participant) => {
              const isMe = participant.id === currentUserId
              const isParticipantOwner = participant.id === room.ownerId
              const hasVoted = participant.vote !== null

              return (
                <div
                  key={participant.id}
                  className={`flex flex-col items-center p-3 rounded-2xl border transition ${
                    isMe
                      ? 'bg-indigo-950/40 border-indigo-500/40'
                      : 'bg-slate-900/60 border-slate-800/90'
                  }`}
                >
                  {/* Playing Card Slot */}
                  <div className="relative w-16 h-24 mb-2.5 flex items-center justify-center">
                    {!hasVoted ? (
                      /* Empty dashed card slot */
                      <div className="w-full h-full rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/40 flex items-center justify-center text-slate-600 text-xs font-medium">
                        …
                      </div>
                    ) : !room.revealed ? (
                      /* Face-down card (shows checkmark that player has chosen) */
                      <div className="w-full h-full rounded-xl card-back-pattern border-2 border-indigo-400/70 shadow-lg shadow-indigo-950/60 flex flex-col items-center justify-center">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/30 border border-indigo-300/60 flex items-center justify-center text-indigo-100 text-xs font-bold">
                          ✓
                        </span>
                        {isMe && (
                          <span className="mt-1 text-[10px] font-semibold text-indigo-200 bg-slate-950/60 px-1.5 py-0.5 rounded">
                            {participant.vote}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* Face-up revealed card */
                      <div className="w-full h-full rounded-xl bg-gradient-to-br from-white to-slate-100 text-slate-900 border-2 border-indigo-400 shadow-xl flex flex-col items-center justify-between p-1.5 animate-card-reveal">
                        <span className="self-start text-[10px] font-bold text-indigo-600 leading-none">
                          {participant.vote}
                        </span>
                        <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                          {participant.vote}
                        </span>
                        <span className="self-end text-[10px] font-bold text-indigo-600 leading-none rotate-180">
                          {participant.vote}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Player Name & Role Badges */}
                  <div className="text-center w-full">
                    <div className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-200 truncate">
                      {isParticipantOwner && (
                        <span title="Room Owner" className="text-amber-400">
                          👑
                        </span>
                      )}
                      <span className="truncate">{participant.name}</span>
                      {isMe && (
                        <span className="text-[10px] text-indigo-400 font-normal">
                          (you)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] mt-0.5">
                      {room.revealed ? (
                        hasVoted ? (
                          <span className="text-indigo-300 font-medium">
                            Voted {participant.vote}
                          </span>
                        ) : (
                          <span className="text-slate-500">No vote</span>
                        )
                      ) : hasVoted ? (
                        <span className="text-emerald-400 font-medium">Ready</span>
                      ) : (
                        <span className="text-slate-500">Thinking...</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* Bottom Deck Tray: Standard Fibonacci Hand */}
      <section className="w-full border-t border-slate-800/80 bg-slate-900/75 backdrop-blur-md py-5 px-8">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-3">
          <div className="flex items-center justify-between w-full text-xs text-slate-400">
            <span>
              {room.revealed
                ? 'Voting is locked while cards are revealed.'
                : currentVote !== null
                ? `You selected "${currentVote}". Click another card to change or click again to clear.`
                : 'Choose your story point estimate below:'}
            </span>
            <span className="text-slate-500">Fibonacci Deck</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {FIBONACCI_DECK.map((card) => {
              const isSelected = currentVote === card.value
              return (
                <button
                  key={card.value}
                  type="button"
                  disabled={room.revealed}
                  onClick={() => handleCardClick(card.value)}
                  title={card.description}
                  className={`group relative w-16 h-24 rounded-2xl border-2 font-extrabold transition-all duration-150 flex flex-col items-center justify-between p-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    isSelected
                      ? '-translate-y-3 bg-indigo-600 border-indigo-300 text-white shadow-xl shadow-indigo-600/40'
                      : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 hover:border-indigo-400/70 text-slate-100 hover:-translate-y-1.5'
                  }`}
                >
                  <span
                    className={`self-start text-[10px] leading-none ${
                      isSelected ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {card.label}
                  </span>
                  <span className="text-2xl tracking-tight">{card.label}</span>
                  <span
                    className={`self-end text-[10px] leading-none rotate-180 ${
                      isSelected ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {card.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
