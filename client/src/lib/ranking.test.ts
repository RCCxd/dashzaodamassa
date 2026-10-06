import { describe, expect, it } from "vitest";
import { deadlineAtEndOfDueDate, isPastDueDate, latePenaltyLoss, LATE_PENALTY_RP, pointsForActivity, progressToNextRank, resolveValorantRank } from "./ranking";

describe("Valorant-style ranking", () => {
  it("deduz cinco RP uma única vez após o fim local do prazo", () => {
    const dueDate = new Date("2026-10-05T12:00:00.000Z");
    const deadline = deadlineAtEndOfDueDate(dueDate);
    expect(LATE_PENALTY_RP).toBe(5);
    expect(deadline.toISOString()).toBe("2026-10-06T00:00:00.000Z");
    expect(isPastDueDate(dueDate, new Date(deadline.getTime() - 1))).toBe(false);
    expect(isPastDueDate(dueDate, new Date(deadline.getTime() + 1))).toBe(true);
    expect(isPastDueDate(null, new Date("2026-10-07T00:00:00.000Z"))).toBe(false);
    expect(latePenaltyLoss(32)).toBe(5);
    expect(latePenaltyLoss(2)).toBe(2);
    expect(latePenaltyLoss(0)).toBe(0);
    expect(latePenaltyLoss(-3)).toBe(0);
  });

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
