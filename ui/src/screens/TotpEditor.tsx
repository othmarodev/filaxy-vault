import { useEffect, useRef, useState } from "react";
import type { EntrySummary } from "../types";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18nContext";
import { decodeQrFromFile } from "../lib/qr";
import * as api from "../api";

/** Parse an otpauth://totp/Label?secret=...&issuer=... URI into fields. */
function parseOtpauth(s: string): { issuer: string; account: string; secret: string } | null {
  if (!s.trim().toLowerCase().startsWith("otpauth://")) return null;
  try {
    const u = new URL(s.trim());
    const secret = (u.searchParams.get("secret") || "").trim();
    let issuer = (u.searchParams.get("issuer") || "").trim();
    let account = decodeURIComponent(u.pathname.replace(/^\/+/, ""));
    if (account.includes(":")) {
      const [a, b] = account.split(":");
      if (!issuer) issuer = a.trim();
      account = b.trim();
    }
    return { issuer, account, secret };
  } catch {
    return null;
  }
}

export function TotpEditor({
  id,
  entry,
  onClose,
}: {
  id: string | null;
  entry?: EntrySummary;
  onClose: () => void;
}) {
  const t = useT();
  const [issuer, setIssuer] = useState(entry?.title ?? "");
  const [account, setAccount] = useState(entry?.username ?? "");
  const [secret, setSecret] = useState("");
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    api.getTotpSecret(id).then(setSecret).catch(() => {});
  }, [id]);

  const onSecretChange = (v: string) => {
    const parsed = parseOtpauth(v);
    if (parsed) {
      if (parsed.issuer) setIssuer(parsed.issuer);
      if (parsed.account) setAccount(parsed.account);
      setSecret(parsed.secret);
    } else {
      setSecret(v);
    }
  };

  const onScanFile = async (file: File | undefined) => {
    if (!file) return;
    setErr("");
    const data = await decodeQrFromFile(file);
    const parsed = data ? parseOtpauth(data) : null;
    if (parsed && parsed.secret) {
      if (parsed.issuer) setIssuer(parsed.issuer);
      if (parsed.account) setAccount(parsed.account);
      setSecret(parsed.secret);
    } else {
      setErr(t("qrNotRecognized"));
    }
  };

  const save = async () => {
    setErr("");
    const tagArr = tags.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      if (id) await api.updateTotpEntry(id, issuer, account, secret, tagArr);
      else await api.addTotpEntry(issuer, account, secret, tagArr);
      onClose();
    } catch {
      setErr(t("invalidKey"));
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm";
  const inputStyle = { background: "var(--fv-surface-2)", borderColor: "var(--fv-border)", color: "var(--fv-text)" } as const;
  const labelCls = "block text-xs uppercase tracking-wide mb-1";
  const labelStyle = { color: "var(--fv-faint)" } as const;

  return (
    <div className="flex flex-col max-h-[85vh]">
      <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--fv-border)" }}>
        <span className="text-xl">⏱️</span>
        <h2 className="text-lg font-semibold" style={{ color: "var(--fv-text)" }}>{id ? t("edit") : t("newTotpTitle")}</h2>
      </div>

      <div className="px-5 py-4 space-y-3 overflow-auto">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} style={labelStyle}>{t("issuerField")}</label>
            <input autoFocus placeholder="GitHub, Binance…" value={issuer} onChange={(e) => setIssuer(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>{t("accountField")}</label>
            <input placeholder="me@email.com" value={account} onChange={(e) => setAccount(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls + " mb-0"} style={labelStyle}>{t("secretKeyField")}</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="fv-btn rounded-lg px-2.5 py-1 text-xs font-medium"
              style={{ background: "var(--fv-surface-2)", color: "var(--fv-violet)" }}
            >
              📷 {t("scanQr")}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onScanFile(e.target.files?.[0])} />
          </div>
          <input
            placeholder="JBSWY3DPEHPK3PXP  ·  or paste otpauth://…"
            value={secret}
            onChange={(e) => onSecretChange(e.target.value)}
            className={`${inputCls} font-mono`}
            style={inputStyle}
            autoComplete="off" autoCorrect="off" spellCheck={false}
          />
          <p className="text-xs mt-1" style={{ color: "var(--fv-faint)" }}>{t("pasteOtpauthHint")}</p>
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>{t("tags")}</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        {err && <p className="text-sm" style={{ color: "#ef4444" }}>{err}</p>}

        <div className="px-3 py-2 rounded-lg text-xs flex items-start gap-2" style={{ background: "var(--fv-surface-2)", color: "var(--fv-muted)" }}>
          <span>⚠️</span><span>{t("totpSecurityNote")}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--fv-border)" }}>
        <Button onClick={save} disabled={!issuer.trim() || !secret.trim()}>{t("save")}</Button>
        <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
      </div>
    </div>
  );
}
