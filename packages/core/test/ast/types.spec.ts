/**
 * Unit tests for AST base types
 */
import {
  ASTNode,
  createPosition,
  createRange,
  isPositionInRange,
} from '../../src/ast';

describe('AST Base Types', () => {
  describe('createPosition', () => {
    it('should create a position with correct line and character', () => {
      const pos = createPosition(5, 10);
      expect(pos.line).toBe(5);
      expect(pos.character).toBe(10);
    });

    it('should create a position at origin', () => {
      const pos = createPosition(0, 0);
      expect(pos.line).toBe(0);
      expect(pos.character).toBe(0);
    });
  });

  describe('createRange', () => {
    it('should create a range with correct start and end positions', () => {
      const range = createRange(1, 0, 1, 10);
      expect(range.start.line).toBe(1);
      expect(range.start.character).toBe(0);
      expect(range.end.line).toBe(1);
      expect(range.end.character).toBe(10);
    });

    it('should create a multi-line range', () => {
      const range = createRange(0, 5, 3, 15);
      expect(range.start.line).toBe(0);
      expect(range.start.character).toBe(5);
      expect(range.end.line).toBe(3);
      expect(range.end.character).toBe(15);
    });
  });

  describe('isPositionInRange', () => {
    const range = createRange(2, 5, 4, 10);

    it('should return true for position inside range', () => {
      expect(isPositionInRange(createPosition(3, 0), range)).toBe(true);
      expect(isPositionInRange(createPosition(2, 5), range)).toBe(true);
      expect(isPositionInRange(createPosition(4, 9), range)).toBe(true);
    });

    it('should return false for position before range start line', () => {
      expect(isPositionInRange(createPosition(1, 5), range)).toBe(false);
    });

    it('should return false for position after range end line', () => {
      expect(isPositionInRange(createPosition(5, 0), range)).toBe(false);
    });

    it('should return false for position on start line but before start character', () => {
      expect(isPositionInRange(createPosition(2, 4), range)).toBe(false);
    });

    it('should return false for position on end line at or after end character', () => {
      expect(isPositionInRange(createPosition(4, 10), range)).toBe(false);
      expect(isPositionInRange(createPosition(4, 11), range)).toBe(false);
    });
  });

  describe('ASTNode interface', () => {
    it('should allow creating a basic AST node', () => {
      const node: ASTNode = {
        type: 'empty',
        range: createRange(0, 0, 0, 10),
      };
      expect(node.type).toBe('empty');
      expect(node.range.start.line).toBe(0);
      expect(node.parent).toBeUndefined();
    });

    it('should allow setting parent reference', () => {
      const parent: ASTNode = {
        type: 'document',
        range: createRange(0, 0, 5, 0),
      };
      const child: ASTNode = {
        type: 'empty',
        range: createRange(1, 0, 2, 0),
        parent,
      };
      expect(child.parent).toBe(parent);
      expect(child.parent?.type).toBe('document');
    });
  });
});
