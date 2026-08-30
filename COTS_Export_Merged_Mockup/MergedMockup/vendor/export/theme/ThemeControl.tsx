/**
 * Two ways to change the theme, sharing one preference:
 *
 *  ThemeToggle  — a single labelled button in the header. One click, light ↔ dark.
 *                 It reports what it will do, not what is on screen, so the accessible
 *                 name never contradicts the icon.
 *  ThemeChoice  — a three-way radio group (Match system / Light / Dark) in the account
 *                 menu, which is the only place "match system" can be got back to.
 *
 * Both are text-labelled. The glyph is decorative and never the sole carrier of state,
 * per the same rule the status chips follow.
 */

import { THEME_LABEL, useTheme, type ThemePreference } from "./ThemeContext";
import "./theme.css";

const GLYPH: Record<ThemePreference, string> = { system: "◐", light: "☀", dark: "☾" };

export function ThemeToggle({ onBrand = false }: { onBrand?: boolean }) {
  const { theme, toggle, followsSystem } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className={`btn btn--sm ${onBrand ? "btn--on-brand" : ""} themetoggle`}
      onClick={toggle}
      title={
        followsSystem
          ? `Following your system setting (${THEME_LABEL[theme].toLowerCase()}). Switch to ${next}.`
          : `Switch to ${next} theme`
      }
    >
      <span aria-hidden="true" className="themetoggle__glyph">
        {GLYPH[next]}
      </span>
      <span className="themetoggle__text">{next === "dark" ? "Dark" : "Light"}</span>
      <span className="sr-only">
        theme{followsSystem ? " — currently following your system setting" : ""}
      </span>
    </button>
  );
}

export function ThemeChoice() {
  const { preference, setPreference, theme } = useTheme();
  const options: ThemePreference[] = ["system", "light", "dark"];
  return (
    <div className="themechoice" role="radiogroup" aria-label="Theme">
      {options.map((opt) => {
        const selected = preference === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`themechoice__opt ${selected ? "themechoice__opt--on" : ""}`}
            onClick={() => setPreference(opt)}
          >
            <span aria-hidden="true">{GLYPH[opt]}</span> {THEME_LABEL[opt]}
            {opt === "system" ? (
              <span className="themechoice__hint"> ({theme === "dark" ? "dark" : "light"} now)</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
