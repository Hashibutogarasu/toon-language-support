/**
 * Unit tests for Visitor Pattern
 */
import {
  Toon,
  ASTVisitor,
  ASTWalker,
  ASTNode,
} from '../../src';
import { NodeVisitEvent } from '../../src/events';

describe('Visitor Pattern', () => {
  describe('ASTVisitor interface', () => {
    it('should allow implementing all visitor methods', () => {
      const visitor: ASTVisitor = {
        visitDocument: jest.fn(),
        visitKeyValuePair: jest.fn(),
        visitSimpleArray: jest.fn(),
        visitStructuredArray: jest.fn(),
        visitField: jest.fn(),
        visitDataRow: jest.fn(),
        visitValue: jest.fn(),
        visitEmpty: jest.fn(),
      };

      expect(visitor.visitDocument).toBeDefined();
      expect(visitor.visitKeyValuePair).toBeDefined();
    });

    it('should allow implementing only some visitor methods', () => {
      const visitor: ASTVisitor = {
        visitKeyValuePair: jest.fn(),
      };

      expect(visitor.visitKeyValuePair).toBeDefined();
      expect(visitor.visitDocument).toBeUndefined();
    });
  });

  describe('ASTWalker', () => {
    let toon: Toon;
    let walker: ASTWalker;

    beforeEach(() => {
      toon = new Toon();
      walker = new ASTWalker();
    });

    it('should visit document node', () => {
      const ast = toon.parse('name: John');
      const visitor: ASTVisitor = {
        visitDocument: jest.fn(),
      };

      walker.walk(ast, visitor);

      expect(visitor.visitDocument).toHaveBeenCalledTimes(1);
      expect(visitor.visitDocument).toHaveBeenCalledWith(ast);
    });

    it('should visit key-value pair nodes', () => {
      const ast = toon.parse('name: John\nage: 30');
      const visitor: ASTVisitor = {
        visitKeyValuePair: jest.fn(),
      };

      walker.walk(ast, visitor);

      expect(visitor.visitKeyValuePair).toHaveBeenCalledTimes(2);
    });

    it('should visit simple array and its values', () => {
      const ast = toon.parse('items[3]: a,b,c');
      const visitor: ASTVisitor = {
        visitSimpleArray: jest.fn(),
        visitValue: jest.fn(),
      };

      walker.walk(ast, visitor);

      expect(visitor.visitSimpleArray).toHaveBeenCalledTimes(1);
      expect(visitor.visitValue).toHaveBeenCalledTimes(3);
    });

    it('should visit structured array with fields and data rows', () => {
      const input = `users[2]{id,name}:
  1,Alice
  2,Bob`;
      const ast = toon.parse(input);
      const visitor: ASTVisitor = {
        visitStructuredArray: jest.fn(),
        visitField: jest.fn(),
        visitDataRow: jest.fn(),
        visitValue: jest.fn(),
      };

      walker.walk(ast, visitor);

      expect(visitor.visitStructuredArray).toHaveBeenCalledTimes(1);
      expect(visitor.visitField).toHaveBeenCalledTimes(2);
      expect(visitor.visitDataRow).toHaveBeenCalledTimes(2);
      expect(visitor.visitValue).toHaveBeenCalledTimes(4); // 2 rows * 2 values
    });

    it('should visit empty nodes', () => {
      const ast = toon.parse('\n\n');
      const visitor: ASTVisitor = {
        visitEmpty: jest.fn(),
      };

      walker.walk(ast, visitor);

      expect(visitor.visitEmpty).toHaveBeenCalled();
    });

    it('should invoke onNodeVisit callback for each node', () => {
      const ast = toon.parse('name: John');
      const onNodeVisit = jest.fn();
      const walkerWithCallback = new ASTWalker({ onNodeVisit });
      const visitor: ASTVisitor = {};

      walkerWithCallback.walk(ast, visitor);

      // Should visit: document, key-value-pair
      expect(onNodeVisit).toHaveBeenCalledTimes(2);
      expect(onNodeVisit.mock.calls[0][0].type).toBe('document');
      expect(onNodeVisit.mock.calls[0][1]).toBe(0); // depth 0
      expect(onNodeVisit.mock.calls[1][0].type).toBe('key-value-pair');
      expect(onNodeVisit.mock.calls[1][1]).toBe(1); // depth 1
    });

    it('should track depth correctly during traversal', () => {
      const input = `users[1]{id}:
  1`;
      const ast = toon.parse(input);
      const depths: number[] = [];
      const walkerWithCallback = new ASTWalker({
        onNodeVisit: (_node, depth) => depths.push(depth),
      });

      walkerWithCallback.walk(ast, {});

      // document(0) -> structured-array(1) -> field(2), data-row(2) -> value(3)
      expect(depths).toContain(0);
      expect(depths).toContain(1);
      expect(depths).toContain(2);
      expect(depths).toContain(3);
    });
  });

  describe('Toon.accept()', () => {
    let toon: Toon;

    beforeEach(() => {
      toon = new Toon({ emitNodeVisits: true });
    });

    it('should accept a visitor and traverse the AST', () => {
      const ast = toon.parse('name: John');
      const visitor: ASTVisitor = {
        visitDocument: jest.fn(),
        visitKeyValuePair: jest.fn(),
      };

      toon.accept(visitor, ast);

      expect(visitor.visitDocument).toHaveBeenCalledTimes(1);
      expect(visitor.visitKeyValuePair).toHaveBeenCalledTimes(1);
    });

    it('should emit node:visit events when emitNodeVisits is enabled', () => {
      const ast = toon.parse('name: John');
      const handler = jest.fn();
      toon.on('node:visit', handler);

      toon.accept({}, ast);

      expect(handler).toHaveBeenCalled();
      const event: NodeVisitEvent = handler.mock.calls[0][0];
      expect(event.node).toBeDefined();
      expect(event.depth).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('should not emit node:visit events when emitNodeVisits is disabled', () => {
      const toonNoEvents = new Toon({ emitNodeVisits: false });
      const ast = toonNoEvents.parse('name: John');
      const handler = jest.fn();
      toonNoEvents.on('node:visit', handler);

      toonNoEvents.accept({}, ast);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should parse empty document if no AST provided', () => {
      const visitor: ASTVisitor = {
        visitDocument: jest.fn(),
        visitEmpty: jest.fn(),
      };

      toon.accept(visitor);

      expect(visitor.visitDocument).toHaveBeenCalledTimes(1);
      expect(visitor.visitEmpty).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visitor traversal completeness', () => {
    it('should visit all nodes in a complex document', () => {
      const toon = new Toon();
      const input = `title: My Document

items[2]: a,b

users[2]{id,name}:
  1,Alice
  2,Bob`;

      const ast = toon.parse(input);
      const visitedNodes: ASTNode[] = [];
      const walker = new ASTWalker({
        onNodeVisit: (node) => visitedNodes.push(node),
      });

      walker.walk(ast, {});

      // Count expected nodes
      const nodeTypes = visitedNodes.map(n => n.type);
      expect(nodeTypes).toContain('document');
      expect(nodeTypes).toContain('key-value-pair');
      expect(nodeTypes).toContain('empty');
      expect(nodeTypes).toContain('simple-array');
      expect(nodeTypes).toContain('structured-array');
      expect(nodeTypes).toContain('field');
      expect(nodeTypes).toContain('data-row');
      expect(nodeTypes).toContain('value');
    });
  });
});
