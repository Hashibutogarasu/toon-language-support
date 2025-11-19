/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseArrayData } from "../parser";
import { ArrayData, Field, LineParser, ParseResult, StructuredArray } from "../types";

/**
 * Parser for structured arrays
 */
export class StructuredArrayParser implements LineParser {
  parse(line: string, lineNumber: number, followingLines: string[]): ParseResult | null {
    // Check for structured array pattern: name[size]{fields}:
    const arrayMatch = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]\{([^}]+)\}:\s*$/);

    if (!arrayMatch) {
      return null;
    }

    const indent = arrayMatch[1];
    const name = arrayMatch[2];
    const sizeStr = arrayMatch[3];
    const fieldsStr = arrayMatch[4];

    const declaredSize = parseInt(sizeStr, 10);
    const nameStartChar = indent.length;
    const bracketStartChar = nameStartChar + name.length + 1; // +1 for '['
    const braceStartChar = line.indexOf('{', bracketStartChar);

    // Parse fields
    const fields: Field[] = [];
    const fieldNames = fieldsStr.split(',').map(f => f.trim());

    fieldNames.forEach((fieldName, index) => {
      const fieldStartInStr = fieldsStr.indexOf(fieldName, index > 0 ? fields[index - 1].name.length : 0);
      const fieldStartChar = braceStartChar + 1 + fieldStartInStr;

      fields.push({
        name: fieldName,
        range: {
          start: { line: lineNumber, character: fieldStartChar },
          end: { line: lineNumber, character: fieldStartChar + fieldName.length }
        },
        index
      });
    });

    // Parse data lines
    const dataLines: ArrayData[] = [];
    for (let i = 0; i < followingLines.length; i++) {
      const dataLine = followingLines[i];

      // Stop if we hit an empty line or a line that doesn't start with whitespace
      if (dataLine.trim().length === 0 || !dataLine.startsWith('  ')) {
        break;
      }

      const arrayData = parseArrayData(dataLine, lineNumber + i + 1, null as any);
      if (arrayData) {
        dataLines.push(arrayData);
      }
    }

    const structuredArray: StructuredArray = {
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
      fields,
      dataLines
    };

    // Link data lines back to parent array
    dataLines.forEach(dataLine => {
      dataLine.parentArray = structuredArray;
    });

    return {
      type: 'structured-array',
      linesConsumed: 1 + dataLines.length,
      parsed: structuredArray
    };
  }
}