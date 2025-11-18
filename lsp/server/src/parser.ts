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
 * Parse a key-value pair line
 * Format: "key: value"
 */
export function parseKeyValuePair(line: string, lineNumber: number): KeyValuePair | null {
  const colonIndex = line.indexOf(':');
  
  if (colonIndex === -1) {
    return null;
  }
  
  const key = line.substring(0, colonIndex).trim();
  const valueStart = colonIndex + 1;
  const value = line.substring(valueStart).trim();
  
  const keyStartChar = line.indexOf(key);
  const valueStartChar = line.indexOf(value, colonIndex);
  
  return {
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
  };
}

/**
 * Parse a simple array line
 * Format: "name[size]: value1,value2,value3"
 */
export function parseSimpleArray(line: string, lineNumber: number): SimpleArray | null {
  // Check for array pattern: name[size]:
  const arrayMatch = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]:\s*(.*)$/);
  
  if (!arrayMatch) {
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
  };
}

/**
 * Parse a structured array declaration line
 * Format: "name[size]{field1,field2,field3}:"
 */
export function parseStructuredArray(
  line: string,
  lineNumber: number,
  followingLines: string[]
): StructuredArray | null {
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
  
  return structuredArray;
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

/**
 * Parse a complete toon document
 */
export function parseToonDocument(textDocument: TextDocument): ToonDocument {
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
    
    // Try to parse as structured array
    const structuredArray = parseStructuredArray(lineContent, i, textLines.slice(i + 1));
    if (structuredArray) {
      lines.push({
        type: 'structured-array',
        lineNumber: i,
        content: lineContent,
        parsed: structuredArray
      });
      
      // Add data lines
      for (let j = 0; j < structuredArray.dataLines.length; j++) {
        const dataLine = structuredArray.dataLines[j];
        lines.push({
          type: 'array-data',
          lineNumber: i + j + 1,
          content: textLines[i + j + 1],
          parsed: dataLine
        });
      }
      
      // Skip the data lines we just processed
      i += structuredArray.dataLines.length;
      continue;
    }
    
    // Try to parse as simple array
    const simpleArray = parseSimpleArray(lineContent, i);
    if (simpleArray) {
      lines.push({
        type: 'simple-array',
        lineNumber: i,
        content: lineContent,
        parsed: simpleArray
      });
      continue;
    }
    
    // Try to parse as key-value pair
    const keyValuePair = parseKeyValuePair(lineContent, i);
    if (keyValuePair) {
      lines.push({
        type: 'key-value',
        lineNumber: i,
        content: lineContent,
        parsed: keyValuePair
      });
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
