'use client'

import { useState } from 'react'
import { type AccountType } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (contractValue: number, accountType: AccountType) => void
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'gen_pest', label: 'Gen Pest' },
  { value: 'mosquito', label: 'Mosquito' },
]

export function SaleModal({ open, onClose, onConfirm }: Props) {
  const [contractValue, setContractValue] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('gen_pest')

  if (!open) return null

  const parsedValue = parseFloat(contractValue)
  const isValid = !isNaN(parsedValue) && parsedValue > 0

  function handleClose() {
    setContractValue('')
    setAccountType('gen_pest')
    onClose()
  }

  function handleConfirm() {
    if (!isValid) return
    onConfirm(parsedValue, accountType)
    setContractValue('')
    setAccountType('gen_pest')
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700">
        <h2 className="text-white text-lg font-bold mb-5">New Sale</h2>

        <div className="mb-4">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">
            Contract Value
          </p>
          <div className="flex items-center bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 gap-2">
            <span className="text-slate-500 font-semibold">$</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              className="bg-transparent text-white text-lg flex-1 outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="mb-6">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">
            Account Type
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNT_TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setAccountType(value)}
                className={`py-3 rounded-xl text-sm font-semibold border-2 ${
                  accountType === value
                    ? 'bg-blue-700 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-600 text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="flex-[2] py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40 active:opacity-80"
          >
            Log Sale
          </button>
        </div>
      </div>
    </div>
  )
}
