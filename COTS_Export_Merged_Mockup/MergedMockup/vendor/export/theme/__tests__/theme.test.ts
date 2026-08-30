import { describe, expect, it } from "vitest";
import { readStoredPreference, resolveTheme, THEME_LABEL } from "../ThemeContext";

describe("theme preference resolution", () => {
  it("follows the system when the preference is 'system'", () => {
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("system", "light")).toBe("light");
  });

  it("overrides the system when an explicit preference is set", () => {
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme("dark", "light")).toBe("dark");
  });

  it("labels every preference, so no control is icon-only", () => {
    expect(Object.keys(THEME_LABEL).sort()).toEqual(["dark", "light", "system"]);
    for (const label of Object.values(THEME_LABEL)) expect(label.length).toBeGreaterThan(2);
  });
});

describe("reading the stored preference", () => {
  it("accepts the three valid values", () => {
    expect(readStoredPreference("light")).toBe("light");
    expect(readStoredPreference("dark")).toBe("dark");
    expect(readStoredPreference("system")).toBe("system");
  });

  it("falls back to 'system' for junk, empty and missing values", () => {
    // A stale or hand-edited localStorage entry must not leave the app unthemed.
    expect(readStoredPreference(null)).toBe("system");
    expect(readStoredPreference("")).toBe("system");
    expect(readStoredPreference("DARK")).toBe("system");
    expect(readStoredPreference("solarized")).toBe("system");
  });
});
