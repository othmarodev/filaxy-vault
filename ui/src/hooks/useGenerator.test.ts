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
