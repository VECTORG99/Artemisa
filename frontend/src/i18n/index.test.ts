import { describe, expect, it } from "vitest";
import { useTranslations, messages } from "./index";

describe("useTranslations", () => {
  it("returns messages for the 'common' namespace", () => {
    const t = useTranslations("common");
    expect(t).toBe(messages.common);
    expect(t.loading).toBe("Cargando...");
    expect(t.error).toBe("Error");
    expect(t.cancel).toBe("Cancelar");
  });

  it("returns messages for the 'dashboard' namespace", () => {
    const t = useTranslations("dashboard");
    expect(t).toBe(messages.dashboard);
    expect(t.title).toBe("Dashboard");
    expect(t.execute).toBe("Desplegar y Ejecutar");
    expect(t.noHistory).toBe("No hay ejecuciones registradas");
  });

  it("returns messages for the 'creator' namespace", () => {
    const t = useTranslations("creator");
    expect(t).toBe(messages.creator);
    expect(t.title).toBe("Huascar Creator");
    expect(t.generate).toBe("Generar configuración");
  });

  it("returns messages for the 'landing' namespace", () => {
    const t = useTranslations("landing");
    expect(t).toBe(messages.landing);
    expect(t.heroTitle).toBe("Huascar");
    expect(t.heroCta).toBe("Empezar misión");
    expect(t.ctaTitle).toBe("¿Listo para construir tu agente?");
  });

  it("all namespaces are defined and non-empty", () => {
    const namespaces = Object.keys(messages) as Array<keyof typeof messages>;
    expect(namespaces.length).toBeGreaterThanOrEqual(4);

    for (const ns of namespaces) {
      const t = useTranslations(ns);
      expect(Object.keys(t).length).toBeGreaterThan(0);
    }
  });
});
