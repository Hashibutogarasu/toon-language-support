import * as fc from 'fast-check';
import * as path from 'path';
import { GrammarTokenizer } from './grammar-tokenizer';

describe('Indentation Property Tests', () => {
  let tokenizer: GrammarTokenizer;

  beforeAll(() => {
    const grammarPath = path.join(__dirname, '..', 'syntaxes', 'toon.tmLanguage.json');
    tokenizer = new GrammarTokenizer(grammarPath);
  });

  describe('Property 17: Indented key-value pair highlighting', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 17: Indented key-value pair highlighting**
     * **Validates: Requirements 7.2**
     * 
     * For any key-value pair with any amount of leading whitespace (spaces or tabs),
     * the key, colon, and value should be matched with the same scopes as non-indented key-value pairs
     */
    test('indented key-value pairs should have same scopes as non-indented', () => {
      fc.assert(
        fc.property(
          // Generate indentation (0-8 spaces or tabs)
          fc.oneof(
            fc.integer({ min: 0, max: 8 }).map(n => ' '.repeat(n)),
            fc.integer({ min: 0, max: 4 }).map(n => '\t'.repeat(n))
          ),
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
          (indent, key, value) => {
            const line = `${indent}${key}: ${value}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find the key token
            const keyToken = tokens.find(t => t.text === key);
            expect(keyToken).toBeDefined();
            expect(keyToken?.scopes).toContain('variable.other.property.toon');

            // Find the colon token
            const colonToken = tokens.find(t => t.text === ':');
            expect(colonToken).toBeDefined();
            expect(colonToken?.scopes).toContain('punctuation.separator.toon');

            // Find the value token and check its scope based on type
            const valueStr = value.toString();
            const valueToken = tokens.find(t => t.text === valueStr);
            expect(valueToken).toBeDefined();

            if (typeof value === 'number') {
              expect(valueToken?.scopes).toContain('constant.numeric.toon');
            } else if (typeof value === 'boolean') {
              expect(valueToken?.scopes).toContain('constant.language.boolean.toon');
            } else {
              expect(valueToken?.scopes).toContain('string.unquoted.toon');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 18: Indented array declaration highlighting', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 18: Indented array declaration highlighting**
     * **Validates: Requirements 7.3**
     * 
     * For any array declaration with any amount of leading whitespace,
     * all syntax elements (array name, brackets, size, values) should be matched 
     * with the same scopes as non-indented array declarations
     */
    test('indented array declarations should have same scopes as non-indented', () => {
      fc.assert(
        fc.property(
          // Generate indentation
          fc.oneof(
            fc.integer({ min: 0, max: 8 }).map(n => ' '.repeat(n)),
            fc.integer({ min: 0, max: 4 }).map(n => '\t'.repeat(n))
          ),
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
          (indent, arrayName, size, values) => {
            const valueStr = values.join(',');
            const line = `${indent}${arrayName}[${size}]: ${valueStr}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find the array name token
            const arrayNameToken = tokens.find(t => t.text === arrayName);
            expect(arrayNameToken).toBeDefined();
            expect(arrayNameToken?.scopes).toContain('entity.name.type.toon');

            // Find bracket tokens
            const openBracket = tokens.find(t => t.text === '[');
            expect(openBracket).toBeDefined();
            expect(openBracket?.scopes).toContain('punctuation.definition.array.toon');

            const closeBracket = tokens.find(t => t.text === ']');
            expect(closeBracket).toBeDefined();
            expect(closeBracket?.scopes).toContain('punctuation.definition.array.toon');

            // Find the size token
            const sizeToken = tokens.find(t => t.text === size.toString());
            expect(sizeToken).toBeDefined();
            expect(sizeToken?.scopes).toContain('constant.numeric.toon');

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

  describe('Property 19: Indented structured array highlighting', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 19: Indented structured array highlighting**
     * **Validates: Requirements 7.4**
     * 
     * For any structured array with any amount of leading whitespace,
     * all syntax elements should be matched with the same scopes as non-indented structured arrays
     */
    test('indented structured arrays should have same scopes as non-indented', () => {
      fc.assert(
        fc.property(
          // Generate indentation
          fc.oneof(
            fc.integer({ min: 0, max: 8 }).map(n => ' '.repeat(n)),
            fc.integer({ min: 0, max: 4 }).map(n => '\t'.repeat(n))
          ),
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
          (indent, arrayName, size, fields) => {
            const fieldStr = fields.join(',');
            const line = `${indent}${arrayName}[${size}]{${fieldStr}}:`;
            const tokens = tokenizer.tokenizeLine(line);

            // Find the array name token
            const arrayNameToken = tokens.find(t => t.text === arrayName);
            expect(arrayNameToken).toBeDefined();
            expect(arrayNameToken?.scopes).toContain('entity.name.type.toon');

            // Find bracket tokens
            const openBracket = tokens.find(t => t.text === '[');
            expect(openBracket).toBeDefined();
            expect(openBracket?.scopes).toContain('punctuation.definition.array.toon');

            const closeBracket = tokens.find(t => t.text === ']');
            expect(closeBracket).toBeDefined();
            expect(closeBracket?.scopes).toContain('punctuation.definition.array.toon');

            // Find the size token
            const sizeToken = tokens.find(t => t.text === size.toString());
            expect(sizeToken).toBeDefined();
            expect(sizeToken?.scopes).toContain('constant.numeric.toon');

            // Find curly brace tokens
            const openBrace = tokens.find(t => t.text === '{');
            expect(openBrace).toBeDefined();
            expect(openBrace?.scopes).toContain('punctuation.definition.fields.toon');

            const closeBrace = tokens.find(t => t.text === '}');
            expect(closeBrace).toBeDefined();
            expect(closeBrace?.scopes).toContain('punctuation.definition.fields.toon');

            // Find the colon token
            const colonToken = tokens.find(t => t.text === ':');
            expect(colonToken).toBeDefined();
            expect(colonToken?.scopes).toContain('punctuation.separator.toon');

            // Check field names
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
  });

  describe('Property 20: Mixed indentation level consistency', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 20: Mixed indentation level consistency**
     * **Validates: Requirements 7.5**
     * 
     * For any toon file containing lines with different indentation levels,
     * each line should be independently and correctly matched regardless of its indentation level
     */
    test('lines with different indentation levels should all be correctly highlighted', () => {
      fc.assert(
        fc.property(
          // Generate multiple lines with different indentation levels
          fc.array(
            fc.record({
              indent: fc.oneof(
                fc.integer({ min: 0, max: 8 }).map(n => ' '.repeat(n)),
                fc.integer({ min: 0, max: 4 }).map(n => '\t'.repeat(n))
              ),
              type: fc.constantFrom('key-value', 'array', 'structured-array'),
              name: fc.tuple(
                fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
                fc.array(
                  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
                  { maxLength: 15 }
                )
              ).map(([first, rest]) => first + rest.join('')),
              value: fc.oneof(
                fc.string({ minLength: 1, maxLength: 15 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
                fc.integer(),
                fc.boolean()
              )
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (lineSpecs) => {
            // Process each line independently
            for (const spec of lineSpecs) {
              let line: string;
              
              if (spec.type === 'key-value') {
                line = `${spec.indent}${spec.name}: ${spec.value}`;
                const tokens = tokenizer.tokenizeLine(line);
                
                const keyToken = tokens.find(t => t.text === spec.name);
                expect(keyToken).toBeDefined();
                expect(keyToken?.scopes).toContain('variable.other.property.toon');
                
                const colonToken = tokens.find(t => t.text === ':');
                expect(colonToken).toBeDefined();
                expect(colonToken?.scopes).toContain('punctuation.separator.toon');
              } else if (spec.type === 'array') {
                const size = 3;
                line = `${spec.indent}${spec.name}[${size}]: ${spec.value}`;
                const tokens = tokenizer.tokenizeLine(line);
                
                const arrayNameToken = tokens.find(t => t.text === spec.name);
                expect(arrayNameToken).toBeDefined();
                expect(arrayNameToken?.scopes).toContain('entity.name.type.toon');
                
                const openBracket = tokens.find(t => t.text === '[');
                expect(openBracket).toBeDefined();
                expect(openBracket?.scopes).toContain('punctuation.definition.array.toon');
              } else {
                // structured-array
                const size = 2;
                const fields = 'id,name';
                line = `${spec.indent}${spec.name}[${size}]{${fields}}:`;
                const tokens = tokenizer.tokenizeLine(line);
                
                const arrayNameToken = tokens.find(t => t.text === spec.name);
                expect(arrayNameToken).toBeDefined();
                expect(arrayNameToken?.scopes).toContain('entity.name.type.toon');
                
                const openBrace = tokens.find(t => t.text === '{');
                expect(openBrace).toBeDefined();
                expect(openBrace?.scopes).toContain('punctuation.definition.fields.toon');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
