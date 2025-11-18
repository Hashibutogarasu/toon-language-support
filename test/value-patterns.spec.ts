import * as fc from 'fast-check';
import * as path from 'path';
import { GrammarTokenizer } from './grammar-tokenizer';

describe('Value Pattern Property Tests', () => {
  let tokenizer: GrammarTokenizer;

  beforeAll(() => {
    const grammarPath = path.join(__dirname, '..', 'syntaxes', 'toon.tmLanguage.json');
    tokenizer = new GrammarTokenizer(grammarPath);
  });

  describe('Property 10: Numeric value highlighting', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 10: Numeric value highlighting**
     * **Validates: Requirements 4.1**
     * 
     * For any numeric value (integer, decimal, or negative), 
     * the value should be matched with a numeric literal scope
     */
    test('integers should match numeric scope', () => {
      fc.assert(
        fc.property(
          fc.integer(),
          (num) => {
            const text = num.toString();
            const matches = tokenizer.matchesPattern(text, 'number');
            const scope = tokenizer.getScopeForPattern('number');

            expect(matches).toBe(true);
            expect(scope).toBe('constant.numeric.toon');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('decimal numbers should match numeric scope', () => {
      fc.assert(
        fc.property(
          fc.double({ noNaN: true, noDefaultInfinity: true }).filter(n => isFinite(n)),
          (num) => {
            const text = num.toString();
            // Skip scientific notation as it's not in the grammar
            if (text.includes('e') || text.includes('E')) {
              return true;
            }

            const matches = tokenizer.matchesPattern(text, 'number');
            const scope = tokenizer.getScopeForPattern('number');

            expect(matches).toBe(true);
            expect(scope).toBe('constant.numeric.toon');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('negative numbers should match numeric scope', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000000, max: -1 }),
          (num) => {
            const text = num.toString();
            const matches = tokenizer.matchesPattern(text, 'number');
            const scope = tokenizer.getScopeForPattern('number');

            expect(matches).toBe(true);
            expect(scope).toBe('constant.numeric.toon');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: String value highlighting', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 11: String value highlighting**
     * **Validates: Requirements 4.3**
     * 
     * For any string value containing alphanumeric characters and underscores,
     * the value should be matched with a string scope
     */
    test('valid identifier strings should match string scope', () => {
      fc.assert(
        fc.property(
          // Generate strings that start with letter or underscore, followed by alphanumeric or underscore
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          (str) => {
            const matches = tokenizer.matchesPattern(str, 'string');
            const scope = tokenizer.getScopeForPattern('string');

            expect(matches).toBe(true);
            expect(scope).toBe('string.unquoted.toon');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('strings starting with digit should not match', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom(...'0123456789'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { minLength: 1, maxLength: 10 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          (str) => {
            const matches = tokenizer.matchesPattern(str, 'string');

            // Strings starting with digits should not match the string pattern
            // (they would be matched as numbers instead)
            expect(matches).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14 & 15: Escape sequence highlighting', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 14: Escape sequence highlighting**
     * **Feature: toon-syntax-highlighting, Property 15: Unicode escape highlighting**
     * **Validates: Requirements 5.1, 5.2**
     * 
     * For any backslash escape sequence (\\n, \\t, \\", \\\\) or Unicode escape sequence (\\uXXXX),
     * the sequence should be matched with an escape character scope
     */
    test('standard escape sequences should match escape scope', () => {
      const escapeChars = ['"', '\\', '/', 'b', 'f', 'n', 'r', 't'];

      fc.assert(
        fc.property(
          fc.constantFrom(...escapeChars),
          (escapeChar) => {
            const text = `\\${escapeChar}`;
            const matches = tokenizer.matchesPattern(text, 'escape-sequence');
            const scope = tokenizer.getScopeForPattern('escape-sequence');

            expect(matches).toBe(true);
            expect(scope).toBe('constant.character.escape.toon');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('unicode escape sequences should match escape scope', () => {
      fc.assert(
        fc.property(
          // Generate 4 hex digits
          fc.array(
            fc.constantFrom(...'0123456789abcdefABCDEF'.split('')),
            { minLength: 4, maxLength: 4 }
          ).map(arr => arr.join('')),
          (hexDigits) => {
            const text = `\\u${hexDigits}`;
            const matches = tokenizer.matchesPattern(text, 'escape-sequence');
            const scope = tokenizer.getScopeForPattern('escape-sequence');

            expect(matches).toBe(true);
            expect(scope).toBe('constant.character.escape.toon');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('invalid escape sequences should not match', () => {
      fc.assert(
        fc.property(
          // Generate invalid escape characters (not in the valid set)
          fc.constantFrom(...'xyzXYZ123456'.split('')),
          (invalidChar) => {
            const text = `\\${invalidChar}`;
            const matches = tokenizer.matchesPattern(text, 'escape-sequence');

            // Invalid escape sequences should not match
            expect(matches).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('unicode escapes with wrong length should not match', () => {
      fc.assert(
        fc.property(
          // Generate hex strings of wrong length (not 4)
          fc.oneof(
            fc.array(
              fc.constantFrom(...'0123456789abcdef'.split('')),
              { minLength: 1, maxLength: 3 }
            ),
            fc.array(
              fc.constantFrom(...'0123456789abcdef'.split('')),
              { minLength: 5, maxLength: 8 }
            )
          ).map(arr => arr.join('')),
          (hexDigits) => {
            const text = `\\u${hexDigits}`;
            const matches = tokenizer.matchesPattern(text, 'escape-sequence');

            // Unicode escapes must be exactly 4 hex digits
            expect(matches).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
