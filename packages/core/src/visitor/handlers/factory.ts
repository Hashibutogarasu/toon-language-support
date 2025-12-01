/**
 * Node Handler Factory
 * 
 * This module implements the Factory pattern for creating NodeHandlers
 * based on AST node types.
 */

import { ASTNodeType } from '../../ast';
import { NodeHandler } from './types';
import {
  DocumentNodeHandler,
  KeyValuePairNodeHandler,
  SimpleArrayNodeHandler,
  StructuredArrayNodeHandler,
  FieldNodeHandler,
  DataRowNodeHandler,
  ValueNodeHandler,
  EmptyNodeHandler,
  DefaultNodeHandler,
} from './handlers';

/**
 * Factory for creating NodeHandlers based on AST node types.
 * Maintains a registry of handlers and returns the appropriate handler
 * for each node type.
 */
export class NodeHandlerFactory {
  private handlers: Map<ASTNodeType, NodeHandler>;
  private defaultHandler: NodeHandler;

  constructor() {
    this.handlers = new Map();
    this.defaultHandler = new DefaultNodeHandler();
    this.registerDefaultHandlers();
  }

  /**
   * Get the handler for a given node type
   * @param type - The AST node type
   * @returns The appropriate handler, or DefaultNodeHandler if type is unknown
   */
  getHandler(type: ASTNodeType): NodeHandler {
    return this.handlers.get(type) ?? this.defaultHandler;
  }

  /**
   * Register a handler for a specific node type
   * @param type - The AST node type
   * @param handler - The handler to register
   */
  registerHandler(type: ASTNodeType, handler: NodeHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * Register all default handlers for known node types
   */
  private registerDefaultHandlers(): void {
    this.registerHandler('document', new DocumentNodeHandler());
    this.registerHandler('key-value-pair', new KeyValuePairNodeHandler());
    this.registerHandler('simple-array', new SimpleArrayNodeHandler());
    this.registerHandler('structured-array', new StructuredArrayNodeHandler());
    this.registerHandler('field', new FieldNodeHandler());
    this.registerHandler('data-row', new DataRowNodeHandler());
    this.registerHandler('value', new ValueNodeHandler());
    this.registerHandler('empty', new EmptyNodeHandler());
  }
}
