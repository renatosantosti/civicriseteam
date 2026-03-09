import { useMemo } from 'react'
import { useAppState } from '../store/hooks'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { appMode, setAppMode, residentZip, setResidentZip } = useAppState()

  const profileHelp = useMemo(
    () =>
      appMode === 'dispatcher'
        ? 'Dispatcher mode is optimized for triage, clustering, and closure-message drafting.'
        : 'Citizen mode is optimized for service finder support and 311 guidance.',
    [appMode],
  )

  const handleClose = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => {
      if (e.target === e.currentTarget) handleClose()
    }}>
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white">Settings</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Role profile selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-white">
                  Copilot Profile
                </label>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/50">
                  <input
                    type="radio"
                    name="copilot-mode"
                    checked={appMode === 'citizen'}
                    onChange={() => setAppMode('citizen')}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">Citizen Service Helper</p>
                    <p className="text-xs text-gray-400">Resident-facing answers, service finder, and 311 guidance.</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/50">
                  <input
                    type="radio"
                    name="copilot-mode"
                    checked={appMode === 'dispatcher'}
                    onChange={() => setAppMode('dispatcher')}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">Dispatcher Operations Assistant</p>
                    <p className="text-xs text-gray-400">Internal triage summaries, clustering, and route suggestions.</p>
                  </div>
                </label>
              </div>

              <div className="p-3 rounded-lg bg-gray-700/50">
                <label className="block text-sm font-medium text-white mb-2">Resident ZIP (for local disruption context)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={residentZip}
                  onChange={(e) => setResidentZip(e.target.value.replace(/[^0-9-]/g, ''))}
                  placeholder="e.g. 36104"
                  className="w-full px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-400 mt-2">{profileHelp}</p>
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white focus:outline-none"
            >
              Cancel
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 