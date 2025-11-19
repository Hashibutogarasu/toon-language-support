import { ParseResult } from "./parse-result";

/**
 * Interface for a line parser
 */
export interface LineParser {
  parse(line: string, lineNumber: number, followingLines: string[]): ParseResult | null;
}
