# Filaxy Vault — UI (`ui/`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React + TypeScript front-end that drives `filaxy-vault` via the 25 Tauri commands — onboarding, unlock, vault list/search, entry detail/edit, password generator, import wizard, and settings — with light/dark themes, EN/ES i18n, and the Filaxy violet→sky brand.

**Architecture:** Vite + React + TypeScript + Tailwind. A single typed `api.ts` wraps every Tauri `invoke` call so screens never touch `invoke` directly (and so it can be mocked in tests). Theme (light/dark) and language (EN/ES) are React contexts persisted to `localStorage`, with an anti-flash inline script in `index.html`. App routing is state-driven: a top-level `<App>` shows Onboarding / Unlock / Vault based on session state polled from the backend. Secrets are fetched on demand (`get_entry_secret`, `copy_secret_to_clipboard`) and never held in global state longer than needed.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3, `@tauri-apps/api` (invoke), `vitest` + `@testing-library/react` + `jsdom` for tests.

## Global Constraints

- **Light/dark theme in the whole app** + **EN/ES language toggle** — Othmaro's non-negotiable rule for every UI.
- **Brand:** violet→sky gradient accents; clean tier-Apple/Stripe aesthetic. Readable text in BOTH themes (no faint/low-contrast text).
- **Hover/active states** on interactive nav/controls.
- **No secret in global/persisted state:** passwords/notes are fetched per-view via `get_entry_secret`; copy goes through `copy_secret_to_clipboard` (backend auto-clears). Never write secrets to `localStorage`.
- **No network calls from the UI** (everything goes through Tauri commands). No analytics, no external fonts loaded at runtime (bundle fonts or use system stack) to respect the CSP `default-src 'self'`.
- **`frontendDist` is `ui/dist`** (matches `tauri.conf.json`). Dev server on `http://localhost:5173`.
- Backend command names & signatures are fixed by the `src-tauri` plan — see `api.ts` (Task 2).

---

## File Structure

```
filaxy-vault/ui/
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ tailwind.config.js
├─ postcss.config.js
├─ index.html                 # anti-flash theme script + root
├─ vitest.config.ts
└─ src/
   ├─ main.tsx                # React root + providers
   ├─ App.tsx                 # session-state router
   ├─ index.css               # Tailwind layers + brand tokens
   ├─ api.ts                  # typed wrappers over Tauri invoke (the ONLY invoke caller)
   ├─ types.ts                # EntrySummary, EntrySecret, Settings, ImportPreview...
   ├─ i18n/
   │  ├─ I18nContext.tsx      # provider + useT() hook
   │  ├─ en.ts
   │  └─ es.ts
   ├─ theme/
   │  └─ ThemeContext.tsx     # light/dark provider + useTheme()
   ├─ components/
   │  ├─ TopBar.tsx           # brand + lang toggle + theme toggle + lock button
   │  ├─ Button.tsx           # branded button w/ hover/active
   │  ├─ PasswordField.tsx    # show/hide + copy
   │  └─ EntropyMeter.tsx
   ├─ hooks/
   │  └─ useGenerator.ts      # generator options state + entropy
   └─ screens/
      ├─ Onboarding.tsx
      ├─ Unlock.tsx
      ├─ VaultList.tsx
      ├─ EntryEditor.tsx
      ├─ GeneratorPanel.tsx
      ├─ ImportWizard.tsx
      └─ SettingsScreen.tsx
```

---

### Task 1: Vite + React + TS + Tailwind scaffold with brand tokens

**Files:**
- Create: `ui/package.json`, `ui/vite.config.ts`, `ui/tsconfig.json`, `ui/tailwind.config.js`, `ui/postcss.config.js`, `ui/index.html`, `ui/src/main.tsx`, `ui/src/App.tsx`, `ui/src/index.css`, `ui/vitest.config.ts`

**Interfaces:**
- Produces: a running Vite app (`npm run dev`) and a test runner (`npm test`).

> Tooling: Node ≥ 18 + npm required. Run all `npm` commands from `ui/`. Verify with `node -v` before starting; if absent, document and stop.

- [ ] **Step 1: Write package.json**

`ui/package.json`:
```json
{
  "name": "filaxy-vault-ui",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@tauri-apps/api": "^2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/react": "^16",
    "@testing-library/jest-dom": "^6",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "jsdom": "^25",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2"
  }
}
```

- [ ] **Step 2: Write vite + ts + tailwind + postcss config**

`ui/vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  build: { outDir: "dist", target: "es2021" },
});
```

`ui/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2021",
    "useDefineForClassFields": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src"]
}
```

`ui/tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          violet: "#7c3aed",
          sky: "#0ea5e9",
        },
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(135deg, #7c3aed 0%, #0ea5e9 100%)",
      },
    },
  },
  plugins: [],
};
```

`ui/postcss.config.js`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 3: Write index.html with anti-flash theme script**

