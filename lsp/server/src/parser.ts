import { TextDocument } from 'vscode-languageserver-textdocument';
import { StructuredArrayParser } from './parsers/structured-array-parser';
import { SimpleArrayParser } from './parsers/simple-array-parser';
import { KeyValuePairParser } from './parsers/key-value-pair-parser';
import { ParserFactory } from './parsers/parser-factory';
import { DocumentPostProcessor, StructuredArrayPostProcessor } from './parsers/post-processors';
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

      // If structured array, we need to advance the index
      if (result.type === 'structured-array') {
        const structuredArray = result.parsed as StructuredArray;
        // Advance index by the number of data lines
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

  // Run post-processors
  const postProcessors: DocumentPostProcessor[] = [
    new StructuredArrayPostProcessor()
  ];

  let processedLines = lines;
  for (const processor of postProcessors) {
    processedLines = processor.process(processedLines, textLines);
  }

  return { lines: processedLines };
}
