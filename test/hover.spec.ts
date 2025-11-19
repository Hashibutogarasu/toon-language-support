/**
 * Hover functionality tests
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseToonDocument } from '../lsp/server/src/parser';
import { KeyValuePair, SimpleArray, StructuredArray } from '../lsp/server/src/types';

describe('Hover Functionality', () => {
  describe('Structured Array Data Values', () => {
    it('should identify field for data value in structured array', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Blue Lake,7.5
  2,Ridge,9.2`;

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const parsed = parseToonDocument(textDoc);

      // Find the structured array
      const arrayLine = parsed.lines.find(l => l.type === 'structured-array');
      expect(arrayLine).toBeDefined();

      const structuredArray = arrayLine?.parsed as StructuredArray;
      expect(structuredArray).toBeDefined();
      expect(structuredArray.fields.length).toBe(3);

      // Check first data line
      const dataLine = parsed.lines.find(l => l.type === 'array-data' && l.lineNumber === 1);
      expect(dataLine).toBeDefined();
      expect(dataLine?.parsed).toBeDefined();

      // Verify the data line has parent array reference
      const arrayData = dataLine?.parsed as any;
      expect(arrayData).toHaveProperty('parentArray');
      expect(arrayData?.parentArray).toBe(structuredArray);
    });

    it('should map data values to correct field indices', () => {
      const content = `hikes[2]{id,name,distance}:
  1,Blue Lake,7.5
  2,Ridge,9.2`;

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const parsed = parseToonDocument(textDoc);

      const arrayLine = parsed.lines.find(l => l.type === 'structured-array');
      const structuredArray = arrayLine?.parsed as StructuredArray;

      // Check that fields have correct indices
      expect(structuredArray.fields[0].name).toBe('id');
      expect(structuredArray.fields[0].index).toBe(0);
      expect(structuredArray.fields[1].name).toBe('name');
      expect(structuredArray.fields[1].index).toBe(1);
      expect(structuredArray.fields[2].name).toBe('distance');
      expect(structuredArray.fields[2].index).toBe(2);
    });
  });

  describe('Simple Array Values', () => {
    it('should parse simple array with value ranges', () => {
      const content = 'friends[3]: ana,luis,sam';

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const parsed = parseToonDocument(textDoc);

      const arrayLine = parsed.lines.find(l => l.type === 'simple-array');
      expect(arrayLine).toBeDefined();

      const simpleArray = arrayLine?.parsed as SimpleArray;
      expect(simpleArray.values).toEqual(['ana', 'luis', 'sam']);
      expect(simpleArray.valueRanges.length).toBe(3);

      // Check that value ranges are correct
      expect(simpleArray.valueRanges[0].start.character).toBeGreaterThan(0);
      expect(simpleArray.valueRanges[1].start.character).toBeGreaterThan(simpleArray.valueRanges[0].end.character);
      expect(simpleArray.valueRanges[2].start.character).toBeGreaterThan(simpleArray.valueRanges[1].end.character);
    });
  });

  describe('Key-Value Pairs', () => {
    it('should parse key-value pair with ranges', () => {
      const content = 'task: Our favorite hikes';

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const parsed = parseToonDocument(textDoc);

      const kvLine = parsed.lines.find(l => l.type === 'key-value');
      expect(kvLine).toBeDefined();

      const keyValuePair = kvLine?.parsed as KeyValuePair;
      expect(keyValuePair.key).toBe('task');
      expect(keyValuePair.value).toBe('Our favorite hikes');
      expect(keyValuePair.keyRange).toBeDefined();
      expect(keyValuePair.valueRange).toBeDefined();
    });
  });

  describe('Field Definition Hover', () => {
    it('should provide field information for structured array fields', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Blue Lake,7.5`;

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const parsed = parseToonDocument(textDoc);

      const arrayLine = parsed.lines.find(l => l.type === 'structured-array');
      const structuredArray = arrayLine?.parsed as StructuredArray;

      // Check field ranges are defined
      expect(structuredArray.fields[0].range).toBeDefined();
      expect(structuredArray.fields[1].range).toBeDefined();
      expect(structuredArray.fields[2].range).toBeDefined();

      // Check field ranges are in correct order
      expect(structuredArray.fields[0].range.start.character).toBeLessThan(
        structuredArray.fields[1].range.start.character
      );
      expect(structuredArray.fields[1].range.start.character).toBeLessThan(
        structuredArray.fields[2].range.start.character
      );
    });
  });
});
