import * as path from 'path';
import { GrammarTokenizer } from './grammar-tokenizer';

describe('Unit Tests for Toon Syntax Highlighting', () => {
  let tokenizer: GrammarTokenizer;

  beforeAll(() => {
    const grammarPath = path.join(__dirname, '..', 'syntaxes', 'toon.tmLanguage.json');
    tokenizer = new GrammarTokenizer(grammarPath);
  });

  describe('Basic Syntax Patterns', () => {
    describe('Key-Value Pairs', () => {
      test('should highlight simple key-value pair with string value', () => {
        const line = 'task: Our favorite hikes';
        const tokens = tokenizer.tokenizeLine(line);

        const keyToken = tokens.find(t => t.text === 'task');
        expect(keyToken).toBeDefined();
        expect(keyToken?.scopes).toContain('variable.other.property.toon');

        const colonToken = tokens.find(t => t.text === ':');
        expect(colonToken).toBeDefined();
        expect(colonToken?.scopes).toContain('punctuation.separator.toon');
      });

      test('should highlight key-value pair with numeric value', () => {
        const line = 'count: 42';
        const tokens = tokenizer.tokenizeLine(line);

        const keyToken = tokens.find(t => t.text === 'count');
        expect(keyToken?.scopes).toContain('variable.other.property.toon');

        const valueToken = tokens.find(t => t.text === '42');
        expect(valueToken?.scopes).toContain('constant.numeric.toon');
      });

      test('should highlight key-value pair with boolean value', () => {
        const line = 'enabled: true';
        const tokens = tokenizer.tokenizeLine(line);

        const keyToken = tokens.find(t => t.text === 'enabled');
        expect(keyToken?.scopes).toContain('variable.other.property.toon');

        const valueToken = tokens.find(t => t.text === 'true');
        expect(valueToken?.scopes).toContain('constant.language.boolean.toon');
      });

      test('should highlight key with underscores', () => {
        const line = 'my_key_name: value';
        const tokens = tokenizer.tokenizeLine(line);

        const keyToken = tokens.find(t => t.text === 'my_key_name');
        expect(keyToken).toBeDefined();
        expect(keyToken?.scopes).toContain('variable.other.property.toon');
      });
    });

    describe('Simple Arrays', () => {
      test('should highlight simple array with string values', () => {
        const line = 'friends[3]: ana,luis,sam';
        const tokens = tokenizer.tokenizeLine(line);

        const arrayNameToken = tokens.find(t => t.text === 'friends');
        expect(arrayNameToken?.scopes).toContain('entity.name.type.toon');

        const openBracketToken = tokens.find(t => t.text === '[');
        expect(openBracketToken?.scopes).toContain('punctuation.definition.array.toon');

        const sizeToken = tokens.find(t => t.text === '3');
        expect(sizeToken?.scopes).toContain('constant.numeric.toon');

        const closeBracketToken = tokens.find(t => t.text === ']');
        expect(closeBracketToken?.scopes).toContain('punctuation.definition.array.toon');
      });

      test('should highlight simple array with numeric values', () => {
        const line = 'numbers[6]: 10,20,30,40,50';
        const tokens = tokenizer.tokenizeLine(line);

        const valueTokens = tokens.filter(t => ['10', '20', '30', '40', '50'].includes(t.text));
        expect(valueTokens.length).toBe(5);
        valueTokens.forEach(token => {
          expect(token.scopes).toContain('constant.numeric.toon');
        });
      });

      test('should highlight simple array with boolean values', () => {
        const line = 'flags[2]: true,false';
        const tokens = tokenizer.tokenizeLine(line);

        const trueToken = tokens.find(t => t.text === 'true');
        expect(trueToken?.scopes).toContain('constant.language.boolean.toon');

        const falseToken = tokens.find(t => t.text === 'false');
        expect(falseToken?.scopes).toContain('constant.language.boolean.toon');
      });

      test('should highlight commas in array value list', () => {
        const line = 'items[3]: a,b,c';
        const tokens = tokenizer.tokenizeLine(line);

        const commaTokens = tokens.filter(t => t.text === ',');
        expect(commaTokens.length).toBe(2);
        commaTokens.forEach(token => {
          expect(token.scopes).toContain('punctuation.separator.comma.toon');
        });
      });
    });

    describe('Structured Arrays', () => {
      test('should highlight structured array declaration', () => {
        const line = 'hikes[3]{id,name,distance}:';
        const tokens = tokenizer.tokenizeLine(line);

        const arrayNameToken = tokens.find(t => t.text === 'hikes');
        expect(arrayNameToken?.scopes).toContain('entity.name.type.toon');

        const sizeToken = tokens.find(t => t.text === '3');
        expect(sizeToken?.scopes).toContain('constant.numeric.toon');

        const openBraceToken = tokens.find(t => t.text === '{');
        expect(openBraceToken?.scopes).toContain('punctuation.definition.fields.toon');

        const closeBraceToken = tokens.find(t => t.text === '}');
        expect(closeBraceToken?.scopes).toContain('punctuation.definition.fields.toon');
      });

      test('should highlight field names in structured array', () => {
        const line = 'data[2]{field1,field2,field3}:';
        const tokens = tokenizer.tokenizeLine(line);

        const fieldTokens = tokens.filter(t => ['field1', 'field2', 'field3'].includes(t.text));
        expect(fieldTokens.length).toBe(3);
        fieldTokens.forEach(token => {
          expect(token.scopes).toContain('variable.parameter.toon');
        });
      });

      test('should highlight data row in structured array', () => {
        const dataLine = '  1,test,true';
        const tokens = tokenizer.tokenizeLine(dataLine);

        const numToken = tokens.find(t => t.text === '1');
        expect(numToken?.scopes).toContain('constant.numeric.toon');

        const strToken = tokens.find(t => t.text === 'test');
        expect(strToken?.scopes).toContain('string.unquoted.toon');

        const boolToken = tokens.find(t => t.text === 'true');
        expect(boolToken?.scopes).toContain('constant.language.boolean.toon');
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Empty and Whitespace Values', () => {
      test('should handle key with no value after colon', () => {
        const line = 'key:';
        const tokens = tokenizer.tokenizeLine(line);

        const keyToken = tokens.find(t => t.text === 'key');
        expect(keyToken).toBeDefined();
        expect(keyToken?.scopes).toContain('variable.other.property.toon');

        const colonToken = tokens.find(t => t.text === ':');
        expect(colonToken).toBeDefined();
        expect(colonToken?.scopes).toContain('punctuation.separator.toon');
      });

      test('should handle array with no values after colon', () => {
        const line = 'items[0]:';
        const tokens = tokenizer.tokenizeLine(line);

        const arrayNameToken = tokens.find(t => t.text === 'items');
        expect(arrayNameToken?.scopes).toContain('entity.name.type.toon');

        const sizeToken = tokens.find(t => t.text === '0');
        expect(sizeToken?.scopes).toContain('constant.numeric.toon');
      });

      test('should handle extra whitespace after colon', () => {
        const line = 'key:  value';
        const tokens = tokenizer.tokenizeLine(line);

        const keyToken = tokens.find(t => t.text === 'key');
        expect(keyToken).toBeDefined();
        expect(keyToken?.scopes).toContain('variable.other.property.toon');

        const valueToken = tokens.find(t => t.text === 'value');
        expect(valueToken).toBeDefined();
        expect(valueToken?.scopes).toContain('string.unquoted.toon');
      });

      test('should handle single value in array', () => {
        const line = 'single[1]: value';
        const tokens = tokenizer.tokenizeLine(line);

        const valueToken = tokens.find(t => t.text === 'value');
        expect(valueToken).toBeDefined();
        expect(valueToken?.scopes).toContain('string.unquoted.toon');
      });
    });

    describe('Special Characters and Numbers', () => {
      test('should handle negative numbers', () => {
        const line = 'temperature: -15';
        const tokens = tokenizer.tokenizeLine(line);

        const valueToken = tokens.find(t => t.text === '-15');
        expect(valueToken).toBeDefined();
        expect(valueToken?.scopes).toContain('constant.numeric.toon');
      });

      test('should handle decimal numbers', () => {
        const line = 'distance: 3.14';
        const tokens = tokenizer.tokenizeLine(line);

        const valueToken = tokens.find(t => t.text === '3.14');
        expect(valueToken).toBeDefined();
        expect(valueToken?.scopes).toContain('constant.numeric.toon');
      });

      test('should handle zero', () => {
        const line = 'count: 0';
        const tokens = tokenizer.tokenizeLine(line);

        const valueToken = tokens.find(t => t.text === '0');
        expect(valueToken).toBeDefined();
        expect(valueToken?.scopes).toContain('constant.numeric.toon');
      });

      test('should handle large numbers', () => {
        const line = 'population: 1000000';
        const tokens = tokenizer.tokenizeLine(line);

        const valueToken = tokens.find(t => t.text === '1000000');
        expect(valueToken).toBeDefined();
        expect(valueToken?.scopes).toContain('constant.numeric.toon');
      });

      test('should handle keys with numbers', () => {
        const line = 'key123: value';
        const tokens = tokenizer.tokenizeLine(line);

        const keyToken = tokens.find(t => t.text === 'key123');
        expect(keyToken).toBeDefined();
        expect(keyToken?.scopes).toContain('variable.other.property.toon');
      });

      test('should handle values with underscores', () => {
        const line = 'season: spring_2025';
        const tokens = tokenizer.tokenizeLine(line);

        const valueToken = tokens.find(t => t.text === 'spring_2025');
        expect(valueToken).toBeDefined();
        expect(valueToken?.scopes).toContain('string.unquoted.toon');
      });
    });

    describe('Mixed Data Types', () => {
      test('should handle array with mixed types', () => {
        const line = 'mixed[4]: text,42,true,another';
        const tokens = tokenizer.tokenizeLine(line);

        const textToken = tokens.find(t => t.text === 'text');
        expect(textToken?.scopes).toContain('string.unquoted.toon');

        const numToken = tokens.find(t => t.text === '42');
        expect(numToken?.scopes).toContain('constant.numeric.toon');

        const boolToken = tokens.find(t => t.text === 'true');
        expect(boolToken?.scopes).toContain('constant.language.boolean.toon');

        const anotherToken = tokens.find(t => t.text === 'another');
        expect(anotherToken?.scopes).toContain('string.unquoted.toon');
      });

      test('should handle structured array data row with mixed types', () => {
        const line = '  1,Blue Lake Trail,7.5,320,ana,true';
        const tokens = tokenizer.tokenizeLine(line);

        const idToken = tokens.find(t => t.text === '1');
        expect(idToken?.scopes).toContain('constant.numeric.toon');

        const distanceToken = tokens.find(t => t.text === '7.5');
        expect(distanceToken?.scopes).toContain('constant.numeric.toon');

        const boolToken = tokens.find(t => t.text === 'true');
        expect(boolToken?.scopes).toContain('constant.language.boolean.toon');
      });
    });

    describe('Large Array Sizes', () => {
      test('should handle large array size', () => {
        const line = 'bigArray[999999]: value';
        const tokens = tokenizer.tokenizeLine(line);

        const sizeToken = tokens.find(t => t.text === '999999');
        expect(sizeToken).toBeDefined();
        expect(sizeToken?.scopes).toContain('constant.numeric.toon');
      });

      test('should handle structured array with many fields', () => {
        const line = 'data[1]{f1,f2,f3,f4,f5,f6,f7,f8,f9,f10}:';
        const tokens = tokenizer.tokenizeLine(line);

        const fieldTokens = tokens.filter(t =>
          ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10'].includes(t.text)
        );
        expect(fieldTokens.length).toBe(10);
      });
    });
  });

  describe('Error Cases', () => {
    describe('Invalid Syntax', () => {
      test('should handle line without colon gracefully', () => {
        const line = 'just some text';
        const tokens = tokenizer.tokenizeLine(line);

        // Should not crash, but won't match any patterns
        expect(tokens).toBeDefined();
        expect(tokens.length).toBeGreaterThan(0);
      });

      test('should handle malformed array declaration (missing closing bracket)', () => {
        const line = 'array[5: value';
        const tokens = tokenizer.tokenizeLine(line);

        // Should not crash - this is the main requirement for error handling
        expect(tokens).toBeDefined();
        expect(tokens.length).toBeGreaterThanOrEqual(0);

        // Won't match any specific pattern, but should still tokenize
        // The grammar will treat this as plain text since it doesn't match patterns
      });

      test('should handle malformed structured array (missing closing brace)', () => {
        const line = 'data[2]{field1,field2:';
        const tokens = tokenizer.tokenizeLine(line);

        // Should not crash
        expect(tokens).toBeDefined();
      });

      test('should handle double colons', () => {
        const line = 'key:: value';
        const tokens = tokenizer.tokenizeLine(line);

        // Should match key-value pattern with first colon
        const keyToken = tokens.find(t => t.text === 'key');
        expect(keyToken).toBeDefined();
      });

      test('should handle empty line', () => {
        const line = '';
        const tokens = tokenizer.tokenizeLine(line);

        // Should return empty or minimal tokens
        expect(tokens).toBeDefined();
      });

      test('should handle line with only whitespace', () => {
        const line = '    ';
        const tokens = tokenizer.tokenizeLine(line);

        // Should not crash
        expect(tokens).toBeDefined();
      });

      test('should handle array with non-numeric size', () => {
        const line = 'array[abc]: value';
        const tokens = tokenizer.tokenizeLine(line);

        // Won't match array pattern, should not crash
        expect(tokens).toBeDefined();
      });

      test('should handle structured array with empty field definition', () => {
        const line = 'data[2]{}:';
        const tokens = tokenizer.tokenizeLine(line);

        // Should not crash
        expect(tokens).toBeDefined();
      });
    });

    describe('Boundary Cases', () => {
      test('should handle very long key name', () => {
        const longKey = 'a'.repeat(1000);
        const line = `${longKey}: value`;
        const tokens = tokenizer.tokenizeLine(line);

        const keyToken = tokens.find(t => t.text === longKey);
        expect(keyToken).toBeDefined();
        expect(keyToken?.scopes).toContain('variable.other.property.toon');
      });

      test('should handle very long value', () => {
        const longValue = 'v'.repeat(1000);
        const line = `key: ${longValue}`;
        const tokens = tokenizer.tokenizeLine(line);

        const valueToken = tokens.find(t => t.text === longValue);
        expect(valueToken).toBeDefined();
      });

      test('should handle array with size 0', () => {
        const line = 'empty[0]:';
        const tokens = tokenizer.tokenizeLine(line);

        const sizeToken = tokens.find(t => t.text === '0');
        expect(sizeToken?.scopes).toContain('constant.numeric.toon');
      });

      test('should handle single character key', () => {
        const line = 'a: value';
        const tokens = tokenizer.tokenizeLine(line);

        const keyToken = tokens.find(t => t.text === 'a');
        expect(keyToken?.scopes).toContain('variable.other.property.toon');
      });

      test('should handle single character value', () => {
        const line = 'key: x';
        const tokens = tokenizer.tokenizeLine(line);

        const valueToken = tokens.find(t => t.text === 'x');
        expect(valueToken?.scopes).toContain('string.unquoted.toon');
      });
    });

    describe('Boolean Edge Cases', () => {
      test('should not match "true" as part of larger word', () => {
        const line = 'key: truely';
        const tokens = tokenizer.tokenizeLine(line);

        const valueToken = tokens.find(t => t.text === 'truely');
        expect(valueToken).toBeDefined();
        // Should match as string, not boolean
        expect(valueToken?.scopes).toContain('string.unquoted.toon');
      });

      test('should not match "false" as part of larger word', () => {
        const line = 'key: falsehood';
        const tokens = tokenizer.tokenizeLine(line);

        const valueToken = tokens.find(t => t.text === 'falsehood');
        expect(valueToken).toBeDefined();
        // Should match as string, not boolean
        expect(valueToken?.scopes).toContain('string.unquoted.toon');
      });

      test('should match standalone "true"', () => {
        const line = 'key: true';
        const tokens = tokenizer.tokenizeLine(line);

        const valueToken = tokens.find(t => t.text === 'true');
        expect(valueToken?.scopes).toContain('constant.language.boolean.toon');
      });

      test('should match standalone "false"', () => {
        const line = 'key: false';
        const tokens = tokenizer.tokenizeLine(line);

        const valueToken = tokens.find(t => t.text === 'false');
        expect(valueToken?.scopes).toContain('constant.language.boolean.toon');
      });
    });
  });

  describe('Requirements Validation', () => {
    /**
     * Requirements 5.4: Invalid escape sequences should be handled gracefully
     * Requirements 6.1: Correct syntax should be properly highlighted
     * Requirements 6.2: Expected line structure should be recognized
     */
    test('should validate Requirements 6.1 - correct syntax highlighting', () => {
      const correctLines = [
        'task: Our favorite hikes',
        'friends[3]: ana,luis,sam',
        'hikes[3]{id,name,distance}:'
      ];

      correctLines.forEach(line => {
        const tokens = tokenizer.tokenizeLine(line);
        expect(tokens).toBeDefined();
        expect(tokens.length).toBeGreaterThan(0);

        // All tokens should have at least the base scope
        tokens.forEach(token => {
          expect(token.scopes).toContain('source.toon');
        });
      });
    });

    test('should validate Requirements 6.2 - line structure recognition', () => {
      // Key-value pair structure
      const kvLine = 'location: Boulder';
      const kvTokens = tokenizer.tokenizeLine(kvLine);

      expect(kvTokens.some(t => t.scopes.includes('variable.other.property.toon'))).toBe(true);
      expect(kvTokens.some(t => t.scopes.includes('punctuation.separator.toon'))).toBe(true);

      // Array structure
      const arrayLine = 'items[5]: a,b,c,d,e';
      const arrayTokens = tokenizer.tokenizeLine(arrayLine);

      expect(arrayTokens.some(t => t.scopes.includes('entity.name.type.toon'))).toBe(true);
      expect(arrayTokens.some(t => t.scopes.includes('punctuation.definition.array.toon'))).toBe(true);
      expect(arrayTokens.some(t => t.scopes.includes('constant.numeric.toon'))).toBe(true);
    });
  });
});
