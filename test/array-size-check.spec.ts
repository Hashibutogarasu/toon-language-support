import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseToonDocument } from '../lsp/server/src/parser';
import { ArraySizeValidator } from '../lsp/server/src/validators/array-size-validator';

describe('ArraySizeValidator - User reported issue', () => {
  const validator = new ArraySizeValidator();

  function createDocument(content: string): TextDocument {
    return TextDocument.create('test://test.toon', 'toon', 1, content);
  }

  test('friends[3]: ana,luis,sam should have NO error', () => {
    const content = 'friends[3]: ana,luis,sam';
    const textDoc = createDocument(content);
    const parsedDoc = parseToonDocument(textDoc);
    
    console.log('Parsed document:', JSON.stringify(parsedDoc, null, 2));
    
    const diagnostics = validator.validate(parsedDoc, textDoc);
    
    console.log('Diagnostics:', diagnostics);
    
    expect(diagnostics).toHaveLength(0);
  });

  test('friends[2]: ana,luis,sam should have error (excess elements)', () => {
    const content = 'friends[2]: ana,luis,sam';
    const textDoc = createDocument(content);
    const parsedDoc = parseToonDocument(textDoc);
    
    console.log('Parsed document:', JSON.stringify(parsedDoc, null, 2));
    
    const diagnostics = validator.validate(parsedDoc, textDoc);
    
    console.log('Diagnostics:', diagnostics);
    
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].message).toContain('超過');
  });

  test('friends[4]: ana,luis,sam should have error (insufficient elements)', () => {
    const content = 'friends[4]: ana,luis,sam';
    const textDoc = createDocument(content);
    const parsedDoc = parseToonDocument(textDoc);
    
    console.log('Parsed document:', JSON.stringify(parsedDoc, null, 2));
    
    const diagnostics = validator.validate(parsedDoc, textDoc);
    
    console.log('Diagnostics:', diagnostics);
    
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].message).toContain('不足');
  });
});
