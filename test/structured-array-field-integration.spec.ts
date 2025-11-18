import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseToonDocument } from '../lsp/server/src/parser';
import { ArraySizeValidator, StructuredArrayFieldValidator } from '../lsp/server/src/validators';

describe('Structured Array Field Validator Integration', () => {
  function createDocument(content: string): TextDocument {
    return TextDocument.create('test://test.toon', 'toon', 1, content);
  }

  it('should work together with ArraySizeValidator', () => {
    const content = `hikes[2]{id,name,distance}:
  1,Trail
  2,Path,9.2,extra`;
    const doc = createDocument(content);
    const parsed = parseToonDocument(doc);

    const arraySizeValidator = new ArraySizeValidator();
    const fieldValidator = new StructuredArrayFieldValidator();

    const arraySizeDiagnostics = arraySizeValidator.validate(parsed, doc);
    const fieldDiagnostics = fieldValidator.validate(parsed, doc);

    // Should have no array size errors (2 rows declared, 2 rows present)
    expect(arraySizeDiagnostics.length).toBe(0);

    // Should have 2 field count errors (one insufficient, one excess)
    expect(fieldDiagnostics.length).toBe(2);
    expect(fieldDiagnostics[0].message).toContain('フィールド数が不足しています');
    expect(fieldDiagnostics[1].message).toContain('フィールド数が超過しています');
  });

  it('should detect both array size and field count issues', () => {
    const content = `hikes[3]{id,name,distance}:
  1,Trail
  2,Path,9.2,extra`;
    const doc = createDocument(content);
    const parsed = parseToonDocument(doc);

    const arraySizeValidator = new ArraySizeValidator();
    const fieldValidator = new StructuredArrayFieldValidator();

    const arraySizeDiagnostics = arraySizeValidator.validate(parsed, doc);
    const fieldDiagnostics = fieldValidator.validate(parsed, doc);

    // Should have 1 array size error (3 rows declared, 2 rows present)
    expect(arraySizeDiagnostics.length).toBe(1);
    expect(arraySizeDiagnostics[0].message).toContain('配列の行数が宣言と一致しません');

    // Should have 2 field count errors
    expect(fieldDiagnostics.length).toBe(2);
  });

  it('should not report errors for valid structured arrays', () => {
    const content = `hikes[3]{id,name,distance}:
  1,Trail,7.5
  2,Path,9.2
  3,Loop,5.1`;
    const doc = createDocument(content);
    const parsed = parseToonDocument(doc);

    const arraySizeValidator = new ArraySizeValidator();
    const fieldValidator = new StructuredArrayFieldValidator();

    const arraySizeDiagnostics = arraySizeValidator.validate(parsed, doc);
    const fieldDiagnostics = fieldValidator.validate(parsed, doc);

    expect(arraySizeDiagnostics.length).toBe(0);
    expect(fieldDiagnostics.length).toBe(0);
  });
});
