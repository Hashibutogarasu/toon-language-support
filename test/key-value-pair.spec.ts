import * as fc from 'fast-check';
import * as path from 'path';
import { GrammarTokenizer } from './grammar-tokenizer';

describe('Key-Value Pair Property Tests', () => {
  let tokenizer: GrammarTokenizer;

  beforeAll(() => {
    const grammarPath = path.join(__dirname, '..', 'syntaxes', 'toon.tmLanguage.json');
    tokenizer = new GrammarTokenizer(grammarPath);
  });

  describe('Property 1: Key highlighting in key-value pairs', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 1: Key highlighting in key-value pairs**
     * **Validates: Requirements 1.1**
     * 
     * For any valid key-value pair in toon syntax, 
     * the key portion should be matched with an identifier scope
     */
    test('keys should be highlighted with variable.other.property.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate valid key names (start with letter or underscore, followed by alphanumeric or underscore)
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate any value (string, number, or boolean)
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
            fc.integer(),
            fc.boolean()
          ),
          (key, value) => {
            const line = `${key}: ${value}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find the key token
            const keyToken = tokens.find(t => t.text === key);

            expect(keyToken).toBeDefined();
            expect(keyToken?.scopes).toContain('variable.other.property.toon');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Colon separator highlighting', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 2: Colon separator highlighting**
     * **Validates: Requirements 1.2**
     * 
     * For any key-value pair, the colon separator should be matched 
     * with a punctuation separator scope
     */
    test('colons should be highlighted with punctuation.separator.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate valid key names
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate any value
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
            fc.integer(),
            fc.boolean()
          ),
          (key, value) => {
            const line = `${key}: ${value}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find the colon token
            const colonToken = tokens.find(t => t.text === ':');

            expect(colonToken).toBeDefined();
            expect(colonToken?.scopes).toContain('punctuation.separator.toon');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Value type recognition', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 3: Value type recognition**
     * **Validates: Requirements 1.3**
     * 
     * For any value following a colon, the value should be matched 
     * with the appropriate type scope (number, boolean, or string)
     */
    test('numeric values should be highlighted with constant.numeric.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate valid key names
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate numeric values
          fc.integer(),
          (key, value) => {
            const line = `${key}: ${value}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find the value token
            const valueToken = tokens.find(t => t.text === value.toString());

            expect(valueToken).toBeDefined();
            expect(valueToken?.scopes).toContain('constant.numeric.toon');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('boolean values should be highlighted with constant.language.boolean.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate valid key names
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate boolean values
          fc.boolean(),
          (key, value) => {
            const line = `${key}: ${value}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find the value token
            const valueToken = tokens.find(t => t.text === value.toString());

            expect(valueToken).toBeDefined();
            expect(valueToken?.scopes).toContain('constant.language.boolean.toon');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('string values should be highlighted with string.unquoted.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate valid key names
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate string values (identifier format)
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          (key, value) => {
            const line = `${key}: ${value}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find the colon token first to locate position
            const colonIndex = tokens.findIndex(t => t.text === ':');
            expect(colonIndex).toBeGreaterThanOrEqual(0);

            // Find the value token after the colon
            const valueToken = tokens.slice(colonIndex + 1).find(t => t.text === value);

            expect(valueToken).toBeDefined();
            expect(valueToken?.scopes).toContain('string.unquoted.toon');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
