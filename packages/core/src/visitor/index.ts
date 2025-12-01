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
import { NodeHandlerFactory } from './handlers/factory';

// Re-export all handlers
export * from './handlers';

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
  private factory: NodeHandlerFactory;

  constructor(options?: ASTWalkerOptions) {
    this.options = options ?? {};
    this.factory = new NodeHandlerFactory();
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
   * Internal method to walk a node and its children using the Factory pattern
   */
  private walkNode(node: ASTNode, visitor: ASTVisitor, depth: number): void {
    // Emit node visit callback if configured
    this.options.onNodeVisit?.(node, depth);

    // Get handler and process node
    const handler = this.factory.getHandler(node.type);
    handler.visit(node, visitor);

    // Recursively process children
    for (const child of handler.getChildren(node)) {
      this.walkNode(child, visitor, depth + 1);
    }
  }
}
