/**
 * Visitor Pattern Module
 * 
 * This module exports visitor interfaces and AST walker for traversing
 * Toon AST nodes using the visitor pattern.
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
} from '../ast';

/**
 * Visitor interface for traversing AST nodes
 * 
 * Implement this interface to process AST nodes during traversal.
 * All methods are optional - only implement the ones you need.
 */
export interface ASTVisitor {
  /** Visit a document root node */
  visitDocument?(node: DocumentNode): void;
  /** Visit a key-value pair node */
  visitKeyValuePair?(node: KeyValuePairNode): void;
  /** Visit a simple array node */
  visitSimpleArray?(node: SimpleArrayNode): void;
  /** Visit a structured array node */
  visitStructuredArray?(node: StructuredArrayNode): void;
  /** Visit a field definition node */
  visitField?(node: FieldNode): void;
  /** Visit a data row node */
  visitDataRow?(node: DataRowNode): void;
  /** Visit a value node */
  visitValue?(node: ValueNode): void;
  /** Visit an empty line node */
  visitEmpty?(node: EmptyNode): void;
}

/**
 * Callback for node visit events during AST traversal
 */
export type NodeVisitCallback = (node: ASTNode, depth: number) => void;

/**
 * Options for configuring the AST walker
 */
export interface ASTWalkerOptions {
  /** Callback to invoke for each node visited (for event emission) */
  onNodeVisit?: NodeVisitCallback;
}

/**
 * AST Walker class for traversing AST nodes
 * 
 * Use this class to walk an AST tree and call visitor methods
 * for each node encountered. Optionally supports node visit callbacks
 * for event emission.
 */
export class ASTWalker {
  private options: ASTWalkerOptions;

  constructor(options?: ASTWalkerOptions) {
    this.options = options ?? {};
  }

  /**
   * Walk an AST tree starting from the given node
   * 
   * @param node - The root node to start walking from
   * @param visitor - The visitor to call for each node
   */
  walk(node: ASTNode, visitor: ASTVisitor): void {
    this.walkNode(node, visitor, 0);
  }

  /**
   * Internal method to walk a node and its children
   * TODO: replace switch to Factory pattern
   */
  private walkNode(node: ASTNode, visitor: ASTVisitor, depth: number): void {
    // Emit node visit callback if configured
    this.options.onNodeVisit?.(node, depth);

    switch (node.type) {
      case 'document':
        visitor.visitDocument?.(node as DocumentNode);
        for (const child of (node as DocumentNode).children) {
          this.walkNode(child, visitor, depth + 1);
        }
        break;
      case 'key-value-pair':
        visitor.visitKeyValuePair?.(node as KeyValuePairNode);
        break;
      case 'simple-array':
        visitor.visitSimpleArray?.(node as SimpleArrayNode);
        for (const value of (node as SimpleArrayNode).values) {
          this.walkNode(value, visitor, depth + 1);
        }
        break;
      case 'structured-array':
        visitor.visitStructuredArray?.(node as StructuredArrayNode);
        for (const field of (node as StructuredArrayNode).fields) {
          this.walkNode(field, visitor, depth + 1);
        }
        for (const row of (node as StructuredArrayNode).dataRows) {
          this.walkNode(row, visitor, depth + 1);
        }
        break;
      case 'field':
        visitor.visitField?.(node as FieldNode);
        break;
      case 'data-row':
        visitor.visitDataRow?.(node as DataRowNode);
        for (const value of (node as DataRowNode).values) {
          this.walkNode(value, visitor, depth + 1);
        }
        break;
      case 'value':
        visitor.visitValue?.(node as ValueNode);
        break;
      case 'empty':
        visitor.visitEmpty?.(node as EmptyNode);
        break;
    }
  }
}
