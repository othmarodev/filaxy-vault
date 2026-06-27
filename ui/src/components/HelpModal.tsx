import { Modal } from "./Modal";
import { Logo } from "./Logo";
import { useLang } from "../i18n/I18nContext";

export type HelpSection = "manual" | "shortcuts" | "about";

const VERSION = "0.1.0";
const REPO = "https://github.com/othmarodev/filaxy-vault";

/* ---------- manual content model ---------- */
type Block =
  | string                       // paragraph
  | { steps: string[] }          // numbered steps
  | { list: string[] }           // bullet list
  | { note: string }             // highlighted callout
  | { warn: string };            // warning callout
type Section = { id: string; title: string; blocks: Block[] };

const MANUAL_EN: Section[] = [
  {
    id: "welcome",
    title: "1 · Welcome to Filaxy™ Vault",
    blocks: [
      "Filaxy™ Vault is a local-first password manager from Filaxy™ Labs. It keeps your passwords, two-factor (2FA) codes and crypto recovery phrases in a single encrypted file that lives on this device only.",
      "There is no cloud account, no server, no sync to the internet and no telemetry. Nobody — not even Filaxy™ Labs — can read your vault. The trade-off is simple: you are in full control, and you are responsible for remembering your master password and keeping a backup.",
      { list: [
        "Encryption: Argon2id (key derivation) + XChaCha20-Poly1305 (authenticated encryption).",
        "Storage: one file, filaxy.fvault, on your computer.",
        "Network use: none. The app works fully offline.",
      ]},
    ],
  },
  {
    id: "master",
    title: "2 · Your master password",
    blocks: [
      "Your master password is the single key to everything. It is never stored anywhere — we only keep a cryptographic derivation of it, so it cannot be extracted from the file.",
      { warn: "If you forget your master password, your vault CANNOT be recovered. There is no reset, no email, no backdoor. This is what keeps it secure. Choose something strong that you will remember." },
      { list: [
        "Use a long passphrase (4+ random words) rather than a short complex string.",
        "Don't reuse a password you already use somewhere else.",
        "Consider writing it on paper and storing it in a safe — never in a digital note.",
      ]},
    ],
  },
  {
    id: "create",
    title: "3 · Creating your vault",
    blocks: [
      "The first time you open the app you'll see the onboarding screen.",
      { steps: [
        "Type your master password.",
        "Type it again to confirm (they must match; minimum 8 characters).",
        "Optionally add a key file under Advanced — a second factor; you'll need both the password AND that file to unlock.",
        "Click “Create vault”. The encrypted file is created in your app data folder.",
      ]},
      { note: "A key file makes your vault stronger but if you lose the file you lose access. Keep a backup copy of it somewhere safe." },
    ],
  },
  {
    id: "lockunlock",
    title: "4 · Unlocking & locking",
    blocks: [
      "Each time you open the app you enter your master password (and key file, if you set one) to unlock.",
      "Lock the vault any time from the in-window Vault menu, the “Lock” button at the top right, or ⌘L. Locking wipes the decrypted data from memory.",
      { list: [
        "Auto-lock: the vault locks itself after a period of inactivity.",
        "Clipboard auto-clear: copied passwords are wiped from the clipboard after a short time.",
        "Brute-force backoff: repeated wrong attempts get progressively slower.",
      ]},
    ],
  },
  {
    id: "layout",
    title: "5 · The main window",
    blocks: [
      "The window has four areas:",
      { list: [
        "Top bar — the Filaxy™ Vault wordmark, the in-window menus (Vault, Help), language and theme switches, and the Lock button.",
        "Sidebar (left) — filters: All items, Favorites, Crypto, Authenticator, Health, Trash, plus your Folders and Tags.",
        "List (middle) — the entries in the selected filter; type in Search to narrow them.",
        "Detail (right) — the full contents of the selected entry, where you reveal, copy and edit.",
      ]},
    ],
  },
  {
    id: "addlogin",
    title: "6 · Adding a password",
    blocks: [
      { steps: [
        "Click “+ New” and choose Password.",
        "Fill in Title (e.g. “Gmail”), Username/email and Password.",
        "Optionally add the Website, Notes and Tags.",
        "Pick an Icon — a brand logo, an emoji, or your own image.",
        "Click Save.",
      ]},
      "To view a saved password, select the entry and click Reveal; click Copy to copy any field. Copied values are cleared from the clipboard automatically.",
    ],
  },
  {
    id: "generator",
    title: "7 · The password generator",
    blocks: [
      "When adding or editing a password, click Generate to create a strong random one.",
      { list: [
        "Length — drag to set how many characters.",
        "Digits / Symbols — toggle to include numbers and special characters.",
        "The strength updates as you change the options; longer is always stronger.",
      ]},
    ],
  },
  {
    id: "richentries",
    title: "8 · Custom fields, expiration, history & icons",
    blocks: [
      "Each entry can hold more than the basics:",
      { list: [
        "Custom fields — add any extra label/value pair (e.g. PIN, recovery code); mark a field as protected to keep it hidden.",
        "Expiration — set a date; expired items are flagged in Health.",
        "History — every time you change a password the old one is archived so you can recover it.",
        "Icon — choose a brand logo, an emoji, or upload your own image.",
      ]},
    ],
  },
  {
    id: "seed",
    title: "9 · Seed phrases (crypto wallets)",
    blocks: [
      "Filaxy™ Vault can store BIP39 wallet recovery phrases safely.",
      { steps: [
        "Click “+ New” → Seed phrase.",
        "Choose the word count (12, 15, 18, 21 or 24).",
        "Type each word, or paste the whole phrase into the first box and it fills the slots automatically.",
        "Optionally record the Network, Derivation path and a Passphrase (25th word).",
        "Click Save.",
      ]},
      { warn: "Anyone who has your seed phrase can steal your funds. Never share it, never photograph it, and never type it into a website. Words stay blurred until you reveal them and are copied one at a time." },
    ],
  },
  {
    id: "totp",
    title: "10 · 2FA / Authenticator codes",
    blocks: [
      "Filaxy™ Vault generates time-based one-time codes (TOTP), just like Google Authenticator. There are four ways to add an account:",
      { list: [
        "By secret key — paste the base32 setup key the service shows you.",
        "By otpauth:// link — paste a full otpauth:// URL.",
        "By scanning a QR image — use “Scan QR image” and pick a screenshot of the setup QR.",
        "Bulk import from Google Authenticator — see the steps below.",
      ]},
      "Codes refresh live with a countdown ring. Filaxy™ Vault honors each account's algorithm (SHA1/256/512), digit count and period, so the codes always match the service.",
      { note: "Keeping 2FA next to your passwords is convenient and acts as a backup — but it's one vault. For your most critical accounts, consider also keeping a separate authenticator." },
    ],
  },
  {
    id: "gaimport",
    title: "11 · Importing all your Google Authenticator accounts",
    blocks: [
      { steps: [
        "On your phone open Google Authenticator.",
        "Tap the ⋮ menu → Transfer accounts → Export accounts.",
        "Select the accounts you want and continue. It shows one or more QR codes.",
        "Take a screenshot of each QR code.",
        "In Filaxy™ Vault click “+ New” → Import from Google Authenticator, and upload the screenshot(s). You can also paste the otpauth-migration:// links, one per line.",
      ]},
      "All selected accounts are imported at once, each with its correct settings.",
    ],
  },
  {
    id: "organize",
    title: "12 · Organizing: favorites, folders, tags & search",
    blocks: [
      { list: [
        "Favorites — star an entry to pin it under Favorites.",
        "Folders — group entries; pick a folder in the entry editor and it appears in the sidebar.",
        "Tags — add one or more tags; each tag becomes a filter in the sidebar.",
        "Search — press ⌘F or click Search and type; the list filters as you type.",
        "Multi-select — tick several entries to act on them together (e.g. delete in bulk).",
      ]},
    ],
  },
  {
    id: "attachments",
    title: "13 · Attachments",
    blocks: [
      "You can attach files to an entry — a recovery-codes PDF, a license key, an image. Attachments are stored encrypted inside the vault, exactly like everything else, so they never touch the cloud.",
      "Open an entry, go to Attachments, click Add file to attach, Download to save a copy out, or remove one (with confirmation).",
    ],
  },
  {
    id: "trash",
    title: "14 · Trash",
    blocks: [
      "Deleting an entry moves it to Trash first, so nothing is lost by accident.",
      { list: [
        "Restore — bring an item back from Trash.",
        "Delete forever — permanently remove a single item (asks you to confirm).",
        "Empty trash — permanently remove everything in Trash (asks you to confirm).",
      ]},
      { warn: "“Delete forever” and “Empty trash” cannot be undone." },
    ],
  },
  {
    id: "health",
    title: "15 · Health report",
    blocks: [
      "The Health section gives your vault a score from 0–100 and flags problems, all analyzed locally — nothing ever leaves your device.",
      { list: [
        "Weak passwords — too little entropy (under ~60 bits).",
        "Reused passwords — the same password used on more than one entry.",
        "Old passwords — not changed in over a year.",
        "Expired — past their expiration date.",
      ]},
      "Work through the flagged items and the score improves.",
    ],
  },
  {
    id: "backup",
    title: "16 · Backup & where your data lives",
    blocks: [
      "Your whole vault is the single encrypted file filaxy.fvault in the app's data folder. Because it's already encrypted, a backup is simply a copy of that file.",
      { list: [
        "Copy filaxy.fvault to an external drive or a USB stick regularly.",
        "The copy is useless without your master password, so it's safe to store.",
        "To restore on a new computer, put the file back in the app data folder and unlock as usual.",
      ]},
      { warn: "No backup + forgotten password = no recovery. Keep at least one backup copy of the file." },
    ],
  },
  {
    id: "security",
    title: "17 · How your security works",
    blocks: [
      "Filaxy™ Vault is built so that your secrets never leave your control:",
      { list: [
        "Your master password is run through Argon2id to derive the encryption key — slow on purpose, to defeat guessing.",
        "Data is sealed with XChaCha20-Poly1305, which also detects any tampering with the file.",
        "The file header is authenticated, so a modified vault is rejected rather than silently trusted.",
        "Nothing is ever sent over a network. No accounts, no servers, no analytics.",
      ]},
      "Because the project is open source, anyone can verify these claims in the code at the link in About.",
    ],
  },
  {
    id: "menus",
    title: "18 · Menus & shortcuts",
    blocks: [
      "Commands are available in two places that always stay in sync:",
      { list: [
        "The native OS menu bar (top of the screen on macOS).",
        "The in-window menus (Vault, Help) in the app's top bar — these work on every platform and even in fullscreen.",
      ]},
      "See the Shortcuts tab on the left for the keyboard shortcuts.",
    ],
  },
  {
    id: "faq",
    title: "19 · Troubleshooting & FAQ",
    blocks: [
      { list: [
        "My 2FA codes don't match the service — check your computer's clock is set to automatic/network time; TOTP depends on the correct time.",
        "I forgot my master password — it cannot be recovered; this is by design.",
        "Can I sync between devices? — not over the cloud. LAN pairing is planned; for now, copy the file yourself.",
        "Where's my file? — it's filaxy.fvault in the app data folder (see Backup above).",
      ]},
    ],
  },
];

