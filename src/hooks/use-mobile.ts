import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Initialize with false to prevent hydration mismatch (server always renders as desktop)
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // SSR guard: only run on client side
    if (typeof window === 'undefined') return

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(mql.matches)
    }

    // Set initial value
    setIsMobile(mql.matches)

    // Listen for changes
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
