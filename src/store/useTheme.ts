import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'

type ThemeState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

/** Reflect the current theme onto <html data-theme> so CSS tokens flip. */
function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
    }),
    {
      name: 'sysviz-theme',
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme ?? 'dark')
      },
    },
  ),
)
