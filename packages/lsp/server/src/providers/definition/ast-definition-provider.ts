import { Location, Range as LSPRange } from 'vscode-languageserver/node';
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
 * AST-based definition provider implementing ASTVisitor
 * 
 * This provider traverses the AST and generates LSP Location objects
 * for go-to-definition functionality. It locates field definitions
 * when the cursor is on a data value in a structured array.
 * 
 * Requirements: 4.1, 4.5
 */
export class ASTDefinitionProvider implements ASTVisitor {
  private position: ASTPosition;
  private result: Location | null = null;
  private documentUri: string;

  /**
   * Create a new AST definition provider
   * @param position The position to find definition for
   * @param documentUri The URI of the document
   */
  constructor(position: ASTPosition, documentUri: string) {
    this.position = position;
    this.documentUri = documentUri;
  }

  /**
   * Get the computed definition location result
   */
  getDefinition(): Location | null {
    return this.result;
  }


  /**
   * Clear the definition result
   */
  clear(): void {
    this.result = null;
  }

  /**
   * Visit document node - entry point
   */
  visitDocument(_node: DocumentNode): void {
    // Document node itself doesn't provide definitions
    // Children will be visited by the walker
  }

  /**
   * Visit key-value pair node
   * Key-value pairs don't have definition targets
   */
  visitKeyValuePair(_node: KeyValuePairNode): void {
    // Key-value pairs don't have go-to-definition functionality
  }

  /**
   * Visit simple array node
   * Simple arrays don't have field definitions to navigate to
   */
  visitSimpleArray(_node: SimpleArrayNode): void {
    // Simple arrays don't have field definitions
  }

  /**
   * Visit structured array node and locate field definitions
   * 
   * This is the main definition functionality:
   * - When cursor is on a data value, navigate to the corresponding field definition
   */
  visitStructuredArray(node: StructuredArrayNode): void {
    // Check if position is within a data row value
    for (const row of node.dataRows) {
      for (let i = 0; i < row.values.length; i++) {
        const value = row.values[i];
        if (isPositionInRange(this.position, value.range)) {
          // Found the value at the cursor position
          // Get the corresponding field definition
          const field = node.fields[i];
          if (field) {
            this.result = {
              uri: this.documentUri,
              range: toLSPRange(field.range)
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
    // Field definition is handled in visitStructuredArray for context
  }

  /**
   * Visit data row node - handled in visitStructuredArray
   */
  visitDataRow(_node: DataRowNode): void {
    // Data row definition is handled in visitStructuredArray for context
  }

  /**
   * Visit value node - handled in parent node visitors
   */
  visitValue(_node: ValueNode): void {
    // Value definition is handled in parent node visitors for context
  }
}
