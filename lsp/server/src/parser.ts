import { TextDocument } from 'vscode-languageserver-textdocument';
import { StructuredArrayParser } from './parsers/structured-array-parser';
import { SimpleArrayParser } from './parsers/simple-array-parser';
import { KeyValuePairParser } from './parsers/key-value-pair-parser';
import { ParserFactory } from './parsers/parser-factory';
import { ArrayData, KeyValuePair, Range, SimpleArray, StructuredArray, ToonDocument, ToonLine } from './types';

/**
 * Parse an array data line (data row in a structured array)
 * Format: "  value1,value2,value3"
 */
export function parseArrayData(
  line: string,
  lineNumber: number,
  parentArray: StructuredArray
): ArrayData | null {
  const trimmedLine = line.trim();

  if (trimmedLine.length === 0) {
    return null;
  }

  // Parse comma-separated values
  const values: string[] = [];
  const valueRanges: Range[] = [];
  const valueParts = trimmedLine.split(',');

  let currentPos = line.indexOf(trimmedLine);

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

  return {
    lineNumber,
    values,
    valueRanges,
    parentArray
  };
}

// --- Wrapper functions for backward compatibility ---
export function parseKeyValuePair(line: string, lineNumber: number): KeyValuePair | null {
  const parser = new KeyValuePairParser();
  const result = parser.parse(line, lineNumber, []);
  return result ? (result.parsed as KeyValuePair) : null;
}

export function parseSimpleArray(line: string, lineNumber: number): SimpleArray | null {
  const parser = new SimpleArrayParser();
  const result = parser.parse(line, lineNumber, []);
  return result ? (result.parsed as SimpleArray) : null;
}

export function parseStructuredArray(
  line: string,
  lineNumber: number,
  followingLines: string[]
): StructuredArray | null {
  const parser = new StructuredArrayParser();
  const result = parser.parse(line, lineNumber, followingLines);
  return result ? (result.parsed as StructuredArray) : null;
}

/**
 * Parse a complete toon document
 */
export function parseToonDocument(textDocument: TextDocument): ToonDocument {
  const factory = new ParserFactory();
  // Register parsers (order matters: structured array before simple array before key-value)
  // Actually, my regexes are specific enough, but structured array vs simple array overlap on name[size]
  // Structured array has {fields}, simple array has : values
  // KeyValuePair looks for colon.

  factory.register(new StructuredArrayParser());
  factory.register(new SimpleArrayParser());
  factory.register(new KeyValuePairParser());

  const lines: ToonLine[] = [];
  const text = textDocument.getText();
  const textLines = text.split('\n');

  for (let i = 0; i < textLines.length; i++) {
    const lineContent = textLines[i];

    // Skip empty lines
    if (lineContent.trim().length === 0) {
      lines.push({
        type: 'empty',
        lineNumber: i,
        content: lineContent
      });
      continue;
    }

    const result = factory.parse(lineContent, i, textLines.slice(i + 1));

    if (result) {
      lines.push({
        type: result.type,
        lineNumber: i,
        content: lineContent,
        parsed: result.parsed
      });

      // If structured array, we need to add the data lines to the document lines
      if (result.type === 'structured-array') {
        const structuredArray = result.parsed as StructuredArray;
        // We already consumed these lines in the parser, but we need to add them to the lines array
        // The parser returned linesConsumed which includes the declaration line + data lines
        // So we need to add (linesConsumed - 1) data lines

        for (let j = 0; j < structuredArray.dataLines.length; j++) {
          const dataLine = structuredArray.dataLines[j];
          lines.push({
            type: 'array-data',
            lineNumber: i + j + 1,
            content: textLines[i + j + 1],
            parsed: dataLine
          });
        }

        // Advance index
        i += structuredArray.dataLines.length;
      }
      continue;
    }

    // If nothing matches, treat as empty/unknown
    lines.push({
      type: 'empty',
      lineNumber: i,
      content: lineContent
    });
  }

  return { lines };
}
