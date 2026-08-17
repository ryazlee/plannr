import { useEffect, useState } from 'react'

export const DESKTOP_QUERY = '(min-width: 960px)'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)

    function onChange() {
      setMatches(media.matches)
    }

    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export function useDesktopLayout(): boolean {
  return useMediaQuery(DESKTOP_QUERY)
}
