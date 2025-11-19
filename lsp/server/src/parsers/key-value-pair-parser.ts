import { LineParser, ParseResult } from "../types";

/**
 * Parser for key-value pairs
 */
export class KeyValuePairParser implements LineParser {
  parse(line: string, lineNumber: number, _followingLines: string[]): ParseResult | null {
    const colonIndex = line.indexOf(':');

    if (colonIndex === -1) {
      return null;
    }

    // If it looks like an array declaration (has brackets before colon), skip
    // This is a simple heuristic to avoid matching arrays as key-value pairs
    const bracketIndex = line.indexOf('[');
    if (bracketIndex !== -1 && bracketIndex < colonIndex) {
      return null;
    }

    const key = line.substring(0, colonIndex).trim();
    const valueStart = colonIndex + 1;
    const value = line.substring(valueStart).trim();

    const keyStartChar = line.indexOf(key);
    const valueStartChar = line.indexOf(value, colonIndex);

    return {
      type: 'key-value',
      linesConsumed: 1,
      parsed: {
        key,
        keyRange: {
          start: { line: lineNumber, character: keyStartChar },
          end: { line: lineNumber, character: keyStartChar + key.length }
        },
        value,
        valueRange: {
          start: { line: lineNumber, character: valueStartChar },
          end: { line: lineNumber, character: valueStartChar + value.length }
        },
        colonPosition: colonIndex
      }
    };
  }
}