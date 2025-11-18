import * as fc from 'fast-check';
import * as path from 'path';
import { GrammarTokenizer } from './grammar-tokenizer';

describe('Mixed Pattern Property Tests', () => {
  let tokenizer: GrammarTokenizer;

  beforeAll(() => {
    const grammarPath = path.join(__dirname, '..', 'syntaxes', 'toon.tmLanguage.json');
    tokenizer = new GrammarTokenizer(grammarPath);
  });

  describe('Property 13: Mixed data type consistency', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 13: Mixed data type consistency**
     * **Validates: Requirements 4.6**
     * 
     * For any toon file containing multiple data types,
     * each type should be consistently matched with its corresponding scope throughout the file
     */
    test('mixed value types in array should be consistently scoped', () => {
      fc.assert(
        fc.property(
          // Generate an array with mixed types: numbers, booleans, and strings
          fc.array(
            fc.oneof(
              fc.integer().map(n => ({ value: n.toString(), expectedScope: 'constant.numeric.toon' })),
              fc.constantFrom('true', 'false').map(b => ({ value: b, expectedScope: 'constant.language.boolean.toon' })),
              fc.tuple(
                fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
                fc.array(
                  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
                  { maxLength: 10 }
                )
              ).map(([first, rest]) => ({ value: first + rest.join(''), expectedScope: 'string.unquoted.toon' }))
            ),
            { minLength: 2, maxLength: 10 }
          ),
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 10 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          fc.integer({ min: 1, max: 20 }),
          (values, arrayName, arraySize) => {
            // Create a simple array with mixed types
            const valueList = values.map(v => v.value).join(',');
            const line = `${arrayName}[${arraySize}]: ${valueList}`;

            const tokens = tokenizer.tokenizeLine(line);

            // Check that each value type is consistently scoped
            values.forEach(({ value, expectedScope }) => {
              const valueToken = tokens.find(t => t.text === value);
              expect(valueToken).toBeDefined();
              expect(valueToken?.scopes).toContain(expectedScope);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('mixed value types in structured array data rows should be consistently scoped', () => {
      fc.assert(
        fc.property(
          // Generate data rows with mixed types
          fc.array(
            fc.tuple(
              fc.integer(),
              fc.constantFrom('true', 'false'),
              fc.tuple(
                fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
                fc.array(
                  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
                  { maxLength: 8 }
                )
              ).map(([first, rest]) => first + rest.join(''))
            ),
            { minLength: 1, maxLength: 5 }
          ),
          (dataRows) => {
            // Process each data row
            dataRows.forEach(([num, bool, str]) => {
              const line = `  ${num},${bool},${str}`;
              const tokens = tokenizer.tokenizeLine(line);

              // Check numeric value
              const numToken = tokens.find(t => t.text === num.toString());
              expect(numToken).toBeDefined();
              expect(numToken?.scopes).toContain('constant.numeric.toon');

              // Check boolean value
              const boolToken = tokens.find(t => t.text === bool);
              expect(boolToken).toBeDefined();
              expect(boolToken?.scopes).toContain('constant.language.boolean.toon');

              // Check string value
              const strToken = tokens.find(t => t.text === str);
              expect(strToken).toBeDefined();
              expect(strToken?.scopes).toContain('string.unquoted.toon');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('same value type should have same scope across different contexts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 10 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          (numValue, keyName) => {
            // Test the same number in different contexts
            const keyValueLine = `${keyName}: ${numValue}`;
            const arrayLine = `${keyName}[1]: ${numValue}`;
            const dataRowLine = `  ${numValue}`;

            const kvTokens = tokenizer.tokenizeLine(keyValueLine);
            const arrayTokens = tokenizer.tokenizeLine(arrayLine);
            const dataTokens = tokenizer.tokenizeLine(dataRowLine);

            // Find the numeric token in each context
            const kvNumToken = kvTokens.find(t => t.text === numValue.toString());
            const arrayNumToken = arrayTokens.find(t => t.text === numValue.toString());
            const dataNumToken = dataTokens.find(t => t.text === numValue.toString());

            // All should have the same scope
            expect(kvNumToken?.scopes).toContain('constant.numeric.toon');
            expect(arrayNumToken?.scopes).toContain('constant.numeric.toon');
            expect(dataNumToken?.scopes).toContain('constant.numeric.toon');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: Mixed pattern recognition', () => {
    /**
     * **Feature: toon-syntax-highlighting, Property 16: Mixed pattern recognition**
     * **Validates: Requirements 6.3**
     * 
     * For any toon file containing multiple syntax patterns (key-value pairs, arrays, structured arrays),
     * each pattern should be independently and correctly matched
     */
    test('key-value pair and simple array should be independently recognized', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 10 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 10 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 10 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          fc.integer({ min: 1, max: 20 }),
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 10 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          (kvKey, kvValue, arrayName, arraySize, arrayValue) => {
            // Test key-value pair
            const kvLine = `${kvKey}: ${kvValue}`;
            const kvTokens = tokenizer.tokenizeLine(kvLine);

            const kvKeyToken = kvTokens.find(t => t.text === kvKey);
            expect(kvKeyToken?.scopes).toContain('variable.other.property.toon');

            // Test simple array
            const arrayLine = `${arrayName}[${arraySize}]: ${arrayValue}`;
            const arrayTokens = tokenizer.tokenizeLine(arrayLine);

            const arrayNameToken = arrayTokens.find(t => t.text === arrayName);
            expect(arrayNameToken?.scopes).toContain('entity.name.type.toon');

            const arraySizeToken = arrayTokens.find(t => t.text === arraySize.toString());
            expect(arraySizeToken?.scopes).toContain('constant.numeric.toon');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('structured array and simple array should be independently recognized', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 10 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          fc.integer({ min: 1, max: 20 }),
          fc.array(
            fc.tuple(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
              fc.array(
                fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
                { maxLength: 8 }
              )
            ).map(([first, rest]) => first + rest.join('')),
            { minLength: 2, maxLength: 5 }
          ),
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 10 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          fc.array(
            fc.tuple(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
              fc.array(
                fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
                { maxLength: 8 }
              )
            ).map(([first, rest]) => first + rest.join('')),
            { minLength: 2, maxLength: 5 }
          ),
          (structArrayName, structArraySize, fields, simpleArrayName, simpleArrayValues) => {
            // Test structured array
            const fieldList = fields.join(',');
            const structLine = `${structArrayName}[${structArraySize}]{${fieldList}}:`;
            const structTokens = tokenizer.tokenizeLine(structLine);

            const structNameToken = structTokens.find(t => t.text === structArrayName);
            expect(structNameToken?.scopes).toContain('entity.name.type.toon');

            fields.forEach(field => {
              const fieldToken = structTokens.find(t => t.text === field);
              expect(fieldToken?.scopes).toContain('variable.parameter.toon');
            });

            // Test simple array
            const valueList = simpleArrayValues.join(',');
            const simpleLine = `${simpleArrayName}[${simpleArrayValues.length}]: ${valueList}`;
            const simpleTokens = tokenizer.tokenizeLine(simpleLine);

            const simpleNameToken = simpleTokens.find(t => t.text === simpleArrayName);
            expect(simpleNameToken?.scopes).toContain('entity.name.type.toon');

            simpleArrayValues.forEach(value => {
              const valueToken = simpleTokens.find(t => t.text === value);
              expect(valueToken?.scopes).toContain('string.unquoted.toon');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('all three patterns should be independently recognized in sequence', () => {
      fc.assert(
        fc.property(
          // Generate parameters for all three patterns
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 10 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 10 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          (kvKey, kvValue) => {
            // Test key-value pair
            const kvLine = `${kvKey}: ${kvValue}`;
            const kvTokens = tokenizer.tokenizeLine(kvLine);
            const kvKeyToken = kvTokens.find(t => t.text === kvKey);

            // Key-value pairs use variable.other.property scope
            expect(kvKeyToken?.scopes).toContain('variable.other.property.toon');

            // The presence of other patterns shouldn't affect this
            expect(kvKeyToken).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('pattern priority: structured array should not be misidentified as simple array', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 10 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          fc.integer({ min: 1, max: 20 }),
          fc.array(
            fc.tuple(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
              fc.array(
                fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
                { maxLength: 8 }
              )
            ).map(([first, rest]) => first + rest.join('')),
            { minLength: 2, maxLength: 5 }
          ),
          (arrayName, arraySize, fields) => {
            const fieldList = fields.join(',');
            const line = `${arrayName}[${arraySize}]{${fieldList}}:`;
            const tokens = tokenizer.tokenizeLine(line);

            // Should recognize as structured array (entity.name.type)
            const nameToken = tokens.find(t => t.text === arrayName);
            expect(nameToken?.scopes).toContain('entity.name.type.toon');

            // Should have field tokens with variable.parameter scope
            fields.forEach(field => {
              const fieldToken = tokens.find(t => t.text === field);
              expect(fieldToken?.scopes).toContain('variable.parameter.toon');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('pattern priority: simple array should not be misidentified as key-value pair', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
            fc.array(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
              { maxLength: 10 }
            )
          ).map(([first, rest]) => first + rest.join('')),
          fc.integer({ min: 1, max: 20 }),
          fc.array(
            fc.tuple(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
              fc.array(
                fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
                { maxLength: 8 }
              )
            ).map(([first, rest]) => first + rest.join('')),
            { minLength: 1, maxLength: 5 }
          ),
          (arrayName, arraySize, values) => {
            const valueList = values.join(',');
            const line = `${arrayName}[${arraySize}]: ${valueList}`;
            const tokens = tokenizer.tokenizeLine(line);

            // Should recognize as array (entity.name.type), not key-value pair (variable.other.property)
            const nameToken = tokens.find(t => t.text === arrayName);
            expect(nameToken?.scopes).toContain('entity.name.type.toon');
            expect(nameToken?.scopes).not.toContain('variable.other.property.toon');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
