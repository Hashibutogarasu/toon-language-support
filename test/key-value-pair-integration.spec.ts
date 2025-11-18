import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseToonDocument } from '../lsp/server/src/parser';
import { KeyValuePairValidator } from '../lsp/server/src/validators/key-value-pair-validator';

describe('KeyValuePairValidator Integration Tests', () => {
  let validator: KeyValuePairValidator;

  beforeEach(() => {
    validator = new KeyValuePairValidator();
  });

  function createDocument(content: string): TextDocument {
    return TextDocument.create('test://test.toon', 'toon', 1, content);
  }

  it('should validate a complete toon document with mixed content', () => {
    const content = `task: Our favorite hikes
friends[3]: ana,luis,sam
hikes[2]{id,name,distance}:
  1,Trail,7.5
  2,Path,9.2
description: A collection of hiking trails`;

    const doc = createDocument(content);
    const parsed = parseToonDocument(doc);
    const diagnostics = validator.validate(parsed, doc);

    // Should have no errors - all key-value pairs are valid
    expect(diagnostics.length).toBe(0);
  });

  it('should detect multiple errors in a document', () => {
    const content = `task: Our favorite hikes
invalid line without colon
: empty key
empty value:
friends[3]: ana,luis,sam`;

    const doc = createDocument(content);
    const parsed = parseToonDocument(doc);
    const diagnostics = validator.validate(parsed, doc);

    // Should have 3 errors: missing colon, empty key, empty value
    expect(diagnostics.length).toBe(3);
  });

  it('should handle context block pattern correctly', () => {
    const content = `context:
  task: Our favorite hikes together
  location: Boulder
  season: spring_2025

hikes[2]{id,name,distance}:
  1,Trail,7.5
  2,Path,9.2`;

    const doc = createDocument(content);
    const parsed = parseToonDocument(doc);
    const diagnostics = validator.validate(parsed, doc);

    // Should have no errors - context: is a valid block structure
    expect(diagnostics.length).toBe(0);
  });

  it('should handle nested block structures', () => {
    const content = `metadata:
  context:
    task: Our favorite hikes together
    location: Boulder
  author: John Doe`;

    const doc = createDocument(content);
    const parsed = parseToonDocument(doc);
    const diagnostics = validator.validate(parsed, doc);

    // Should have no errors - both metadata: and context: are valid block structures
    expect(diagnostics.length).toBe(0);
  });
});
