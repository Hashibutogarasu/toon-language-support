/**
 * Serializer Module
 * 
 * This module provides serialization functionality to convert AST nodes
 * back to Toon text format, supporting round-trip parsing/printing.
 */

import {
  ASTNode,
  DocumentNode,
  KeyValuePairNode,
  BlockNode,
  SimpleArrayNode,
  StructuredArrayNode,
  EmptyNode,
} from '../ast';

/**
 * Options for configuring the serializer
 */
export interface SerializerOptions {
  /** Indentation string to use (default: '  ' - 2 spaces) */
  indent?: string;
  /** Line ending to use (default: '\n') */
  lineEnding?: string;
}

/**
 * Default serializer options
 */
const DEFAULT_OPTIONS: Required<SerializerOptions> = {
  indent: '  ',
  lineEnding: '\n',
};

/**
 * Serializer class for converting AST nodes back to Toon text format
 */
export class ToonSerializer {
  private options: Required<SerializerOptions>;

  constructor(options?: SerializerOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Serialize a DocumentNode to text
   */
  serialize(node: DocumentNode): string {
    const lines: string[] = [];

    for (const child of node.children) {
      const serialized = this.serializeNode(child, 0);
      if (serialized !== null) {
        lines.push(serialized);
      }
    }

    return lines.join(this.options.lineEnding);
  }

  /**
   * Serialize any AST node with the given indentation level
   */
  private serializeNode(node: ASTNode, indentLevel: number): string | null {
    const indent = this.options.indent.repeat(indentLevel);

    switch (node.type) {
      case 'key-value-pair':
        return this.serializeKeyValuePair(node as KeyValuePairNode, indent);

      case 'block':
        return this.serializeBlock(node as BlockNode, indentLevel);

      case 'simple-array':
        return this.serializeSimpleArray(node as SimpleArrayNode, indent);

      case 'structured-array':
        return this.serializeStructuredArray(node as StructuredArrayNode, indent);

      case 'empty':
        return this.serializeEmpty(node as EmptyNode);

      default:
        return null;
    }
  }

  /**
   * Serialize a KeyValuePairNode
   */
  private serializeKeyValuePair(node: KeyValuePairNode, indent: string): string {
    if (node.value.length > 0) {
      return `${indent}${node.key}: ${node.value}`;
    }
    return `${indent}${node.key}:`;
  }

  /**
   * Serialize a BlockNode with its children
   */
  private serializeBlock(node: BlockNode, indentLevel: number): string {
    const indent = this.options.indent.repeat(indentLevel);
    const lines: string[] = [];

    // Block header
    lines.push(`${indent}${node.key}:`);

    // Serialize children with increased indentation
    for (const child of node.children) {
      const serialized = this.serializeNode(child, indentLevel + 1);
      if (serialized !== null) {
        lines.push(serialized);
      }
    }

    return lines.join(this.options.lineEnding);
  }

  /**
   * Serialize a SimpleArrayNode
   */
  private serializeSimpleArray(node: SimpleArrayNode, indent: string): string {
    const values = node.values.map(v => v.value).join(',');
    return `${indent}${node.name}[${node.declaredSize}]: ${values}`;
  }

  /**
   * Serialize a StructuredArrayNode
   */
  private serializeStructuredArray(node: StructuredArrayNode, indent: string): string {
    const lines: string[] = [];

    // Header line: name[size]{fields}:
    const fields = node.fields.map(f => f.name).join(',');
    lines.push(`${indent}${node.name}[${node.declaredSize}]{${fields}}:`);

    // Data rows
    for (const row of node.dataRows) {
      const values = row.values.map(v => v.value).join(',');
      lines.push(`${indent}${this.options.indent}${values}`);
    }

    return lines.join(this.options.lineEnding);
  }

  /**
   * Serialize an EmptyNode
   */
  private serializeEmpty(_node: EmptyNode): string {
    return '';
  }
}

/**
 * Convenience function to serialize a DocumentNode with default options
 */
export function serialize(node: DocumentNode, options?: SerializerOptions): string {
  const serializer = new ToonSerializer(options);
  return serializer.serialize(node);
}
