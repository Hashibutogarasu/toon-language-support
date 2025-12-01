/**
 * Node Handler Types
 * 
 * This module defines the NodeHandler interface for the Factory pattern
 * implementation of AST node traversal.
 */

import { ASTNode } from '../../ast';
import { ASTVisitor } from '../index';

/**
 * Interface for handling AST node visits and child traversal.
 * Each node type has a corresponding handler implementation.
 */
export interface NodeHandler {
  /**
   * Visit the node and call the appropriate visitor method
   * @param node - The AST node to visit
   * @param visitor - The visitor to call
   */
  visit(node: ASTNode, visitor: ASTVisitor): void;

  /**
   * Get the child nodes that should be traversed next
   * @param node - The AST node to get children from
   * @returns Array of child nodes
   */
  getChildren(node: ASTNode): ASTNode[];
}
