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
