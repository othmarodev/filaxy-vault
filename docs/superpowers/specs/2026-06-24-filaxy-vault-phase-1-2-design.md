# Filaxy Vault — Diseño Fase 1+2 (Núcleo cripto + Bóveda desktop + Multi-factor)

- **Fecha:** 2026-06-24
- **Estado:** Aprobado (brainstorming) — pendiente de revisión del spec por Othmaro
- **Producto:** Filaxy Vault (nombre de trabajo) — gestor de contraseñas local-first, bajo Filaxy Labs
- **Autor:** Othmaro Fallas Rojas (othmarodev)

---

## 1. Visión del producto

Filaxy Vault es un gestor de contraseñas **gratuito**, **local-first** y **sin nube**: la bóveda
vive cifrada en el disco del usuario, no hay servidor que hackear ni base de datos central que
pueda filtrar las contraseñas de miles de personas. El diferenciador es doble: **UX moderna
(tier Apple/Stripe)** + **seguridad extrema** ("el más seguro del mundo" como vara de calidad).

El usuario controla su archivo de bóveda. Si quiere sincronizarlo entre equipos, lo hace él
(Dropbox/iCloud/USB) — esa es una decisión del usuario, no una dependencia del producto.

### Por qué existe (no es "otro KeePassXC más")
- KeePassXC es seguro pero feo y técnico → Filaxy Vault apunta a que **cualquier persona normal**
  lo use, con seguridad sólida pero invisible.
- Camino de migración real: **importar desde CSV/XLSX y desde foto (OCR)** para que nadie tenga
  que tipear sus contraseñas una por una.

### Origen legal (importante)
Este producto es **código nuevo, clean-room**. NO contiene ni deriva del código de KeePassXC
(que es GPL-2.0/3.0, copyleft). Se usa KeePassXC solo como **referencia conceptual de diseño**
(los conceptos no son copyrightables). Tampoco se usa el formato KDBX: Filaxy Vault define su
**propio formato de bóveda**. Esto deja el producto libre de ataduras de licencia.

---

## 2. Objetivos y no-objetivos

### Objetivos (Fase 1+2)
- Motor criptográfico **auditable y aislado** (crate Rust puro, sin dependencias de UI).
- Bóveda cifrada local con CRUD de entradas, búsqueda y generador de contraseñas.
- Multi-factor **sin costo para el usuario**: biometría del OS + TOTP opcional + key file opcional.
- Importador de archivos **CSV/XLSX** con mapeo de columnas y pantalla de revisión.
- Endurecimiento de seguridad de base (auto-lock, clipboard auto-clear, zeroize, 0 red, 0 telemetría).
- UI moderna React/TS con marca Filaxy (violet→sky), **light/dark + EN/ES**.

### No-objetivos (quedan para el roadmap, fases 3-5)
- App móvil iOS/Android y publicación en App Store / Google Play.
- Import por **foto/OCR** (comparte motor con el generador desde captura → Fase 3).
- Sincronización sin nube (LAN E2E) y aprobación de login desde el móvil (reemplazo del SMS).
- Autofill en navegadores / extensión.

### Restricciones duras (reglas del producto)
- ❌ **Sin nube.** Cero backend, cero llamadas de red en Fase 1+2 (verificable).
- ❌ **Sin hardware.** Nada que obligue al usuario a comprar algo (no YubiKey/FIDO2).
- ❌ **Sin SMS** como segundo factor (necesita servidor + guardar números + es el 2FA más débil).
- ✅ **Gratis** de verdad.
- ✅ **OCR/parseo siempre on-device** (cuando llegue): las contraseñas nunca salen del aparato.

---

## 3. Arquitectura

Tres capas, con el cripto totalmente aislado para poder auditarlo y reusarlo en móvil (Fase 4)
sin tocarlo:

