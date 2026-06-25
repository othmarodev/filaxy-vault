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
