import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseToonDocument } from '../lsp/server/src/parser';

describe('ArraySizeValidator', () => {
  function createDocument(content: string): TextDocument {
    return TextDocument.create('test://test.toon', 'toon', 1, content);
  }

  describe('Simple Array Validation', () => {
    it('should not report error when array size matches', () => {
      const content = 'friends[3]: ana,luis,sam';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      expect(parsed.lines.length).toBe(1);
      expect(parsed.lines[0].type).toBe('simple-array');

      const simpleArray = parsed.lines[0].parsed as any;
      expect(simpleArray.declaredSize).toBe(3);
      expect(simpleArray.values.length).toBe(3);
    });

    it('should detect when array has insufficient elements', () => {
      const content = 'friends[5]: ana,luis,sam';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      const simpleArray = parsed.lines[0].parsed as any;
      expect(simpleArray.declaredSize).toBe(5);
      expect(simpleArray.values.length).toBe(3);
    });

    it('should detect when array has excess elements', () => {
      const content = 'friends[2]: ana,luis,sam';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      const simpleArray = parsed.lines[0].parsed as any;
      expect(simpleArray.declaredSize).toBe(2);
      expect(simpleArray.values.length).toBe(3);
    });
  });

  describe('Structured Array Validation', () => {
    it('should not report error when row count matches', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Trail,7.5
  2,Path,9.2
  3,Loop,5.1`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      expect(parsed.lines[0].type).toBe('structured-array');

      const structuredArray = parsed.lines[0].parsed as any;
      expect(structuredArray.declaredSize).toBe(3);
      expect(structuredArray.dataLines.length).toBe(3);
    });

    it('should detect when structured array has insufficient rows', () => {
      const content = `hikes[5]{id,name,distance}:
  1,Trail,7.5
  2,Path,9.2`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      const structuredArray = parsed.lines[0].parsed as any;
      expect(structuredArray.declaredSize).toBe(5);
      expect(structuredArray.dataLines.length).toBe(2);
    });

    it('should detect when structured array has excess rows', () => {
      const content = `hikes[2]{id,name,distance}:
  1,Trail,7.5
  2,Path,9.2
  3,Loop,5.1`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      const structuredArray = parsed.lines[0].parsed as any;
      expect(structuredArray.declaredSize).toBe(2);
      expect(structuredArray.dataLines.length).toBe(3);
    });
  });
});
