/**
 * Event System Module
 * 
 * This module exports event types and interfaces for the Toon parser's
 * event-driven architecture. The Toon class extends Node.js EventEmitter
 * to provide lifecycle events during parsing and AST traversal.
 */

import { EventEmitter } from 'events';
import { ASTNode, DocumentNode, Range } from '../ast';

/**
 * Severity level for parse errors
 */
export type ParseErrorSeverity = 'error' | 'warning';

/**
 * Event emitted when parsing begins
 */
export interface ParseStartEvent {
  /** The source text being parsed */
  source: string;
  /** Timestamp when parsing started */
  timestamp: number;
}

/**
 * Event emitted when parsing completes successfully
 */
export interface ParseCompleteEvent {
  /** The resulting AST document node */
  ast: DocumentNode;
  /** Timestamp when parsing completed */
  timestamp: number;
  /** Duration of parsing in milliseconds */
  duration: number;
}

/**
 * Represents a parse error with diagnostic information
 */
export interface ParseError {
  /** Error message describing the issue */
  message: string;
  /** The source range where the error occurred */
  range: Range;
  /** Severity of the error */
  severity: ParseErrorSeverity;
}

/**
 * Event emitted when a parse error occurs
 */
export interface ParseErrorEvent {
  /** The parse error details */
  error: ParseError;
  /** Timestamp when the error was detected */
  timestamp: number;
}

/**
 * Event emitted when an AST node is visited during traversal
 */
export interface NodeVisitEvent {
  /** The node being visited */
  node: ASTNode;
  /** Depth of the node in the AST tree (0 for root) */
  depth: number;
  /** Timestamp when the node was visited */
  timestamp: number;
}

/**
 * Event names used by the Toon parser
 */
export type ToonEventName =
  | 'parse:start'
  | 'parse:complete'
  | 'parse:error'
  | 'node:visit';

/**
 * Event handler type for parse:start events
 */
export type ParseStartHandler = (event: ParseStartEvent) => void;

/**
 * Event handler type for parse:complete events
 */
export type ParseCompleteHandler = (event: ParseCompleteEvent) => void;

/**
 * Event handler type for parse:error events
 */
export type ParseErrorHandler = (event: ParseErrorEvent) => void;

/**
 * Event handler type for node:visit events
 */
export type NodeVisitHandler = (event: NodeVisitEvent) => void;

/**
 * Map of event names to their handler types
 */
export interface ToonEventHandlers {
  'parse:start': ParseStartHandler;
  'parse:complete': ParseCompleteHandler;
  'parse:error': ParseErrorHandler;
  'node:visit': NodeVisitHandler;
}

/**
 * Interface for typed event emitter methods
 * This provides type-safe event handling for the Toon class
 */
export interface ToonEventEmitter {
  /**
   * Register an event listener
   */
  on<K extends ToonEventName>(event: K, listener: ToonEventHandlers[K]): this;

  /**
   * Register a one-time event listener
   */
  once<K extends ToonEventName>(event: K, listener: ToonEventHandlers[K]): this;

  /**
   * Remove an event listener
   */
  off<K extends ToonEventName>(event: K, listener: ToonEventHandlers[K]): this;

  /**
   * Emit an event
   */
  emit<K extends ToonEventName>(
    event: K,
    ...args: Parameters<ToonEventHandlers[K]>
  ): boolean;
}

/**
 * Base class for event-emitting Toon components
 * Extends Node.js EventEmitter with typed event methods
 */
export class ToonEventEmitterBase extends EventEmitter implements ToonEventEmitter {
  /**
   * Register an event listener with type safety
   */
  on<K extends ToonEventName>(event: K, listener: ToonEventHandlers[K]): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  /**
   * Register a one-time event listener with type safety
   */
  once<K extends ToonEventName>(event: K, listener: ToonEventHandlers[K]): this {
    return super.once(event, listener as (...args: unknown[]) => void);
  }

  /**
   * Remove an event listener with type safety
   */
  off<K extends ToonEventName>(event: K, listener: ToonEventHandlers[K]): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }

  /**
   * Emit an event with type safety
   */
  emit<K extends ToonEventName>(
    event: K,
    ...args: Parameters<ToonEventHandlers[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  /**
   * Helper method to emit parse:start event
   */
  protected emitParseStart(source: string): void {
    const event: ParseStartEvent = {
      source,
      timestamp: Date.now(),
    };
    this.emit('parse:start', event);
  }

  /**
   * Helper method to emit parse:complete event
   */
  protected emitParseComplete(ast: DocumentNode, startTime: number): void {
    const event: ParseCompleteEvent = {
      ast,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
    };
    this.emit('parse:complete', event);
  }

  /**
   * Helper method to emit parse:error event
   */
  protected emitParseError(error: ParseError): void {
    const event: ParseErrorEvent = {
      error,
      timestamp: Date.now(),
    };
    this.emit('parse:error', event);
  }

  /**
   * Helper method to emit node:visit event
   */
  protected emitNodeVisit(node: ASTNode, depth: number): void {
    const event: NodeVisitEvent = {
      node,
      depth,
      timestamp: Date.now(),
    };
    this.emit('node:visit', event);
  }
}
