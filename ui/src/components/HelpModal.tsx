import { Modal } from "./Modal";
import { Logo } from "./Logo";
import { useLang } from "../i18n/I18nContext";

export type HelpSection = "manual" | "shortcuts" | "about";

const VERSION = "0.1.0";
const REPO = "https://github.com/othmarodev/filaxy-vault";

function ManualEN() {
  return (
    <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--text)" }}>
      <Sec title="Getting started">Create a vault with a strong master password — it's the only one you must remember, and it can't be recovered. Everything is encrypted (Argon2id + XChaCha20-Poly1305) in a single local file. No cloud, no servers, no telemetry.</Sec>
      <Sec title="Entry types">Use “+ New” to add a Password, a Seed phrase (crypto wallet) or a 2FA code. The sidebar filters by category, by tag and by folder. Star an item to add it to Favorites.</Sec>
      <Sec title="2FA / Authenticator">Add 2FA accounts by base32 key, by pasting an otpauth:// link, by scanning a QR image, or by bulk-importing the export QR from Google Authenticator. Codes update live with a countdown ring.</Sec>
      <Sec title="Seed phrases">Store BIP39 recovery phrases (12–24 words) with network, derivation path and passphrase. Words stay blurred until you reveal them and are copied one at a time.</Sec>
      <Sec title="Import & backup">Import passwords from CSV/XLSX (Chrome, LastPass, Bitwarden, 1Password, KeePass). Export an encrypted backup anytime. Attachments are stored encrypted inside the vault.</Sec>
      <Sec title="Security">Auto-lock on idle, clipboard auto-clear, brute-force backoff, optional key file and biometrics. The Health section flags weak, reused, old and expired passwords — all checked locally.</Sec>
    </div>
  );
}
function ManualES() {
  return (
    <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--text)" }}>
      <Sec title="Primeros pasos">Creá una bóveda con una contraseña maestra fuerte — es la única que tenés que recordar, y no se puede recuperar. Todo se cifra (Argon2id + XChaCha20-Poly1305) en un único archivo local. Sin nube, sin servidores, sin telemetría.</Sec>
      <Sec title="Tipos de entrada">Usá “+ Nuevo” para agregar una Contraseña, una Frase semilla (wallet cripto) o un Código 2FA. El sidebar filtra por categoría, etiqueta y carpeta. Marcá una estrella para sumarla a Favoritos.</Sec>
      <Sec title="2FA / Autenticador">Agregá cuentas 2FA por clave base32, pegando un link otpauth://, escaneando una imagen QR, o importando en masa el QR de exportación de Google Authenticator. Los códigos se actualizan en vivo con un anillo de cuenta regresiva.</Sec>
      <Sec title="Frases semilla">Guardá frases de recuperación BIP39 (12–24 palabras) con red, ruta de derivación y passphrase. Las palabras quedan borrosas hasta que las mostrás y se copian de a una.</Sec>
      <Sec title="Importar y backup">Importá contraseñas desde CSV/XLSX (Chrome, LastPass, Bitwarden, 1Password, KeePass). Exportá un backup cifrado cuando quieras. Los adjuntos se guardan cifrados dentro de la bóveda.</Sec>
      <Sec title="Seguridad">Auto-bloqueo por inactividad, borrado automático del portapapeles, backoff anti-fuerza-bruta, archivo llave y biometría opcionales. La sección Salud detecta contraseñas débiles, repetidas, viejas y vencidas — todo analizado localmente.</Sec>
    </div>
  );
}
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-1" style={{ color: "var(--fv-text)" }}>{title}</h3>
      <p style={{ color: "var(--fv-muted)" }}>{children}</p>
    </div>
  );
}

const SHORTCUTS: [string, string, string][] = [
  ["⌘ C", "Copy field", "Copiar campo"],
  ["⌘ F", "Search", "Buscar"],
  ["⌘ L", "Lock vault", "Bloquear bóveda"],
  ["⌘ N", "New entry", "Nueva entrada"],
  ["Esc", "Close dialog", "Cerrar diálogo"],
];

export function HelpModal({ open, section, onClose, onSection }: {
  open: boolean; section: HelpSection; onClose: () => void; onSection: (s: HelpSection) => void;
}) {
  const { lang } = useLang();
  const es = lang === "es";
  const tabs: [HelpSection, string][] = [
    ["manual", es ? "Manual" : "Manual"],
    ["shortcuts", es ? "Atajos" : "Shortcuts"],
    ["about", es ? "Acerca de" : "About"],
  ];

  return (
    <Modal open={open} onClose={onClose} maxWidth="44rem">
      <div className="flex" style={{ height: "32rem" }}>
        <nav className="w-40 shrink-0 border-r p-3 space-y-1" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface-2)" }}>
          <div className="px-2 pb-2"><Logo size={26} /></div>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => onSection(id)}
              className="fv-row w-full text-left px-3 py-2 rounded-lg text-sm"
              style={{ background: section === id ? "var(--fv-hover)" : "transparent", color: section === id ? "var(--fv-text)" : "var(--fv-muted)", fontWeight: section === id ? 600 : 500 }}>
              {label}
            </button>
          ))}
        </nav>
        <div className="flex-1 overflow-auto p-6">
          {section === "manual" && (es ? <ManualES /> : <ManualEN />)}
          {section === "shortcuts" && (
            <div className="space-y-2">
              <h3 className="font-semibold mb-3" style={{ color: "var(--fv-text)" }}>{es ? "Atajos de teclado" : "Keyboard shortcuts"}</h3>
              {SHORTCUTS.map(([k, en, sp]) => (
                <div key={k} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--fv-border)" }}>
                  <span className="text-sm" style={{ color: "var(--fv-muted)" }}>{es ? sp : en}</span>
                  <kbd className="px-2 py-1 rounded-md text-xs font-mono" style={{ background: "var(--fv-surface-2)", color: "var(--fv-text)", border: "1px solid var(--fv-border)" }}>{k}</kbd>
                </div>
              ))}
            </div>
          )}
          {section === "about" && (
            <div className="text-center pt-4">
              <div className="flex justify-center mb-4"><Logo size={48} /></div>
              <div className="text-sm" style={{ color: "var(--fv-muted)" }}>{es ? "Versión" : "Version"} {VERSION}</div>
              <p className="text-sm mt-4 max-w-sm mx-auto leading-relaxed" style={{ color: "var(--fv-muted)" }}>
                {es
                  ? "Gestor de contraseñas local-first, de código abierto. Tu bóveda cifrada vive en tu dispositivo — sin nube."
                  : "A local-first, open-source password manager. Your encrypted vault lives on your device — no cloud."}
              </p>
              <div className="mt-5 flex flex-col items-center gap-1.5 text-sm">
                <a href={REPO} style={{ color: "var(--fv-violet)" }}>github.com/othmarodev/filaxy-vault</a>
                <span style={{ color: "var(--fv-faint)" }}>MIT · Filaxy Labs · Costa Rica 🇨🇷</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
