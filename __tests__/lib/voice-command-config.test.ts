import {
  analyzeVoiceCommandKeywords,
  getVoiceCommandScreenContext,
} from "@/lib/voice-command-config";
import { splitVoiceCommandTranscript } from "@/lib/voice-command-transcript";

describe("lib/voice-command-config - screen context", () => {
  it("detects the products screen from pathname", () => {
    const context = getVoiceCommandScreenContext("/sites/demo/products");

    expect(context.key).toBe("products");
    expect(context.allowedIntents).toEqual(["create_product"]);
  });

  it("detects the offer create screen and exposes contextual actions", () => {
    const context = getVoiceCommandScreenContext("/sites/demo/offerte/create");

    expect(context.key).toBe("offer-create");
    expect(context.allowedIntents).toEqual([
      "create_offer",
      "create_client",
      "create_product",
    ]);
  });
});

describe("lib/voice-command-config - keyword coverage", () => {
  it("recognizes move_card when the dictation contains move verb, project keyword and destination", () => {
    const analysis = analyzeVoiceCommandKeywords(
      "Sposta il progetto 26-632 in inviata",
      ["move_card", "create_project"],
    );

    expect(analysis.recognizedIntents).toEqual(["move_card"]);
  });

  it("does not recognize move_card when the destination is missing", () => {
    const analysis = analyzeVoiceCommandKeywords(
      "Sposta il progetto 26-632",
      ["move_card"],
    );

    expect(analysis.recognizedIntents).toEqual([]);
    expect(analysis.coverage[0]).toMatchObject({
      intent: "move_card",
      matched: false,
      missingGroups: ["destination"],
    });
  });

  it("requires both a creation verb and the project keyword to recognize create_project", () => {
    const analysis = analyzeVoiceCommandKeywords(
      "Nuovo cliente Bianchi",
      ["create_project"],
    );

    expect(analysis.recognizedIntents).toEqual([]);
    expect(analysis.coverage[0]).toMatchObject({
      intent: "create_project",
      matched: false,
      missingGroups: ["entity"],
    });
  });

  it("recognizes create_offer only when the offer keyword is present", () => {
    const analysis = analyzeVoiceCommandKeywords(
      "Crea offerta per Rossi serramenti",
      ["create_offer"],
    );

    expect(analysis.recognizedIntents).toEqual(["create_offer"]);
  });

  it("recognizes create_client for add client phrasing", () => {
    const analysis = analyzeVoiceCommandKeywords(
      "Aggiungi cliente Bianchi SA in via Roma 1 Lugano",
      ["create_client"],
    );

    expect(analysis.recognizedIntents).toEqual(["create_client"]);
  });

  it("recognizes create_product for add product phrasing", () => {
    const analysis = analyzeVoiceCommandKeywords(
      "Aggiungi prodotto armadio categoria cucine",
      ["create_product"],
    );

    expect(analysis.recognizedIntents).toEqual(["create_product"]);
  });

  it("does not recognize create_product when the product keyword is missing", () => {
    const analysis = analyzeVoiceCommandKeywords(
      "Aggiungi armadio categoria cucine",
      ["create_product"],
    );

    expect(analysis.recognizedIntents).toEqual([]);
    expect(analysis.coverage[0]).toMatchObject({
      intent: "create_product",
      matched: false,
      missingGroups: ["entity"],
    });
  });
});

describe("lib/voice-command-transcript", () => {
  it("splits a dictation with multiple actions into atomic commands", () => {
    const segments = splitVoiceCommandTranscript(
      "Sposta il progetto 26-632 in inviata. Poi crea anche un'offerta per il cliente Franceschelli Mirko per quattro armadi. Poi crea anche un'offerta per il signor Gianni Lucia per una nuova finestra in legno.",
    );

    expect(segments).toEqual([
      "Sposta il progetto 26-632 in inviata",
      "crea anche un'offerta per il cliente Franceschelli Mirko per quattro armadi",
      "crea anche un'offerta per il signor Gianni Lucia per una nuova finestra in legno",
    ]);
  });

  it("keeps a single command untouched", () => {
    const segments = splitVoiceCommandTranscript(
      "Crea offerta per Rossi serramenti da 4500 franchi",
    );

    expect(segments).toEqual([
      "Crea offerta per Rossi serramenti da 4500 franchi",
    ]);
  });
});
