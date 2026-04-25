'use client'

import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  email: string
  initialDisplayName: string
  initialEmoji: string | null
  onClose: () => void
  onSave: (displayName: string, emoji: string | null) => Promise<void>
  onSignOut: () => void
}

export function SettingsModal({
  open,
  email,
  initialDisplayName,
  initialEmoji,
  onClose,
  onSave,
  onSignOut,
}: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [emoji, setEmoji] = useState(initialEmoji ?? '')
  const [saving, setSaving] = useState(false)

  // Sync state whenever the modal opens
  useEffect(() => {
    if (open) {
      setDisplayName(initialDisplayName)
      setEmoji(initialEmoji ?? '')
    }
  }, [open, initialDisplayName, initialEmoji])

  async function handleSave() {
    setSaving(true)
    const firstEmoji = emoji.trim() ? (Array.from(emoji.trim())[0] ?? null) : null
    await onSave(displayName.trim(), firstEmoji)
    setSaving(false)
  }

  const previewEmoji = emoji.trim() ? Array.from(emoji.trim())[0] : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className={`fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6 ${open ? '' : 'hidden'}`}
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl w-full max-w-sm border border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 id="settings-modal-title" className="text-white text-lg font-bold">
              Settings
            </h2>
            <button
              onClick={onClose}
              aria-label="Close settings"
              className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 active:opacity-70"
            >
              ✕
            </button>
          </div>

          {/* Emoji field */}
          <div className="mb-4">
            <label
              htmlFor="emoji-input"
              className="text-slate-400 text-xs uppercase tracking-widest mb-2 block"
            >
              Personal Emoji
            </label>
            <div className="h-12 bg-slate-900 border border-slate-600 rounded-xl px-4 flex items-center gap-3">
              <span className="text-xl leading-none select-none w-7 text-center">
                {previewEmoji ?? '👤'}
              </span>
              <input
                id="emoji-input"
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="Tap to set your emoji"
                className="flex-1 bg-transparent text-slate-400 text-sm outline-none placeholder:text-slate-600"
                aria-label="Personal emoji"
              />
            </div>
          </div>

          {/* Display name field */}
          <div className="mb-6">
            <label
              htmlFor="display-name"
              className="text-slate-400 text-xs uppercase tracking-widest mb-2 block"
            >
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              className="w-full h-12 bg-slate-900 border border-slate-600 rounded-xl px-4 text-white text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 active:opacity-80"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Sign out — separated */}
        <div className="border-t border-slate-700 px-6 py-4">
          <p className="text-slate-500 text-xs mb-3 truncate">{email}</p>
          <button
            onClick={onSignOut}
            className="w-full py-3 rounded-xl bg-slate-700 text-red-400 text-sm font-semibold active:opacity-70"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
