import { Range } from "vscode-languageserver";
import { LineParser, ParseResult } from "../types";

/**
 * Parser for simple arrays
 */
export class SimpleArrayParser implements LineParser {
  parse(line: string, lineNumber: number, _followingLines: string[]): ParseResult | null {
    // Check for array pattern: name[size]:
    const arrayMatch = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]:\s*(.*)$/);

    if (!arrayMatch) {
      return null;
    }

    // If it has curly braces, it might be a structured array
    if (line.includes('{') && line.includes('}')) {
      return null;
    }

    const indent = arrayMatch[1];
    const name = arrayMatch[2];
    const sizeStr = arrayMatch[3];
    const valuesStr = arrayMatch[4];

    const declaredSize = parseInt(sizeStr, 10);
    const nameStartChar = indent.length;
    const bracketStartChar = nameStartChar + name.length + 1; // +1 for '['
    const colonChar = line.indexOf(':', bracketStartChar);

    // Parse values
    const values: string[] = [];
    const valueRanges: Range[] = [];

    if (valuesStr.trim().length > 0) {
      const valueParts = valuesStr.split(',');
      let currentPos = colonChar + 1;

      for (const valuePart of valueParts) {
        const trimmedValue = valuePart.trim();
        const valueStartInPart = valuePart.indexOf(trimmedValue);
        const valueStartChar = currentPos + valueStartInPart;

        values.push(trimmedValue);
        valueRanges.push({
          start: { line: lineNumber, character: valueStartChar },
          end: { line: lineNumber, character: valueStartChar + trimmedValue.length }
        });

        currentPos += valuePart.length + 1; // +1 for comma
      }
    }

    return {
      type: 'simple-array',
      linesConsumed: 1,
      parsed: {
        name,
        nameRange: {
          start: { line: lineNumber, character: nameStartChar },
          end: { line: lineNumber, character: nameStartChar + name.length }
        },
        declaredSize,
        sizeRange: {
          start: { line: lineNumber, character: bracketStartChar },
          end: { line: lineNumber, character: bracketStartChar + sizeStr.length + 1 }
        },
        values,
        valueRanges
      }
    };
  }
}