```
filaxy-vault/
├─ core/          ← crate Rust PURO: cripto + motor de bóveda + import parsers. 0 deps de UI.
├─ src-tauri/     ← Tauri: comandos que puentean UI ↔ core + integraciones OS
│                    (keychain, biometría, clipboard, file dialogs, detección de idle)
└─ ui/            ← frontend web: React + TypeScript + Vite + Tailwind
                     marca violet→sky, light/dark, EN/ES
```

**Regla de oro:** las contraseñas descifradas viven **solo en la memoria del proceso Rust**.
Nunca se escriben en disco en claro ni se mandan enteras al frontend. El UI pide cada secreto
on-demand (revelar/copiar puntual). Al hacer auto-lock, la memoria se zeroiza.

### Unidades y responsabilidades
- **`core`** — qué hace: cifrar/descifrar la bóveda, derivar llaves, serializar entradas, parsear
  imports. Cómo se usa: API Rust (`Vault::create`, `Vault::open`, `Vault::add_entry`, …).
  De qué depende: solo crates de cripto auditados. Testeable 100% en aislamiento.
- **`src-tauri`** — qué hace: expone comandos a la UI y habla con el OS. Cómo se usa: comandos
  Tauri invocados desde el frontend. De qué depende: `core` + APIs del OS.
- **`ui`** — qué hace: render y flujo de usuario. Cómo se usa: app de escritorio. De qué
  depende: comandos Tauri. Nunca toca cripto directamente.

---

## 4. Diseño criptográfico (el corazón)

Nada inventado. Solo primitivas auditadas (crates de RustCrypto y equivalentes).

### 4.1 Derivación de llave (KDF)
- **Argon2id** sobre el master password → llave maestra de 256 bits.
- Parámetros por defecto endurecidos (ajustables en settings): memoria ≥ 64 MiB,
  iteraciones (time cost) calibradas a ~0.5–1 s en hardware típico, paralelismo según CPU.
- Salt aleatorio de 16 bytes por bóveda (en el header).

### 4.2 Cifrado de la bóveda
- **XChaCha20-Poly1305** (AEAD). Nonce de 24 bytes (aleatorio por escritura).
- El **header de la bóveda va como AAD** (datos autenticados): versión de formato, parámetros
  Argon2id, salt, nonce, id de cifrado. → Si modifican un solo byte del archivo (header o
  cuerpo), la verificación del tag **falla y la bóveda no abre** (detección de tampering).
- Decisión: XChaCha20-Poly1305 sobre AES-256-GCM por su nonce grande (menos riesgo de reuso) y
  menos footguns. *(Alternativa AES-256-GCM disponible si se requiere por certificación.)*

### 4.3 Key file opcional (segundo factor "algo que tenés", gratis)
- Si el usuario activa key file: se combina la salida de Argon2id con `SHA-256(keyfile)` vía
  **HKDF-SHA256** → llave final de 256 bits.
- El key file es un archivo que el usuario genera y guarda donde quiera (otra carpeta, USB, su
  Drive personal). No es hardware, no cuesta nada. **Opcional.**

### 4.4 Higiene de secretos
- **CSPRNG del OS** (`getrandom`) para salts, nonces y generación de contraseñas.
- **Zeroize** de toda llave/secreto en memoria al dejar de usarse.
- Intento de **`mlock`** para evitar que secretos vayan a swap (best-effort por plataforma).
- Comparaciones en **tiempo constante** (`subtle`) donde aplique.

### 4.5 Formato de archivo de bóveda (`.fvault`)
```
[ MAGIC (8 bytes) | format_version (u16) ]
[ HEADER (autenticado como AAD):
    kdf_id, argon2_params{mem,time,par}, salt(16), cipher_id, nonce(24) ]
[ CIPHERTEXT (XChaCha20-Poly1305 de los datos serializados) ]
[ TAG (16 bytes) ]
```
Datos serializados = la bóveda completa (lista de entradas + metadata) en un formato compacto
(p.ej. MessagePack/CBOR). Todo cifrado.

---

## 5. Modelo de datos de la bóveda

