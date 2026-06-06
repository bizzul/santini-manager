import { extractTextFromTemplateBuffer } from "@/lib/documenti/extract-template-text";

describe("extractTextFromTemplateBuffer", () => {
  it("extracts plain text buffers", async () => {
    const buffer = Buffer.from("Offerta per {{destinatario.nome}}\nOggetto: {{oggetto}}");
    const result = await extractTextFromTemplateBuffer(
      buffer,
      "text/plain",
      "modello.txt",
    );
    expect(result.source).toBe("text");
    expect(result.content).toContain("{{destinatario.nome}}");
  });

  it("rejects unsupported formats", async () => {
    const buffer = Buffer.from("binary");
    await expect(
      extractTextFromTemplateBuffer(buffer, "application/octet-stream", "file.bin"),
    ).rejects.toThrow("Formato non supportato");
  });
});
