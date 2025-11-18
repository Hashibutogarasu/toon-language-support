import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseToonDocument } from '../lsp/server/src/parser';
import { StructuredArrayFieldValidator } from '../lsp/server/src/validators';

describe('StructuredArrayFieldValidator', () => {
  function createDocument(content: string): TextDocument {
    return TextDocument.create('test://test.toon', 'toon', 1, content);
  }

  describe('Field Count Validation', () => {
    it('should not report error when field count matches', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Trail,7.5
  2,Path,9.2
  3,Loop,5.1`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const validator = new StructuredArrayFieldValidator();
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(0);
    });

    it('should detect when data row has insufficient fields', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Trail
  2,Path,9.2
  3,Loop,5.1`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const validator = new StructuredArrayFieldValidator();
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].message).toContain('フィールド数が不足しています');
      expect(diagnostics[0].message).toContain('期待: 3');
      expect(diagnostics[0].message).toContain('実際: 2');
      expect(diagnostics[0].range.start.line).toBe(1);
    });

    it('should detect when data row has excess fields', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Trail,7.5
  2,Path,9.2,extra,field
  3,Loop,5.1`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const validator = new StructuredArrayFieldValidator();
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].message).toContain('フィールド数が超過しています');
      expect(diagnostics[0].message).toContain('期待: 3');
      expect(diagnostics[0].message).toContain('実際: 5');
      expect(diagnostics[0].range.start.line).toBe(2);
    });

    it('should report individual errors for multiple inconsistent rows', () => {
      const content = `hikes[4]{id,name,distance}:
  1,Trail
  2,Path,9.2
  3,Loop,5.1,extra
  4,Mountain,10.5,steep,long`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const validator = new StructuredArrayFieldValidator();
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(3);

      // First error: insufficient fields
      expect(diagnostics[0].message).toContain('フィールド数が不足しています');
      expect(diagnostics[0].range.start.line).toBe(1);

      // Second error: excess fields
      expect(diagnostics[1].message).toContain('フィールド数が超過しています');
      expect(diagnostics[1].range.start.line).toBe(3);

      // Third error: excess fields
      expect(diagnostics[2].message).toContain('フィールド数が超過しています');
      expect(diagnostics[2].range.start.line).toBe(4);
    });

    it('should work with arrays with single field', () => {
      const content = `names[2]{name}:
  Alice
  Bob`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const validator = new StructuredArrayFieldValidator();
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(0);
    });

    it('should detect field mismatch in single field array', () => {
      const content = `names[2]{name}:
  Alice,Extra
  Bob`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);
      const validator = new StructuredArrayFieldValidator();
      const diagnostics = validator.validate(parsed, doc);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].message).toContain('フィールド数が超過しています');
      expect(diagnostics[0].message).toContain('期待: 1');
      expect(diagnostics[0].message).toContain('実際: 2');
    });
  });
});

