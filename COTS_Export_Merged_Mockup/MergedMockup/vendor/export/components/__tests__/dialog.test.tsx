/**
 * Regression cover for the dialog focus bug.
 *
 * `Dialog`'s focus effect depended on `onClose`. Every caller passes an inline arrow
 * — `onClose={() => setOpen(false)}` — which is a new function on every render, so the
 * effect re-ran on every keystroke, moved focus back to the first control and dropped
 * everything after the first character. Typing "1250000" into a dialog input left "1".
 *
 * Nothing errored. That is why this test exists.
 */

import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "../feedback";

/** A host that passes a fresh `onClose` on every render, as every real caller does. */
function Host({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [value, setValue] = useState("");
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open the dialog
      </button>
      <p data-testid="echo">{value}</p>
      <Dialog open={open} title="Amount under collection" onClose={() => setOpen(false)}>
        <label htmlFor="amount">Amount</label>
        <input id="amount" value={value} onChange={(e) => setValue(e.target.value)} />
        <label htmlFor="note">Note</label>
        <input id="note" defaultValue="" />
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("keeps every character typed into a text input", async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByLabelText("Amount");
    await user.click(input);
    await user.keyboard("1250000");
    expect((input as HTMLInputElement).value).toBe("1250000");
    expect(screen.getByTestId("echo").textContent).toBe("1250000");
  });

  it("does not steal focus back to the first control while typing", async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByLabelText("Amount");
    await user.click(input);
    await user.keyboard("30");
    expect(document.activeElement).toBe(input);
  });

  it("focuses the first control when it opens", async () => {
    const user = userEvent.setup();
    render(<Host initialOpen={false} />);
    await user.click(screen.getByRole("button", { name: "Open the dialog" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    // The Close button is the first focusable element inside the panel.
    expect((document.activeElement as HTMLElement)?.textContent).toBe("Close");
  });

  it("closes on Escape, with the callback the caller passed on that render", async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByLabelText("Amount");
    await user.click(input);
    await user.keyboard("42");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("returns focus to the opener when it closes", async () => {
    const user = userEvent.setup();
    render(<Host initialOpen={false} />);
    const opener = screen.getByRole("button", { name: "Open the dialog" });
    await user.click(opener);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("renders nothing when closed", () => {
    render(<Host initialOpen={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("traps Tab inside the panel", async () => {
    const user = userEvent.setup();
    render(<Host />);
    const inside = ["Close", "Amount", "Note"];
    for (let i = 0; i < inside.length + 2; i += 1) await user.tab();
    const panel = screen.getByRole("dialog");
    expect(panel.contains(document.activeElement)).toBe(true);
  });
});
