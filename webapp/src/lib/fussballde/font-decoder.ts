import * as fontkit from "fontkit";

const FONT_BASE_URL = "https://www.fussball.de/export.fontface/-/format/ttf/id";

const glyphNameToCharacter = new Map<string, string>([
  ["zero", "0"],
  ["one", "1"],
  ["two", "2"],
  ["three", "3"],
  ["four", "4"],
  ["five", "5"],
  ["six", "6"],
  ["seven", "7"],
  ["eight", "8"],
  ["nine", "9"],
  ["period", "."],
  ["comma", ","],
  ["colon", ":"],
  ["hyphen", "-"],
  ["space", " "],
]);

const fontCache = new Map<string, Promise<Map<number, string>>>();

function mapGlyphNameToCharacter(name: string | null | undefined, fallback: string): string {
  if (!name) {
    return fallback;
  }

  const namedCharacter = glyphNameToCharacter.get(name);

  if (namedCharacter) {
    return namedCharacter;
  }

  if (/^[A-Za-z]$/.test(name)) {
    return name;
  }

  return fallback;
}

async function loadFontMapping(fontId: string): Promise<Map<number, string>> {
  const response = await fetch(`${FONT_BASE_URL}/${fontId}/type/font`, {
    cache: "force-cache",
    headers: {
      "user-agent": "Mozilla/5.0 Tabellenrechner",
    },
  });

  if (!response.ok) {
    throw new Error(`Obfuscation-Font '${fontId}' konnte nicht geladen werden.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const font = fontkit.create(buffer);
  const mapping = new Map<number, string>();

  for (const codePoint of font.characterSet) {
    const glyph = font.glyphForCodePoint(codePoint);
    mapping.set(codePoint, mapGlyphNameToCharacter(glyph.name, String.fromCodePoint(codePoint)));
  }

  return mapping;
}

async function getFontMapping(fontId: string): Promise<Map<number, string>> {
  if (!fontCache.has(fontId)) {
    fontCache.set(
      fontId,
      loadFontMapping(fontId).catch((error) => {
        fontCache.delete(fontId);
        throw error;
      }),
    );
  }

  return fontCache.get(fontId) as Promise<Map<number, string>>;
}

export async function decodeObfuscatedText(rawText: string, fontId?: string | null): Promise<string> {
  if (!rawText || !fontId) {
    return rawText;
  }

  const mapping = await getFontMapping(fontId);
  let output = "";

  for (const character of rawText) {
    const codePoint = character.codePointAt(0);

    if (codePoint === undefined) {
      continue;
    }

    output += mapping.get(codePoint) ?? character;
  }

  return output;
}
