/**
 * Property-based tests for Block Structure Parsing
 *
 * This file contains property tests for:
 * - Property 1: BlockNode creation with children
 * - Property 2: KeyValuePairNode backward compatibility
 * - Property 3: BlockNode range calculation
 * - Property 4: Nested block parsing
 * - Property 8: Parent references in BlockNodes
 */
import * as fc from 'fast-check';
import { Toon, BlockNode, KeyValuePairNode, ASTNode } from '../../src';

/**
 * Arbitrary for generating valid key strings
 */
const keyArb = fc.string({ minLength: 1, maxLength: 10 })
  .filter((s) => /^[a-z_]+$/.test(s));

/**
 * Arbitrary for generating valid value strings
 */
const valueArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter((s) => !/[\n\r]/.test(s) && s.trim().length > 0)
  .map((s) => s.trim());

/**
 * Generate a block with children
 */
const blockWithChildrenArb = fc.tuple(
  keyArb,
  fc.array(fc.tuple(keyArb, valueArb), { minLength: 1, maxLength: 5 })
).map(([blockKey, children]) => {
  const lines = [`${blockKey}:`];
  for (const [key, value] of children) {
    lines.push(`  ${key}: ${value}`);
  }
  return {
    text: lines.join('\n'),
    blockKey,
    childCount: children.length,
    children: children.map(([k, v]) => ({ key: k, value: v })),
  };
});

/**
 * Generate a key-value pair with value (not a block header)
 */
const keyValuePairWithValueArb = fc.tuple(keyArb, valueArb)
  .map(([key, value]) => ({
    text: `${key}: ${value}`,
    key,
    value,
  }));

/**
 * Generate nested block structure
 */
const nestedBlockArb = fc.tuple(keyArb, keyArb, fc.tuple(keyArb, valueArb))
  .map(([outerKey, innerKey, [childKey, childValue]]) => {
    const lines = [
      `${outerKey}:`,
      `  ${innerKey}:`,
      `    ${childKey}: ${childValue}`,
    ];
    return {
      text: lines.join('\n'),
      outerKey,
      innerKey,
      childKey,
      childValue,
    };
  });

