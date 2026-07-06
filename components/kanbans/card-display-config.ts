export type CardDisplayField =
  | "projectCode"
  | "countryFlag"
  | "date"
  | "productCategory"
  | "image"
  | "client"
  | "location"
  | "objectName"
  | "pieces"
  | "value"
  | "notes"
  | "suppliers"
  | "activity";

export type CardDisplayMode = "normal" | "small";

export type CardFieldConfig = Record<CardDisplayMode, Record<CardDisplayField, boolean>>;

export const DEFAULT_CARD_FIELD_CONFIG: CardFieldConfig = {
  normal: {
    projectCode: true,
    countryFlag: true,
    date: true,
    productCategory: true,
    image: true,
    client: true,
    location: true,
    objectName: true,
    pieces: true,
    value: true,
    notes: true,
    suppliers: true,
    activity: true,
  },
  small: {
    projectCode: true,
    countryFlag: true,
    date: true,
    productCategory: true,
    image: true,
    client: true,
    location: true,
    objectName: true,
    pieces: true,
    value: true,
    notes: false,
    suppliers: false,
    activity: true,
  },
};

export const CARD_FIELD_LABELS: Record<CardDisplayField, string> = {
  projectCode: "No progetto",
  countryFlag: "Bandiera paese",
  date: "Data",
  productCategory: "Categoria",
  image: "Immagine",
  client: "Cliente",
  location: "Luogo",
  objectName: "Nome oggetto",
  pieces: "Pezzi",
  value: "Valore",
  notes: "Note",
  suppliers: "Fornitori",
  activity: "Cerchi/Avatar attivi",
};