Entrada (entry):
- `id` (UUID)
- `title`
- `username`
- `password` (secreto)
- `url`
- `notes` (secreto)
- `tags` (lista)
- `totp_secret` (opcional, secreto — para generar códigos TOTP de los sitios del usuario)
- `created_at`, `updated_at`
- `history` (versiones anteriores de la entrada, para no perder cambios) — **incluido en Fase 1**

Metadata de bóveda: nombre, parámetros KDF, configuración (timeout de auto-lock, segundos de
clipboard auto-clear, etc.).

---

## 6. Multi-factor (Fase 2, incluido en este spec)

Todo gratis, con lo que el usuario ya tiene. El master password (Argon2id) es **siempre la raíz**.

- **Biometría del OS** (Touch ID / Windows Hello): tras el primer unlock con master password, se
  guarda una **copia envuelta de la llave** en el keychain/secure enclave del sistema, protegida
  por biometría. Unlocks siguientes usan biometría para recuperarla. Fallback siempre a master
  password.
- **TOTP (Google Authenticator) opcional como gate de apertura:** honestidad documentada — en un
  solo equipo suma comodidad, no seguridad pura (el secreto vive en el mismo aparato). Secreto
  guardado en el keychain del OS. Opcional.
- **Key file opcional:** ver §4.3.

---

## 7. Features Fase 1

- **CRUD de entradas** + **búsqueda** (título/usuario/url/tags).
- **Generador de contraseñas:** CSPRNG, longitud configurable, sets (mayús/minús/dígitos/símbolos),
  exclusión de ambiguos, **medidor de entropía** visible.
- **Clipboard auto-clear:** al copiar una contraseña, se borra del portapapeles tras N segundos
  (configurable).
