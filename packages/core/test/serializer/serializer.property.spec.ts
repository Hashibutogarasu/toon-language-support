/**
 * Property-based tests for Round-trip Serialization
 *
 * This file contains property tests for:
 * - Property 10: Round-trip parsing/printing
 */
import * as fc from 'fast-check';
import { Toon, ToonSerializer, BlockNode, KeyValuePairNode } from '../../src';

/**
 * Arbitrary for generating valid key strings
 */
const keyArb = fc.string({ minLength: 1, maxLength: 10 })
  .filter((s) => /^[a-z_]+$/.test(s));

/**
 * Arbitrary for generating valid value strings (no special characters that would break parsing)
 */
const valueArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter((s) => !/[\n\r:,[\]{}]/.test(s) && s.trim().length > 0)
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
 * Generate a key-value pair with value
 */
const keyValuePairArb = fc.tuple(keyArb, valueArb)
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

/**
 * Generate a mixed document with blocks and key-value pairs
 */
const mixedDocumentArb = fc.tuple(
  fc.array(keyValuePairArb, { minLength: 0, maxLength: 2 }),
  blockWithChildrenArb,
  fc.array(keyValuePairArb, { minLength: 0, maxLength: 2 })
).map(([kvsBefore, block, kvsAfter]) => {
  const lines: string[] = [];
  for (const kv of kvsBefore) {
    lines.push(kv.text);
  }
  lines.push(block.text);
  for (const kv of kvsAfter) {
    lines.push(kv.text);
  }
  return {
    text: lines.join('\n'),
    kvsBefore,
    block,
    kvsAfter,
  };
});

