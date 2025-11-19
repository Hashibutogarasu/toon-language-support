/**
 * Definition jump functionality tests
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';
import { parseToonDocument } from '../lsp/server/src/parser';
import { getFieldDefinitionForValue, findFieldDefinitionLocation } from '../lsp/server/src/definition-provider';

describe('Definition Jump Functionality', () => {
  describe('getFieldDefinitionForValue', () => {
    it('should return field definition for first value in structured array', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Blue Lake,7.5
  2,Ridge,9.2`;

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const parsed = parseToonDocument(textDoc);

      // Position on first value "1" in first data line
      const position: Position = { line: 1, character: 2 };
      const field = getFieldDefinitionForValue(position, parsed);

      expect(field).toBeDefined();
      expect(field?.name).toBe('id');
      expect(field?.index).toBe(0);
    });

    it('should return field definition for second value in structured array', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Blue Lake,7.5
  2,Ridge,9.2`;

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const parsed = parseToonDocument(textDoc);

      // Position on second value "Blue Lake" in first data line
      const position: Position = { line: 1, character: 4 };
      const field = getFieldDefinitionForValue(position, parsed);

      expect(field).toBeDefined();
      expect(field?.name).toBe('name');
      expect(field?.index).toBe(1);
    });

    it('should return field definition for third value in structured array', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Blue Lake,7.5
  2,Ridge,9.2`;

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const parsed = parseToonDocument(textDoc);

      // Position on third value "7.5" in first data line
      const position: Position = { line: 1, character: 15 };
      const field = getFieldDefinitionForValue(position, parsed);

      expect(field).toBeDefined();
      expect(field?.name).toBe('distance');
      expect(field?.index).toBe(2);
    });

    it('should return null for position not on array data', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Blue Lake,7.5`;

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const parsed = parseToonDocument(textDoc);

      // Position on array declaration line
      const position: Position = { line: 0, character: 5 };
      const field = getFieldDefinitionForValue(position, parsed);

      expect(field).toBeNull();
    });

    it('should return null for simple array values', () => {
      const content = 'friends[3]: ana,luis,sam';

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const parsed = parseToonDocument(textDoc);

      // Position on simple array value
      const position: Position = { line: 0, character: 13 };
      const field = getFieldDefinitionForValue(position, parsed);

      expect(field).toBeNull();
    });
  });

  describe('findFieldDefinitionLocation', () => {
    it('should return location for field definition', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Blue Lake,7.5`;

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const parsed = parseToonDocument(textDoc);

      // Position on first value "1" in data line
      const position: Position = { line: 1, character: 2 };
      const location = findFieldDefinitionLocation(position, parsed, 'test://test.toon');

      expect(location).toBeDefined();
      expect(location?.uri).toBe('test://test.toon');
      expect(location?.range).toBeDefined();
      expect(location?.range.start.line).toBe(0);
    });

    it('should return null for invalid position', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Blue Lake,7.5`;

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const parsed = parseToonDocument(textDoc);

      // Position on empty line
      const position: Position = { line: 10, character: 0 };
      const location = findFieldDefinitionLocation(position, parsed, 'test://test.toon');

      expect(location).toBeNull();
    });
  });

  describe('Field mapping correctness', () => {
    it('should correctly map all values to their field definitions', () => {
      const content = `products[2]{id,name,price,category}:
  101,Laptop,999.99,Electronics
  102,Mouse,29.99,Accessories`;

      const textDoc = TextDocument.create('test://test.toon', 'toon', 1, content);
      const parsed = parseToonDocument(textDoc);

      // Test first data line
      const dataLine1 = parsed.lines.find(l => l.type === 'array-data' && l.lineNumber === 1);
      expect(dataLine1).toBeDefined();

      // Check each value maps to correct field
      const positions = [
        { line: 1, character: 2, expectedField: 'id' },
        { line: 1, character: 6, expectedField: 'name' },
        { line: 1, character: 13, expectedField: 'price' },
        { line: 1, character: 20, expectedField: 'category' }
      ];

      positions.forEach(({ line, character, expectedField }) => {
        const field = getFieldDefinitionForValue({ line, character }, parsed);
        expect(field?.name).toBe(expectedField);
      });
    });
  });
});
