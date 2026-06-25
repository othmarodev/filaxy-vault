<div align="center">

# 🔐 Filaxy Vault

**A local-first, zero-cloud password manager — your encrypted vault never leaves your device.**

Built with Rust + Tauri. Modern UX, serious cryptography, no servers to breach.

[![License: MIT](https://img.shields.io/badge/License-MIT-7c3aed.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-early%20WIP-f59e0b)
![Platform](https://img.shields.io/badge/desktop-Win%20%7C%20macOS%20%7C%20Linux-0ea5e9)

*A [Filaxy Labs](https://filaxy.shop) product.*

</div>

---

> ### ⚠️ Project status: early work-in-progress
> Filaxy Vault is under active development and has **not yet been independently
> security-audited**. The cryptographic design uses standard, audited libraries,
> but the application as a whole has not been reviewed by third parties. **Do not
> trust it with critical secrets yet.** A professional audit is on the roadmap
> before any stable release.

---

## Why Filaxy Vault exists

Most "convenient" password managers keep your vault in **their** cloud. That makes
one server a single point of failure — when it gets breached, the passwords of
*millions* of people leak at once. It has happened, repeatedly.

Filaxy Vault takes the opposite bet, the same one that makes tools like KeePassXC
trustworthy: **your vault is a single encrypted file that lives on your device.**
There is no server to hack, no account to phish, no database of millions of users
to spill. You own the file. If you want to sync it, *you* decide how.

What Filaxy Vault adds on top of that philosophy is what veteran local managers
have always lacked: a **modern, beautiful, effortless experience** that a
non-technical person can actually enjoy — plus features built for **2026 problems**
like storing crypto-wallet seed phrases and generating compliant passwords from a
photo.

> **Open source, on purpose.** A security tool you can't inspect is a security tool
> you have to *trust blindly*. Our code is public so anyone can verify the crypto
> is real and that there is no backdoor. Your safety comes from the encryption and
> your master password — never from hiding the code.

---

## How it keeps your secrets safe

- **Master password → Argon2id** (memory-hard key derivation; crushes brute-force).
- **Vault encrypted with XChaCha20-Poly1305** (authenticated encryption). Change a
  single byte of the file and it refuses to open (tamper detection).
- **Optional key file** — a second factor ("something you have") that costs nothing.
- **Zero network. Zero telemetry.** The engine has *no* HTTP/network dependency
  (verified in CI-style checks). Nothing about you ever leaves the machine.
- **Secrets stay in memory only**, are zeroized on lock, and never touch disk in
  plaintext. The clipboard auto-clears after a few seconds.
- **No invented cryptography** — only well-known, audited primitives.

---

## What it does

**Available today (desktop, dev builds):**

- ✅ Create / unlock an encrypted vault (`.fvault` format)
- ✅ Add, edit, search and delete entries (with password history)
- ✅ Strong password generator with a live entropy meter
- ✅ Import from **CSV / XLSX** — with presets for Chrome, LastPass, Bitwarden,
  1Password and KeePass (preview → column-map → review → import)
- ✅ Encrypted backup / export
- ✅ Auto-lock on idle, clipboard auto-clear, brute-force backoff
- ✅ TOTP support, optional key file
- ✅ Modern UI: **light / dark** themes and **English / Spanish**, out of the box

**On the roadmap (designed, building next):**

- 🔜 **Crypto-wallet seed-phrase vault** — a dedicated, hardened place for your
  BIP39 recovery phrases (see below)
- 🔜 **Password generator from a photo / screenshot** — point your camera (or snip
  the screen) at a site's password rules; on-device OCR reads them and generates a
  compliant password. No cloud ever touches the image.
- 🔜 **Import existing passwords from a photo** — got a sheet of passwords? Scan it,
  review the parsed entries, save them. All on-device.
- 🔜 **Biometric unlock** (Touch ID / Windows Hello)
- 🔜 **Mobile apps** (iOS + Android) from the same codebase — App Store & Google Play
- 🔜 **Cloud-free sync** over your local network, end-to-end encrypted, with
  *"approve this login from your phone"* (the secure replacement for SMS 2FA)
- 🔜 **Independent security audit** before the first stable release

---

## 🪙 Coming soon: Crypto-wallet seed-phrase vault

If you hold crypto, your recovery phrase **is** your money. Yet most people store
those 12–24 words in a plain note, a screenshot, or a text file — the most
dangerous place possible. No mainstream password manager has a proper home for them.

Filaxy Vault will add a **dedicated seed-phrase entry type**, built for exactly this:

- **12 / 15 / 18 / 21 / 24 numbered word slots** (all BIP39 lengths)
- Fields for **wallet name**, **network / chain** (Bitcoin, Ethereum, Solana, …),
  **derivation path**, and an optional **BIP39 passphrase** (the "25th word")
- Word-order preserved and validated, with an **extra-cautious reveal** (words shown
  one at a time, no accidental "copy all", strong warnings)
- Encrypted exactly like everything else — same Argon2id + XChaCha20 vault

> This feature is in design. Until it ships, treat seed-phrase storage here as
> experimental.

---

## How Filaxy Vault compares

An honest look. KeePassXC and the others are excellent, mature tools — this table
shows *where Filaxy Vault aims to be different*, and is upfront about where it is
still behind (notably: it has not been audited yet).

| | **Filaxy Vault** | KeePassXC | Bitwarden | 1Password |
|---|:---:|:---:|:---:|:---:|
| **Price** | Free | Free | Free tier | Paid |
| **Open source** | ✅ | ✅ | ✅ (clients) | ❌ |
| **Local-first, no cloud needed** | ✅ (no cloud at all) | ✅ | ⚠️ cloud by default | ❌ cloud |
| **Zero network / zero telemetry** | ✅ | ✅ (mostly) | ❌ | ❌ |
| **Modern, "just works" UX** | ✅ (core goal) | ⚠️ powerful but technical | ✅ | ✅ |
| **Light/dark + EN/ES built in** | ✅ | partial | ✅ | ✅ |
| **Crypto seed-phrase vault (BIP39)** | 🔜 dedicated | ❌ notes only | ❌ notes only | ❌ notes only |
| **Password generator from a photo (OCR)** | 🔜 | ❌ | ❌ | ❌ |
| **Import passwords from a photo (OCR)** | 🔜 | ❌ | ❌ | ❌ |
| **Desktop + mobile from one codebase** | 🔜 | desktop (3rd-party mobile) | ✅ | ✅ |
| **Cloud-free LAN sync + phone-approve login** | 🔜 | DIY file sync | ❌ cloud | ❌ cloud |
| **Independent security audit** | ❌ *(planned)* | ✅ (2023) | ✅ | ✅ |

Legend: ✅ available · 🔜 planned · ⚠️ partial/with caveats · ❌ not available

**The short version:** if you love KeePassXC's no-cloud philosophy but wish it felt
modern — and you also want a real home for crypto seed phrases and camera-based
password capture — that's the gap Filaxy Vault is built to fill. If you need a
battle-tested, *already-audited* tool today, use KeePassXC; we'll be there too,
audited, soon.

---

## Architecture

Three layers, with the cryptography fully isolated so it can be audited and reused
(on mobile, later) without touching it:

```
filaxy-vault/
├─ core/        # Pure Rust engine: crypto + vault + import. Zero UI deps. Auditable.
├─ src-tauri/   # Tauri 2 bridge: commands + OS integration (keychain, clipboard, dialogs)
└─ ui/          # React + TypeScript + Vite + Tailwind front-end
```

**Tech stack:** Rust · Tauri 2 · React 18 + TypeScript · Vite · Tailwind ·
`argon2`, `chacha20poly1305`, `hkdf` (RustCrypto).

---

## Build & run (development)

> Requirements: [Rust](https://rustup.rs) (stable) and [Node.js](https://nodejs.org) 18+.

```bash
# 1) install UI dependencies
cd ui && npm install && cd ..

# 2) start the Vite dev server (leave it running)
npm --prefix ui run dev          # serves the UI on http://localhost:5173

# 3) in another terminal, run the desktop app
cargo run -p filaxy-vault        # opens the Filaxy Vault window
```

Run the test suites:

```bash
cargo test            # Rust: crypto, vault, import, session, TOTP (52 tests)
npm --prefix ui test  # UI: api client, i18n, generator
```

A distributable bundle (`.app` / `.msi` / `.AppImage`) is produced with
[`cargo tauri build`](https://v2.tauri.app/distribute/) (packaging is being finalized).

---

## Roadmap

1. ✅ **Core engine** — crypto, vault format, import (done)
2. ✅ **Desktop app** — bridge + UI (done, dev builds)
3. 🔜 **Crypto seed-phrase vault**
4. 🔜 **OCR** — generate & import passwords from a photo/screenshot
5. 🔜 **Mobile apps** — iOS + Android (App Store / Google Play)
6. 🔜 **Cloud-free LAN sync** + phone-approve login
7. 🔜 **Independent security audit** → first stable release

---

## License

Released under the [MIT License](LICENSE) — free to use, study, modify and share.

**Attribution & origin:** Filaxy Vault is original, clean-room software. It is
*inspired conceptually* by the local-first philosophy of
[KeePassXC](https://keepassxc.org) but contains **none** of its source code and
does **not** use the KDBX file format — it has its own `.fvault` format. KeePassXC
is a trademark of its respective owners; Filaxy Vault is not affiliated with it.

---

<div align="center">

Made with care by **[Filaxy Labs](https://filaxy.shop)** · Costa Rica 🇨🇷

</div>
