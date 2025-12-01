/**
 * Handlers Module
 * 
 * This module exports all handler-related types, classes, and the factory
 * for the Factory pattern implementation of AST node traversal.
 */

// Export the NodeHandler interface
export { NodeHandler } from './types';

// Export the NodeHandlerFactory class
export { NodeHandlerFactory } from './factory';

// Export all concrete handlers
export {
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
