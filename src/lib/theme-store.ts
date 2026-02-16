import { Store } from '@tanstack/store'

/**
 * TanStack Store für Theme-Management (Dark Mode / Light Mode)
 * ==============================================================
 *
 * Was ist TanStack Store?
 * ----------------------
 * TanStack Store ist eine minimal Zustand Verwaltungslösung für Global State.
 * Im Gegensatz zu React Context ist es Framework-agnostisch und sehr leichtgewichtig.
 *
 * Im Vergleich zu anderen State Management Lösungen:
 * - Redux: Zu komplex für einfache globale States
 * - Zustand: Externe Library (TanStack Store ist Teil von @tanstack/store)
 * - Context: Kann zu Performance-Problemen bei häufigen Updates führen
 * - TanStack Store: Perfekt für einfache, reaktive globale States
 *
 * Warum TanStack Store für Darkmode?
 * -----------------------------------
 * 1. Darkmode ist ein global State, der in vielen Komponenten gebraucht wird
 * 2. Theme sollte sich über Seitennavigation nicht ändern
 * 3. Darkmode sollte persisten (localStorage)
 * 4. TanStack Store bietet automatische Reaktivität ohne Hook-Zwang
 *
 * Wie funktioniert es?
 * --------------------
 * 1. Store wird mit initialem State erstellt: new Store({ darkMode: false })
 * 2. Komponenten können den Store abonnieren: themeStore.subscribe()
 * 3. State wird aktualisiert: themeStore.setState({ darkMode: true })
 * 4. Alle Abonnenten werden automatisch benachrichtigt
 * 5. localStorage wird synchron mit dem Store gehalten
 *
 * Wichtig: Das ist der "Source of Truth" für das Theme
 * Alle UI-Updates basieren auf `themeStore.state.darkMode`
 */

// Store für Theme-Zustand erstellen
export const themeStore = new Store({
  /**
   * darkMode: boolean
   * 
   * true = Dark Mode aktiviert
   * false = Light Mode aktiviert
   * 
   * Initial wird localStorage überprüft. Wenn keine Präferenz,
   * wird system-Präferenz verwendet (prefers-color-scheme)
   */
  darkMode: false,
})

/**
 * Initialisiert den Theme Store mit dem gespeicherten Wert
 * Dies sollte beim App-Start aufgerufen werden (vor dem Rendern)
 * 
 * Priorität:
 * 1. localStorage (Benutzer-Präferenz)
 * 2. System-Präferenz (OS Dark Mode)
 * 3. Standard: false (Light Mode)
 */
export function initializeThemeStore() {
  // Versuche, den Theme aus localStorage zu laden
  const savedTheme = localStorage.getItem('taskmanager-theme')
  
  if (savedTheme === 'dark' || savedTheme === 'light') {
    themeStore.setState({ darkMode: savedTheme === 'dark' })
  } else {
    // Kein gespeicherter Theme: Benutze System-Präferenz
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    themeStore.setState({ darkMode: prefersDark })
  }
  
  // Aktualisiere das HTML Element mit der Dark-Klasse
  updateHtmlDarkClass()
  
  // Überwache System-Präferenz-Änderungen
  watchSystemThemePreference()
}

/**
 * Toggle Dark Mode an/aus
 * 
 * Diese Funktion:
 * 1. Schaltet den Store um
 * 2. Speichert die Präferenz in localStorage
 * 3. Aktualisiert das HTML Element
 * 4. Alle komponenten mit themeStore.subscribe() werden benachrichtigt
 */
export function toggleDarkMode() {
  const currentDarkMode = themeStore.state.darkMode
  const newDarkMode = !currentDarkMode

  // Aktualisiere Store
  themeStore.setState({ darkMode: newDarkMode })
  
  // Speichere Präferenz in localStorage
  localStorage.setItem('taskmanager-theme', newDarkMode ? 'dark' : 'light')
  
  updateHtmlDarkClass()
}

/**
 * Setzt Dark Mode Präferenz explizit
 * 
 * @param isDark - true für Dark Mode, false für Light Mode
 */
export function setDarkMode(isDark: boolean) {
  themeStore.setState({ darkMode: isDark })
  localStorage.setItem('taskmanager-theme', isDark ? 'dark' : 'light')
  updateHtmlDarkClass()
}

/**
 * Hilfsfunktion: Aktualisiert das HTML Element mit der 'dark' Klasse
 * 
 * Tailwind CSS bietet automatisch Dark Mode Support:
 * - dark:bg-gray-900 wird aktiv, wenn HTML Element die 'dark' Klasse hat
 * - Ohne 'dark' Klasse: light Mode Styles
 * - Mit 'dark' Klasse: dark Mode Styles
 */
function updateHtmlDarkClass() {
  if (typeof document === 'undefined') return
  
  const htmlElement = document.documentElement
  const bodyElement = document.body
  const isDark = themeStore.state.darkMode

  if (isDark) {
    htmlElement.classList.add('dark')
    if (bodyElement) bodyElement.classList.add('dark')
  } else {
    htmlElement.classList.remove('dark')
    if (bodyElement) bodyElement.classList.remove('dark')
  }
}

/**
 * System-Präferenz-Änderungen abonnieren
 * 
 * Wenn der Benutzer im OS die Dark Mode Einstellung ändert,
 * können wir darauf reagieren (optional)
 */
let systemThemeWatcherInitialized = false

export function watchSystemThemePreference() {
  if (typeof window === 'undefined' || systemThemeWatcherInitialized) return
  
  systemThemeWatcherInitialized = true
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  // Abonniere Änderungen in der System-Präferenz
  mediaQuery.addEventListener('change', (e) => {
    // Nur aktualisieren, wenn der Benutzer keine explizite Präferenz in localStorage hat
    const explicitPreference = localStorage.getItem('taskmanager-theme')
    
    if (!explicitPreference) {
      themeStore.setState({ darkMode: e.matches })
      updateHtmlDarkClass()
    }
  })
}
