import * as fc from 'fast-check';
import * as path from 'path';
import { GrammarTokenizer } from './grammar-tokenizer';

describe('Simple Array Property Tests', () => {
  let tokenizer: GrammarTokenizer;

  beforeAll(() => {
    const grammarPath = path.join(__dirname, '..', 'syntaxes', 'toon.tmLanguage.json');
    tokenizer = new GrammarTokenizer(grammarPath);
  });

  describe('Property 4: Array name highlighting', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 4: Array name highlighting**
     * **Validates: Requirements 2.1**
     * 
     * For any array declaration, the array name should be matched with an identifier scope
     */
    test('array names should be highlighted with entity.name.type.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate valid array names (start with letter or underscore, followed by alphanumeric or underscore)
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate array size (positive integer)
          fc.integer({ min: 1, max: 100 }),
          // Generate array values
          fc.array(
            fc.oneof(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
              fc.integer(),
              fc.boolean()
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (arrayName, size, values) => {
            const valueStr = values.join(',');
            const line = `${arrayName}[${size}]: ${valueStr}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find the array name token
            const arrayNameToken = tokens.find(t => t.text === arrayName);

            expect(arrayNameToken).toBeDefined();
            expect(arrayNameToken?.scopes).toContain('entity.name.type.toon');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Array syntax element highlighting', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 5: Array syntax element highlighting**
     * **Validates: Requirements 2.2**
     * 
     * For any array declaration with brackets and size, the brackets should be matched 
     * as operators and the size as a numeric constant
     */
    test('opening brackets should be highlighted with punctuation.definition.array.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate valid array names
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate array size
          fc.integer({ min: 1, max: 100 }),
          // Generate array values
          fc.array(
            fc.oneof(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
              fc.integer(),
              fc.boolean()
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (arrayName, size, values) => {
            const valueStr = values.join(',');
            const line = `${arrayName}[${size}]: ${valueStr}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find the opening bracket token
            const openBracketToken = tokens.find(t => t.text === '[');

            expect(openBracketToken).toBeDefined();
            expect(openBracketToken?.scopes).toContain('punctuation.definition.array.toon');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('closing brackets should be highlighted with punctuation.definition.array.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate valid array names
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate array size
          fc.integer({ min: 1, max: 100 }),
          // Generate array values
          fc.array(
            fc.oneof(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
              fc.integer(),
              fc.boolean()
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (arrayName, size, values) => {
            const valueStr = values.join(',');
            const line = `${arrayName}[${size}]: ${valueStr}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find the closing bracket token
            const closeBracketToken = tokens.find(t => t.text === ']');

            expect(closeBracketToken).toBeDefined();
            expect(closeBracketToken?.scopes).toContain('punctuation.definition.array.toon');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('array size should be highlighted with constant.numeric.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate valid array names
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate array size
          fc.integer({ min: 1, max: 100 }),
          // Generate array values
          fc.array(
            fc.oneof(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
              fc.integer(),
              fc.boolean()
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (arrayName, size, values) => {
            const valueStr = values.join(',');
            const line = `${arrayName}[${size}]: ${valueStr}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find the size token
            const sizeToken = tokens.find(t => t.text === size.toString());

            expect(sizeToken).toBeDefined();
            expect(sizeToken?.scopes).toContain('constant.numeric.toon');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Array value list highlighting', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 6: Array value list highlighting**
     * **Validates: Requirements 2.3**
     * 
     * For any array declaration followed by a colon and comma-separated values,
     * each value should be matched with the appropriate type scope
     */
    test('numeric values in array should be highlighted with constant.numeric.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate valid array names
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate array size
          fc.integer({ min: 1, max: 100 }),
          // Generate numeric array values
          fc.array(fc.integer(), { minLength: 1, maxLength: 10 }),
          (arrayName, size, values) => {
            const valueStr = values.join(',');
            const line = `${arrayName}[${size}]: ${valueStr}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Check that all numeric values are highlighted correctly
            for (const value of values) {
              const valueToken = tokens.find(t => t.text === value.toString());
              expect(valueToken).toBeDefined();
              expect(valueToken?.scopes).toContain('constant.numeric.toon');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('boolean values in array should be highlighted with constant.language.boolean.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate valid array names
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate array size
          fc.integer({ min: 1, max: 100 }),
          // Generate boolean array values
          fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
          (arrayName, size, values) => {
            const valueStr = values.join(',');
            const line = `${arrayName}[${size}]: ${valueStr}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Check that all boolean values are highlighted correctly
            for (const value of values) {
              const valueToken = tokens.find(t => t.text === value.toString());
              expect(valueToken).toBeDefined();
              expect(valueToken?.scopes).toContain('constant.language.boolean.toon');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('string values in array should be highlighted with string.unquoted.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate valid array names
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate array size
          fc.integer({ min: 1, max: 100 }),
          // Generate string array values
          fc.array(
            fc.tuple(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
              fc.array(
                fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
                { maxLength: 10 }
              )
            ).map(([first, rest]) => first + rest.join('')),
            { minLength: 1, maxLength: 10 }
          ),
          (arrayName, size, values) => {
            const valueStr = values.join(',');
            const line = `${arrayName}[${size}]: ${valueStr}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Check that all string values are highlighted correctly
            for (const value of values) {
              const valueToken = tokens.find(t => t.text === value);
              expect(valueToken).toBeDefined();
              expect(valueToken?.scopes).toContain('string.unquoted.toon');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('commas in value list should be highlighted with punctuation.separator.comma.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate valid array names
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate array size
          fc.integer({ min: 2, max: 100 }),
          // Generate at least 2 values to ensure we have commas
          fc.array(
            fc.oneof(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
              fc.integer(),
              fc.boolean()
            ),
            { minLength: 2, maxLength: 10 }
          ),
          (arrayName, size, values) => {
            const valueStr = values.join(',');
            const line = `${arrayName}[${size}]: ${valueStr}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find all comma tokens
            const commaTokens = tokens.filter(t => t.text === ',');

            // Should have (values.length - 1) commas
            expect(commaTokens.length).toBe(values.length - 1);

            // All commas should have the correct scope
            for (const commaToken of commaTokens) {
              expect(commaToken.scopes).toContain('punctuation.separator.comma.toon');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: Array declaration distinction', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 12: Array declaration distinction**
     * **Validates: Requirements 4.5**
     * 
     * For any key with brackets (array declaration), it should be matched 
     * with a different scope than regular key-value pairs
     */
    test('array declarations should use entity.name.type.toon scope instead of variable.other.property.toon', () => {
      fc.assert(
        fc.property(
          // Generate valid names
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 20 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          // Generate array size
          fc.integer({ min: 1, max: 100 }),
          // Generate values
          fc.array(
            fc.oneof(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
              fc.integer(),
              fc.boolean()
            ),
            { minLength: 1, maxLength: 10 }
          ),
          // Generate a simple value for key-value pair
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
            fc.integer(),
            fc.boolean()
          ),
          (name, size, arrayValues, simpleValue) => {
            // Test array declaration
            const arrayLine = `${name}[${size}]: ${arrayValues.join(',')}`;
            const arrayTokens = tokenizer.tokenizeLine(arrayLine);
            const arrayNameToken = arrayTokens.find(t => t.text === name);

            expect(arrayNameToken).toBeDefined();
            expect(arrayNameToken?.scopes).toContain('entity.name.type.toon');
            expect(arrayNameToken?.scopes).not.toContain('variable.other.property.toon');

            // Test key-value pair
            const kvLine = `${name}: ${simpleValue}`;
            const kvTokens = tokenizer.tokenizeLine(kvLine);
            const keyToken = kvTokens.find(t => t.text === name);

            expect(keyToken).toBeDefined();
            expect(keyToken?.scopes).toContain('variable.other.property.toon');
            expect(keyToken?.scopes).not.toContain('entity.name.type.toon');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
