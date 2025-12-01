/**
 * Concrete Node Handlers
 * 
 * This module contains all concrete NodeHandler implementations
 * for each AST node type.
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
} from '../../ast';
import { ASTVisitor } from '../index';
import { NodeHandler } from './types';

/**
 * Handler for DocumentNode
 */
export class DocumentNodeHandler implements NodeHandler {
  visit(node: ASTNode, visitor: ASTVisitor): void {
    visitor.visitDocument?.(node as DocumentNode);
  }

  getChildren(node: ASTNode): ASTNode[] {
    return (node as DocumentNode).children;
  }
}

/**
 * Handler for KeyValuePairNode
 */
export class KeyValuePairNodeHandler implements NodeHandler {
  visit(node: ASTNode, visitor: ASTVisitor): void {
    visitor.visitKeyValuePair?.(node as KeyValuePairNode);
  }

  getChildren(_node: ASTNode): ASTNode[] {
    return [];
  }
}


/**
 * Handler for SimpleArrayNode
 */
export class SimpleArrayNodeHandler implements NodeHandler {
  visit(node: ASTNode, visitor: ASTVisitor): void {
    visitor.visitSimpleArray?.(node as SimpleArrayNode);
  }

  getChildren(node: ASTNode): ASTNode[] {
    return (node as SimpleArrayNode).values;
  }
}

/**
 * Handler for StructuredArrayNode
 */
export class StructuredArrayNodeHandler implements NodeHandler {
  visit(node: ASTNode, visitor: ASTVisitor): void {
    visitor.visitStructuredArray?.(node as StructuredArrayNode);
  }

  getChildren(node: ASTNode): ASTNode[] {
    const structuredArray = node as StructuredArrayNode;
    return [...structuredArray.fields, ...structuredArray.dataRows];
  }
}

/**
 * Handler for FieldNode
 */
export class FieldNodeHandler implements NodeHandler {
  visit(node: ASTNode, visitor: ASTVisitor): void {
    visitor.visitField?.(node as FieldNode);
  }

  getChildren(_node: ASTNode): ASTNode[] {
    return [];
  }
}

/**
 * Handler for DataRowNode
 */
export class DataRowNodeHandler implements NodeHandler {
  visit(node: ASTNode, visitor: ASTVisitor): void {
    visitor.visitDataRow?.(node as DataRowNode);
  }

  getChildren(node: ASTNode): ASTNode[] {
    return (node as DataRowNode).values;
  }
}

/**
 * Handler for ValueNode
 */
export class ValueNodeHandler implements NodeHandler {
  visit(node: ASTNode, visitor: ASTVisitor): void {
    visitor.visitValue?.(node as ValueNode);
  }

  getChildren(_node: ASTNode): ASTNode[] {
    return [];
  }
}

/**
 * Handler for EmptyNode
 */
export class EmptyNodeHandler implements NodeHandler {
  visit(node: ASTNode, visitor: ASTVisitor): void {
    visitor.visitEmpty?.(node as EmptyNode);
  }

  getChildren(_node: ASTNode): ASTNode[] {
    return [];
  }
}

/**
 * Default handler for unknown node types
 * Logs a warning and returns no children
 */
export class DefaultNodeHandler implements NodeHandler {
  visit(node: ASTNode, _visitor: ASTVisitor): void {
    console.warn(`Unknown node type encountered: ${node.type}`);
  }

  getChildren(_node: ASTNode): ASTNode[] {
    return [];
  }
}
