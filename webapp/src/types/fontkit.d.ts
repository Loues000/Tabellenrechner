declare module "fontkit" {
  type Glyph = {
    id: number;
    name?: string | null;
  };

  type Font = {
    characterSet: number[];
    glyphForCodePoint(codePoint: number): Glyph;
  };

  export const create: (buffer: Buffer) => Font;

  const fontkit: {
    create(buffer: Buffer): Font;
  };
}
