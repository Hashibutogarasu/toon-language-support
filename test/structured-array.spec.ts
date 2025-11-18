import * as fc from 'fast-check';
import * as path from 'path';
import { GrammarTokenizer } from './grammar-tokenizer';

describe('Structured Array Property Tests', () => {
  let tokenizer: GrammarTokenizer;

  beforeAll(() => {
    const grammarPath = path.join(__dirname, '..', 'syntaxes', 'toon.tmLanguage.json');
    tokenizer = new GrammarTokenizer(grammarPath);
  });

  describe('Property 7: Structured array declaration highlighting', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 7: Structured array declaration highlighting**
     * **Validates: Requirements 3.1**
     * 
     * For any structured array declaration, the array name, size, and field definitions 
     * should each be matched with appropriate scopes
     */
    test('array name should be highlighted with entity.name.type.toon scope', () => {
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
          // Generate field names
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
          (arrayName, size, fields) => {
            const fieldStr = fields.join(',');
            const line = `${arrayName}[${size}]{${fieldStr}}:`;
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
          // Generate field names
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
          (arrayName, size, fields) => {
            const fieldStr = fields.join(',');
            const line = `${arrayName}[${size}]{${fieldStr}}:`;
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

    test('brackets should be highlighted with punctuation.definition.array.toon scope', () => {
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
          // Generate field names
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
          (arrayName, size, fields) => {
            const fieldStr = fields.join(',');
            const line = `${arrayName}[${size}]{${fieldStr}}:`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find bracket tokens
            const openBracket = tokens.find(t => t.text === '[');
            const closeBracket = tokens.find(t => t.text === ']');

            expect(openBracket).toBeDefined();
            expect(openBracket?.scopes).toContain('punctuation.definition.array.toon');
            expect(closeBracket).toBeDefined();
            expect(closeBracket?.scopes).toContain('punctuation.definition.array.toon');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('colon should be highlighted with punctuation.separator.toon scope', () => {
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
          // Generate field names
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
          (arrayName, size, fields) => {
            const fieldStr = fields.join(',');
            const line = `${arrayName}[${size}]{${fieldStr}}:`;
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

  describe('Property 8: Field definition highlighting', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 8: Field definition highlighting**
     * **Validates: Requirements 3.2**
     * 
     * For any field definition within curly braces, the braces should be matched as operators 
     * and each field name as an identifier
     */
    test('curly braces should be highlighted with punctuation.definition.fields.toon scope', () => {
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
          // Generate field names
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
          (arrayName, size, fields) => {
            const fieldStr = fields.join(',');
            const line = `${arrayName}[${size}]{${fieldStr}}:`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find curly brace tokens
            const openBrace = tokens.find(t => t.text === '{');
            const closeBrace = tokens.find(t => t.text === '}');

            expect(openBrace).toBeDefined();
            expect(openBrace?.scopes).toContain('punctuation.definition.fields.toon');
            expect(closeBrace).toBeDefined();
            expect(closeBrace?.scopes).toContain('punctuation.definition.fields.toon');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('field names should be highlighted with variable.parameter.toon scope', () => {
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
          // Generate field names
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
          (arrayName, size, fields) => {
            const fieldStr = fields.join(',');
            const line = `${arrayName}[${size}]{${fieldStr}}:`;
            const tokens = tokenizer.tokenizeLine(line);

            // Check that all field names are highlighted correctly
            for (const field of fields) {
              const fieldToken = tokens.find(t => t.text === field);
              expect(fieldToken).toBeDefined();
              expect(fieldToken?.scopes).toContain('variable.parameter.toon');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('commas in field definitions should be highlighted with punctuation.separator.comma.toon scope', () => {
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
          // Generate at least 2 field names to ensure we have commas
          fc.array(
            fc.tuple(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
              fc.array(
                fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
                { maxLength: 10 }
              )
            ).map(([first, rest]) => first + rest.join('')),
            { minLength: 2, maxLength: 10 }
          ),
          (arrayName, size, fields) => {
            const fieldStr = fields.join(',');
            const line = `${arrayName}[${size}]{${fieldStr}}:`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find all comma tokens
            const commaTokens = tokens.filter(t => t.text === ',');

            // Should have (fields.length - 1) commas
            expect(commaTokens.length).toBe(fields.length - 1);

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

  describe('Property 9: Structured array data row highlighting', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 9: Structured array data row highlighting**
     * **Validates: Requirements 3.3**
     * 
     * For any data row in a structured array, each comma-separated value should be 
     * matched with the appropriate type scope
     */
    test('numeric values in data rows should be highlighted with constant.numeric.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate numeric data row values
          fc.array(fc.integer(), { minLength: 1, maxLength: 10 }),
          (values) => {
            const valueStr = values.join(',');
            const line = `  ${valueStr}`;
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

    test('boolean values in data rows should be highlighted with constant.language.boolean.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate boolean data row values
          fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
          (values) => {
            const valueStr = values.join(',');
            const line = `  ${valueStr}`;
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

    test('string values in data rows should be highlighted with string.unquoted.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate string data row values
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
          (values) => {
            const valueStr = values.join(',');
            const line = `  ${valueStr}`;
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

    test('mixed type values in data rows should be highlighted with appropriate scopes', () => {
      fc.assert(
        fc.property(
          // Generate mixed data row values
          fc.array(
            fc.oneof(
              fc.integer().map(v => ({ type: 'number' as const, value: v, str: v.toString() })),
              fc.boolean().map(v => ({ type: 'boolean' as const, value: v, str: v.toString() })),
              fc.tuple(
                fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
                fc.array(
                  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
                  { maxLength: 10 }
                )
              ).map(([first, rest]) => {
                const str = first + rest.join('');
                return { type: 'string' as const, value: str, str };
              })
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (values) => {
            const valueStr = values.map(v => v.str).join(',');
            const line = `  ${valueStr}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Check that all values are highlighted with the correct scope
            for (const value of values) {
              const valueToken = tokens.find(t => t.text === value.str);
              expect(valueToken).toBeDefined();

              if (value.type === 'number') {
                expect(valueToken?.scopes).toContain('constant.numeric.toon');
              } else if (value.type === 'boolean') {
                expect(valueToken?.scopes).toContain('constant.language.boolean.toon');
              } else {
                expect(valueToken?.scopes).toContain('string.unquoted.toon');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('commas in data rows should be highlighted with punctuation.separator.comma.toon scope', () => {
      fc.assert(
        fc.property(
          // Generate at least 2 values to ensure we have commas
          fc.array(
            fc.oneof(
              fc.integer(),
              fc.boolean(),
              fc.tuple(
                fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
                fc.array(
                  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
                  { maxLength: 10 }
                )
              ).map(([first, rest]) => first + rest.join(''))
            ),
            { minLength: 2, maxLength: 10 }
          ),
          (values) => {
            const valueStr = values.join(',');
            const line = `  ${valueStr}`;
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
});
