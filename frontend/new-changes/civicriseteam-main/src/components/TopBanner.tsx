import { useCallback } from 'react'
import { X } from 'lucide-react'
import { useAppState } from '../store'
import { getIncidentForZip } from '../utils'

export function TopBanner() {
  const { isBannerVisible, setBannerVisible, residentZip, appMode } = useAppState();
  const incident = getIncidentForZip(residentZip)

  const handleCloseBanner = useCallback(() => {
    setBannerVisible(false);
  }, [setBannerVisible]);

  if (!isBannerVisible) {
    return null;
  }

  const profileHint =
    appMode === 'dispatcher'
      ? 'Dispatcher profile active: responses focus on triage and operational summaries.'
      : 'Citizen profile active: responses focus on resident services and 311 guidance.'

  return (
    <div className="relative w-full max-w-3xl px-3 py-3 mx-auto mt-4 mb-2 font-medium text-white bg-orange-500 rounded-md text-sm">
      <button
        onClick={handleCloseBanner}
        className="absolute top-2 right-2 p-1 bg-orange-600 hover:bg-orange-700 rounded transition-colors"
        aria-label="Close banner"
      >
        <X className="w-4 h-4" />
      </button>

      {incident ? (
        <div className="pr-8">
          <p className="font-semibold">{incident.title} - ZIP {residentZip}</p>
          <p className="opacity-95">{incident.summary}</p>
        </div>
      ) : (
        <p className='pr-8'>No active local incidents for your ZIP. {profileHint}</p>
      )}
    </div>
  );
}
