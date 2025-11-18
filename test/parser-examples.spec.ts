/**
 * Parser tests using actual example files
 */

import * as fs from 'fs';
import * as path from 'path';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseToonDocument, SimpleArray, StructuredArray } from '../lsp/server/src/parser';

describe('Parser - Example Files', () => {
  it('should parse simple.toon correctly', () => {
    const content = fs.readFileSync(path.join(__dirname, '../example/simple.toon'), 'utf-8');
    const textDoc = TextDocument.create('test://simple.toon', 'toon', 1, content);
    const result = parseToonDocument(textDoc);
    
    // Should have key-value pairs
    const kvLines = result.lines.filter(l => l.type === 'key-value');
    expect(kvLines.length).toBeGreaterThan(0);
  });

  it('should parse array.toon correctly', () => {
    const content = fs.readFileSync(path.join(__dirname, '../example/array.toon'), 'utf-8');
    const textDoc = TextDocument.create('test://array.toon', 'toon', 1, content);
    const result = parseToonDocument(textDoc);
    
    // Should have a simple array
    const arrayLine = result.lines.find(l => l.type === 'simple-array');
    expect(arrayLine).toBeDefined();
    
    const parsed = arrayLine?.parsed as SimpleArray;
    expect(parsed.name).toBe('friends');
    expect(parsed.declaredSize).toBe(3);
    expect(parsed.values).toEqual(['ana', 'luis', 'sam']);
  });

  it('should parse array_with_keys.toon correctly', () => {
    const content = fs.readFileSync(path.join(__dirname, '../example/array_with_keys.toon'), 'utf-8');
    const textDoc = TextDocument.create('test://array_with_keys.toon', 'toon', 1, content);
    const result = parseToonDocument(textDoc);
    
    // Should have a structured array
    const arrayLine = result.lines.find(l => l.type === 'structured-array');
    expect(arrayLine).toBeDefined();
    
    const parsed = arrayLine?.parsed as StructuredArray;
    expect(parsed.name).toBe('hikes');
    expect(parsed.declaredSize).toBe(3);
    expect(parsed.fields.length).toBe(6);
    expect(parsed.fields.map(f => f.name)).toEqual([
      'id', 'name', 'distanceKm', 'elevationGain', 'companion', 'wasSunny'
    ]);
    expect(parsed.dataLines.length).toBe(3);
    
    // Verify first data line
    expect(parsed.dataLines[0].values).toEqual([
      '1', 'Blue Lake Trail', '7.5', '320', 'ana', 'true'
    ]);
  });
});
