import {
  matchEntity,
  normalizeText,
  type MatchableEntity,
} from "@/lib/personal-manager/matchEntity";

const entities: MatchableEntity[] = [
  {
    id: "e-mmm",
    name: "MMM",
    aliases: ["medical manager", "matris medical manager"],
  },
  {
    id: "e-fabio",
    name: "Fabio Käppeli",
    aliases: ["fabio"],
  },
  {
    id: "e-santini",
    name: "Santini",
    aliases: ["falegnameria santini"],
  },
  {
    id: "e-deleted",
    name: "Ghost",
    aliases: ["fantasma"],
    deleted_at: "2026-01-01T00:00:00Z",
  },
];

describe("normalizeText", () => {
  it("rimuove accenti e normalizza spazi", () => {
    expect(normalizeText("  Käppeli  ")).toBe("kappeli");
  });
});

describe("matchEntity", () => {
  it("match nome esatto", () => {
    expect(matchEntity("MMM", entities)).toBe("e-mmm");
  });

  it("match alias", () => {
    expect(matchEntity("medical manager", entities)).toBe("e-mmm");
  });

  it("case-insensitive", () => {
    expect(matchEntity("mmm", entities)).toBe("e-mmm");
    expect(matchEntity("FABIO", entities)).toBe("e-fabio");
  });

  it("accenti/normalizzazione (kappeli → Käppeli)", () => {
    expect(matchEntity("kappeli", entities)).toBe("e-fabio");
  });

  it("errore lieve di trascrizione", () => {
    expect(matchEntity("Santnii", entities)).toBe("e-santini");
  });

  it("nessun match → null", () => {
    expect(matchEntity("Inesistente XYZ", entities)).toBeNull();
    expect(matchEntity(null, entities)).toBeNull();
    expect(matchEntity("", entities)).toBeNull();
  });

  it("entità soft-deleted esclusa", () => {
    expect(matchEntity("Ghost", entities)).toBeNull();
    expect(matchEntity("fantasma", entities)).toBeNull();
  });
});
