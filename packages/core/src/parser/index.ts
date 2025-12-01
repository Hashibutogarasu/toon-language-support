/**
 * Parser Module
 * 
 * This module exports the Toon parser class that provides AST-based parsing
 * for Toon language files with event-driven architecture.
 */

import {
  ASTNode,
  DocumentNode,
  KeyValuePairNode,
  SimpleArrayNode,
  StructuredArrayNode,
  FieldNode,
  DataRowNode,
  ValueNode,
  EmptyNode,
  createRange,
} from '../ast';

import {
  ToonEventEmitterBase,
  ParseError,
} from '../events';

import { ASTVisitor, ASTWalker } from '../visitor';

/**
 * Options for configuring the Toon parser
 */
export interface ToonOptions {
  /** Whether to emit node:visit events during parsing (default: false) */
  emitNodeVisits?: boolean;
}

/**
 * Interface representing a TextDocument (compatible with LSP TextDocument)
 */
export interface TextDocument {
  /** Get the full text content of the document */
  getText(): string;
  /** The URI of the document */
  uri: string;
}

/**
 * Toon parser class - main entry point for parsing Toon documents
 * 
 * Extends ToonEventEmitterBase to provide event-driven parsing with
 * lifecycle events (parse:start, parse:complete, parse:error, node:visit).
 */
export class Toon extends ToonEventEmitterBase {
  private options: ToonOptions;
  private walker: ASTWalker;

  constructor(options?: ToonOptions) {
    super();
    this.options = options ?? {};
    this.walker = new ASTWalker({
      onNodeVisit: this.options.emitNodeVisits
        ? (node, depth) => this.emitNodeVisit(node, depth)
        : undefined,
    });
  }

  /**
   * Parse a Toon document from text string
   * 
   * @param text - The source text to parse
   * @returns DocumentNode AST representing the parsed document
   */
  parse(text: string): DocumentNode {
    const startTime = Date.now();

    // Emit parse:start event
    this.emitParseStart(text);

    try {
      const lines = text.split('\n');
      const children: ASTNode[] = [];
      let lineIndex = 0;

      while (lineIndex < lines.length) {
        const line = lines[lineIndex];
        const result = this.parseLine(line, lineIndex, lines);

        if (result.node) {
          children.push(result.node);
        }

        lineIndex += result.linesConsumed;
      }

      // Create document node
      const documentNode: DocumentNode = {
        type: 'document',
        range: createRange(0, 0, lines.length - 1, lines[lines.length - 1]?.length ?? 0),
        children,
      };

      // Set parent references
      for (const child of children) {
        child.parent = documentNode;
      }

      // Emit parse:complete event
      this.emitParseComplete(documentNode, startTime);

      return documentNode;
    } catch (error) {
      // Emit parse:error for unexpected errors
      const parseError: ParseError = {
        message: error instanceof Error ? error.message : 'Unknown parse error',
        range: createRange(0, 0, 0, 0),
        severity: 'error',
      };
      this.emitParseError(parseError);
      throw error;
    }
  }

  /**
   * Parse a Toon document from a TextDocument object
   * 
   * @param document - The TextDocument to parse
   * @returns DocumentNode AST representing the parsed document
   */
  parseDocument(document: TextDocument): DocumentNode {
    return this.parse(document.getText());
  }

  /**
   * Accept a visitor for AST traversal
   * 
   * @param visitor - The visitor to accept
   * @param ast - The AST to traverse (optional, will parse empty document if not provided)
   */
  accept(visitor: ASTVisitor, ast?: DocumentNode): void {
    if (!ast) {
      ast = this.parse('');
    }
    this.walker.walk(ast, visitor);
  }

  /**
   * Parse a single line and return the resulting node and lines consumed
   */
  private parseLine(
    line: string,
    lineNumber: number,
    allLines: string[]
  ): { node: ASTNode | null; linesConsumed: number } {
    const trimmedLine = line.trim();

    // Empty line
    if (trimmedLine.length === 0) {
      return {
        node: this.createEmptyNode(lineNumber, line.length),
        linesConsumed: 1,
      };
    }

    // Try structured array first (most specific pattern)
    const structuredArrayResult = this.tryParseStructuredArray(line, lineNumber, allLines);
    if (structuredArrayResult) {
      return structuredArrayResult;
    }

    // Try simple array
    const simpleArrayResult = this.tryParseSimpleArray(line, lineNumber);
    if (simpleArrayResult) {
      return simpleArrayResult;
    }

    // Try key-value pair
    const keyValueResult = this.tryParseKeyValuePair(line, lineNumber);
    if (keyValueResult) {
      return keyValueResult;
    }

    // Unknown line type - treat as empty
    return {
      node: this.createEmptyNode(lineNumber, line.length),
      linesConsumed: 1,
    };
  }

