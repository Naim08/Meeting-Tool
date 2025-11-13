import * as React from 'react'
import { useEffect, useState } from 'react'
import { KeyboardPill } from '@/components/ui/keyboard-pill'
import { HOTKEY_DESCRIPTIONS, formatHotkey } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface HotkeyData {
  key: string
  function: string
}

export interface ShortcutsTableProps {
  className?: string
}

const ShortcutsTable: React.FC<ShortcutsTableProps> = ({ className }) => {
  const [hotkeys, setHotkeys] = useState<HotkeyData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadHotkeys = async () => {
      try {
        const hotkeyMap = await window.api?.getHotkeys?.()
        if (hotkeyMap) {
          const formattedHotkeys = Object.entries(hotkeyMap).map(
            ([func, key]: [string, unknown]) => ({
              function: func,
              key: String(key),
            })
          )
          setHotkeys(formattedHotkeys)
        }
      } catch (error) {
        console.error('[ShortcutsTable] Failed to load hotkeys:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadHotkeys()
  }, [])

  const parseKeyCombo = (hotkeyString: string): string[] => {
    const formatted = formatHotkey(hotkeyString)
    return formatted.split(' + ').map((k: string) => k.trim())
  }

  const getHotkeyDescription = (funcName: string): string => {
    return (
      HOTKEY_DESCRIPTIONS[funcName as keyof typeof HOTKEY_DESCRIPTIONS] ||
      funcName.replace(/([A-Z])/g, ' $1').trim()
    )
  }

  if (isLoading) {
    return (
      <div className={cn('animate-pulse space-y-2', className)}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-10 bg-zinc-800 rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border border-white/10', className)}>
      <table className="w-full table-auto">
        <thead>
          <tr className="border-b border-white/10 bg-zinc-900">
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
              Function
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
              Shortcut
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {hotkeys.map((hotkey, index) => (
            <tr
              key={hotkey.function}
              className={cn(
                'border-b border-white/5 transition-colors hover:bg-blue-500/5',
                index % 2 === 0 ? 'bg-zinc-900/50' : 'bg-zinc-900/30'
              )}
            >
              <td className="px-4 py-3 text-sm font-mono text-zinc-300">
                {hotkey.function}
              </td>
              <td className="px-4 py-3">
                <KeyboardPill
                  keys={parseKeyCombo(hotkey.key)}
                  variant="glow"
                />
              </td>
              <td className="px-4 py-3 text-sm text-zinc-400">
                {getHotkeyDescription(hotkey.function)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { ShortcutsTable }
