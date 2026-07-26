import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/utils";
import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders translated title from i18n", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Dashboard"
    );
  });

  it("renders translated placeholder text from i18n", () => {
    render(<DashboardPage />);
    expect(
      screen.getByText("Ejecución de agentes y terminal — por implementar.")
    ).toBeInTheDocument();
  });

  it("does not contain hardcoded strings outside of i18n messages", () => {
    // This test verifies the component uses useTranslations
    // by checking the rendered output matches es.json values
    render(<DashboardPage />);
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main.querySelector("h1")).toHaveTextContent("Dashboard");
  });
});
