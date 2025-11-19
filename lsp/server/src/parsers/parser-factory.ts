import { LineParser, ParseResult } from "../types";

/**
 * Factory for managing and executing parsers
 */
export class ParserFactory {
  private parsers: LineParser[] = [];

  register(parser: LineParser) {
    this.parsers.push(parser);
  }

  parse(line: string, lineNumber: number, followingLines: string[]): ParseResult | null {
    for (const parser of this.parsers) {
      const result = parser.parse(line, lineNumber, followingLines);
      if (result) {
        return result;
      }
    }
    return null;
  }
}