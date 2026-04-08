type CoverImageSource = "product" | "project" | "placeholder";

type PlaceholderKey =
  | "arredamento"
  | "porte"
  | "serramenti"
  | "casa"
  | "pavimenti"
  | "accessori"
  | "default";

type ResolveCoverImageInput = {
  productImageUrl?: string | null;
  projectImageUrl?: string | null;
  preferProjectCoverImage?: boolean;
  productCategoryName?: string | null;
  productType?: string | null;
  productName?: string | null;
  projectName?: string | null;
  projectLocation?: string | null;
  projectNotes?: string | null;
};

type ResolveCoverImageResult = {
  imageUrl: string;
  source: CoverImageSource;
  placeholderKey?: PlaceholderKey;
};

const PLACEHOLDER_PATHS: Record<PlaceholderKey, string[]> = {
  arredamento: ["/placeholders/arredamento.svg"],
  porte: ["/placeholders/photos/porte-catalogo.png", "/placeholders/porte.svg"],
  serramenti: [
    "/placeholders/photos/finestre-catalogo.png",
    "/placeholders/photos/zanzariera-plisse.png",
    "/placeholders/photos/zanzariera-rullo.png",
    "/placeholders/photos/zanzariera-verticale.png",
    "/placeholders/serramenti.svg",
  ],
  casa: ["/placeholders/casa.svg"],
  pavimenti: ["/placeholders/pavimenti.svg"],
  accessori: ["/placeholders/accessori.svg"],
  default: ["/placeholders/default.svg"],
};

const CATEGORY_TO_PLACEHOLDER: Record<string, PlaceholderKey> = {
  arredamento: "arredamento",
  porte: "porte",
  serramenti: "serramenti",
  casa: "casa",
  case: "casa",
  immobili: "casa",
  pavimenti: "pavimenti",
  pavimento: "pavimenti",
  parquet: "pavimenti",
  accessori: "accessori",
};

const KEYWORD_TO_PLACEHOLDER: Array<{ keywords: string[]; key: PlaceholderKey }> = [
  {
    keywords: [
      "pavimento",
      "pavimenti",
      "parquet",
      "gres",
      "piastrella",
      "piastrelle",
      "laminato",
      "vinilico",
      "rivestimento",
      "floor",
    ],
    key: "pavimenti",
  },
  {
    keywords: [
      "zanzariera",
      "zanzariere",
      "plisse",
      "rullo",
      "verticale",
      "finestra",
      "finestre",
      "serramento",
      "serramenti",
      "infisso",
      "infissi",
      "scorrevole",
      "persiana",
      "avvolgibile",
    ],
    key: "serramenti",
  },
  {
    keywords: [
      "casa",
      "case",
      "abitazione",
      "appartamento",
      "condominio",
      "villetta",
      "villa",
      "edificio",
      "facciata",
      "cantiere",
      "tetto",
    ],
    key: "casa",
  },
  {
    keywords: [
      "porta",
      "porte",
      "porta blindata",
      "portoncino",
      "portone",
    ],
    key: "porte",
  },
  {
    keywords: [
      "maniglia",
      "maniglie",
      "cerniera",
      "cerniere",
      "accessorio",
      "accessori",
      "ferramenta",
    ],
    key: "accessori",
  },
  {
    keywords: [
      "tavolo",
      "letto",
      "divano",
      "credenza",
      "madia",
      "armadio",
      "cucina",
      "mobile",
      "arredo",
      "arredamento",
      "libreria",
      "composizione",
    ],
    key: "arredamento",
  },
];

const normalizeText = (value?: string | null): string =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const isValidImageUrl = (value?: string | null): value is string =>
  typeof value === "string" && value.trim().length > 0;

const resolvePlaceholderKey = (
  categoryName?: string | null,
  searchableText?: string
): PlaceholderKey => {
  const normalizedCategory = normalizeText(categoryName);
  if (normalizedCategory && CATEGORY_TO_PLACEHOLDER[normalizedCategory]) {
    return CATEGORY_TO_PLACEHOLDER[normalizedCategory];
  }

  const text = normalizeText(searchableText);
  if (!text) {
    return "default";
  }

  const matchScores = new Map<PlaceholderKey, number>();
  for (const { keywords, key } of KEYWORD_TO_PLACEHOLDER) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        matchScores.set(key, (matchScores.get(key) || 0) + 1);
      }
    }
  }

  if (matchScores.size > 0) {
    return Array.from(matchScores.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  return "default";
};

const getStableHash = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export function resolveCoverImage(
  input: ResolveCoverImageInput
): ResolveCoverImageResult {
  const {
    productImageUrl,
    projectImageUrl,
    preferProjectCoverImage = false,
    productCategoryName,
    productType,
    productName,
    projectName,
    projectLocation,
    projectNotes,
  } = input;

  if (preferProjectCoverImage) {
    if (isValidImageUrl(projectImageUrl)) {
      return { imageUrl: projectImageUrl, source: "project" };
    }
    if (isValidImageUrl(productImageUrl)) {
      return { imageUrl: productImageUrl, source: "product" };
    }
  } else {
    if (isValidImageUrl(productImageUrl)) {
      return { imageUrl: productImageUrl, source: "product" };
    }
    if (isValidImageUrl(projectImageUrl)) {
      return { imageUrl: projectImageUrl, source: "project" };
    }
  }

  const searchableText = [
    productType,
    productName,
    projectName,
    projectLocation,
    projectNotes,
  ]
    .filter(Boolean)
    .join(" ");
  const placeholderKey = resolvePlaceholderKey(productCategoryName, searchableText);
  const candidates = PLACEHOLDER_PATHS[placeholderKey];
  const safeCandidates =
    candidates && candidates.length > 0
      ? candidates
      : PLACEHOLDER_PATHS.default;
  const selectedIndex =
    safeCandidates.length === 1
      ? 0
      : getStableHash(searchableText || placeholderKey) % safeCandidates.length;
  const imageUrl = safeCandidates[selectedIndex];

  return {
    imageUrl,
    source: "placeholder",
    placeholderKey,
  };
}