describe('Round-trip Serialization - Property Tests', () => {
  let toon: Toon;
  let serializer: ToonSerializer;

  beforeEach(() => {
    toon = new Toon();
    serializer = new ToonSerializer();
  });

  /**
   * **Feature: block-structure-parsing, Property 10: Round-trip parsing/printing**
   * **Validates: Requirements 3.4, 3.5**
   *
   * For any valid Toon document containing block structures, parsing then
   * serializing SHALL produce output that, when parsed again, produces
   * an equivalent AST.
   */
  describe('Property 10: Round-trip parsing/printing', () => {
    it('should preserve block structure after round-trip', () => {
      fc.assert(
        fc.property(blockWithChildrenArb, ({ text, blockKey, children }) => {
          // Parse original text
          const ast1 = toon.parse(text);

          // Serialize the AST
          const serialized = serializer.serialize(ast1);

          // Parse the serialized text
          const ast2 = toon.parse(serialized);

          // Find BlockNodes in both ASTs
          const block1 = ast1.children.find((n) => n.type === 'block') as BlockNode | undefined;
          const block2 = ast2.children.find((n) => n.type === 'block') as BlockNode | undefined;

          if (!block1 || !block2) {
            return false;
          }

          // Verify block keys match
          if (block1.key !== block2.key || block1.key !== blockKey) {
            return false;
          }

          // Verify child count matches
          if (block1.children.length !== block2.children.length) {
            return false;
          }

          // Verify each child matches
          for (let i = 0; i < children.length; i++) {
            const child1 = block1.children[i] as KeyValuePairNode;
            const child2 = block2.children[i] as KeyValuePairNode;
            const expected = children[i];

            if (child1.key !== child2.key || child1.key !== expected.key) {
              return false;
            }
            if (child1.value !== child2.value || child1.value !== expected.value) {
              return false;
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve nested block structure after round-trip', () => {
      fc.assert(
        fc.property(nestedBlockArb, ({ text, outerKey, innerKey, childKey, childValue }) => {
          // Parse original text
          const ast1 = toon.parse(text);

          // Serialize the AST
          const serialized = serializer.serialize(ast1);

          // Parse the serialized text
          const ast2 = toon.parse(serialized);

          // Verify structure in both ASTs
          const outer1 = ast1.children.find((n) => n.type === 'block') as BlockNode | undefined;
          const outer2 = ast2.children.find((n) => n.type === 'block') as BlockNode | undefined;

          if (!outer1 || !outer2) {
            return false;
          }

          if (outer1.key !== outer2.key || outer1.key !== outerKey) {
            return false;
          }

          const inner1 = outer1.children.find((n) => n.type === 'block') as BlockNode | undefined;
          const inner2 = outer2.children.find((n) => n.type === 'block') as BlockNode | undefined;

          if (!inner1 || !inner2) {
            return false;
          }

          if (inner1.key !== inner2.key || inner1.key !== innerKey) {
            return false;
          }

          const child1 = inner1.children[0] as KeyValuePairNode;
          const child2 = inner2.children[0] as KeyValuePairNode;

          if (child1.key !== child2.key || child1.key !== childKey) {
            return false;
          }

          if (child1.value !== child2.value || child1.value !== childValue) {
            return false;
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve key-value pairs after round-trip', () => {
      fc.assert(
        fc.property(keyValuePairArb, ({ text, key, value }) => {
          // Parse original text
          const ast1 = toon.parse(text);

          // Serialize the AST
          const serialized = serializer.serialize(ast1);

          // Parse the serialized text
          const ast2 = toon.parse(serialized);

          // Find KeyValuePairNodes in both ASTs
          const kv1 = ast1.children.find((n) => n.type === 'key-value-pair') as KeyValuePairNode | undefined;
          const kv2 = ast2.children.find((n) => n.type === 'key-value-pair') as KeyValuePairNode | undefined;

          if (!kv1 || !kv2) {
            return false;
          }

          return kv1.key === kv2.key && kv1.key === key &&
            kv1.value === kv2.value && kv1.value === value;
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve mixed document structure after round-trip', () => {
      fc.assert(
        fc.property(mixedDocumentArb, ({ text }) => {
          // Parse original text
          const ast1 = toon.parse(text);

          // Serialize the AST
          const serialized = serializer.serialize(ast1);

          // Parse the serialized text
          const ast2 = toon.parse(serialized);

          // Count nodes of each type
          const countByType = (ast: typeof ast1) => {
            const counts: Record<string, number> = {};
            for (const child of ast.children) {
              const type = child.type;
              counts[type] = (counts[type] || 0) + 1;
            }
            return counts;
          };

          const counts1 = countByType(ast1);
          const counts2 = countByType(ast2);

          // Empty nodes may differ due to serialization, so we focus on actual content
          const contentTypes = ['key-value-pair', 'block', 'simple-array', 'structured-array'];
          for (const type of contentTypes) {
            if ((counts1[type] || 0) !== (counts2[type] || 0)) {
              return false;
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should produce equivalent AST structure (semantic equivalence)', () => {
      fc.assert(
        fc.property(blockWithChildrenArb, ({ text }) => {
          // Parse -> Serialize -> Parse
          const ast1 = toon.parse(text);
          const serialized = serializer.serialize(ast1);
          const ast2 = toon.parse(serialized);

          // Helper to compare AST nodes semantically (ignoring ranges)
          const compareNodes = (n1: typeof ast1.children[0], n2: typeof ast2.children[0]): boolean => {
            if (n1.type !== n2.type) {
              return false;
            }

            if (n1.type === 'block' && n2.type === 'block') {
              const b1 = n1 as BlockNode;
              const b2 = n2 as BlockNode;
              if (b1.key !== b2.key) { return false; }
              if (b1.children.length !== b2.children.length) { return false; }
              for (let i = 0; i < b1.children.length; i++) {
                if (!compareNodes(b1.children[i], b2.children[i])) {
                  return false;
                }
              }
              return true;
            }

            if (n1.type === 'key-value-pair' && n2.type === 'key-value-pair') {
              const kv1 = n1 as KeyValuePairNode;
              const kv2 = n2 as KeyValuePairNode;
              return kv1.key === kv2.key && kv1.value === kv2.value;
            }

            return true; // For other types, just check type equality
          };

          // Compare all non-empty children
          const contentNodes1 = ast1.children.filter((n) => n.type !== 'empty');
          const contentNodes2 = ast2.children.filter((n) => n.type !== 'empty');

          if (contentNodes1.length !== contentNodes2.length) {
            return false;
          }

          for (let i = 0; i < contentNodes1.length; i++) {
            if (!compareNodes(contentNodes1[i], contentNodes2[i])) {
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
   * Additional test: Serialization preserves indentation structure
   */
  describe('Serialization output format', () => {
    it('should produce properly indented block structures', () => {
      const text = 'block:\n  child: value';
      const ast = toon.parse(text);
      const serialized = serializer.serialize(ast);

      // Should contain the block header
      expect(serialized).toContain('block:');
      // Should contain indented child
      expect(serialized).toContain('  child: value');
    });

    it('should produce properly indented nested blocks', () => {
      const text = 'outer:\n  inner:\n    child: value';
      const ast = toon.parse(text);
      const serialized = serializer.serialize(ast);

      // Should maintain proper indentation levels
      const lines = serialized.split('\n');
      expect(lines[0]).toBe('outer:');
      expect(lines[1]).toBe('  inner:');
      expect(lines[2]).toBe('    child: value');
    });
  });
});
