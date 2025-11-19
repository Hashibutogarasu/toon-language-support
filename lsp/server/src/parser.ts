import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Range representing a position in the document
 */
export interface Range {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

/**
 * Field definition in a structured array
 */
export interface Field {
  name: string;
  range: Range;
  index: number;
}

/**
 * Key-value pair (e.g., "task: Our favorite hikes")
 */
export interface KeyValuePair {
  key: string;
  keyRange: Range;
  value: string;
  valueRange: Range;
  colonPosition: number;
}

/**
 * Simple array (e.g., "friends[3]: ana,luis,sam")
 */
export interface SimpleArray {
  name: string;
  nameRange: Range;
  declaredSize: number;
  sizeRange: Range;
  values: string[];
  valueRanges: Range[];
}

/**
 * Data row in a structured array
 */
export interface ArrayData {
  lineNumber: number;
  values: string[];
  valueRanges: Range[];
  parentArray?: StructuredArray;
}

/**
 * Structured array (e.g., "hikes[3]{id,name,distance}")
 */
export interface StructuredArray {
  name: string;
  nameRange: Range;
  declaredSize: number;
  sizeRange: Range;
  fields: Field[];
  dataLines: ArrayData[];
}

/**
 * Parsed line in a toon document
 */
export interface ToonLine {
  type: 'key-value' | 'simple-array' | 'structured-array' | 'array-data' | 'empty';
  lineNumber: number;
  content: string;
  parsed?: KeyValuePair | SimpleArray | StructuredArray | ArrayData;
}

/**
 * Parsed toon document
 */
export interface ToonDocument {
  lines: ToonLine[];
}

/**
 * Result of parsing a line (or multiple lines)
 */
export interface ParseResult {
  parsed: KeyValuePair | SimpleArray | StructuredArray | ArrayData;
  linesConsumed: number;
  type: 'key-value' | 'simple-array' | 'structured-array' | 'array-data';
}

/**
 * Interface for a line parser
 */
export interface LineParser {
  parse(line: string, lineNumber: number, followingLines: string[]): ParseResult | null;
}

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

/**
 * Parser for key-value pairs
 */
export class KeyValuePairParser implements LineParser {
  parse(line: string, lineNumber: number, followingLines: string[]): ParseResult | null {
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

/**
 * Parser for simple arrays
 */
export class SimpleArrayParser implements LineParser {
  parse(line: string, lineNumber: number, followingLines: string[]): ParseResult | null {
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
    let currentPos = braceStartChar + 1;
    
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
