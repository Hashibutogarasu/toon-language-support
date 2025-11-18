import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseToonDocument } from '../lsp/server/src/parser';

// Mock the validator since we can't easily import it from server.ts
// We'll test the integration through the actual implementation
describe('Array Size Diagnostics Integration', () => {
  function createDocument(content: string): TextDocument {
    return TextDocument.create('test://test.toon', 'toon', 1, content);
  }

  describe('Simple Array Size Validation', () => {
    it('should parse simple array with matching size correctly', () => {
      const content = 'friends[3]: ana,luis,sam';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      const line = parsed.lines[0];
      expect(line.type).toBe('simple-array');

      const simpleArray = line.parsed as any;
      expect(simpleArray.declaredSize).toBe(3);
      expect(simpleArray.values).toEqual(['ana', 'luis', 'sam']);
      expect(simpleArray.values.length).toBe(3);
    });

    it('should parse simple array with insufficient elements', () => {
      const content = 'friends[5]: ana,luis';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      const line = parsed.lines[0];
      const simpleArray = line.parsed as any;
      expect(simpleArray.declaredSize).toBe(5);
      expect(simpleArray.values.length).toBe(2);
      // Validator should detect: declared=5, actual=2
    });

    it('should parse simple array with excess elements', () => {
      const content = 'friends[2]: ana,luis,sam,maria';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      const line = parsed.lines[0];
      const simpleArray = line.parsed as any;
      expect(simpleArray.declaredSize).toBe(2);
      expect(simpleArray.values.length).toBe(4);
      // Validator should detect: declared=2, actual=4
    });

    it('should parse empty simple array', () => {
      const content = 'friends[0]: ';
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      const line = parsed.lines[0];
      const simpleArray = line.parsed as any;
      expect(simpleArray.declaredSize).toBe(0);
      expect(simpleArray.values.length).toBe(0);
    });
  });

  describe('Structured Array Row Count Validation', () => {
    it('should parse structured array with matching row count', () => {
      const content = `hikes[3]{id,name,distance}:
  1,Trail,7.5
  2,Path,9.2
  3,Loop,5.1`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      const line = parsed.lines[0];
      expect(line.type).toBe('structured-array');

      const structuredArray = line.parsed as any;
      expect(structuredArray.declaredSize).toBe(3);
      expect(structuredArray.dataLines.length).toBe(3);
      expect(structuredArray.fields.length).toBe(3);
    });

    it('should parse structured array with insufficient rows', () => {
      const content = `hikes[5]{id,name}:
  1,Trail`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      const line = parsed.lines[0];
      const structuredArray = line.parsed as any;
      expect(structuredArray.declaredSize).toBe(5);
      expect(structuredArray.dataLines.length).toBe(1);
      // Validator should detect: declared=5, actual=1
    });

    it('should parse structured array with excess rows', () => {
      const content = `hikes[1]{id,name}:
  1,Trail
  2,Path
  3,Loop`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      const line = parsed.lines[0];
      const structuredArray = line.parsed as any;
      expect(structuredArray.declaredSize).toBe(1);
      expect(structuredArray.dataLines.length).toBe(3);
      // Validator should detect: declared=1, actual=3
    });

    it('should parse structured array with zero rows', () => {
      const content = `hikes[0]{id,name}:`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      const line = parsed.lines[0];
      const structuredArray = line.parsed as any;
      expect(structuredArray.declaredSize).toBe(0);
      expect(structuredArray.dataLines.length).toBe(0);
    });
  });

  describe('Mixed Document Validation', () => {
    it('should parse document with multiple arrays', () => {
      const content = `task: Hiking data
friends[3]: ana,luis,sam
hikes[2]{id,name}:
  1,Trail
  2,Path`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      expect(parsed.lines.length).toBe(5); // key-value, simple-array, structured-array, 2 data lines
      expect(parsed.lines[0].type).toBe('key-value');
      expect(parsed.lines[1].type).toBe('simple-array');
      expect(parsed.lines[2].type).toBe('structured-array');

      const simpleArray = parsed.lines[1].parsed as any;
      expect(simpleArray.declaredSize).toBe(3);
      expect(simpleArray.values.length).toBe(3);

      const structuredArray = parsed.lines[2].parsed as any;
      expect(structuredArray.declaredSize).toBe(2);
      expect(structuredArray.dataLines.length).toBe(2);
    });

    it('should parse document with size mismatches', () => {
      const content = `friends[5]: ana,luis
hikes[1]{id,name}:
  1,Trail
  2,Path
  3,Loop`;
      const doc = createDocument(content);
      const parsed = parseToonDocument(doc);

      const simpleArray = parsed.lines[0].parsed as any;
      expect(simpleArray.declaredSize).toBe(5);
      expect(simpleArray.values.length).toBe(2);
      // Should generate diagnostic: insufficient elements

      const structuredArray = parsed.lines[1].parsed as any;
      expect(structuredArray.declaredSize).toBe(1);
      expect(structuredArray.dataLines.length).toBe(3);
      // Should generate diagnostic: excess rows
    });
  });
});