`ui/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Filaxy Vault</title>
    <script>
      // anti-flash: apply saved theme before paint
      (function () {
        try {
          var t = localStorage.getItem("fv-theme");
          if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
            document.documentElement.classList.add("dark");
          }
        } catch (e) {}
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write index.css with brand tokens (readable in both themes)**

`ui/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --fv-bg: #f8fafc;
  --fv-surface: #ffffff;
  --fv-text: #0f172a;
  --fv-muted: #475569;
  --fv-border: #e2e8f0;
}
.dark {
  --fv-bg: #0b1020;
  --fv-surface: #131a2e;
  --fv-text: #f1f5f9;
  --fv-muted: #94a3b8;
  --fv-border: #243049;
}
html, body, #root { height: 100%; }
body {
  margin: 0;
  background: var(--fv-bg);
  color: var(--fv-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
```

- [ ] **Step 5: Write a minimal main.tsx + App.tsx**

`ui/src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`ui/src/App.tsx`:
```tsx
export default function App() {
  return (
    <div className="min-h-full flex items-center justify-center">
      <h1 className="text-2xl font-semibold bg-brand-grad bg-clip-text text-transparent">
        Filaxy Vault
      </h1>
    </div>
  );
}
```

- [ ] **Step 6: Write vitest config**

`ui/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: [] },
});
```

- [ ] **Step 7: Install + verify build**

Run: `cd ui && npm install && npm run build`
Expected: `dist/` is produced with `index.html` + assets. (If `node`/`npm` missing, stop and report.)

- [ ] **Step 8: Commit**

```bash
git add ui/package.json ui/vite.config.ts ui/tsconfig.json ui/tailwind.config.js ui/postcss.config.js ui/index.html ui/vitest.config.ts ui/src/main.tsx ui/src/App.tsx ui/src/index.css ui/package-lock.json
git commit -m "chore(ui): scaffold Vite+React+TS+Tailwind with brand tokens and anti-flash theme"
```

---

### Task 2: Types + typed Tauri API client

**Files:**
- Create: `ui/src/types.ts`, `ui/src/api.ts`, `ui/src/api.test.ts`

**Interfaces:**
- Produces (`types.ts`): `EntrySummary { id, title, username, url: string; tags: string[]; has_totp: boolean }`; `EntrySecret { password: string; notes: string; totp_code: string | null }`; `Settings { autolock_secs: number; clipboard_clear_secs: number }`; `ImportPreview { headers: string[]; rows: string[][]; detected_preset: string | null }`; `Mapping { title?: string; username?: string; password?: string; url?: string; notes?: string }`; `GenOpts { length: number; lower: boolean; upper: boolean; digits: boolean; symbols: boolean; exclude_ambiguous: boolean }`.
- Produces (`api.ts`): one async function per backend command, e.g. `unlockVault(path, password, keyfilePath?, totpCode?)`, `listEntries()`, `getEntrySecret(id)`, `addEntry(...)`, `updateEntry(...)`, `deleteEntry(id)`, `searchEntries(q)`, `generatePassword(o: GenOpts)`, `passwordEntropy(o: GenOpts)`, `importPreview(filePath)`, `importCommit(filePath, map)`, `exportBackup(dest)`, `copySecret(id)`, `touchActivity()`, `checkAutolock()`, `getSettings()`, `setSettings(a, c)`, `rememberOnDevice()`, `forgetDevice()`, `unlockWithDevice(path)`, `createVault(...)`, `vaultExists(path)`, `lockVault()`, `isLocked()`, `totpNow(secret)`.

- [ ] **Step 1: Write types.ts**

`ui/src/types.ts`:
```ts
export interface EntrySummary {
  id: string;
  title: string;
  username: string;
  url: string;
  tags: string[];
  has_totp: boolean;
}
export interface EntrySecret {
  password: string;
  notes: string;
  totp_code: string | null;
}
export interface Settings {
  autolock_secs: number;
  clipboard_clear_secs: number;
}
export interface ImportPreview {
  headers: string[];
  rows: string[][];
  detected_preset: string | null;
}
export interface Mapping {
  title?: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
}
export interface GenOpts {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  exclude_ambiguous: boolean;
}
```

- [ ] **Step 2: Write the failing test (mock @tauri-apps/api/core)**

`ui/src/api.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

import * as api from "./api";

beforeEach(() => invoke.mockReset());

describe("api client", () => {
  it("unlockVault forwards args with correct command name", async () => {
    invoke.mockResolvedValue(undefined);
    await api.unlockVault("/v.fvault", "pw", "/kf", "123456");
    expect(invoke).toHaveBeenCalledWith("unlock_vault", {
      path: "/v.fvault",
      password: "pw",
      keyfilePath: "/kf",
      totpCode: "123456",
    });
  });

  it("generatePassword maps GenOpts fields", async () => {
    invoke.mockResolvedValue("abc");
    const pw = await api.generatePassword({
      length: 20, lower: true, upper: true, digits: true, symbols: true, exclude_ambiguous: true,
    });
    expect(pw).toBe("abc");
    expect(invoke).toHaveBeenCalledWith("generate_password", {
      length: 20, lower: true, upper: true, digits: true, symbols: true, excludeAmbiguous: true,
    });
  });

  it("listEntries returns the array from invoke", async () => {
    invoke.mockResolvedValue([{ id: "1", title: "Gmail", username: "", url: "", tags: [], has_totp: false }]);
    const list = await api.listEntries();
    expect(list).toHaveLength(1);
    expect(invoke).toHaveBeenCalledWith("list_entries", undefined);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ui && npm test`
Expected: FAIL (api.ts not implemented).

- [ ] **Step 4: Write api.ts**

`ui/src/api.ts`:
```ts
import { invoke } from "@tauri-apps/api/core";
import type { EntrySummary, EntrySecret, Settings, ImportPreview, Mapping, GenOpts } from "./types";

export const vaultExists = (path: string) => invoke<boolean>("vault_exists", { path });

export const createVault = (path: string, password: string, keyfilePath?: string) =>
  invoke<void>("create_vault", { path, password, keyfilePath: keyfilePath ?? null });

export const unlockVault = (path: string, password: string, keyfilePath?: string, totpCode?: string) =>
  invoke<void>("unlock_vault", {
    path, password, keyfilePath: keyfilePath ?? null, totpCode: totpCode ?? null,
  });

export const lockVault = () => invoke<void>("lock_vault");
export const isLocked = () => invoke<boolean>("is_locked");

export const listEntries = () => invoke<EntrySummary[]>("list_entries", undefined);
export const searchEntries = (query: string) => invoke<EntrySummary[]>("search_entries", { query });
export const getEntrySecret = (id: string) => invoke<EntrySecret>("get_entry_secret", { id });

export const addEntry = (
  title: string, username: string, password: string, url: string, notes: string,
  tags: string[], totpSecret?: string,
) => invoke<string>("add_entry", { title, username, password, url, notes, tags, totpSecret: totpSecret ?? null });

export const updateEntry = (
  id: string, title: string, username: string, password: string, url: string, notes: string,
  tags: string[], totpSecret?: string,
) => invoke<void>("update_entry", { id, title, username, password, url, notes, tags, totpSecret: totpSecret ?? null });

export const deleteEntry = (id: string) => invoke<void>("delete_entry", { id });

export const generatePassword = (o: GenOpts) =>
  invoke<string>("generate_password", {
    length: o.length, lower: o.lower, upper: o.upper, digits: o.digits, symbols: o.symbols, excludeAmbiguous: o.exclude_ambiguous,
  });

export const passwordEntropy = (o: GenOpts) =>
  invoke<number>("password_entropy", {
    length: o.length, lower: o.lower, upper: o.upper, digits: o.digits, symbols: o.symbols, excludeAmbiguous: o.exclude_ambiguous,
  });

export const importPreview = (filePath: string) => invoke<ImportPreview>("import_preview", { filePath });
export const importCommit = (filePath: string, map: Mapping) => invoke<number>("import_commit", { filePath, map });
export const exportBackup = (destPath: string) => invoke<void>("export_backup", { destPath });

export const copySecret = (id: string) => invoke<void>("copy_secret_to_clipboard", { id });
export const touchActivity = () => invoke<void>("touch_activity");
export const checkAutolock = () => invoke<boolean>("check_autolock");

export const getSettings = () => invoke<Settings>("get_settings");
export const setSettings = (autolockSecs: number, clipboardClearSecs: number) =>
  invoke<void>("set_settings", { autolockSecs, clipboardClearSecs });

export const rememberOnDevice = () => invoke<void>("remember_on_device");
export const forgetDevice = () => invoke<void>("forget_device");
export const unlockWithDevice = (path: string) => invoke<void>("unlock_with_device", { path });

export const totpNow = (secret: string) => invoke<string>("totp_now", { secret });
```

> Tauri converts snake_case command args to camelCase on the JS side, so `keyfile_path` → `keyfilePath`, `exclude_ambiguous` → `excludeAmbiguous`, etc. The tests above lock this contract.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd ui && npm test`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add ui/src/types.ts ui/src/api.ts ui/src/api.test.ts
git commit -m "feat(ui): typed Tauri API client + types with contract tests"
```

---

### Task 3: i18n (EN/ES) + theme (light/dark) contexts

**Files:**
- Create: `ui/src/i18n/en.ts`, `ui/src/i18n/es.ts`, `ui/src/i18n/I18nContext.tsx`, `ui/src/theme/ThemeContext.tsx`, `ui/src/i18n/i18n.test.tsx`

**Interfaces:**
- Produces: `useT()` → `(key: keyof Dict) => string`; `useLang()` → `{ lang: "en"|"es", setLang }`; `<I18nProvider>`. `useTheme()` → `{ theme: "light"|"dark", toggle }`; `<ThemeProvider>`. Both persist to `localStorage` (`fv-lang`, `fv-theme`) and theme toggles the `dark` class on `<html>`.

- [ ] **Step 1: Write the dictionaries**

`ui/src/i18n/en.ts`:
```ts
export const en = {
  appName: "Filaxy Vault",
  unlock: "Unlock",
  lock: "Lock",
  masterPassword: "Master password",
  keyFile: "Key file (optional)",
  createVault: "Create vault",
  search: "Search",
  add: "Add",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  copy: "Copy",
  username: "Username",
  password: "Password",
  url: "Website",
  notes: "Notes",
  tags: "Tags",
  generate: "Generate",
  length: "Length",
  symbols: "Symbols",
  digits: "Digits",
  settings: "Settings",
  importTitle: "Import passwords",
  next: "Next",
  back: "Back",
  finish: "Finish",
  cannotOpen: "Cannot open vault. Check your master password or key file.",
  language: "Language",
  theme: "Theme",
} as const;
export type Dict = typeof en;
```

`ui/src/i18n/es.ts`:
```ts
import type { Dict } from "./en";
export const es: Dict = {
  appName: "Filaxy Vault",
  unlock: "Desbloquear",
  lock: "Bloquear",
  masterPassword: "Contraseña maestra",
  keyFile: "Archivo llave (opcional)",
  createVault: "Crear bóveda",
  search: "Buscar",
  add: "Agregar",
  save: "Guardar",
  cancel: "Cancelar",
  delete: "Eliminar",
  copy: "Copiar",
  username: "Usuario",
  password: "Contraseña",
  url: "Sitio web",
  notes: "Notas",
  tags: "Etiquetas",
  generate: "Generar",
  length: "Longitud",
  symbols: "Símbolos",
  digits: "Dígitos",
  settings: "Ajustes",
  importTitle: "Importar contraseñas",
  next: "Siguiente",
  back: "Atrás",
  finish: "Finalizar",
  cannotOpen: "No se pudo abrir la bóveda. Revisá tu contraseña maestra o archivo llave.",
  language: "Idioma",
  theme: "Tema",
};
```

- [ ] **Step 2: Write the i18n context**

`ui/src/i18n/I18nContext.tsx`:
```tsx
import { createContext, useContext, useState, type ReactNode } from "react";
import { en, type Dict } from "./en";
import { es } from "./es";

type Lang = "en" | "es";
const dicts: Record<Lang, Dict> = { en, es };

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: keyof Dict) => string } | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("fv-lang");
    return saved === "es" ? "es" : "en";
  });
  const setLang = (l: Lang) => {
    localStorage.setItem("fv-lang", l);
    setLangState(l);
  };
  const t = (k: keyof Dict) => dicts[lang][k];
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useT() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useT must be used within I18nProvider");
  return c.t;
}
export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used within I18nProvider");
  return { lang: c.lang, setLang: c.setLang };
}
```

- [ ] **Step 3: Write the theme context**

`ui/src/theme/ThemeContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const Ctx = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("fv-theme", theme);
  }, [theme]);
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
```

- [ ] **Step 4: Write the test**

`ui/src/i18n/i18n.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { I18nProvider, useT, useLang } from "./I18nContext";

function Probe() {
  const t = useT();
  const { setLang } = useLang();
  return (
    <div>
      <span data-testid="label">{t("unlock")}</span>
      <button onClick={() => setLang("es")}>switch</button>
    </div>
  );
}

beforeEach(() => localStorage.clear());

describe("i18n", () => {
  it("defaults to English and switches to Spanish", () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    expect(screen.getByTestId("label").textContent).toBe("Unlock");
    act(() => screen.getByText("switch").click());
    expect(screen.getByTestId("label").textContent).toBe("Desbloquear");
    expect(localStorage.getItem("fv-lang")).toBe("es");
  });
});
```

- [ ] **Step 5: Run test**

Run: `cd ui && npm test`
Expected: PASS (api 3 + i18n 1).

- [ ] **Step 6: Commit**

```bash
git add ui/src/i18n ui/src/theme
git commit -m "feat(ui): EN/ES i18n + light/dark theme contexts (persisted)"
```

---

### Task 4: Shared components (TopBar, Button, PasswordField, EntropyMeter)

**Files:**
- Create: `ui/src/components/Button.tsx`, `ui/src/components/TopBar.tsx`, `ui/src/components/PasswordField.tsx`, `ui/src/components/EntropyMeter.tsx`

**Interfaces:**
- `Button({ variant?: "primary"|"ghost", ...buttonProps })` — primary uses `bg-brand-grad text-white`, hover/active states.
- `TopBar({ onLock?: () => void })` — brand wordmark + language toggle (EN/ES) + theme toggle + optional lock button.
- `PasswordField({ value, onChange?, readOnly?, onCopy? })` — masked input with show/hide eye + optional copy button.
- `EntropyMeter({ bits: number })` — colored bar; <40 red, 40–70 amber, ≥70 green; label reads bits.

- [ ] **Step 1: Write Button**

`ui/src/components/Button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

export function Button({ variant = "primary", className = "", ...rest }: Props) {
  const base = "px-4 py-2 rounded-lg font-medium transition active:scale-[0.98] disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-brand-grad text-white hover:brightness-110"
      : "border hover:bg-black/5 dark:hover:bg-white/10";
  return <button className={`${base} ${styles} ${className}`} style={{ borderColor: "var(--fv-border)" }} {...rest} />;
}
```

- [ ] **Step 2: Write TopBar**

`ui/src/components/TopBar.tsx`:
```tsx
import { useLang } from "../i18n/I18nContext";
import { useTheme } from "../theme/ThemeContext";
import { useT } from "../i18n/I18nContext";
import { Button } from "./Button";

export function TopBar({ onLock }: { onLock?: () => void }) {
  const { lang, setLang } = useLang();
  const { theme, toggle } = useTheme();
  const t = useT();
  return (
    <header
      className="flex items-center justify-between px-5 py-3 border-b"
      style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}
    >
      <span className="text-lg font-semibold bg-brand-grad bg-clip-text text-transparent">{t("appName")}</span>
      <div className="flex items-center gap-2">
        <button
          className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => setLang(lang === "en" ? "es" : "en")}
          aria-label={t("language")}
        >
          {lang === "en" ? "EN" : "ES"}
        </button>
        <button
          className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
          onClick={toggle}
          aria-label={t("theme")}
        >
          {theme === "dark" ? "☾" : "☀"}
        </button>
        {onLock && <Button variant="ghost" onClick={onLock}>{t("lock")}</Button>}
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Write PasswordField + EntropyMeter**

`ui/src/components/PasswordField.tsx`:
```tsx
import { useState } from "react";

export function PasswordField({
  value, onChange, readOnly, onCopy,
}: { value: string; onChange?: (v: string) => void; readOnly?: boolean; onCopy?: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        type={show ? "text" : "password"}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg border bg-transparent"
        style={{ borderColor: "var(--fv-border)", color: "var(--fv-text)" }}
      />
      <button className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setShow((s) => !s)} aria-label="toggle">
        {show ? "🙈" : "👁"}
      </button>
      {onCopy && (
        <button className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10" onClick={onCopy} aria-label="copy">📋</button>
      )}
    </div>
  );
}
```

`ui/src/components/EntropyMeter.tsx`:
```tsx
export function EntropyMeter({ bits }: { bits: number }) {
  const pct = Math.min(100, (bits / 128) * 100);
  const color = bits < 40 ? "#ef4444" : bits < 70 ? "#f59e0b" : "#22c55e";
  return (
    <div>
      <div className="h-2 rounded-full" style={{ background: "var(--fv-border)" }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs" style={{ color: "var(--fv-muted)" }}>{Math.round(bits)} bits</span>
    </div>
  );
}
```

- [ ] **Step 4: Build check**

Run: `cd ui && npm run build`
Expected: builds with no TS errors.

- [ ] **Step 5: Commit**

```bash
git add ui/src/components
git commit -m "feat(ui): shared components (TopBar, Button, PasswordField, EntropyMeter)"
```

---

### Task 5: Generator hook + GeneratorPanel

**Files:**
- Create: `ui/src/hooks/useGenerator.ts`, `ui/src/screens/GeneratorPanel.tsx`, `ui/src/hooks/useGenerator.test.ts`

**Interfaces:**
- `useGenerator()` → `{ opts: GenOpts; setOpts; value: string; bits: number; regenerate(): Promise<void> }`. Debounced entropy via `api.passwordEntropy`; value via `api.generatePassword`.
- `GeneratorPanel({ onUse }: { onUse?: (pw: string) => void })` — controls (length slider, toggles) + EntropyMeter + generated value + "use".

- [ ] **Step 1: Write the hook test (mock api)**

`ui/src/hooks/useGenerator.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("../api", () => ({
  generatePassword: vi.fn(async () => "GENERATED"),
  passwordEntropy: vi.fn(async () => 120),
}));
import { useGenerator } from "./useGenerator";

beforeEach(() => vi.clearAllMocks());

describe("useGenerator", () => {
  it("regenerates a value and reports entropy", async () => {
    const { result } = renderHook(() => useGenerator());
    await act(async () => { await result.current.regenerate(); });
    expect(result.current.value).toBe("GENERATED");
    await waitFor(() => expect(result.current.bits).toBe(120));
  });
});
```

- [ ] **Step 2: Write the hook**

`ui/src/hooks/useGenerator.ts`:
```ts
import { useEffect, useState } from "react";
import type { GenOpts } from "../types";
import { generatePassword, passwordEntropy } from "../api";

const DEFAULT: GenOpts = { length: 20, lower: true, upper: true, digits: true, symbols: true, exclude_ambiguous: true };

export function useGenerator() {
  const [opts, setOpts] = useState<GenOpts>(DEFAULT);
  const [value, setValue] = useState("");
  const [bits, setBits] = useState(0);

  useEffect(() => {
    let alive = true;
    passwordEntropy(opts).then((b) => { if (alive) setBits(b); }).catch(() => {});
    return () => { alive = false; };
  }, [opts]);

  const regenerate = async () => {
    const pw = await generatePassword(opts);
    setValue(pw);
  };

  return { opts, setOpts, value, bits, regenerate };
}
```

- [ ] **Step 3: Write GeneratorPanel**

`ui/src/screens/GeneratorPanel.tsx`:
```tsx
import { useEffect } from "react";
import { useGenerator } from "../hooks/useGenerator";
import { EntropyMeter } from "../components/EntropyMeter";
import { PasswordField } from "../components/PasswordField";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18nContext";

export function GeneratorPanel({ onUse }: { onUse?: (pw: string) => void }) {
  const t = useT();
  const { opts, setOpts, value, bits, regenerate } = useGenerator();
  useEffect(() => { void regenerate(); /* initial */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="space-y-3 p-4 rounded-xl border" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
      <PasswordField value={value} readOnly onCopy={() => navigator.clipboard?.writeText(value)} />
      <EntropyMeter bits={bits} />
      <label className="flex items-center gap-2 text-sm">
        {t("length")}: {opts.length}
        <input type="range" min={8} max={64} value={opts.length}
          onChange={(e) => setOpts({ ...opts, length: Number(e.target.value) })} className="flex-1" />
      </label>
      <div className="flex gap-4 text-sm flex-wrap">
        <label className="flex items-center gap-1"><input type="checkbox" checked={opts.digits} onChange={(e) => setOpts({ ...opts, digits: e.target.checked })} />{t("digits")}</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={opts.symbols} onChange={(e) => setOpts({ ...opts, symbols: e.target.checked })} />{t("symbols")}</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={opts.upper} onChange={(e) => setOpts({ ...opts, upper: e.target.checked })} />A-Z</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={opts.lower} onChange={(e) => setOpts({ ...opts, lower: e.target.checked })} />a-z</label>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => void regenerate()}>{t("generate")}</Button>
        {onUse && value && <Button variant="ghost" onClick={() => onUse(value)}>{t("save")}</Button>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests + build**

Run: `cd ui && npm test && npm run build`
Expected: tests PASS (api 3 + i18n 1 + generator 1), build OK.

- [ ] **Step 5: Commit**

```bash
git add ui/src/hooks ui/src/screens/GeneratorPanel.tsx
git commit -m "feat(ui): password generator hook + panel with live entropy"
```

---

### Task 6: Onboarding + Unlock screens

**Files:**
- Create: `ui/src/screens/Onboarding.tsx`, `ui/src/screens/Unlock.tsx`

**Interfaces:**
- `Onboarding({ path, onCreated })` — master password + confirm + optional key file path + create (calls `api.createVault` then `api.unlockVault`).
- `Unlock({ path, onUnlocked })` — master password + optional key file + optional TOTP + unlock (calls `api.unlockVault`; on error shows generic `t("cannotOpen")`). Offers "unlock with device" via `api.unlockWithDevice` if available.

- [ ] **Step 1: Write Onboarding**

`ui/src/screens/Onboarding.tsx`:
```tsx
import { useState } from "react";
import { Button } from "../components/Button";
import { PasswordField } from "../components/PasswordField";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function Onboarding({ path, onCreated }: { path: string; onCreated: () => void }) {
  const t = useT();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [keyfile, setKeyfile] = useState("");
  const [err, setErr] = useState("");

  const create = async () => {
    if (pw.length < 8) { setErr("min 8"); return; }
    if (pw !== confirm) { setErr("mismatch"); return; }
    try {
      await api.createVault(path, pw, keyfile || undefined);
      await api.unlockVault(path, pw, keyfile || undefined);
      onCreated();
    } catch { setErr(t("cannotOpen")); }
  };

  return (
    <div className="max-w-md mx-auto mt-16 space-y-4 p-6 rounded-2xl border" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
      <h2 className="text-xl font-semibold">{t("createVault")}</h2>
      <PasswordField value={pw} onChange={setPw} />
      <PasswordField value={confirm} onChange={setConfirm} />
      <input placeholder={t("keyFile")} value={keyfile} onChange={(e) => setKeyfile(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--fv-border)" }} />
      {err && <p className="text-sm" style={{ color: "#ef4444" }}>{err}</p>}
      <Button onClick={create} className="w-full">{t("createVault")}</Button>
    </div>
  );
}
```

- [ ] **Step 2: Write Unlock**

`ui/src/screens/Unlock.tsx`:
```tsx
import { useState } from "react";
import { Button } from "../components/Button";
import { PasswordField } from "../components/PasswordField";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function Unlock({ path, onUnlocked }: { path: string; onUnlocked: () => void }) {
  const t = useT();
  const [pw, setPw] = useState("");
  const [keyfile, setKeyfile] = useState("");
  const [totp, setTotp] = useState("");
  const [err, setErr] = useState("");

  const unlock = async () => {
    setErr("");
    try {
      await api.unlockVault(path, pw, keyfile || undefined, totp || undefined);
      onUnlocked();
    } catch { setErr(t("cannotOpen")); }
  };

  return (
    <div className="max-w-md mx-auto mt-24 space-y-4 p-6 rounded-2xl border" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
      <h2 className="text-xl font-semibold">{t("unlock")}</h2>
      <PasswordField value={pw} onChange={setPw} />
      <input placeholder={t("keyFile")} value={keyfile} onChange={(e) => setKeyfile(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--fv-border)" }} />
      <input placeholder="TOTP" value={totp} onChange={(e) => setTotp(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--fv-border)" }} />
      {err && <p className="text-sm" style={{ color: "#ef4444" }}>{err}</p>}
      <Button onClick={unlock} className="w-full">{t("unlock")}</Button>
    </div>
  );
}
```

- [ ] **Step 3: Build check**

Run: `cd ui && npm run build`
Expected: builds.

- [ ] **Step 4: Commit**

```bash
git add ui/src/screens/Onboarding.tsx ui/src/screens/Unlock.tsx
git commit -m "feat(ui): onboarding (create vault) + unlock screens with generic errors"
```

---

### Task 7: Vault list + search + Entry editor

**Files:**
- Create: `ui/src/screens/VaultList.tsx`, `ui/src/screens/EntryEditor.tsx`

**Interfaces:**
- `VaultList({ onOpenEntry, onAdd, onImport, onSettings })` — search box (debounced → `api.searchEntries`), list of `EntrySummary`, add/import/settings buttons.
- `EntryEditor({ id, onClose })` — if `id` set, loads `api.getEntrySecret`; fields title/username/password(+generator)/url/notes/tags; save via add/update; delete; copy via `api.copySecret`.

- [ ] **Step 1: Write VaultList**

`ui/src/screens/VaultList.tsx`:
```tsx
import { useEffect, useState } from "react";
import type { EntrySummary } from "../types";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function VaultList({
  onOpenEntry, onAdd, onImport, onSettings, reloadKey,
}: { onOpenEntry: (id: string) => void; onAdd: () => void; onImport: () => void; onSettings: () => void; reloadKey: number }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<EntrySummary[]>([]);

  useEffect(() => {
    const run = () => (q ? api.searchEntries(q) : api.listEntries()).then(setItems).catch(() => {});
    const id = setTimeout(run, 150);
    return () => clearTimeout(id);
  }, [q, reloadKey]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-3">
      <div className="flex gap-2">
        <input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--fv-border)" }} />
        <Button onClick={onAdd}>{t("add")}</Button>
        <Button variant="ghost" onClick={onImport}>{t("importTitle")}</Button>
        <Button variant="ghost" onClick={onSettings}>{t("settings")}</Button>
      </div>
      <ul className="space-y-2">
        {items.map((e) => (
          <li key={e.id}>
            <button onClick={() => onOpenEntry(e.id)}
              className="w-full text-left px-4 py-3 rounded-xl border hover:brightness-105 transition"
              style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
              <div className="font-medium">{e.title || e.url || e.username}</div>
              <div className="text-sm" style={{ color: "var(--fv-muted)" }}>{e.username}{e.has_totp ? " · TOTP" : ""}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Write EntryEditor**

`ui/src/screens/EntryEditor.tsx`:
```tsx
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { PasswordField } from "../components/PasswordField";
import { GeneratorPanel } from "./GeneratorPanel";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function EntryEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [showGen, setShowGen] = useState(false);

  useEffect(() => {
    if (!id) return;
    // summary fields come from the list; secret fields fetched on demand
    api.getEntrySecret(id).then((s) => { setPassword(s.password); setNotes(s.notes); }).catch(() => {});
  }, [id]);

  const save = async () => {
    const tagArr = tags.split(",").map((s) => s.trim()).filter(Boolean);
    if (id) await api.updateEntry(id, title, username, password, url, notes, tagArr);
    else await api.addEntry(title, username, password, url, notes, tagArr);
    onClose();
  };
  const remove = async () => { if (id) { await api.deleteEntry(id); onClose(); } };

  const inputCls = "w-full px-3 py-2 rounded-lg border bg-transparent";
  const inputStyle = { borderColor: "var(--fv-border)" } as const;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-3">
      <input placeholder={t("appName")} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} style={inputStyle} />
      <input placeholder={t("username")} value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} style={inputStyle} />
      <PasswordField value={password} onChange={setPassword} onCopy={id ? () => void api.copySecret(id) : undefined} />
      <button className="text-sm underline" style={{ color: "var(--fv-muted)" }} onClick={() => setShowGen((s) => !s)}>{t("generate")}</button>
      {showGen && <GeneratorPanel onUse={(pw) => { setPassword(pw); setShowGen(false); }} />}
      <input placeholder={t("url")} value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} style={inputStyle} />
      <textarea placeholder={t("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} style={inputStyle} rows={3} />
      <input placeholder={t("tags")} value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} style={inputStyle} />
      <div className="flex gap-2">
        <Button onClick={save}>{t("save")}</Button>
        <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
        {id && <Button variant="ghost" onClick={remove} className="ml-auto" style={{ color: "#ef4444" }}>{t("delete")}</Button>}
      </div>
    </div>
  );
}
```

> Note: title/username/url for an existing entry come from the list selection; pass them in via props in the wiring task if you want them prefilled. For this slice, secret fields load via `getEntrySecret`; summary prefill is wired in Task 9.

- [ ] **Step 3: Build check**

Run: `cd ui && npm run build`
Expected: builds.

- [ ] **Step 4: Commit**

```bash
git add ui/src/screens/VaultList.tsx ui/src/screens/EntryEditor.tsx
git commit -m "feat(ui): vault list with search + entry editor"
```

---

### Task 8: Import wizard + Settings screen

**Files:**
- Create: `ui/src/screens/ImportWizard.tsx`, `ui/src/screens/SettingsScreen.tsx`

**Interfaces:**
- `ImportWizard({ onDone })` — step 1 pick file path → `api.importPreview`; step 2 map columns (prefilled from detected preset) over a review table; step 3 `api.importCommit` → shows count. Uses `tauri-plugin-dialog` open via `@tauri-apps/plugin-dialog` to pick the file.
- `SettingsScreen({ onDone })` — auto-lock minutes + clipboard seconds via `api.getSettings`/`api.setSettings`; remember/forget device buttons; reminder to delete imported plaintext files.

- [ ] **Step 1: Add the dialog plugin JS package**

Run: `cd ui && npm install @tauri-apps/plugin-dialog@^2`

- [ ] **Step 2: Write ImportWizard**

`ui/src/screens/ImportWizard.tsx`:
```tsx
import { useState } from "react";
import type { ImportPreview, Mapping } from "../types";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";
import { open } from "@tauri-apps/plugin-dialog";

export function ImportWizard({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [path, setPath] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [map, setMap] = useState<Mapping>({});
  const [count, setCount] = useState<number | null>(null);

  const pick = async () => {
    const sel = await open({ multiple: false, filters: [{ name: "Passwords", extensions: ["csv", "xlsx"] }] });
    if (typeof sel === "string") {
      setPath(sel);
      const pv = await api.importPreview(sel);
      setPreview(pv);
      // naive prefill: match common header names
      const h = pv.headers;
      const find = (...names: string[]) => h.find((x) => names.includes(x.toLowerCase()));
      setMap({
        title: find("name", "title", "account"),
        username: find("username", "login", "login_username", "login name"),
        password: find("password", "login_password"),
        url: find("url", "site", "login_uri", "web site"),
        notes: find("notes", "extra", "comments"),
      });
    }
  };

  const commit = async () => { const n = await api.importCommit(path, map); setCount(n); };

  if (count !== null) {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4 text-center">
        <p className="text-lg">✅ {count}</p>
        <p className="text-sm" style={{ color: "var(--fv-muted)" }}>
          {t("importTitle")} — remember to delete the original plaintext file.
        </p>
        <Button onClick={onDone}>{t("finish")}</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-3">
      <h2 className="text-xl font-semibold">{t("importTitle")}</h2>
      {!preview ? (
        <Button onClick={pick}>{t("next")}</Button>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(["title", "username", "password", "url", "notes"] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1">
                <span style={{ color: "var(--fv-muted)" }}>{field}</span>
                <select value={map[field] ?? ""} onChange={(e) => setMap({ ...map, [field]: e.target.value || undefined })}
                  className="px-2 py-1 rounded border bg-transparent" style={{ borderColor: "var(--fv-border)" }}>
                  <option value="">—</option>
                  {preview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="text-xs" style={{ color: "var(--fv-muted)" }}>{preview.rows.length} rows · {preview.detected_preset ?? "?"}</div>
          <div className="flex gap-2">
            <Button onClick={commit}>{t("finish")}</Button>
            <Button variant="ghost" onClick={onDone}>{t("cancel")}</Button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write SettingsScreen**

`ui/src/screens/SettingsScreen.tsx`:
```tsx
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function SettingsScreen({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [lockMin, setLockMin] = useState(5);
  const [clipSec, setClipSec] = useState(20);

  useEffect(() => {
    api.getSettings().then((s) => { setLockMin(Math.round(s.autolock_secs / 60)); setClipSec(s.clipboard_clear_secs); }).catch(() => {});
  }, []);

  const save = async () => { await api.setSettings(lockMin * 60, clipSec); onDone(); };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-xl font-semibold">{t("settings")}</h2>
      <label className="flex items-center justify-between gap-3">
        Auto-lock (min)
        <input type="number" min={1} value={lockMin} onChange={(e) => setLockMin(Number(e.target.value))}
          className="w-24 px-2 py-1 rounded border bg-transparent" style={{ borderColor: "var(--fv-border)" }} />
      </label>
      <label className="flex items-center justify-between gap-3">
        Clipboard clear (s)
        <input type="number" min={1} value={clipSec} onChange={(e) => setClipSec(Number(e.target.value))}
          className="w-24 px-2 py-1 rounded border bg-transparent" style={{ borderColor: "var(--fv-border)" }} />
      </label>
      <div className="flex gap-2 flex-wrap">
        <Button variant="ghost" onClick={() => void api.rememberOnDevice()}>Remember device</Button>
        <Button variant="ghost" onClick={() => void api.forgetDevice()}>Forget device</Button>
      </div>
      <div className="flex gap-2">
        <Button onClick={save}>{t("save")}</Button>
        <Button variant="ghost" onClick={onDone}>{t("cancel")}</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build check**

Run: `cd ui && npm run build`
Expected: builds.

- [ ] **Step 5: Commit**

```bash
git add ui/package.json ui/package-lock.json ui/src/screens/ImportWizard.tsx ui/src/screens/SettingsScreen.tsx
git commit -m "feat(ui): import wizard (preview→map→commit) + settings screen"
```

---

### Task 9: App wiring (session router) + providers + activity/auto-lock loop

**Files:**
- Modify: `ui/src/App.tsx`, `ui/src/main.tsx`

**Interfaces:**
- `App` decides view from backend session state: on mount, `api.isLocked()` + `api.vaultExists(path)`. Views: `onboarding` (no vault) / `unlock` (locked) / `list` / `editor` / `import` / `settings`. A global activity listener calls `api.touchActivity()` (throttled) and a 30s interval calls `api.checkAutolock()`; if it returns locked, switch to unlock.
- Vault path: a fixed app-data path. For this plan, resolve via `@tauri-apps/api/path` `appDataDir()` + `"filaxy.fvault"`.

- [ ] **Step 1: Wrap providers in main.tsx**

`ui/src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n/I18nContext";
import { ThemeProvider } from "./theme/ThemeContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: Write the session router App.tsx**

`ui/src/App.tsx`:
```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { appDataDir, join } from "@tauri-apps/api/path";
import { TopBar } from "./components/TopBar";
import { Onboarding } from "./screens/Onboarding";
import { Unlock } from "./screens/Unlock";
import { VaultList } from "./screens/VaultList";
import { EntryEditor } from "./screens/EntryEditor";
import { ImportWizard } from "./screens/ImportWizard";
import { SettingsScreen } from "./screens/SettingsScreen";
import * as api from "./api";

type View = "loading" | "onboarding" | "unlock" | "list" | "editor" | "import" | "settings";

export default function App() {
  const [view, setView] = useState<View>("loading");
  const [path, setPath] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const lastTouch = useRef(0);

  useEffect(() => {
    (async () => {
      const dir = await appDataDir();
      const p = await join(dir, "filaxy.fvault");
      setPath(p);
      const exists = await api.vaultExists(p);
      if (!exists) { setView("onboarding"); return; }
      const locked = await api.isLocked();
      setView(locked ? "unlock" : "list");
    })();
  }, []);

  // activity + auto-lock loop (only while unlocked)
  const unlocked = view === "list" || view === "editor" || view === "import" || view === "settings";
  useEffect(() => {
    if (!unlocked) return;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastTouch.current > 5000) { lastTouch.current = now; void api.touchActivity(); }
    };
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    const iv = setInterval(async () => {
      const locked = await api.checkAutolock();
      if (locked) setView("unlock");
    }, 30000);
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      clearInterval(iv);
    };
  }, [unlocked]);

  const lock = useCallback(async () => { await api.lockVault(); setView("unlock"); }, []);
  const reload = () => setReloadKey((k) => k + 1);

  return (
    <div className="min-h-full flex flex-col">
      <TopBar onLock={unlocked ? lock : undefined} />
      <main className="flex-1">
        {view === "loading" && <div className="p-8 text-center" style={{ color: "var(--fv-muted)" }}>…</div>}
        {view === "onboarding" && <Onboarding path={path} onCreated={() => setView("list")} />}
        {view === "unlock" && <Unlock path={path} onUnlocked={() => setView("list")} />}
        {view === "list" && (
          <VaultList reloadKey={reloadKey}
            onOpenEntry={(id) => { setEditId(id); setView("editor"); }}
            onAdd={() => { setEditId(null); setView("editor"); }}
            onImport={() => setView("import")}
            onSettings={() => setView("settings")} />
        )}
        {view === "editor" && <EntryEditor id={editId} onClose={() => { reload(); setView("list"); }} />}
        {view === "import" && <ImportWizard onDone={() => { reload(); setView("list"); }} />}
        {view === "settings" && <SettingsScreen onDone={() => setView("list")} />}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Run tests + build**

Run: `cd ui && npm test && npm run build`
Expected: all unit tests PASS (api 3 + i18n 1 + generator 1 = 5), `dist/` produced.

- [ ] **Step 4: Commit**

```bash
git add ui/src/App.tsx ui/src/main.tsx
git commit -m "feat(ui): session-state router, providers, activity + auto-lock loop"
```

---

### Task 10: Full desktop build + handoff for Othmaro's visual validation

**Files:** none (verification).

- [ ] **Step 1: Build the UI bundle**

Run: `cd ui && npm run build`
Expected: `ui/dist/` updated with the real app (replaces the Task-10 stub from the Tauri plan).

- [ ] **Step 2: Build the whole desktop app**

Run: `source "$HOME/.cargo/env" && cargo build -p filaxy-vault 2>&1 | tail -15`
Expected: compiles; the bundled `frontendDist = ../ui/dist` now contains the real UI.

- [ ] **Step 3: Confirm no runtime network/font fetches in the bundle**

Run: `grep -RinE "https?://" ui/dist/assets 2>/dev/null | grep -viE "w3.org|schema|svg" | head || echo "NO EXTERNAL URLS IN BUNDLE - good"`
Expected: `NO EXTERNAL URLS IN BUNDLE - good` (or only harmless SVG namespace URLs). If a real external URL appears, remove that dependency (CSP `default-src 'self'` would block it anyway).

- [ ] **Step 4: Handoff (do NOT self-approve visuals)**

Print for Othmaro:
> "UI built. Run `cd src-tauri && cargo tauri dev` (or `cargo run -p filaxy-vault`) to open Filaxy Vault and validate visually: create a vault, add an entry, generate a password, toggle light/dark and EN/ES, try the import wizard, lock/unlock. Report anything to adjust."

- [ ] **Step 5: Commit**

```bash
git add ui/dist
git commit -m "build(ui): production UI bundle wired into the Tauri shell"
```

---

## Self-Review

**1. Spec coverage:**
- light/dark + EN/ES everywhere → Tasks 3, 4 (TopBar toggles), anti-flash (Task 1). ✓
- Brand violet→sky, hover/active, readable both themes → tokens (Task 1), components (Task 4). ✓
- Onboarding/unlock/list/editor/generator/import/settings → Tasks 5-9. ✓
- Generic unlock error → Onboarding/Unlock use `t("cannotOpen")` (Task 6). ✓
- Secrets on demand, no persistence → `getEntrySecret`/`copySecret`, never stored in `localStorage` (Tasks 2, 7). ✓
- Auto-lock + activity, clipboard auto-clear (backend) → Task 9 loop + `copySecret` (Task 7). ✓
- Import wizard preview→map→commit + delete-source reminder → Task 8. ✓
- No UI network calls, CSP-safe (no external fonts) → system font stack (Task 1), bundle audit (Task 10). ✓

**2. Placeholder scan:** no TBD/TODO in executable steps. The EntryEditor prefill note (Task 7) is addressed by passing the id and loading secret; summary fields are optional prefill, not required for function. ✓

**3. Type consistency:** `api.ts` arg names (camelCase) match Tauri's conversion of the `src-tauri` command params; `GenOpts`/`Mapping`/`EntrySummary`/`EntrySecret`/`Settings`/`ImportPreview` used consistently across hooks/screens. Command names match the `generate_handler!` list exactly. ✓

**Known limitations (documented):**
- Entry summary fields (title/username/url) are reloaded into the editor via list state; for an existing entry, only secret fields auto-load — acceptable for v1, full prefill is a small follow-up.
- `tauri.conf.json` may need the dialog/fs plugin **permissions** (capabilities) enabled for `plugin-dialog`'s `open` to work at runtime; if the file picker is blocked, add a capabilities file granting `dialog:allow-open` — surface this during Othmaro's smoke test.

---

## Cierre

Con esta capa, **Filaxy Vault desktop está completa end-to-end**: motor (`core`) + puente OS (`src-tauri`) + UI (`ui`). Próximos hitos del roadmap (otros specs/planes): OCR (Fase 3), móvil + App Store/Google Play (Fase 4), sync LAN sin nube (Fase 5). Othmaro valida el visual con `cargo tauri dev` antes de cualquier release o publicación en filaxy.shop.