  /**
   * Try to parse a structured array: name[size]{field1,field2}:
   */
  private tryParseStructuredArray(
    line: string,
    lineNumber: number,
    allLines: string[]
  ): { node: StructuredArrayNode; linesConsumed: number } | null {
    // Pattern: name[size]{fields}:
    const match = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]\{([^}]+)\}:\s*$/);
    if (!match) {
      return null;
    }

    const indent = match[1];
    const name = match[2];
    const sizeStr = match[3];
    const fieldsStr = match[4];

    const declaredSize = parseInt(sizeStr, 10);
    const nameStartChar = indent.length;
    const bracketStartChar = nameStartChar + name.length;
    const braceStartChar = line.indexOf('{', bracketStartChar);

    // Parse fields
    const fields: FieldNode[] = [];
    const fieldNames = fieldsStr.split(',').map(f => f.trim());
    let fieldSearchStart = 0;

    for (const fieldName of fieldNames) {
      const fieldStartInStr = fieldsStr.indexOf(fieldName, fieldSearchStart);
      const fieldStartChar = braceStartChar + 1 + fieldStartInStr;

      const fieldNode: FieldNode = {
        type: 'field',
        name: fieldName,
        range: createRange(lineNumber, fieldStartChar, lineNumber, fieldStartChar + fieldName.length),
      };
      fields.push(fieldNode);
      fieldSearchStart = fieldStartInStr + fieldName.length;
    }

    // Parse data rows (following lines that start with whitespace)
    const dataRows: DataRowNode[] = [];
    let dataLineIndex = lineNumber + 1;

    while (dataLineIndex < allLines.length) {
      const dataLine = allLines[dataLineIndex];

      // Stop if we hit an empty line or a line that doesn't start with whitespace
      if (dataLine.trim().length === 0 || !dataLine.match(/^\s+/)) {
        break;
      }

      const dataRow = this.parseDataRow(dataLine, dataLineIndex, fields.length);
      if (dataRow) {
        dataRows.push(dataRow);
      }
      dataLineIndex++;
    }

    const linesConsumed = 1 + dataRows.length;
    const endLine = lineNumber + linesConsumed - 1;
    const endChar = dataRows.length > 0
      ? allLines[endLine].length
      : line.length;

    const structuredArrayNode: StructuredArrayNode = {
      type: 'structured-array',
      name,
      nameRange: createRange(lineNumber, nameStartChar, lineNumber, nameStartChar + name.length),
      declaredSize,
      sizeRange: createRange(lineNumber, bracketStartChar + 1, lineNumber, bracketStartChar + 1 + sizeStr.length),
      fields,
      dataRows,
      range: createRange(lineNumber, 0, endLine, endChar),
    };

    // Set parent references
    for (const field of fields) {
      field.parent = structuredArrayNode;
    }
    for (const row of dataRows) {
      row.parent = structuredArrayNode;
    }

    return { node: structuredArrayNode, linesConsumed };
  }

  /**
   * Parse a data row in a structured array
   */
  private parseDataRow(line: string, lineNumber: number, _expectedFieldCount: number): DataRowNode | null {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) {
      return null;
    }

    const values: ValueNode[] = [];
    const valueParts = trimmedLine.split(',');
    let currentPos = line.indexOf(trimmedLine);

    for (const valuePart of valueParts) {
      const trimmedValue = valuePart.trim();
      const valueStartInPart = valuePart.indexOf(trimmedValue);
      const valueStartChar = currentPos + valueStartInPart;

      const valueNode: ValueNode = {
        type: 'value',
        value: trimmedValue,
        range: createRange(lineNumber, valueStartChar, lineNumber, valueStartChar + trimmedValue.length),
      };
      values.push(valueNode);
      currentPos += valuePart.length + 1; // +1 for comma
    }

    const dataRowNode: DataRowNode = {
      type: 'data-row',
      values,
      range: createRange(lineNumber, line.indexOf(trimmedLine), lineNumber, line.indexOf(trimmedLine) + trimmedLine.length),
    };

    // Set parent references for values
    for (const value of values) {
      value.parent = dataRowNode;
    }

    return dataRowNode;
  }

  /**
   * Try to parse a simple array: name[size]: value1,value2,value3
   */
  private tryParseSimpleArray(
    line: string,
    lineNumber: number
  ): { node: SimpleArrayNode; linesConsumed: number } | null {
    // Pattern: name[size]: values
    const match = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]:\s*(.*)$/);
    if (!match) {
      return null;
    }

    // If it has curly braces, it's a structured array
    if (line.includes('{') && line.includes('}')) {
      return null;
    }

    const indent = match[1];
    const name = match[2];
    const sizeStr = match[3];
    const valuesStr = match[4];

    const declaredSize = parseInt(sizeStr, 10);
    const nameStartChar = indent.length;
    const bracketStartChar = nameStartChar + name.length;
    const colonChar = line.indexOf(':', bracketStartChar);

    // Parse values
    const values: ValueNode[] = [];

    if (valuesStr.trim().length > 0) {
      const valueParts = valuesStr.split(',');
      // Find where valuesStr actually starts in the line (after colon and any whitespace)
      const valuesStartPos = line.indexOf(valuesStr, colonChar + 1);
      let currentPos = valuesStartPos;

      for (const valuePart of valueParts) {
        const trimmedValue = valuePart.trim();
        const valueStartInPart = valuePart.indexOf(trimmedValue);
        const valueStartChar = currentPos + valueStartInPart;

        const valueNode: ValueNode = {
          type: 'value',
          value: trimmedValue,
          range: createRange(lineNumber, valueStartChar, lineNumber, valueStartChar + trimmedValue.length),
        };
        values.push(valueNode);
        currentPos += valuePart.length + 1; // +1 for comma
      }
    }

    const simpleArrayNode: SimpleArrayNode = {
      type: 'simple-array',
      name,
      nameRange: createRange(lineNumber, nameStartChar, lineNumber, nameStartChar + name.length),
      declaredSize,
      sizeRange: createRange(lineNumber, bracketStartChar + 1, lineNumber, bracketStartChar + 1 + sizeStr.length),
      values,
      range: createRange(lineNumber, 0, lineNumber, line.length),
    };

    // Set parent references for values
    for (const value of values) {
      value.parent = simpleArrayNode;
    }

    return { node: simpleArrayNode, linesConsumed: 1 };
  }

  /**
   * Try to parse a key-value pair: key: value
   */
  private tryParseKeyValuePair(
    line: string,
    lineNumber: number
  ): { node: KeyValuePairNode; linesConsumed: number } | null {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return null;
    }

    // If it looks like an array declaration (has brackets before colon), skip
    const bracketIndex = line.indexOf('[');
    if (bracketIndex !== -1 && bracketIndex < colonIndex) {
      return null;
    }

    const key = line.substring(0, colonIndex).trim();
    const valueStart = colonIndex + 1;
    const value = line.substring(valueStart).trim();

    const keyStartChar = line.indexOf(key);
    const valueStartChar = value.length > 0 ? line.indexOf(value, colonIndex) : colonIndex + 1;

    const keyValueNode: KeyValuePairNode = {
      type: 'key-value-pair',
      key,
      keyRange: createRange(lineNumber, keyStartChar, lineNumber, keyStartChar + key.length),
      value,
      valueRange: createRange(lineNumber, valueStartChar, lineNumber, valueStartChar + value.length),
      colonPosition: colonIndex,
      range: createRange(lineNumber, 0, lineNumber, line.length),
    };

    return { node: keyValueNode, linesConsumed: 1 };
  }

  /**
   * Create an empty node for empty lines
   */
  private createEmptyNode(lineNumber: number, lineLength: number): EmptyNode {
    return {
      type: 'empty',
      range: createRange(lineNumber, 0, lineNumber, lineLength),
    };
  }
}