describe('Block Structure Parsing - Property Tests', () => {
  let toon: Toon;

  beforeEach(() => {
    toon = new Toon();
  });

  /**
   * For any input text containing a line with a key followed by a colon (no value)
   * and one or more following indented lines, parsing SHALL produce a BlockNode
   * where the children array contains all consecutively indented lines as parsed nodes.
   */
  describe('Property 1: BlockNode creation with children', () => {
    it('should create BlockNode with children for block structure', () => {
      fc.assert(
        fc.property(blockWithChildrenArb, ({ text, blockKey, childCount }) => {
          const ast = toon.parse(text);

          // Find the BlockNode
          const blockNode = ast.children.find((n) => n.type === 'block') as BlockNode | undefined;

          // Should have a BlockNode
          if (!blockNode) {
            return false;
          }

          // BlockNode should have the correct key
          if (blockNode.key !== blockKey) {
            return false;
          }

          // BlockNode should have all children
          if (blockNode.children.length !== childCount) {
            return false;
          }

          // All children should be KeyValuePairNodes
          return blockNode.children.every((child) => child.type === 'key-value-pair');
        }),
        { numRuns: 100 }
      );
    });

    it('should include correct key-value pairs as children', () => {
      fc.assert(
        fc.property(blockWithChildrenArb, ({ text, children }) => {
          const ast = toon.parse(text);
          const blockNode = ast.children.find((n) => n.type === 'block') as BlockNode | undefined;

          if (!blockNode) {
            return false;
          }

          // Verify each child has the expected key and value
          for (let i = 0; i < children.length; i++) {
            const expectedChild = children[i];
            const actualChild = blockNode.children[i] as KeyValuePairNode;

            if (actualChild.type !== 'key-value-pair') {
              return false;
            }
            if (actualChild.key !== expectedChild.key) {
              return false;
            }
            if (actualChild.value !== expectedChild.value) {
              return false;
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * For any input text containing a line with a key, colon, and non-empty value,
   * parsing SHALL produce a KeyValuePairNode (not a BlockNode).
   */
  describe('Property 2: KeyValuePairNode backward compatibility', () => {
    it('should create KeyValuePairNode for key-value pairs with values', () => {
      fc.assert(
        fc.property(keyValuePairWithValueArb, ({ text, key, value }) => {
          const ast = toon.parse(text);

          // Should have exactly one child
          if (ast.children.length !== 1) {
            return false;
          }

          const node = ast.children[0];

          // Should be a KeyValuePairNode, not a BlockNode
          if (node.type !== 'key-value-pair') {
            return false;
          }

          const kvNode = node as KeyValuePairNode;

          // Should have correct key and value
          return kvNode.key === key && kvNode.value === value;
        }),
        { numRuns: 100 }
      );
    });

    it('should not create BlockNode for lines with values after colon', () => {
      fc.assert(
        fc.property(keyValuePairWithValueArb, ({ text }) => {
          const ast = toon.parse(text);

          // Should not contain any BlockNodes
          return !ast.children.some((n) => n.type === 'block');
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * For any BlockNode, the range.start SHALL equal the start of the header line
   * and range.end SHALL equal the end of the last child element.
   */
  describe('Property 3: BlockNode range calculation', () => {
    it('should have range starting at header line', () => {
      fc.assert(
        fc.property(blockWithChildrenArb, ({ text }) => {
          const ast = toon.parse(text);
          const blockNode = ast.children.find((n) => n.type === 'block') as BlockNode | undefined;

          if (!blockNode) {
            return false;
          }

          // Range should start at line 0 (header line)
          return blockNode.range.start.line === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should have range ending at last child line', () => {
      fc.assert(
        fc.property(blockWithChildrenArb, ({ text }) => {
          const ast = toon.parse(text);
          const blockNode = ast.children.find((n) => n.type === 'block') as BlockNode | undefined;

          if (!blockNode || blockNode.children.length === 0) {
            return false;
          }

          const lastChild = blockNode.children[blockNode.children.length - 1];

          // BlockNode range end should match last child range end
          return (
            blockNode.range.end.line === lastChild.range.end.line &&
            blockNode.range.end.character === lastChild.range.end.character
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should span all child lines', () => {
      fc.assert(
        fc.property(blockWithChildrenArb, ({ text, childCount: expectedChildCount }) => {
          const ast = toon.parse(text);
          const blockNode = ast.children.find((n) => n.type === 'block') as BlockNode | undefined;

          if (!blockNode) {
            return false;
          }

          // Range should span from line 0 to the last child line
          const expectedEndLine = expectedChildCount; // 0-indexed, so last child is at line childCount
          return blockNode.range.end.line === expectedEndLine;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * For any block structure containing nested block structures (indented block headers
   * with their own indented children), parsing SHALL correctly create nested BlockNodes
   * with proper parent-child relationships.
   */
  describe('Property 4: Nested block parsing', () => {
    it('should create nested BlockNodes for nested structures', () => {
      fc.assert(
        fc.property(nestedBlockArb, ({ text, outerKey, innerKey }) => {
          const ast = toon.parse(text);

          // Find the outer BlockNode
          const outerBlock = ast.children.find((n) => n.type === 'block') as BlockNode | undefined;

          if (!outerBlock) {
            return false;
          }

          // Should have the correct outer key
          if (outerBlock.key !== outerKey) {
            return false;
          }

          // Should have an inner BlockNode as child
          const innerBlock = outerBlock.children.find(
            (n) => n.type === 'block'
          ) as BlockNode | undefined;

          if (!innerBlock) {
            return false;
          }

          // Should have the correct inner key
          return innerBlock.key === innerKey;
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly nest children in inner blocks', () => {
      fc.assert(
        fc.property(nestedBlockArb, ({ text, childKey, childValue }) => {
          const ast = toon.parse(text);

          // Find the outer BlockNode
          const outerBlock = ast.children.find((n) => n.type === 'block') as BlockNode | undefined;

          if (!outerBlock) {
            return false;
          }

          // Find the inner BlockNode
          const innerBlock = outerBlock.children.find(
            (n) => n.type === 'block'
          ) as BlockNode | undefined;

          if (!innerBlock) {
            return false;
          }

          // Inner block should have the key-value pair as child
          if (innerBlock.children.length !== 1) {
            return false;
          }

          const child = innerBlock.children[0] as KeyValuePairNode;

          return (
            child.type === 'key-value-pair' &&
            child.key === childKey &&
            child.value === childValue
          );
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * For any BlockNode, all child nodes SHALL have their parent property
   * set to reference the BlockNode.
   */
  describe('Property 8: Parent references in BlockNodes', () => {
    it('should set parent reference for all children of BlockNode', () => {
      fc.assert(
        fc.property(blockWithChildrenArb, ({ text }) => {
          const ast = toon.parse(text);
          const blockNode = ast.children.find((n) => n.type === 'block') as BlockNode | undefined;

          if (!blockNode) {
            return false;
          }

          // All children should have parent set to the BlockNode
          return blockNode.children.every((child) => child.parent === blockNode);
        }),
        { numRuns: 100 }
      );
    });

    it('should set parent references correctly for nested blocks', () => {
      fc.assert(
        fc.property(nestedBlockArb, ({ text }) => {
          const ast = toon.parse(text);

          // Find the outer BlockNode
          const outerBlock = ast.children.find((n) => n.type === 'block') as BlockNode | undefined;

          if (!outerBlock) {
            return false;
          }

          // Outer block's parent should be the document
          if (outerBlock.parent !== ast) {
            return false;
          }

          // Find the inner BlockNode
          const innerBlock = outerBlock.children.find(
            (n) => n.type === 'block'
          ) as BlockNode | undefined;

          if (!innerBlock) {
            return false;
          }

          // Inner block's parent should be the outer block
          if (innerBlock.parent !== outerBlock) {
            return false;
          }

          // Inner block's children should have parent set to inner block
          return innerBlock.children.every((child) => child.parent === innerBlock);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Helper function to recursively check parent references
     */
    function verifyParentReferences(node: ASTNode, expectedParent: ASTNode | undefined): boolean {
      if (node.parent !== expectedParent) {
        return false;
      }

      if (node.type === 'block') {
        const blockNode = node as BlockNode;
        return blockNode.children.every((child) => verifyParentReferences(child, blockNode));
      }

      return true;
    }

    it('should maintain correct parent chain through all nesting levels', () => {
      fc.assert(
        fc.property(nestedBlockArb, ({ text }) => {
          const ast = toon.parse(text);

          // Verify entire parent chain
          return ast.children.every((child) => verifyParentReferences(child, ast));
        }),
        { numRuns: 100 }
      );
    });
  });
});