const MANUAL_ES: Section[] = [
  {
    id: "welcome",
    title: "1 · Bienvenido a Filaxy™ Vault",
    blocks: [
      "Filaxy™ Vault es un gestor de contraseñas local-first de Filaxy™ Labs. Guarda tus contraseñas, códigos de doble factor (2FA) y frases de recuperación de cripto en un único archivo cifrado que vive solo en este dispositivo.",
      "No hay cuenta en la nube, ni servidor, ni sincronización por internet, ni telemetría. Nadie — ni siquiera Filaxy™ Labs — puede leer tu bóveda. El trato es simple: vos tenés el control total, y sos responsable de recordar tu contraseña maestra y de mantener un backup.",
      { list: [
        "Cifrado: Argon2id (derivación de clave) + XChaCha20-Poly1305 (cifrado autenticado).",
        "Almacenamiento: un solo archivo, filaxy.fvault, en tu computadora.",
        "Uso de red: ninguno. La app funciona 100% offline.",
      ]},
    ],
  },
  {
    id: "master",
    title: "2 · Tu contraseña maestra",
    blocks: [
      "Tu contraseña maestra es la única llave de todo. Nunca se guarda en ningún lado — solo conservamos una derivación criptográfica, así que no se puede extraer del archivo.",
      { warn: "Si olvidás tu contraseña maestra, tu bóveda NO se puede recuperar. No hay reset, ni email, ni puerta trasera. Eso es justo lo que la hace segura. Elegí algo fuerte que vayas a recordar." },
      { list: [
        "Usá una frase larga (4+ palabras al azar) en vez de una cadena corta y complicada.",
        "No reutilices una contraseña que ya usás en otro lado.",
        "Considerá anotarla en papel y guardarla en un lugar seguro — nunca en una nota digital.",
      ]},
    ],
  },
  {
    id: "create",
    title: "3 · Crear tu bóveda",
    blocks: [
      "La primera vez que abrís la app vas a ver la pantalla de bienvenida.",
      { steps: [
        "Escribí tu contraseña maestra.",
        "Escribila de nuevo para confirmar (deben coincidir; mínimo 8 caracteres).",
        "Opcional: agregá un archivo llave en Avanzado — un segundo factor; vas a necesitar la contraseña Y ese archivo para desbloquear.",
        "Hacé clic en “Crear bóveda”. El archivo cifrado se crea en tu carpeta de datos.",
      ]},
      { note: "Un archivo llave hace tu bóveda más fuerte, pero si lo perdés perdés el acceso. Guardá una copia de respaldo en un lugar seguro." },
    ],
  },
  {
    id: "lockunlock",
    title: "4 · Bloquear y desbloquear",
    blocks: [
      "Cada vez que abrís la app ingresás tu contraseña maestra (y el archivo llave, si configuraste uno) para desbloquear.",
      "Bloqueá la bóveda cuando quieras desde el menú Bóveda dentro de la ventana, el botón “Bloquear” arriba a la derecha, o ⌘L. Bloquear borra los datos descifrados de la memoria.",
      { list: [
        "Auto-bloqueo: la bóveda se bloquea sola tras un rato de inactividad.",
        "Borrado del portapapeles: las contraseñas copiadas se borran del portapapeles tras un tiempo.",
        "Backoff anti-fuerza-bruta: los intentos fallidos repetidos se vuelven cada vez más lentos.",
      ]},
    ],
  },
  {
    id: "layout",
    title: "5 · La ventana principal",
    blocks: [
      "La ventana tiene cuatro áreas:",
      { list: [
        "Barra superior — el wordmark Filaxy™ Vault, los menús dentro de la ventana (Bóveda, Ayuda), los selectores de idioma y tema, y el botón Bloquear.",
        "Sidebar (izquierda) — filtros: Todos, Favoritos, Cripto, Autenticador, Salud, Papelera, además de tus Carpetas y Etiquetas.",
        "Lista (centro) — las entradas del filtro seleccionado; escribí en Buscar para acotarlas.",
        "Detalle (derecha) — el contenido completo de la entrada seleccionada, donde mostrás, copiás y editás.",
      ]},
    ],
  },
  {
    id: "addlogin",
    title: "6 · Agregar una contraseña",
    blocks: [
      { steps: [
        "Hacé clic en “+ Nuevo” y elegí Contraseña.",
        "Completá Título (ej. “Gmail”), Usuario/email y Contraseña.",
        "Opcional: agregá el Sitio web, Notas y Etiquetas.",
        "Elegí un Ícono — un logo de marca, un emoji, o tu propia imagen.",
        "Hacé clic en Guardar.",
      ]},
      "Para ver una contraseña guardada, seleccioná la entrada y hacé clic en Mostrar; hacé clic en Copiar para copiar cualquier campo. Lo copiado se borra del portapapeles automáticamente.",
    ],
  },
  {
    id: "generator",
    title: "7 · El generador de contraseñas",
    blocks: [
      "Al agregar o editar una contraseña, hacé clic en Generar para crear una fuerte y aleatoria.",
      { list: [
        "Longitud — deslizá para definir cuántos caracteres.",
        "Dígitos / Símbolos — activá para incluir números y caracteres especiales.",
        "La fuerza se actualiza al cambiar las opciones; más larga siempre es más fuerte.",
      ]},
    ],
  },
  {
    id: "richentries",
    title: "8 · Campos personalizados, expiración, historial e íconos",
    blocks: [
      "Cada entrada puede guardar más que lo básico:",
      { list: [
        "Campos personalizados — agregá cualquier par etiqueta/valor (ej. PIN, código de recuperación); marcá un campo como protegido para mantenerlo oculto.",
        "Expiración — poné una fecha; los ítems vencidos se marcan en Salud.",
        "Historial — cada vez que cambiás una contraseña, la anterior se archiva por si la necesitás.",
        "Ícono — elegí un logo de marca, un emoji, o subí tu propia imagen.",
      ]},
    ],
  },
  {
    id: "seed",
    title: "9 · Frases semilla (wallets cripto)",
    blocks: [
      "Filaxy™ Vault puede guardar de forma segura frases de recuperación BIP39.",
      { steps: [
        "Hacé clic en “+ Nuevo” → Frase semilla.",
        "Elegí la cantidad de palabras (12, 15, 18, 21 o 24).",
        "Escribí cada palabra, o pegá la frase completa en el primer casillero y se reparte sola.",
        "Opcional: anotá la Red, la Ruta de derivación y una Passphrase (palabra 25).",
        "Hacé clic en Guardar.",
      ]},
      { warn: "Cualquiera que tenga tu frase semilla puede robar tus fondos. Nunca la compartas, nunca la fotografíes, y nunca la escribas en una web. Las palabras quedan borrosas hasta que las mostrás y se copian de a una." },
    ],
  },
  {
    id: "totp",
    title: "10 · Códigos 2FA / Autenticador",
    blocks: [
      "Filaxy™ Vault genera códigos de un solo uso basados en tiempo (TOTP), igual que Google Authenticator. Hay cuatro formas de agregar una cuenta:",
      { list: [
        "Por clave secreta — pegá la clave base32 de configuración que te muestra el servicio.",
        "Por link otpauth:// — pegá una URL otpauth:// completa.",
        "Escaneando una imagen QR — usá “Escanear QR” y elegí un screenshot del QR de configuración.",
        "Importación masiva desde Google Authenticator — ver los pasos abajo.",
      ]},
      "Los códigos se refrescan en vivo con un anillo de cuenta regresiva. Filaxy™ Vault respeta el algoritmo (SHA1/256/512), la cantidad de dígitos y el período de cada cuenta, así que los códigos siempre coinciden con el servicio.",
      { note: "Tener el 2FA junto a tus contraseñas es cómodo y sirve de backup — pero es una sola bóveda. Para tus cuentas más críticas, considerá mantener también un autenticador aparte." },
    ],
  },
  {
    id: "gaimport",
    title: "11 · Importar todas tus cuentas de Google Authenticator",
    blocks: [
      { steps: [
        "En tu teléfono abrí Google Authenticator.",
        "Tocá el menú ⋮ → Transferir cuentas → Exportar cuentas.",
        "Seleccioná las cuentas que querés y continuá. Te muestra uno o más códigos QR.",
        "Sacale un screenshot a cada código QR.",
        "En Filaxy™ Vault hacé clic en “+ Nuevo” → Importar de Google Authenticator, y subí el/los screenshot(s). También podés pegar los links otpauth-migration://, uno por línea.",
      ]},
      "Todas las cuentas seleccionadas se importan de una, cada una con su configuración correcta.",
    ],
  },
  {
    id: "organize",
    title: "12 · Organizar: favoritos, carpetas, etiquetas y búsqueda",
    blocks: [
      { list: [
        "Favoritos — marcá la estrella de una entrada para fijarla en Favoritos.",
        "Carpetas — agrupá entradas; elegí una carpeta en el editor y aparece en el sidebar.",
        "Etiquetas — agregá una o más; cada etiqueta se vuelve un filtro en el sidebar.",
        "Búsqueda — apretá ⌘F o hacé clic en Buscar y escribí; la lista filtra mientras tipeás.",
        "Selección múltiple — marcá varias entradas para actuar sobre todas juntas (ej. borrar en masa).",
      ]},
    ],
  },
  {
    id: "attachments",
    title: "13 · Adjuntos",
    blocks: [
      "Podés adjuntar archivos a una entrada — un PDF de códigos de recuperación, una clave de licencia, una imagen. Los adjuntos se guardan cifrados dentro de la bóveda, igual que todo lo demás, así que nunca tocan la nube.",
      "Abrí una entrada, andá a Adjuntos, hacé clic en Agregar archivo para adjuntar, Descargar para sacar una copia, o quitá uno (con confirmación).",
    ],
  },
  {
    id: "trash",
    title: "14 · Papelera",
    blocks: [
      "Eliminar una entrada la manda primero a la Papelera, así no se pierde nada por accidente.",
      { list: [
        "Restaurar — recuperá un ítem de la Papelera.",
        "Eliminar definitivamente — borra un ítem para siempre (te pide confirmación).",
        "Vaciar papelera — borra todo lo de la Papelera para siempre (te pide confirmación).",
      ]},
      { warn: "“Eliminar definitivamente” y “Vaciar papelera” no se pueden deshacer." },
    ],
  },
  {
    id: "health",
    title: "15 · Reporte de salud",
    blocks: [
      "La sección Salud le da a tu bóveda un puntaje de 0–100 y marca problemas, todo analizado localmente — nada sale nunca de tu dispositivo.",
      { list: [
        "Contraseñas débiles — muy poca entropía (menos de ~60 bits).",
        "Contraseñas repetidas — la misma contraseña usada en más de una entrada.",
        "Contraseñas viejas — sin cambiar en más de un año.",
        "Vencidas — pasaron su fecha de expiración.",
      ]},
      "A medida que resolvés los ítems marcados, el puntaje mejora.",
    ],
  },
  {
    id: "backup",
    title: "16 · Backup y dónde viven tus datos",
    blocks: [
      "Toda tu bóveda es el único archivo cifrado filaxy.fvault en la carpeta de datos de la app. Como ya está cifrado, un backup es simplemente una copia de ese archivo.",
      { list: [
        "Copiá filaxy.fvault a un disco externo o una memoria USB con regularidad.",
        "La copia es inútil sin tu contraseña maestra, así que es seguro guardarla.",
        "Para restaurar en otra computadora, poné el archivo de vuelta en la carpeta de datos y desbloqueá como siempre.",
      ]},
      { warn: "Sin backup + contraseña olvidada = sin recuperación. Mantené al menos una copia de respaldo del archivo." },
    ],
  },
  {
    id: "security",
    title: "17 · Cómo funciona tu seguridad",
    blocks: [
      "Filaxy™ Vault está hecho para que tus secretos nunca salgan de tu control:",
      { list: [
        "Tu contraseña maestra pasa por Argon2id para derivar la clave de cifrado — lento a propósito, para frenar los intentos de adivinanza.",
        "Los datos se sellan con XChaCha20-Poly1305, que además detecta cualquier manipulación del archivo.",
        "El encabezado del archivo está autenticado, así que una bóveda modificada se rechaza en vez de confiarse en silencio.",
        "Nada se envía nunca por la red. Sin cuentas, sin servidores, sin analítica.",
      ]},
      "Como el proyecto es de código abierto, cualquiera puede verificar estas afirmaciones en el código, en el link de Acerca de.",
    ],
  },
  {
    id: "menus",
    title: "18 · Menús y atajos",
    blocks: [
      "Los comandos están disponibles en dos lugares que siempre quedan sincronizados:",
      { list: [
        "La barra de menú nativa del sistema (arriba de la pantalla en macOS).",
        "Los menús dentro de la ventana (Bóveda, Ayuda) en la barra superior de la app — funcionan en cualquier plataforma e incluso en pantalla completa.",
      ]},
      "Mirá la pestaña Atajos a la izquierda para los atajos de teclado.",
    ],
  },
  {
    id: "faq",
    title: "19 · Problemas frecuentes y FAQ",
    blocks: [
      { list: [
        "Mis códigos 2FA no coinciden — revisá que el reloj de tu computadora esté en automático/hora de red; el TOTP depende de la hora correcta.",
        "Olvidé mi contraseña maestra — no se puede recuperar; es por diseño.",
        "¿Puedo sincronizar entre dispositivos? — no por la nube. El emparejamiento por LAN está planeado; por ahora, copiá el archivo vos mismo.",
        "¿Dónde está mi archivo? — es filaxy.fvault en la carpeta de datos de la app (ver Backup arriba).",
      ]},
    ],
  },
];

