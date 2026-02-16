/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  /**
   * Dark Mode Konfiguration
   * =======================
   * 
   * Tailwind bietet zwei Strategien für Dark Mode:
   * 
   * 1. 'media' (Standard)
   *    - Nutzt OS Dark Mode Einstellung (prefers-color-scheme)
   *    - Automatisch basierend auf System-Einstellungen
   * 
   * 2. 'class' (Unsere Wahl)
   *    - Wir setzen manuell 'dark' Klasse auf HTML Element
   *    - Dem Benutzer erlauben, Dark Mode zu toggeln
   *    - localStorage speichert die Präferenz
   * 
   * Wie es funktioniert:
   * - Wenn HTML Element <html class="dark"> hat:
   *   - dark:bg-gray-900 wird zu bg-gray-900
   *   - dark:text-white wird zu text-white
   * 
   * - Wenn HTML Element keine 'dark' Klasse hat:
   *   - dark: Utility Classes werden ignoriert
   *   - Normal Klassen (z.B. bg-gray-50) werden verwendet
   */
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
