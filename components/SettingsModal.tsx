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
  const [saveError, setSaveError] = useState('')

  // Sync state whenever the modal opens
  useEffect(() => {
    if (open) {
      setDisplayName(initialDisplayName)
      setEmoji(initialEmoji ?? '')
      setSaveError('')
    }
  }, [open, initialDisplayName, initialEmoji])

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    const firstEmoji = emoji.trim() ? ([...emoji.trim()][0] ?? null) : null
    await onSave(displayName.trim(), firstEmoji)
    setSaving(false)
  }

  const previewEmoji = emoji.trim() ? [...emoji.trim()][0] : null

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
          <h2 id="settings-modal-title" className="text-white text-lg font-bold mb-6">
            Settings
          </h2>

          {/* Emoji — visible input, tapping it opens the keyboard on iPad */}
          <div className="mb-5">
            <label
              htmlFor="emoji-input"
              className="text-slate-400 text-xs uppercase tracking-widest mb-2 block"
            >
              Personal Emoji
            </label>
            <div className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-3xl w-10 text-center leading-none select-none">
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

          {/* Display name */}
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
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500"
            />
          </div>

          {saveError && (
            <p className="text-red-400 text-sm mb-4">{saveError}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 text-sm font-semibold active:opacity-70"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-[2] py-3 rounded-xl bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 active:opacity-80"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
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
