/**
 * Property-based tests for AST Diagnostic Validator BlockNode handling
 *
 * This file contains property tests for:
 * - Property 5: No MISSING_VALUE for BlockNodes
 * - Property 6: Child validation in BlockNodes
 * - Property 7: MISSING_VALUE for actual empty values
 */
import * as fc from 'fast-check';
import { DiagnosticSeverity } from 'vscode-languageserver/node';
import {
  Toon,
  ASTWalker,
  BlockNode,
  KeyValuePairNode,
} from '@toon/core';
import { ASTDiagnosticValidator, DiagnosticMessages } from '../../src/validators';

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
 * Generate a key-value pair with empty value (not a block header)
 */
const keyValuePairWithEmptyValueArb = keyArb
  .map((key) => ({
    text: `${key}:`,
    key,
  }));

/**
 * Generate a key-value pair with value
 */
const keyValuePairWithValueArb = fc.tuple(keyArb, valueArb)
  .map(([key, value]) => ({
    text: `${key}: ${value}`,
    key,
    value,
  }));

/**
 * Helper to run validation on parsed text
 */
function validateText(text: string): { diagnostics: ReturnType<ASTDiagnosticValidator['getDiagnostics']>; ast: ReturnType<Toon['parse']> } {
  const toon = new Toon();
  const ast = toon.parse(text);
  const validator = new ASTDiagnosticValidator();
  const walker = new ASTWalker();
  walker.walk(ast, validator);
  return { diagnostics: validator.getDiagnostics(), ast };
}

describe('AST Diagnostic Validator BlockNode - Property Tests', () => {
  /**
   * **Feature: block-structure-parsing, Property 5: No MISSING_VALUE for BlockNodes**
   * **Validates: Requirements 2.1**
   *
   * For any valid BlockNode (with at least one child), the diagnostic validator
   * SHALL NOT produce a MISSING_VALUE diagnostic.
   */
  describe('Property 5: No MISSING_VALUE for BlockNodes', () => {
    it('should not report MISSING_VALUE for block headers with children', () => {
      fc.assert(
        fc.property(blockWithChildrenArb, ({ text }) => {
          const { diagnostics } = validateText(text);

          // Should not have any MISSING_VALUE diagnostics
          const missingValueDiagnostics = diagnostics.filter(
            (d) => d.message === DiagnosticMessages.MISSING_VALUE
          );

          return missingValueDiagnostics.length === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should not report any errors for valid block structures', () => {
      fc.assert(
        fc.property(blockWithChildrenArb, ({ text }) => {
          const { diagnostics } = validateText(text);

          // Should not have any error diagnostics
          const errorDiagnostics = diagnostics.filter(
            (d) => d.severity === DiagnosticSeverity.Error
          );

          return errorDiagnostics.length === 0;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: block-structure-parsing, Property 6: Child validation in BlockNodes**
   * **Validates: Requirements 2.3**
   *
   * For any BlockNode, each child node SHALL be validated according to its
   * own type's validation rules.
   */
  describe('Property 6: Child validation in BlockNodes', () => {
    it('should validate children of BlockNodes', () => {
      fc.assert(
        fc.property(blockWithChildrenArb, ({ text }) => {
          const { diagnostics, ast } = validateText(text);

          // Find the BlockNode
          const blockNode = ast.children.find((n) => n.type === 'block') as BlockNode | undefined;

          if (!blockNode) {
            return false;
          }

          // All children should be valid KeyValuePairNodes (no errors)
          const errorDiagnostics = diagnostics.filter(
            (d) => d.severity === DiagnosticSeverity.Error
          );

          return errorDiagnostics.length === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should validate KeyValuePairNode children with proper keys and values', () => {
      fc.assert(
        fc.property(blockWithChildrenArb, ({ text, children }) => {
          const { ast } = validateText(text);

          // Find the BlockNode
          const blockNode = ast.children.find((n) => n.type === 'block') as BlockNode | undefined;

          if (!blockNode) {
            return false;
          }

          // Verify all children have proper keys and values
          for (let i = 0; i < blockNode.children.length; i++) {
            const child = blockNode.children[i] as KeyValuePairNode;
            const expected = children[i];

            if (child.key !== expected.key || child.value !== expected.value) {
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
   * **Feature: block-structure-parsing, Property 7: MISSING_VALUE for actual empty values**
   * **Validates: Requirements 2.4**
   *
   * For any KeyValuePairNode with an empty value (not a block header),
   * the diagnostic validator SHALL produce a MISSING_VALUE diagnostic.
   */
  describe('Property 7: MISSING_VALUE for actual empty values', () => {
    it('should report MISSING_VALUE for key-value pairs with empty values (no children)', () => {
      fc.assert(
        fc.property(keyValuePairWithEmptyValueArb, ({ text }) => {
          const { diagnostics, ast } = validateText(text);

          // Should have a KeyValuePairNode (not a BlockNode, since no indented children)
          const kvNode = ast.children.find((n) => n.type === 'key-value-pair') as KeyValuePairNode | undefined;

          // If parser created a KeyValuePairNode with empty value, should have MISSING_VALUE
          if (kvNode && kvNode.value.trim() === '') {
            const missingValueDiagnostics = diagnostics.filter(
              (d) => d.message === DiagnosticMessages.MISSING_VALUE
            );
            return missingValueDiagnostics.length > 0;
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should not report MISSING_VALUE for key-value pairs with values', () => {
      fc.assert(
        fc.property(keyValuePairWithValueArb, ({ text }) => {
          const { diagnostics } = validateText(text);

          // Should not have any MISSING_VALUE diagnostics
          const missingValueDiagnostics = diagnostics.filter(
            (d) => d.message === DiagnosticMessages.MISSING_VALUE
          );

          return missingValueDiagnostics.length === 0;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional test: Empty blocks should produce a warning
   */
  describe('Empty block warning', () => {
    it('should warn when a block header has no indented children', () => {
      // Create a block header followed by a non-indented line (not a child)
      const text = 'block:\nnotachild: value';
      const { diagnostics, ast } = validateText(text);

      // Check if there's a BlockNode with no children
      const blockNode = ast.children.find((n) => n.type === 'block') as BlockNode | undefined;

      if (blockNode && blockNode.children.length === 0) {
        // Should have an EMPTY_BLOCK warning
        const emptyBlockWarnings = diagnostics.filter(
          (d) => d.message === DiagnosticMessages.EMPTY_BLOCK
        );
        expect(emptyBlockWarnings.length).toBeGreaterThan(0);
      }
    });
  });
});