- **Auto-lock:** por inactividad, al suspender y al minimizar (configurable). Al lockear, zeroize.
- **Backup/export cifrado + import de bóveda:** exportar copia cifrada (para "por si formateo el
  equipo") e importarla.
- **Importador de archivos** (ver §8).

---

## 8. Importador de archivos (CSV / XLSX)

Camino de migración para que la gente traiga sus contraseñas sin tipearlas.

- **Formatos:** CSV y XLSX genéricos + presets para exports comunes (Chrome/Edge, LastPass,
  1Password, Bitwarden, KeePass CSV).
- **Flujo:**
  1. Usuario elige archivo.
  2. App detecta columnas → **pantalla de mapeo** (cuál columna es título/usuario/contraseña/url/notas).
     Presets autocompletan el mapeo cuando reconocen el formato.
  3. **Pantalla de revisión:** se muestran las entradas propuestas; el usuario corrige/descarta.
  4. Confirma → se crean las entradas en la bóveda (cifradas).
- **Seguridad:** parseo **on-device**. Tras importar, **recordatorio de borrar el archivo origen**
  (está en texto plano). Nada del import sale del aparato.
- Import por **foto/OCR** → Fase 3 (comparte motor OCR con el generador desde captura).

---

## 9. Endurecimiento de seguridad ("el más seguro")

- **Backoff exponencial** en intentos de unlock fallidos (ralentiza fuerza bruta sobre el archivo).
- **Errores genéricos:** no revelar si falló el password o el archivo; comparaciones en tiempo
  constante.
- **Detección de tampering** vía AEAD (archivo modificado → no abre; sugerir restaurar backup).
- **Lock al minimizar/suspender** + auto-lock por idle.
- **0 red, 0 telemetría** en Fase 1+2 — verificable (no se enlaza ningún cliente HTTP).
- Sin plugins (filosofía de seguridad).

---

## 10. UI / UX

- **Stack:** React + TypeScript + Vite + Tailwind.
- **Marca:** Filaxy violet→sky; estética tier Apple/Stripe/Linear.
- **Reglas globales de Othmaro (no negociables):** **light/dark** + **EN/ES** en toda la app;
  footer/textos legibles en ambos temas; estados hover/active en navegación.
- Pantallas Fase 1+2: onboarding (crear master password + opción key file), unlock (password /
  biometría / TOTP), lista+búsqueda, detalle/edición de entrada, generador, settings, import wizard.

---

## 11. Manejo de errores

- Password/key file incorrectos → mensaje genérico "no se pudo abrir la bóveda", con backoff.
- Archivo corrupto/manipulado → rechazar, ofrecer restaurar backup.
- Keychain/biometría no disponible → fallback transparente a master password.
- Import: filas inválidas marcadas en la pantalla de revisión, nunca se guardan sin confirmación.
- Backup/restore: validar integridad antes de aplicar.

---

## 12. Estrategia de testing

- **Core (Rust):**
  - Round-trip cifrar/descifrar (incluye key file on/off).
  - **Tamper test:** flip de 1 byte (header y cuerpo) → debe fallar la apertura.
  - Password errado → falla; reuso de nonce evitado.
  - Combine de key file (HKDF) determinista y correcto.
  - **Property tests** (proptest) de serialización round-trip de la bóveda.
  - Parsers de import: CSV/XLSX bien formados y malformados.
- **src-tauri:** tests de integración de comandos (crear/abrir/CRUD/import).
- **ui:** tests de componentes mínimos en flujos críticos (unlock, import wizard).

---

## 13. Distribución (contexto de roadmap)

Gracias a **Tauri 2**, el mismo núcleo compila a Win/Mac/Linux + iOS/Android.
- **iOS → App Store** (cuenta Apple Developer ya disponible).
- **Android → Google Play** (requiere Google Play Console, $25 pago único — pendiente de crear).
- **Windows/Linux → descarga directa** desde filaxy.shop (las stores no los distribuyen).
- **Mac → DMG notarizado** (como Filaxy Files) o Mac App Store.
- **Privacy policy URL** obligatoria en ambas stores (declaramos "cero datos recolectados" —
  verdadero por diseño). Página en filaxy.shop.
- Página de producto en **filaxy.shop** con botones App Store + Google Play + descargas desktop.

---

## 14. Roadmap (fases siguientes)

| Fase | Alcance |
|---|---|
| **3. Generador + import por captura (OCR)** | Snip de pantalla / foto → OCR local → leer reglas de contraseña y/o parsear hojas de contraseñas en entradas (con pantalla de revisión). |
| **4. App móvil (Tauri 2)** | Recompilar el mismo núcleo a iOS/Android; cámara real para el OCR; publicación App Store + Google Play. |
| **5. Sync sin nube + aprobación por LAN** | Sync E2E desktop↔móvil por red local; "tu móvil aprueba el login" (reemplazo del SMS, sin servidor). |

---

## 15. Decisiones bloqueadas

- **Nombre:** Filaxy Vault.
- Local-first, **sin nube**, sin backend.
- **Sin hardware** (cero gasto para el usuario); sin SMS.
- Stack: **Tauri 2** (core Rust + **UI React + TypeScript + Vite + Tailwind**).
- Cripto: **Argon2id (64 MiB, ~0.5–1 s) + XChaCha20-Poly1305**; formato propio `.fvault` (no KDBX).
- Multi-factor: **biometría OS + TOTP opcional + key file opcional**.
- **Historial de versiones de entrada: incluido en Fase 1.**
- **Import Fase 1:** CSV/XLSX genérico + presets Chrome, LastPass, Bitwarden, 1Password, KeePass.
- **Defaults de seguridad:** auto-lock 5 min · clipboard auto-clear 20 s (ambos configurables).
- Código **clean-room** (sin código GPL de KeePassXC).
- Orden de construcción: **desktop primero**, luego recompilar a móvil para las stores.

---

## 16. Crates / dependencias previstas (core)

`argon2`, `chacha20poly1305`, `hkdf`, `sha2`, `getrandom`/`rand`, `zeroize`, `subtle`,
`uuid`, serialización CBOR/MessagePack (`ciborium`/`rmp-serde`), parsers CSV (`csv`) y
XLSX (`calamine`). Tauri 2 para el shell + plugins OS (biometría, keychain, clipboard).