/* ---------- renderers ---------- */
function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (typeof b === "string") return <p key={i} style={{ color: "var(--fv-muted)" }}>{b}</p>;
        if ("steps" in b) return (
          <ol key={i} className="list-decimal pl-5 space-y-1.5" style={{ color: "var(--fv-muted)" }}>
            {b.steps.map((s, j) => <li key={j}>{s}</li>)}
          </ol>
        );
        if ("list" in b) return (
          <ul key={i} className="list-disc pl-5 space-y-1.5" style={{ color: "var(--fv-muted)" }}>
            {b.list.map((s, j) => <li key={j}>{s}</li>)}
          </ul>
        );
        if ("note" in b) return (
          <div key={i} className="rounded-lg px-3.5 py-2.5 text-sm" style={{ background: "var(--fv-surface-2)", border: "1px solid var(--fv-border)", color: "var(--fv-text)" }}>
            💡 {b.note}
          </div>
        );
        return (
          <div key={i} className="rounded-lg px-3.5 py-2.5 text-sm" style={{ background: "rgba(239,68,68,.10)", border: "1px solid rgba(239,68,68,.35)", color: "var(--fv-text)" }}>
            ⚠️ {(b as { warn: string }).warn}
          </div>
        );
      })}
    </>
  );
}

function Manual({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-7 text-sm leading-relaxed">
      {sections.map((s) => (
        <section key={s.id}>
          <h3 className="font-semibold mb-2 text-[15px]" style={{ color: "var(--fv-text)" }}>{s.title}</h3>
          <div className="space-y-2.5">
            <Blocks blocks={s.blocks} />
          </div>
        </section>
      ))}
    </div>
  );
}

const SHORTCUTS: [string, string, string][] = [
  ["⌘ C", "Copy field", "Copiar campo"],
  ["⌘ F", "Search", "Buscar"],
  ["⌘ L", "Lock vault", "Bloquear bóveda"],
  ["⌘ N", "New entry", "Nueva entrada"],
  ["⌘ ,", "Settings", "Ajustes"],
  ["Esc", "Close dialog / menu", "Cerrar diálogo / menú"],
];

export function HelpModal({ open, section, onClose, onSection }: {
  open: boolean; section: HelpSection; onClose: () => void; onSection: (s: HelpSection) => void;
}) {
  const { lang } = useLang();
  const es = lang === "es";
  const tabs: [HelpSection, string][] = [
    ["manual", "Manual"],
    ["shortcuts", es ? "Atajos" : "Shortcuts"],
    ["about", es ? "Acerca de" : "About"],
  ];

  return (
    <Modal open={open} onClose={onClose} maxWidth="46rem">
      <div className="flex" style={{ height: "34rem" }}>
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
          {section === "manual" && <Manual sections={es ? MANUAL_ES : MANUAL_EN} />}
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
                <span style={{ color: "var(--fv-faint)" }}>MIT · Filaxy™ Labs · Costa Rica 🇨🇷</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
