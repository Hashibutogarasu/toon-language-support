/**
 * AST Node Type Definitions for Toon Language
 * 
 * This module defines all AST node interfaces for the Toon language parser.
 */

/**
 * Represents a position in a text document.
 * Line and character are 0-based indices.
 */
export interface Position {
  /** 0-based line number */
  line: number;
  /** 0-based character offset within the line */
  character: number;
}

/**
 * Represents a range in a text document.
 * A range is defined by a start and end position.
 */
export interface Range {
  /** The start position of the range (inclusive) */
  start: Position;
  /** The end position of the range (exclusive) */
  end: Position;
}

/**
 * Union type of all possible AST node types
 */
export type ASTNodeType =
  | 'document'
  | 'key-value-pair'
  | 'simple-array'
  | 'structured-array'
  | 'field'
  | 'data-row'
  | 'value'
  | 'empty';

/**
 * Base interface for all AST nodes.
 * All specific node types extend this interface.
 */
export interface ASTNode {
  /** The type discriminator for the node */
  type: ASTNodeType;
  /** The source range of this node in the document */
  range: Range;
  /** Reference to the parent node (undefined for root) */
  parent?: ASTNode;
}

/**
 * Document root node - contains all top-level nodes in a Toon document
 */
export interface DocumentNode extends ASTNode {
  type: 'document';
  /** All top-level children nodes in the document */
  children: ASTNode[];
}

/**
 * Key-value pair node: "key: value"
 */
export interface KeyValuePairNode extends ASTNode {
  type: 'key-value-pair';
  /** The key string */
  key: string;
  /** Range of the key in the source */
  keyRange: Range;
  /** The value string */
  value: string;
  /** Range of the value in the source */
  valueRange: Range;
  /** Character position of the colon separator */
  colonPosition: number;
}

/**
 * Individual value node
 */
export interface ValueNode extends ASTNode {
  type: 'value';
  /** The value string */
  value: string;
}

/**
 * Simple array node: "name[size]: value1,value2,value3"
 */
export interface SimpleArrayNode extends ASTNode {
  type: 'simple-array';
  /** The array name */
  name: string;
  /** Range of the name in the source */
  nameRange: Range;
  /** The declared size of the array */
  declaredSize: number;
  /** Range of the size declaration in the source */
  sizeRange: Range;
  /** Array of value nodes */
  values: ValueNode[];
}

/**
 * Field definition node in a structured array
 */
export interface FieldNode extends ASTNode {
  type: 'field';
  /** The field name */
  name: string;
}

/**
 * Data row node in a structured array
 */
export interface DataRowNode extends ASTNode {
  type: 'data-row';
  /** Array of value nodes in this row */
  values: ValueNode[];
}

/**
 * Structured array node: "name[size]{field1,field2}:"
 */
export interface StructuredArrayNode extends ASTNode {
  type: 'structured-array';
  /** The array name */
  name: string;
  /** Range of the name in the source */
  nameRange: Range;
  /** The declared size of the array (number of data rows) */
  declaredSize: number;
  /** Range of the size declaration in the source */
  sizeRange: Range;
  /** Array of field definition nodes */
  fields: FieldNode[];
  /** Array of data row nodes */
  dataRows: DataRowNode[];
}

/**
 * Empty line or comment node
 */
export interface EmptyNode extends ASTNode {
  type: 'empty';
}

/**
 * Helper function to create a Position
 */
export function createPosition(line: number, character: number): Position {
  return { line, character };
}

/**
 * Helper function to create a Range
 */
export function createRange(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number
): Range {
  return {
    start: createPosition(startLine, startCharacter),
    end: createPosition(endLine, endCharacter),
  };
}

/**
 * Check if a position is within a range
 */
export function isPositionInRange(position: Position, range: Range): boolean {
  // Check if position is before range start
  if (position.line < range.start.line) { return false; }
  if (position.line === range.start.line && position.character < range.start.character) { return false; }

  // Check if position is after range end
  if (position.line > range.end.line) { return false; }
  if (position.line === range.end.line && position.character >= range.end.character) { return false; }

  return true;
}
