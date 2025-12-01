import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import {
  ASTVisitor,
  BlockNode,
  DocumentNode,
  KeyValuePairNode,
  SimpleArrayNode,
  StructuredArrayNode,
  DataRowNode,
  Range as ASTRange,
} from '@toon/core';
import { DiagnosticMessages } from './diagnostic-validator';

/**
 * Convert AST Range to LSP Range format
 */
function toRange(astRange: ASTRange): { start: { line: number; character: number }; end: { line: number; character: number } } {
  return {
    start: { line: astRange.start.line, character: astRange.start.character },
    end: { line: astRange.end.line, character: astRange.end.character }
  };
}

/**
 * AST-based diagnostic validator implementing ASTVisitor
 * 
 * This validator traverses the AST and generates LSP Diagnostic objects
 * for validation errors such as:
 * - Array size mismatches
 * - Structured array row count mismatches
 * - Structured array field count mismatches per row
 * - Key-value pair syntax errors
 */
export class ASTDiagnosticValidator implements ASTVisitor {
  private diagnostics: Diagnostic[] = [];

  /**
   * Get all collected diagnostics
   */
  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }

  /**
   * Clear all collected diagnostics
   */
  clear(): void {
    this.diagnostics = [];
  }

  /**
   * Visit document node - entry point for validation
   */
  visitDocument(_node: DocumentNode): void {
    // Document node itself doesn't need validation
    // Children will be visited by the walker
  }

  /**
   * Visit block node - validate block structure
   * 
   * BlockNodes represent block headers with indented children.
   * We do NOT report MISSING_VALUE for block headers since the
   * colon without a value is intentional for block structures.
   * 
   * Optionally warns if the block has no children.
   */
  visitBlock(node: BlockNode): void {
    // Optionally warn if block has no children
    if (node.children.length === 0) {
      this.diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: toRange(node.range),
        message: DiagnosticMessages.EMPTY_BLOCK,
        source: 'toon'
      });
    }
    // Children are validated through normal AST walker traversal
  }

  /**
   * Visit key-value pair node and validate syntax
   * 
   * Validates:
   * - Key is not empty
   * - Value is not empty (unless it's a block structure header)
   */
  visitKeyValuePair(node: KeyValuePairNode): void {
    // Validate empty key
    if (node.key.trim().length === 0) {
      this.diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: toRange(node.keyRange),
        message: DiagnosticMessages.MISSING_KEY,
        source: 'toon'
      });
    }

    // Validate empty value
    // Note: Empty value might be valid for block structures, but the parser
    // should handle that by not creating a KeyValuePairNode for block headers
    if (node.value.trim().length === 0) {
      this.diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: toRange(node.valueRange),
        message: DiagnosticMessages.MISSING_VALUE,
        source: 'toon'
      });
    }
  }

  /**
   * Visit simple array node and validate size
   * 
   * Validates:
   * - Actual value count matches declared size
   */
  visitSimpleArray(node: SimpleArrayNode): void {
    const actualCount = node.values.length;
    const declaredSize = node.declaredSize;

    if (actualCount !== declaredSize) {
      let message: string;
      if (actualCount < declaredSize) {
        message = DiagnosticMessages.ARRAY_SIZE_INSUFFICIENT
          .replace('{declared}', declaredSize.toString())
          .replace('{actual}', actualCount.toString());
      } else {
        message = DiagnosticMessages.ARRAY_SIZE_EXCEEDED
          .replace('{declared}', declaredSize.toString())
          .replace('{actual}', actualCount.toString());
      }

      this.diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: toRange(node.range),
        message,
        source: 'toon'
      });
    }
  }

  /**
   * Visit structured array node and validate row count
   * 
   * Validates:
   * - Actual row count matches declared size
   * 
   * Also sets context for data row validation
   */
  visitStructuredArray(node: StructuredArrayNode): void {
    const actualRows = node.dataRows.length;
    const declaredSize = node.declaredSize;

    if (actualRows !== declaredSize) {
      const message = DiagnosticMessages.ARRAY_ROWS_MISMATCH
        .replace('{declared}', declaredSize.toString())
        .replace('{actual}', actualRows.toString());

      this.diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: toRange(node.sizeRange),
        message,
        source: 'toon'
      });
    }

    // Validate field counts in each data row
    for (const row of node.dataRows) {
      this.validateDataRow(row, node);
    }
  }

  /**
   * Validate a data row against its parent structured array
   * 
   * Validates:
   * - Field count in row matches expected field count from array definition
   */
  private validateDataRow(row: DataRowNode, parentArray: StructuredArrayNode): void {
    const expectedFieldCount = parentArray.fields.length;
    const actualFieldCount = row.values.length;

    if (actualFieldCount !== expectedFieldCount) {
      let message: string;
      if (actualFieldCount < expectedFieldCount) {
        message = DiagnosticMessages.FIELD_COUNT_INSUFFICIENT
          .replace('{expected}', expectedFieldCount.toString())
          .replace('{actual}', actualFieldCount.toString());
      } else {
        message = DiagnosticMessages.FIELD_COUNT_EXCEEDED
          .replace('{expected}', expectedFieldCount.toString())
          .replace('{actual}', actualFieldCount.toString());
      }

      this.diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: toRange(row.range),
        message,
        source: 'toon'
      });
    }
  }
}
