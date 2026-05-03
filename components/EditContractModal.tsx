'use client'

import { useState, useEffect } from 'react'
import { type SaleRow, type AccountType } from '@/lib/types'

interface Props {
  sale: SaleRow | null
  onClose: () => void
  onSave: (id: string, contractValue: number) => void
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  gen_pest: 'Gen Pest',
  mosquito: 'Mosquito',
}

export function EditContractModal({ sale, onClose, onSave }: Props) {
  const [contractValue, setContractValue] = useState('')

  useEffect(() => {
    if (sale) {
      setContractValue(sale.contract_value != null ? String(sale.contract_value) : '')
    }
  }, [sale])

  if (!sale) return null

  const parsedValue = parseFloat(contractValue)
  const isValid = !isNaN(parsedValue) && parsedValue > 0
  const isUnchanged = parsedValue === sale.contract_value

  function handleClose() {
    setContractValue('')
    onClose()
  }

  function handleSave() {
    if (!isValid || isUnchanged) return
    onSave(sale!.id, parsedValue)
    setContractValue('')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-contract-modal-title"
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700">
        <h2 id="edit-contract-modal-title" className="text-white text-lg font-bold mb-5">
          Edit Sale
        </h2>

        <div className="mb-4">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Account Type</p>
          <div className="bg-slate-900 rounded-xl px-4 py-3 text-slate-300 text-sm font-semibold">
            {ACCOUNT_TYPE_LABELS[sale.account_type ?? ''] ?? sale.account_type}
          </div>
        </div>

        <div className="mb-6">
          <label
            htmlFor="edit-contract-value"
            className="text-slate-400 text-xs uppercase tracking-widest mb-2 block"
          >
            Contract Value
          </label>
          <div className="flex items-center bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 gap-2">
            <span className="text-slate-500 font-semibold" aria-hidden="true">$</span>
            <input
              id="edit-contract-value"
              type="number"
              inputMode="decimal"
              min="0.01"
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              className="bg-transparent text-white text-lg flex-1 outline-none"
              autoFocus
            />
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
            onClick={handleSave}
            disabled={!isValid || isUnchanged}
            className="flex-[2] py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40 active:opacity-80"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
