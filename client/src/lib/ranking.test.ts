import { describe, expect, it } from "vitest";
import { pointsForActivity, resolveValorantRank } from "@/lib/ranking";

describe("ranking escolar", () => {
  it("só concede pontos pelo nível de prioridade da atividade", () => {
    expect(pointsForActivity("baixa")).toBe(10);
    expect(pointsForActivity("media")).toBe(12);
    expect(pointsForActivity("alta")).toBe(15);
  });

  it("ordena níveis e divisões a cada 100 RP", () => {
    expect(resolveValorantRank(0).label).toBe("Ferro I");
    expect(resolveValorantRank(99).label).toBe("Ferro I");
    expect(resolveValorantRank(100).label).toBe("Ferro II");
    expect(resolveValorantRank(300).label).toBe("Bronze I");
    expect(resolveValorantRank(2_399).label).toBe("Imortal III");
    expect(resolveValorantRank(2_400).label).toBe("Radiante");
  });

  it("não produz valores negativos e preserva o excedente de Radiante", () => {
    expect(resolveValorantRank(-50).totalRP).toBe(0);
    expect(resolveValorantRank(2_450).rr).toBe(50);
  });
});
