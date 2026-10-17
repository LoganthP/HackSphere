import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field, Input, Toggle, StageBadge } from "../ui";

describe("Field", () => {
  it("links the label and error message to the control", () => {
    render(
      <Field label="Team name" error="Team names need at least 2 characters.">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Team name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Team names need at least 2 characters.");
  });
});

describe("Toggle", () => {
  it("is a keyboard-operable switch", async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Dark mode" />);
    const sw = screen.getByRole("switch", { name: "Dark mode" });
    sw.focus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("StageBadge", () => {
  it("uses human-readable stage names", () => {
    render(<StageBadge stage="REGISTRATION_OPEN" />);
    expect(screen.getByText("Registration open")).toBeInTheDocument();
  });
});
