/**
 * Basic parser tests to verify data model and parsing functionality
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  parseToonDocument,
  parseKeyValuePair,
  parseSimpleArray,
  parseStructuredArray,
  parseArrayData,
  SimpleArray,
  StructuredArray
} from '../lsp/server/src/parser';

describe('Parser - Data Models and Basic Parsing', () => {
  describe('parseKeyValuePair', () => {
    it('should parse a simple key-value pair', () => {
      const result = parseKeyValuePair('task: Our favorite hikes', 0);

      expect(result).not.toBeNull();
      expect(result?.key).toBe('task');
      expect(result?.value).toBe('Our favorite hikes');
      expect(result?.colonPosition).toBe(4);
    });

    it('should parse key-value pair with whitespace', () => {
      const result = parseKeyValuePair('  location: Boulder  ', 1);

      expect(result).not.toBeNull();
      expect(result?.key).toBe('location');
      expect(result?.value).toBe('Boulder');
    });

    it('should return null for line without colon', () => {
      const result = parseKeyValuePair('no colon here', 0);

      expect(result).toBeNull();
    });
  });

  describe('parseSimpleArray', () => {
    it('should parse a simple array with values', () => {
      const result = parseSimpleArray('friends[3]: ana,luis,sam', 0);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('friends');
      expect(result?.declaredSize).toBe(3);
      expect(result?.values).toEqual(['ana', 'luis', 'sam']);
      expect(result?.values.length).toBe(3);
    });

    it('should parse a simple array with no values', () => {
      const result = parseSimpleArray('items[5]: ', 0);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('items');
      expect(result?.declaredSize).toBe(5);
      expect(result?.values).toEqual([]);
    });

    it('should return null for non-array line', () => {
      const result = parseSimpleArray('task: something', 0);

      expect(result).toBeNull();
    });
  });

  describe('parseStructuredArray', () => {
    it('should parse a structured array declaration', () => {
      const declaration = 'hikes[3]{id,name,distance}:';
      const dataLines = [
        '  1,Blue Lake,7.5',
        '  2,Ridge,9.2',
        '  3,Loop,5.1'
      ];

      const result = parseStructuredArray(declaration, 0, dataLines);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('hikes');
      expect(result?.declaredSize).toBe(3);
      expect(result?.fields.length).toBe(3);
      expect(result?.fields[0].name).toBe('id');
      expect(result?.fields[1].name).toBe('name');
      expect(result?.fields[2].name).toBe('distance');
      expect(result?.dataLines.length).toBe(3);
    });

    it('should return null for non-structured-array line', () => {
      const result = parseStructuredArray('friends[3]: ana,luis', 0, []);

      expect(result).toBeNull();
    });
  });

  describe('parseArrayData', () => {
    it('should parse array data line', () => {
      const result = parseArrayData('  1,Blue Lake,7.5', 1, null as any);

      expect(result).not.toBeNull();
      expect(result?.values).toEqual(['1', 'Blue Lake', '7.5']);
      expect(result?.lineNumber).toBe(1);
    });

    it('should return null for empty line', () => {
      const result = parseArrayData('  ', 1, null as any);

      expect(result).toBeNull();
    });
  });

  describe('parseToonDocument', () => {
    it('should parse a simple document with key-value pairs', () => {
      const content = `context:
  task: Our favorite hikes together
  location: Boulder
  season: spring_2025`;

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const result = parseToonDocument(textDoc);

      expect(result.lines.length).toBeGreaterThan(0);

      // Find key-value lines
      const kvLines = result.lines.filter(l => l.type === 'key-value');
      expect(kvLines.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse a document with simple array', () => {
      const content = 'friends[3]: ana,luis,sam';

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const result = parseToonDocument(textDoc);

      const arrayLine = result.lines.find(l => l.type === 'simple-array');
      expect(arrayLine).toBeDefined();

      const parsed = arrayLine?.parsed as SimpleArray;
      expect(parsed.name).toBe('friends');
      expect(parsed.declaredSize).toBe(3);
      expect(parsed.values).toEqual(['ana', 'luis', 'sam']);
    });

    it('should parse a document with structured array', () => {
      const content = `hikes[3]{id,name,distanceKm,elevationGain,companion,wasSunny}:
  1,Blue Lake Trail,7.5,320,ana,true
  2,Ridge Overlook,9.2,540,luis,false
  3,Wildflower Loop,5.1,180,sam,true`;

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const result = parseToonDocument(textDoc);

      const arrayLine = result.lines.find(l => l.type === 'structured-array');
      expect(arrayLine).toBeDefined();

      const parsed = arrayLine?.parsed as StructuredArray;
      expect(parsed.name).toBe('hikes');
      expect(parsed.declaredSize).toBe(3);
      expect(parsed.fields.length).toBe(6);
      expect(parsed.dataLines.length).toBe(3);

      // Check data lines are also in the document
      const dataLines = result.lines.filter(l => l.type === 'array-data');
      expect(dataLines.length).toBe(3);
    });
  });
});
