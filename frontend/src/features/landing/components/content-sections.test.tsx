import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/utils";
import { HeroSection, ContentSections } from "./content-sections";

describe("HeroSection", () => {
  it("renders hero title from i18n landing namespace", () => {
    render(<HeroSection />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Huascar"
    );
  });

  it("renders hero description from i18n", () => {
    render(<HeroSection />);
    expect(
      screen.getByText(/Diseña agentes de desarrollo y operación/)
    ).toBeInTheDocument();
  });

  it("renders CTA button text from i18n", () => {
    render(<HeroSection />);
    expect(screen.getByText("Empezar misión")).toBeInTheDocument();
  });

  it("links to /agents/new", () => {
    render(<HeroSection />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/agents/new");
  });
});

describe("ContentSections", () => {
  it("renders the final CTA title from i18n", () => {
    render(<ContentSections />);
    expect(
      screen.getByText("¿Listo para construir tu agente?")
    ).toBeInTheDocument();
  });

  it("renders the final CTA description from i18n", () => {
    render(<ContentSections />);
    expect(
      screen.getByText(
        "El Creator te guía paso a paso. Sin sorpresas, sin caja negra."
      )
    ).toBeInTheDocument();
  });

  it("renders the CTA button from i18n", () => {
    render(<ContentSections />);
    expect(screen.getByText("Iniciar Creator →")).toBeInTheDocument();
  });
});
