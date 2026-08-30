import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { returnToFrom } from "../auth/RequireAuth";
import { DEMO_USERS } from "../data/master";
import { ROLE_LABEL } from "../domain/types";
import { Banner } from "../components/feedback";
import { ErrorSummary, FormRow, RequiredLegend, TextInput } from "../components/form";
import "./login.css";

interface FieldErrors {
  username?: string;
  password?: string;
}

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // RedirectIfAuthenticated performs the actual redirect; this is only used to tell the
  // reviewer where they will land.
  const returnTo = returnToFrom(location.state);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const summaryItems = [
    ...(errors.username ? [{ field: "login-username", message: errors.username }] : []),
    ...(errors.password ? [{ field: "login-password", message: errors.password }] : []),
  ];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const next: FieldErrors = {};
    if (!username.trim()) next.username = "Enter your username.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSubmitting(true);
    const result = await signIn(username, password);
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.reason);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    // Belt and braces: RedirectIfAuthenticated will already have redirected on the auth
    // state change, but navigating explicitly keeps the behaviour correct if that wrapper
    // is ever removed.
    navigate(returnTo, { replace: true });
  }

  return (
    <div className="login">
      <div className="login__panel">
        <div className="login__brandcol on-brand">
          <p className="login__brand">
            <strong>COTS</strong>
            <span>Export Operations</span>
          </p>
          <h1 className="login__pitch">One workspace from trade deal to shipment close-out.</h1>
          <ul className="login__points">
            <li>Contract, execution planning and cargo readiness in one chain</li>
            <li>Export contract and EX-form balances that reconcile</li>
            <li>Clearance, stuffing and document milestones with real target dates</li>
            <li>Bank submittal and close-out with the currency stated</li>
          </ul>
          <p className="login__proto">
            Prototype — synthetic data, local mock authentication, no production security.
          </p>
        </div>

        <div className="login__formcol">
          <h2 className="login__h2">Sign in</h2>
          <p className="login__sub muted small">
            Use one of the demo accounts listed below. Nothing you enter leaves your browser.
          </p>
          {returnTo !== "/" ? (
            <Banner tone="info" title="You will be returned to the page you asked for">
              After signing in you will land on <code>{returnTo}</code>.
            </Banner>
          ) : null}

          <form onSubmit={onSubmit} noValidate className="login__form">
            <div ref={summaryRef} tabIndex={-1}>
              {formError ? (
                <Banner tone="risk" title="Sign-in failed">
                  {formError}
                </Banner>
              ) : (
                <ErrorSummary errors={summaryItems} title="Check the sign-in form" />
              )}
            </div>

            <FormRow label="Username or email" htmlFor="login-username" required error={errors.username}>
              <TextInput
                id="login-username"
                value={username}
                onChange={(v) => {
                  setUsername(v);
                  if (errors.username) setErrors((s) => ({ ...s, username: undefined }));
                }}
                required
                error={errors.username}
                placeholder="execution"
              />
            </FormRow>

            <FormRow label="Password" htmlFor="login-password" required error={errors.password}>
              <div className="login__pwwrap">
                <TextInput
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    if (errors.password) setErrors((s) => ({ ...s, password: undefined }));
                  }}
                  required
                  error={errors.password}
                  placeholder="demo1234"
                />
                <button
                  type="button"
                  className="btn btn--sm login__pwtoggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </FormRow>

            <RequiredLegend />

            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
            <p className="muted xsmall">Press Enter to submit from any field.</p>
          </form>

          <section className="login__creds">
            <h3>Demo credentials</h3>
            <p className="muted xsmall">
              Every account uses the password <code>demo1234</code>. All five reach the same data; the role
              changes the labelling in the account menu.
            </p>
            <table>
              <caption className="sr-only">Demo accounts</caption>
              <thead>
                <tr>
                  <th scope="col">Username</th>
                  <th scope="col">Password</th>
                  <th scope="col">Role</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_USERS.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <button
                        type="button"
                        className="login__fill"
                        onClick={() => {
                          setUsername(u.username);
                          setPassword(u.password);
                          setErrors({});
                          setFormError(null);
                        }}
                      >
                        {u.username}
                      </button>
                    </td>
                    <td>
                      <code>{u.password}</code>
                    </td>
                    <td>{ROLE_LABEL[u.role]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted xsmall">
              Select a username to fill the form. The session is held in <code>sessionStorage</code> — it
              survives a page refresh and clears when the tab closes. "Reset demo data" in the account menu
              restores the seeded records.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
