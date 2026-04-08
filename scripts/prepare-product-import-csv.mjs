import fs from "node:fs/promises";
import path from "node:path";

const SELL_PRODUCT_IMPORT_HEADERS = [
  "ID",
  "COD_INT",
  "CATEGORIA",
  "SOTTOCATEGORIA",
  "TIPO",
  "NOME_PRODOTTO",
  "DESCRIZIONE",
  "LISTINO_PREZZI",
  "URL_IMMAGINE",
  "URL_DOC",
  "ATTIVO",
];

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

async function prepareFile(relativePath) {
  const absolutePath = path.resolve(relativePath);
  const text = await fs.readFile(absolutePath, "utf8");
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const sourceHeaders = parseCsvLine(lines[0]);
  const headerIndex = Object.fromEntries(
    sourceHeaders.map((header, index) => [header, index]),
  );
  const sourceRows = lines.slice(1).map(parseCsvLine);

  const mappedRows = sourceRows.map((row) => ({
    ID: "",
    COD_INT: row[headerIndex.COD_INT] ?? "",
    CATEGORIA: row[headerIndex.CATEGORIA] ?? "",
    SOTTOCATEGORIA: row[headerIndex.SOTTOCATEGORIA] ?? "",
    TIPO: "",
    NOME_PRODOTTO: row[headerIndex.NOME_PRODOTTO] ?? "",
    DESCRIZIONE: row[headerIndex.DESCRIZIONE] ?? "",
    LISTINO_PREZZI: row[headerIndex.LISTINO_PREZZI] ?? "",
    URL_IMMAGINE: row[headerIndex.URL_IMMAGINE] ?? "",
    URL_DOC: row[headerIndex.URL_DOC] ?? "",
    ATTIVO: "SI",
  }));

  const toCsv = (rows) =>
    [SELL_PRODUCT_IMPORT_HEADERS, ...rows.map((row) => SELL_PRODUCT_IMPORT_HEADERS.map((header) => row[header]))]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

  const readyPath = absolutePath.replace(/\.csv$/i, "-ready.csv");
  await fs.writeFile(readyPath, `\uFEFF${toCsv(mappedRows)}\n`, "utf8");

  const accessoriRows = mappedRows.filter((row) => row.CATEGORIA === "Accessori");
  let accessoriPath = null;
  if (accessoriRows.length > 0) {
    accessoriPath = absolutePath.replace(/\.csv$/i, "-accessori-ready.csv");
    await fs.writeFile(accessoriPath, `\uFEFF${toCsv(accessoriRows)}\n`, "utf8");
  }

  return {
    source: relativePath,
    ready: path.relative(process.cwd(), readyPath),
    readyRows: mappedRows.length,
    accessori: accessoriPath ? path.relative(process.cwd(), accessoriPath) : null,
    accessoriRows: accessoriRows.length,
  };
}

const targets = [
  "data/dadesign-products-import.csv",
  "data/speedywood-products-import.csv",
];

const results = [];
for (const target of targets) {
  results.push(await prepareFile(target));
}

console.log(JSON.stringify(results, null, 2));
