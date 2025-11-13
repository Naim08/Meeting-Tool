import { useState, useEffect, useCallback } from 'react'

interface AudioLevels {
  microphone: number
  system: number
}

interface UseAudioStatusReturn {
  levels: AudioLevels
  isMicrophoneActive: boolean
  isSystemAudioActive: boolean
  peakMicLevel: number
  peakSystemLevel: number
  resetPeaks: () => void
}

export function useAudioStatus(): UseAudioStatusReturn {
  const [levels, setLevels] = useState<AudioLevels>({
    microphone: 0,
    system: 0,
  })
  const [peakMicLevel, setPeakMicLevel] = useState(0)
  const [peakSystemLevel, setPeakSystemLevel] = useState(0)

  const resetPeaks = useCallback(() => {
    setPeakMicLevel(0)
    setPeakSystemLevel(0)
  }, [])

  useEffect(() => {
    const handleAudioLevel = (data: {
      source: 'microphone' | 'system'
      level: number
    }) => {
      setLevels((prev) => ({
        ...prev,
        [data.source]: data.level,
      }))

      if (data.source === 'microphone') {
        setPeakMicLevel((prev) => Math.max(prev, data.level))
      } else {
        setPeakSystemLevel((prev) => Math.max(prev, data.level))
      }
    }

    // Subscribe to audio level events
    const cleanup = window.api?.on?.('audio:level', handleAudioLevel)

    // Also listen for general messages
    const handleMessage = (message: any) => {
      if (message.type === 'audio:level') {
        handleAudioLevel(message.data)
      }
    }

    window.api?.on?.('message', handleMessage)

    return () => {
      cleanup?.()
      window.api?.off?.('message', handleMessage)
    }
  }, [])

  // Decay levels when not receiving updates
  useEffect(() => {
    const decayInterval = setInterval(() => {
      setLevels((prev) => ({
        microphone: prev.microphone > 0 ? Math.max(0, prev.microphone - 2) : 0,
        system: prev.system > 0 ? Math.max(0, prev.system - 2) : 0,
      }))
    }, 100)

    return () => clearInterval(decayInterval)
  }, [])

  return {
    levels,
    isMicrophoneActive: levels.microphone > 5,
    isSystemAudioActive: levels.system > 5,
    peakMicLevel,
    peakSystemLevel,
    resetPeaks,
  }
}
