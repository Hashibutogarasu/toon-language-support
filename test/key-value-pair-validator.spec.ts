import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseToonDocument } from '../lsp/server/src/parser';
import { KeyValuePairValidator } from '../lsp/server/src/validators/key-value-pair-validator';

describe('KeyValuePairValidator', () => {
  let validator: KeyValuePairValidator;

  beforeEach(() => {
    validator = new KeyValuePairValidator();
  });

  function createDocument(content: string): TextDocument {
    return TextDocument.create('test://test.toon', 'toon', 1, content);
  }

  describe('Valid Key-Value Pairs', () => {
    it('should not report error for valid key-value pair', () => {
      const content = 'task: Our favorite hikes';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(0);
    });

    it('should not report error for key-value pair with numeric value', () => {
      const content = 'count: 42';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Missing Colon', () => {
    it('should report error when colon is missing', () => {
      const content = 'task Our favorite hikes';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].message).toContain('コロンが見つかりません');
    });
  });

  describe('Empty Value', () => {
    it('should report error when value is empty', () => {
      const content = 'task:';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].message).toContain('値が指定されていません');
    });

    it('should report error when value is only whitespace', () => {
      const content = 'task:   ';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].message).toContain('値が指定されていません');
    });
  });

  describe('Empty Key', () => {
    it('should report error when key is empty', () => {
      const content = ': Our favorite hikes';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].message).toContain('キーが指定されていません');
    });

    it('should report error when key is only whitespace', () => {
      const content = '   : Our favorite hikes';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].message).toContain('キーが指定されていません');
    });
  });

  describe('Array Declaration Exclusion', () => {
    it('should not validate simple array declarations', () => {
      const content = 'friends[3]: ana,luis,sam';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const diagnostics = validator.validate(parsed, doc);

      // Should not report any errors for array declarations
      expect(diagnostics.length).toBe(0);
    });

    it('should not validate structured array declarations', () => {
      const content = 'hikes[3]{id,name,distance}:';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const diagnostics = validator.validate(parsed, doc);

      // Should not report any errors for array declarations
      expect(diagnostics.length).toBe(0);
    });

    it('should not validate array data lines', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Trail,7.5`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const diagnostics = validator.validate(parsed, doc);

      // Should not report any errors for array data lines
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Multiple Errors', () => {
    it('should report both empty key and empty value errors', () => {
      const content = ':';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(2);
      const messages = diagnostics.map(d => d.message);
      expect(messages).toContain('キーが指定されていません');
      expect(messages).toContain('値が指定されていません');
    });
  });

  describe('Empty Lines', () => {
    it('should not report errors for empty lines', () => {
      const content = '\n\n';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(0);
    });
  });
});
