import { Hover, MarkupKind, Range as LSPRange } from 'vscode-languageserver/node';
import {
  ASTVisitor,
  DocumentNode,
  KeyValuePairNode,
  SimpleArrayNode,
  StructuredArrayNode,
  FieldNode,
  DataRowNode,
  ValueNode,
  Position as ASTPosition,
  Range as ASTRange,
  isPositionInRange,
} from '@toon/core';

/**
 * Convert AST Range to LSP Range format
 */
function toLSPRange(astRange: ASTRange): LSPRange {
  return {
    start: { line: astRange.start.line, character: astRange.start.character },
    end: { line: astRange.end.line, character: astRange.end.character }
  };
}

/**
 * AST-based hover provider implementing ASTVisitor
 * 
 * This provider traverses the AST and generates LSP Hover objects
 * for positions within:
 * - Structured array data values (shows field name)
 * - Structured array field definitions (shows field info)
 * - Key-value pairs (shows key/value info)
 * - Simple arrays (shows array info)
 * 
 * Requirements: 4.1, 4.4
 */
export class ASTHoverProvider implements ASTVisitor {
  private position: ASTPosition;
  private result: Hover | null = null;
  private documentUri: string;

  /**
   * Create a new AST hover provider
   * @param position The position to check for hover information
   * @param documentUri The URI of the document (for go-to-definition links)
   */
  constructor(position: ASTPosition, documentUri: string) {
    this.position = position;
    this.documentUri = documentUri;
  }

  /**
   * Get the computed hover result
   */
  getHover(): Hover | null {
    return this.result;
  }

  /**
   * Clear the hover result
   */
  clear(): void {
    this.result = null;
  }


  /**
   * Visit document node - entry point
   */
  visitDocument(_node: DocumentNode): void {
    // Document node itself doesn't provide hover
    // Children will be visited by the walker
  }

  /**
   * Visit key-value pair node and provide hover for key or value
   */
  visitKeyValuePair(node: KeyValuePairNode): void {
    // Check if position is within the key range
    if (isPositionInRange(this.position, node.keyRange)) {
      this.result = {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**Key:** \`${node.key}\`\n\n**Value:** ${node.value}`
        },
        range: toLSPRange(node.keyRange)
      };
      return;
    }

    // Check if position is within the value range
    if (isPositionInRange(this.position, node.valueRange)) {
      this.result = {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**Value:** ${node.value}\n\n**Key:** \`${node.key}\``
        },
        range: toLSPRange(node.valueRange)
      };
    }
  }

  /**
   * Visit simple array node and provide hover for array name or values
   */
  visitSimpleArray(node: SimpleArrayNode): void {
    // Check if position is within the name range
    if (isPositionInRange(this.position, node.nameRange)) {
      this.result = {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**Array:** \`${node.name}\`\n\n**Size:** ${node.declaredSize}\n\n**Values:** ${node.values.length}`
        },
        range: toLSPRange(node.nameRange)
      };
      return;
    }

    // Check if position is within any value
    for (let i = 0; i < node.values.length; i++) {
      const value = node.values[i];
      if (isPositionInRange(this.position, value.range)) {
        this.result = {
          contents: {
            kind: MarkupKind.Markdown,
            value: `**Value:** ${value.value}\n\n**Index:** ${i + 1} of ${node.values.length}\n\n**Array:** \`${node.name}\``
          },
          range: toLSPRange(value.range)
        };
        return;
      }
    }
  }

  /**
   * Visit structured array node and provide hover for data values
   * 
   * This is the main hover functionality for structured arrays:
   * - Hovering over a data value shows the corresponding field name
   * - Hovering over a field definition shows field info
   */
  visitStructuredArray(node: StructuredArrayNode): void {
    // Check if position is within the array name range
    if (isPositionInRange(this.position, node.nameRange)) {
      this.result = {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**Structured Array:** \`${node.name}\`\n\n**Size:** ${node.declaredSize}\n\n**Fields:** ${node.fields.map(f => f.name).join(', ')}`
        },
        range: toLSPRange(node.nameRange)
      };
      return;
    }

    // Check if position is within a field definition
    for (let i = 0; i < node.fields.length; i++) {
      const field = node.fields[i];
      if (isPositionInRange(this.position, field.range)) {
        this.result = {
          contents: {
            kind: MarkupKind.Markdown,
            value: `**Field:** ${field.name}\n\n**Position:** ${i + 1} of ${node.fields.length}`
          },
          range: toLSPRange(field.range)
        };
        return;
      }
    }

    // Check if position is within a data row value
    for (const row of node.dataRows) {
      for (let i = 0; i < row.values.length; i++) {
        const value = row.values[i];
        if (isPositionInRange(this.position, value.range)) {
          const field = node.fields[i];
          if (field) {
            // Create hover content with field information and go-to-definition link
            const hoverContent = [
              `**Field:** ${field.name}`,
              ``,
              `**Value:** ${value.value}`,
              ``,
              `[Go to definition](command:editor.action.goToLocations?${encodeURIComponent(JSON.stringify([
                this.documentUri,
                { line: this.position.line, character: this.position.character },
                [{
                  uri: this.documentUri,
                  range: toLSPRange(field.range)
                }]
              ]))})`
            ].join('\n');

            this.result = {
              contents: {
                kind: MarkupKind.Markdown,
                value: hoverContent
              },
              range: toLSPRange(value.range)
            };
            return;
          }
        }
      }
    }
  }

  /**
   * Visit field node - handled in visitStructuredArray
   */
  visitField(_node: FieldNode): void {
    // Field hover is handled in visitStructuredArray for context
  }

  /**
   * Visit data row node - handled in visitStructuredArray
   */
  visitDataRow(_node: DataRowNode): void {
    // Data row hover is handled in visitStructuredArray for context
  }

  /**
   * Visit value node - handled in parent node visitors
   */
  visitValue(_node: ValueNode): void {
    // Value hover is handled in parent node visitors for context
  }
}
