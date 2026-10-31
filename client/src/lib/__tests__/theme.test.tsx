import { StrictMode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "../theme";
import { ThemeControl } from "@/components/ThemeControl";

let media: MediaQueryList;
let listeners: Set<EventListener>;
let matches = false;

function Probe() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  return <>
    <output data-testid="preference">{preference}</output><output data-testid="resolved">{resolvedTheme}</output>
    <button onClick={() => setPreference("dark")}>Set dark</button>
    <button onClick={() => setPreference("light")}>Set light</button>
    <button onClick={() => setPreference("system")}>Set system</button>
  </>;
}

function mount() {
  return render(<StrictMode><ThemeProvider><Probe /><ThemeControl /></ThemeProvider></StrictMode>);
}

function changeDevice(dark: boolean) {
  act(() => {
    matches = dark;
    listeners.forEach((listener) => listener(new Event("change")));
  });
}

beforeEach(() => {
  localStorage.clear();
  matches = false;
  listeners = new Set();
  media = {
    get matches() { return matches; }, media: "(prefers-color-scheme: dark)", onchange: null,
    addEventListener: vi.fn((_type, listener) => listeners.add(listener as EventListener)),
    removeEventListener: vi.fn((_type, listener) => listeners.delete(listener as EventListener)),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  } as MediaQueryList;
  vi.stubGlobal("matchMedia", vi.fn(() => media));
  document.head.innerHTML = '<meta name="theme-color" content="#F8FAFF">';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ThemeProvider", () => {
  it("defaults to light even on a dark device", () => {
    matches = true;
    mount();
    expect(screen.getByTestId("preference")).toHaveTextContent("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(listeners.size).toBe(0);
  });

  it.each(["light", "dark", "system"])("restores the saved %s preference (including legacy values)", (preference) => {
    localStorage.setItem("hs-theme", preference);
    matches = true;
    mount();
    expect(screen.getByTestId("preference")).toHaveTextContent(preference);
    expect(document.documentElement.dataset.theme).toBe(preference === "light" ? "light" : "dark");
  });

  it("persists changes and updates CSS, native controls and browser chrome", async () => {
    const user = userEvent.setup();
    const view = mount();
    await user.click(screen.getByText("Set dark"));
    expect(localStorage.getItem("hs-theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#161a33");
    view.unmount();
    mount();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    await user.click(screen.getByText("Set light"));
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#F8FAFF");
  });

  it("follows live OS changes only in System and removes listeners on exit and unmount", async () => {
    const user = userEvent.setup();
    const view = mount();
    await user.click(screen.getByText("Set system"));
    expect(listeners.size).toBe(1);
    changeDevice(true);
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByText("Currently dark, following your device.")).toBeVisible();
    changeDevice(false);
    expect(document.documentElement.dataset.theme).toBe("light");
    await user.click(screen.getByText("Set dark"));
    expect(listeners.size).toBe(0);
    changeDevice(false);
    expect(document.documentElement.dataset.theme).toBe("dark");
    await user.click(screen.getByText("Set system"));
    expect(document.documentElement.dataset.theme).toBe("light");
    view.unmount();
    expect(listeners.size).toBe(0);
  });

  it("syncs storage events, removal and clear without writing back", () => {
    mount();
    const write = vi.spyOn(Storage.prototype, "setItem");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "hs-theme", newValue: "dark" })));
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "other-key", newValue: "light" })));
    expect(document.documentElement.dataset.theme).toBe("dark");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "hs-theme", newValue: "system" })));
    changeDevice(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "hs-theme", newValue: null })));
    expect(document.documentElement.dataset.theme).toBe("light");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: null })));
    expect(screen.getByTestId("preference")).toHaveTextContent("light");
    expect(write).not.toHaveBeenCalled();
  });

  it("handles corrupt and unavailable storage", async () => {
    localStorage.setItem("hs-theme", "invalid");
    const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    mount();
    expect(document.documentElement.dataset.theme).toBe("light");
    await userEvent.click(screen.getByText("Set dark"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    read.mockRestore();
  });
});

describe("ThemeControl", () => {
  it("provides a labelled radio group with roving focus, arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    mount();
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeVisible();
    const light = screen.getByRole("radio", { name: "Light" });
    light.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveFocus();
    expect(light).toHaveAttribute("tabindex", "-1");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    await user.keyboard("{ArrowRight}");
    expect(light).toBeChecked();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "System" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(light).toHaveFocus();
    await user.keyboard("{End}{ArrowUp}");
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveFocus();
  });
});
