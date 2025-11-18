import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic } from 'vscode-languageserver/node';
import { parseToonDocument } from '../lsp/server/src/parser';
import {
  ArraySyntaxValidator,
  ArraySizeValidator,
  KeyValuePairValidator,
  StructuredArrayFieldValidator
} from '../lsp/server/src/validators';

describe('Array Syntax Validator Integration', () => {
  function createDocument(content: string): TextDocument {
    return TextDocument.create('test://test.toon', 'toon', 1, content);
  }

  function getAllDiagnostics(content: string): Diagnostic[] {
    const textDoc = createDocument(content);
    const parsedDoc = parseToonDocument(textDoc);

    const validators = [
      new ArraySizeValidator(),
      new StructuredArrayFieldValidator(),
      new KeyValuePairValidator(),
      new ArraySyntaxValidator()
    ];

    const allDiagnostics: Diagnostic[] = [];
    for (const validator of validators) {
      const diagnostics = validator.validate(parsedDoc, textDoc);
      allDiagnostics.push(...diagnostics);
    }

    return allDiagnostics;
  }

  test('should detect syntax errors before size validation', () => {
    const content = 'items[abc]: value1,value2';
    const diagnostics = getAllDiagnostics(content);

    // Should have syntax error for invalid size
    const syntaxErrors = diagnostics.filter(d => d.message.includes('数値である必要があります'));
    expect(syntaxErrors.length).toBeGreaterThan(0);
  });

  test('should work alongside other validators', () => {
    const content = `task: Our favorite hikes
items[3]: value1,value2
hikes[2]{id,name}:
  1,Trail
  2,Path,Extra`;

    const diagnostics = getAllDiagnostics(content);

    // Should have array size error (items has 2 values but declared 3)
    const sizeErrors = diagnostics.filter(d => d.message.includes('要素数が不足'));
    expect(sizeErrors.length).toBeGreaterThan(0);

    // Should have field count error (last hike has 3 fields but declared 2)
    const fieldErrors = diagnostics.filter(d => d.message.includes('フィールド数が超過'));
    expect(fieldErrors.length).toBeGreaterThan(0);
  });

  test('should not interfere with valid documents', () => {
    const content = `task: Our favorite hikes
items[3]: value1,value2,value3
hikes[2]{id,name}:
  1,Trail
  2,Path`;

    const diagnostics = getAllDiagnostics(content);
    expect(diagnostics).toHaveLength(0);
  });

  test('should detect multiple syntax errors in one document', () => {
    const content = `items1[: value1
items2[abc]: value2
items3[3]{id,name: value3`;

    const diagnostics = getAllDiagnostics(content);

    // Should have at least 3 errors (missing bracket, invalid size, missing brace)
    expect(diagnostics.length).toBeGreaterThanOrEqual(3);
  });
});
