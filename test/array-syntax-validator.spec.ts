import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseToonDocument } from '../lsp/server/src/parser';
import { ArraySyntaxValidator } from '../lsp/server/src/validators/array-syntax-validator';

describe('ArraySyntaxValidator', () => {
  const validator = new ArraySyntaxValidator();

  function createDocument(content: string): TextDocument {
    return TextDocument.create('test://test.toon', 'toon', 1, content);
  }

  describe('Requirement 5.1: Missing closing bracket', () => {
    test('should report error when closing bracket is missing', () => {
      const content = 'items[5: value1,value2';
      const textDoc = createDocument(content);
      const parsedDoc = parseToonDocument(textDoc);
      const diagnostics = validator.validate(parsedDoc, textDoc);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('閉じ角括弧が見つかりません');
    });
  });

  describe('Requirement 5.2: Missing array size', () => {
    test('should report error when array size is not specified', () => {
      const content = 'items[]: value1,value2';
      const textDoc = createDocument(content);
      const parsedDoc = parseToonDocument(textDoc);
      const diagnostics = validator.validate(parsedDoc, textDoc);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('配列サイズが指定されていません');
    });

    test('should report error when array size is only whitespace', () => {
      const content = 'items[ ]: value1,value2';
      const textDoc = createDocument(content);
      const parsedDoc = parseToonDocument(textDoc);
      const diagnostics = validator.validate(parsedDoc, textDoc);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('配列サイズが指定されていません');
    });
  });

  describe('Requirement 5.3: Invalid array size (non-numeric)', () => {
    test('should report error when array size is not numeric', () => {
      const content = 'items[abc]: value1,value2';
      const textDoc = createDocument(content);
      const parsedDoc = parseToonDocument(textDoc);
      const diagnostics = validator.validate(parsedDoc, textDoc);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('配列サイズは数値である必要があります');
    });

    test('should report error when array size contains letters', () => {
      const content = 'items[5a]: value1,value2';
      const textDoc = createDocument(content);
      const parsedDoc = parseToonDocument(textDoc);
      const diagnostics = validator.validate(parsedDoc, textDoc);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('配列サイズは数値である必要があります');
    });
  });

  describe('Requirement 5.4: Missing closing brace for structured arrays', () => {
    test('should report error when closing brace is missing', () => {
      const content = 'items[3]{id,name:';
      const textDoc = createDocument(content);
      const parsedDoc = parseToonDocument(textDoc);
      const diagnostics = validator.validate(parsedDoc, textDoc);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('閉じ波括弧が見つかりません');
    });
  });

  describe('Requirement 5.5: No error when syntax is correct', () => {
    test('should not report error for valid simple array', () => {
      const content = 'items[3]: value1,value2,value3';
      const textDoc = createDocument(content);
      const parsedDoc = parseToonDocument(textDoc);
      const diagnostics = validator.validate(parsedDoc, textDoc);

      expect(diagnostics).toHaveLength(0);
    });

    test('should not report error for valid structured array', () => {
      const content = 'items[3]{id,name}:';
      const textDoc = createDocument(content);
      const parsedDoc = parseToonDocument(textDoc);
      const diagnostics = validator.validate(parsedDoc, textDoc);

      expect(diagnostics).toHaveLength(0);
    });

    test('should not report error for lines without brackets', () => {
      const content = 'task: Our favorite hikes';
      const textDoc = createDocument(content);
      const parsedDoc = parseToonDocument(textDoc);
      const diagnostics = validator.validate(parsedDoc, textDoc);

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    test('should not validate empty lines', () => {
      const content = '\n\n';
      const textDoc = createDocument(content);
      const parsedDoc = parseToonDocument(textDoc);
      const diagnostics = validator.validate(parsedDoc, textDoc);

      expect(diagnostics).toHaveLength(0);
    });

    test('should not validate array data lines', () => {
      const content = 'items[2]{id,name}:\n  1,Item1\n  2,Item2';
      const textDoc = createDocument(content);
      const parsedDoc = parseToonDocument(textDoc);
      const diagnostics = validator.validate(parsedDoc, textDoc);

      expect(diagnostics).toHaveLength(0);
    });

    test('should handle multiple errors in document', () => {
      const content = 'items1[: value1\nitems2[abc]: value2\nitems3[3]{id,name: value3';
      const textDoc = createDocument(content);
      const parsedDoc = parseToonDocument(textDoc);
      const diagnostics = validator.validate(parsedDoc, textDoc);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });
});
