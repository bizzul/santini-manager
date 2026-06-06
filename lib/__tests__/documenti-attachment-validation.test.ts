import {
  validateDocumentAttachment,
  DOCUMENT_ATTACHMENT_MAX_SIZE_BYTES,
} from "@/lib/documenti/attachment-validation";

describe("attachment-validation", () => {
  it("accepts allowed MIME types within size limit", () => {
    const result = validateDocumentAttachment({
      name: "doc.pdf",
      size: 1024,
      type: "application/pdf",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects oversized files", () => {
    const result = validateDocumentAttachment({
      name: "big.pdf",
      size: DOCUMENT_ATTACHMENT_MAX_SIZE_BYTES + 1,
      type: "application/pdf",
    });
    expect(result.valid).toBe(false);
    expect(result.message).toContain("troppo grande");
  });

  it("rejects unsupported MIME types", () => {
    const result = validateDocumentAttachment({
      name: "virus.exe",
      size: 100,
      type: "application/x-msdownload",
    });
    expect(result.valid).toBe(false);
    expect(result.message).toContain("Formato non supportato");
  });
});
