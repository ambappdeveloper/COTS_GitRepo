/**
 * Form primitives with accessible validation.
 *
 * - `required` + `aria-required`, a visible `*` and a legend (CTRM anti-pattern A5)
 * - error text associated by `aria-describedby` and `aria-invalid`
 * - an accessible error summary that receives focus on submit failure
 * - inherited / calculated / read-only field states are shown in TEXT, not grey alone
 */

import { useEffect, useId, useRef, type ReactNode } from "react";
import type { FieldBehaviour } from "../domain/types";
import "./form.css";

export function FormRow({
  label,
  htmlFor,
  required,
  hint,
  error,
  behaviour,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  /**
   * `ReactNode` rather than `string` since 6 September 2026: a hint sometimes has to carry a
   * link — the shipment screen's route to creating the execution plan it needs is the first
   * case — and a hint is the right place for it, beside the control it is about.
   */
  hint?: ReactNode;
  error?: string;
  behaviour?: FieldBehaviour;
  children: ReactNode;
}) {
  return (
    <div className={`frow ${error ? "frow--error" : ""} ${behaviour ? `frow--${behaviour}` : ""}`}>
      <label className="frow__label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <>
            {" "}
            <span className="frow__req" aria-hidden="true">
              *
            </span>
          </>
        ) : null}
        {behaviour === "inherited" ? <span className="frow__badge">inherited</span> : null}
        {behaviour === "calculated" ? <span className="frow__badge">calculated</span> : null}
        {behaviour === "readonly" ? <span className="frow__badge">read-only</span> : null}
      </label>
      {children}
      {hint ? (
        <p className="frow__hint" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="frow__error" id={`${htmlFor}-error`}>
          <span aria-hidden="true">!</span> {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  required,
  error,
  hint,
  type = "text",
  disabled,
  placeholder,
  inputMode,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel";
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <input
      id={id}
      className="input"
      type={type}
      inputMode={inputMode}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      aria-required={required || undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy || undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function SelectInput<T extends string>({
  id,
  value,
  onChange,
  options,
  required,
  error,
  hint,
  disabled,
  placeholder = "Select…",
}: {
  id: string;
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string; disabled?: boolean }[];
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <select
      id={id}
      className="input"
      value={value}
      disabled={disabled}
      required={required}
      aria-required={required || undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy || undefined}
      onChange={(e) => onChange(e.target.value as T)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function TextArea({
  id,
  value,
  onChange,
  rows = 3,
  error,
  hint,
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <textarea
      id={id}
      className="input"
      rows={rows}
      value={value}
      required={required}
      aria-required={required || undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy || undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Accessible error summary — focused on submit failure so the errors are announced. */
export function ErrorSummary({
  errors,
  title = "The form could not be saved",
}: {
  errors: { field: string; message: string }[];
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const count = errors.length;

  // The summary takes focus itself. A caller that focuses it straight after setState runs
  // before React has rendered it, so nothing gets focus and the errors are never announced.
  useEffect(() => {
    if (count > 0) ref.current?.focus();
  }, [count]);

  if (count === 0) return null;
  return (
    <div className="esummary" role="alert" tabIndex={-1} ref={ref} aria-labelledby={`es-${id}`}>
      <p className="esummary__title" id={`es-${id}`}>
        <span aria-hidden="true">!</span> {title} — {count} problem{count === 1 ? "" : "s"} to fix
      </p>
      <ul>
        {errors.map((e) => (
          <li key={e.field}>
            <a
              href={`#${e.field}`}
              onClick={(ev) => {
                ev.preventDefault();
                document.getElementById(e.field)?.focus();
              }}
            >
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RequiredLegend() {
  return (
    <p className="frow__legend">
      <span aria-hidden="true">*</span> indicates a required field.
    </p>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="factions">{children}</div>;
}
