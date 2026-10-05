import { describe, expect, it } from "vitest";
import { pointsForActivity, progressToNextRank, resolveValorantRank } from "./ranking";

describe("Valorant-style ranking", () => {
  it("combina prioridade e tipo de atividade em fontes de RP distintas", () => {
    expect(pointsForActivity("baixa")).toBe(10);
    expect(pointsForActivity("media")).toBe(12);
    expect(pointsForActivity("alta")).toBe(15);
    expect(pointsForActivity("baixa", "prova")).toBe(15);
    expect(pointsForActivity("media", "trabalho")).toBe(15);
    expect(pointsForActivity("alta", "projeto")).toBe(19);
    expect(pointsForActivity("alta", "prova")).toBe(20);
  });

  it("ordena níveis e divisões a cada 50 RP, com Radiante a partir de 1.200", () => {
    expect(resolveValorantRank(0).label).toBe("Ferro I");
    expect(resolveValorantRank(49).label).toBe("Ferro I");
    expect(resolveValorantRank(50).label).toBe("Ferro II");
    expect(resolveValorantRank(150).label).toBe("Bronze I");
    expect(resolveValorantRank(1_199).label).toBe("Imortal III");
    expect(resolveValorantRank(1_200).label).toBe("Radiante");
  });

  it("não produz valores negativos e preserva o excedente de Radiante", () => {
    expect(resolveValorantRank(-50).totalRP).toBe(0);
    expect(resolveValorantRank(1_250).rr).toBe(50);
  });
});
