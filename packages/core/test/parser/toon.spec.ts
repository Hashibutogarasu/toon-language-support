/**
 * Unit tests for Toon parser class
 */
import { Toon, KeyValuePairNode, SimpleArrayNode, StructuredArrayNode } from '../../src';
import { ParseStartEvent, ParseCompleteEvent } from '../../src/events';

describe('Toon Parser', () => {
  let toon: Toon;

  beforeEach(() => {
    toon = new Toon();
  });

  describe('parse()', () => {
    it('should parse an empty document', () => {
      const ast = toon.parse('');
      expect(ast.type).toBe('document');
      expect(ast.children).toHaveLength(1); // One empty node
      expect(ast.children[0].type).toBe('empty');
    });

    it('should parse a key-value pair', () => {
      const ast = toon.parse('name: John');
      expect(ast.type).toBe('document');
      expect(ast.children).toHaveLength(1);

      const kvNode = ast.children[0] as KeyValuePairNode;
      expect(kvNode.type).toBe('key-value-pair');
      expect(kvNode.key).toBe('name');
      expect(kvNode.value).toBe('John');
    });

    it('should parse multiple key-value pairs', () => {
      const ast = toon.parse('name: John\nage: 30\ncity: NYC');
      expect(ast.children).toHaveLength(3);

      const names = (ast.children as KeyValuePairNode[]).map(n => n.key);
      expect(names).toEqual(['name', 'age', 'city']);
    });

    it('should parse a simple array', () => {
      const ast = toon.parse('friends[3]: ana,luis,sam');
      expect(ast.children).toHaveLength(1);

      const arrayNode = ast.children[0] as SimpleArrayNode;
      expect(arrayNode.type).toBe('simple-array');
      expect(arrayNode.name).toBe('friends');
      expect(arrayNode.declaredSize).toBe(3);
      expect(arrayNode.values).toHaveLength(3);
      expect(arrayNode.values.map(v => v.value)).toEqual(['ana', 'luis', 'sam']);
    });

    it('should parse a simple array with empty values', () => {
      const ast = toon.parse('items[0]:');
      expect(ast.children).toHaveLength(1);

      const arrayNode = ast.children[0] as SimpleArrayNode;
      expect(arrayNode.type).toBe('simple-array');
      expect(arrayNode.name).toBe('items');
      expect(arrayNode.declaredSize).toBe(0);
      expect(arrayNode.values).toHaveLength(0);
    });

    it('should parse a simple array with size mismatch', () => {
      const ast = toon.parse('items[5]: a,b,c');
      expect(ast.children).toHaveLength(1);

      const arrayNode = ast.children[0] as SimpleArrayNode;
      expect(arrayNode.type).toBe('simple-array');
      expect(arrayNode.declaredSize).toBe(5);
      expect(arrayNode.values).toHaveLength(3);
    });

    it('should parse a simple array with leading whitespace', () => {
      const ast = toon.parse('  items[2]: a,b');
      expect(ast.children).toHaveLength(1);

      const arrayNode = ast.children[0] as SimpleArrayNode;
      expect(arrayNode.type).toBe('simple-array');
      expect(arrayNode.name).toBe('items');
      expect(arrayNode.nameRange.start.character).toBe(2);
    });

    it('should parse a simple array with underscores in name', () => {
      const ast = toon.parse('my_items[2]: a,b');
      expect(ast.children).toHaveLength(1);

      const arrayNode = ast.children[0] as SimpleArrayNode;
      expect(arrayNode.type).toBe('simple-array');
      expect(arrayNode.name).toBe('my_items');
    });

    it('should calculate ranges correctly for simple array', () => {
      // items[3]: a,b,c
      // 0123456789012345
      // 'a' is at position 10
      const ast = toon.parse('items[3]: a,b,c');
      const arrayNode = ast.children[0] as SimpleArrayNode;

      expect(arrayNode.nameRange.start.character).toBe(0);
      expect(arrayNode.nameRange.end.character).toBe(5);
      expect(arrayNode.sizeRange.start.character).toBe(6);
      expect(arrayNode.sizeRange.end.character).toBe(7);
      expect(arrayNode.values[0].range.start.character).toBe(10);
      expect(arrayNode.values[0].value).toBe('a');
    });

    it('should not parse line without brackets as simple array', () => {
      const ast = toon.parse('items: a,b,c');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('key-value-pair');
    });

    it('should not parse line with invalid array name as simple array', () => {
      const ast = toon.parse('123items[2]: a,b');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).not.toBe('simple-array');
    });

    it('should set parent references for simple array values', () => {
      const ast = toon.parse('items[2]: a,b');
      const arrayNode = ast.children[0] as SimpleArrayNode;

      expect(arrayNode.parent).toBe(ast);
      expect(arrayNode.values[0].parent).toBe(arrayNode);
      expect(arrayNode.values[1].parent).toBe(arrayNode);
    });

    it('should parse a structured array', () => {
      const input = `hikes[2]{id,name}:
  1,Blue Lake
  2,Ridge`;
      const ast = toon.parse(input);
      expect(ast.children).toHaveLength(1);

      const arrayNode = ast.children[0] as StructuredArrayNode;
      expect(arrayNode.type).toBe('structured-array');
      expect(arrayNode.name).toBe('hikes');
      expect(arrayNode.declaredSize).toBe(2);
      expect(arrayNode.fields).toHaveLength(2);
      expect(arrayNode.fields.map(f => f.name)).toEqual(['id', 'name']);
      expect(arrayNode.dataRows).toHaveLength(2);
    });

    it('should parse structured array with many fields', () => {
      const input = `hikes[3]{id,name,distanceKm,elevationGain,companion,wasSunny}:
  1,Blue Lake Trail,7.5,320,ana,true
  2,Ridge Overlook,9.2,540,luis,false
  3,Wildflower Loop,5.1,180,sam,true`;
      const ast = toon.parse(input);
      expect(ast.children).toHaveLength(1);

      const arrayNode = ast.children[0] as StructuredArrayNode;
      expect(arrayNode.type).toBe('structured-array');
      expect(arrayNode.name).toBe('hikes');
      expect(arrayNode.declaredSize).toBe(3);
      expect(arrayNode.fields).toHaveLength(6);
      expect(arrayNode.fields.map(f => f.name)).toEqual(['id', 'name', 'distanceKm', 'elevationGain', 'companion', 'wasSunny']);
      expect(arrayNode.dataRows).toHaveLength(3);
      expect(arrayNode.dataRows[0].values.map(v => v.value)).toEqual(['1', 'Blue Lake Trail', '7.5', '320', 'ana', 'true']);
    });

    it('should parse structured array with size mismatch (fewer rows)', () => {
      const input = `items[5]{id,name}:
  1,First
  2,Second`;
      const ast = toon.parse(input);
      const arrayNode = ast.children[0] as StructuredArrayNode;
      expect(arrayNode.type).toBe('structured-array');
      expect(arrayNode.declaredSize).toBe(5);
      expect(arrayNode.dataRows).toHaveLength(2);
    });

    it('should parse structured array with field count mismatch in data row', () => {
      const input = `items[2]{id,name,price}:
  1,First
  2,Second,10.99,extra`;
      const ast = toon.parse(input);
      const arrayNode = ast.children[0] as StructuredArrayNode;
      expect(arrayNode.type).toBe('structured-array');
      expect(arrayNode.fields).toHaveLength(3);
      expect(arrayNode.dataRows[0].values).toHaveLength(2); // Fewer values than fields
      expect(arrayNode.dataRows[1].values).toHaveLength(4); // More values than fields
    });

    it('should calculate ranges correctly for structured array', () => {
      // hikes[2]{id,name}:
      // 0123456789012345678
      const input = `hikes[2]{id,name}:
  1,Blue Lake`;
      const ast = toon.parse(input);
      const arrayNode = ast.children[0] as StructuredArrayNode;

      expect(arrayNode.nameRange.start.character).toBe(0);
      expect(arrayNode.nameRange.end.character).toBe(5);
      expect(arrayNode.sizeRange.start.character).toBe(6);
      expect(arrayNode.sizeRange.end.character).toBe(7);
    });

    it('should calculate ranges correctly for structured array fields', () => {
      // hikes[2]{id,name}:
      // 0123456789012345678
      const input = `hikes[2]{id,name}:
  1,Blue Lake`;
      const ast = toon.parse(input);
      const arrayNode = ast.children[0] as StructuredArrayNode;

      expect(arrayNode.fields[0].name).toBe('id');
      expect(arrayNode.fields[0].range.start.character).toBe(9);
      expect(arrayNode.fields[0].range.end.character).toBe(11);
      expect(arrayNode.fields[1].name).toBe('name');
      expect(arrayNode.fields[1].range.start.character).toBe(12);
      expect(arrayNode.fields[1].range.end.character).toBe(16);
    });

    it('should calculate ranges correctly for structured array data rows', () => {
      const input = `hikes[1]{id,name}:
  1,Blue Lake`;
      const ast = toon.parse(input);
      const arrayNode = ast.children[0] as StructuredArrayNode;

      expect(arrayNode.dataRows[0].range.start.line).toBe(1);
      expect(arrayNode.dataRows[0].values[0].value).toBe('1');
      expect(arrayNode.dataRows[0].values[1].value).toBe('Blue Lake');
    });

    it('should set parent references for structured array children', () => {
      const input = `hikes[1]{id,name}:
  1,Blue Lake`;
      const ast = toon.parse(input);
      const arrayNode = ast.children[0] as StructuredArrayNode;

      expect(arrayNode.parent).toBe(ast);
      expect(arrayNode.fields[0].parent).toBe(arrayNode);
      expect(arrayNode.fields[1].parent).toBe(arrayNode);
      expect(arrayNode.dataRows[0].parent).toBe(arrayNode);
      expect(arrayNode.dataRows[0].values[0].parent).toBe(arrayNode.dataRows[0]);
    });

    it('should stop parsing data rows at empty line', () => {
      const input = `hikes[3]{id,name}:
  1,First
  2,Second

  3,Third`;
      const ast = toon.parse(input);
      const arrayNode = ast.children[0] as StructuredArrayNode;
      expect(arrayNode.type).toBe('structured-array');
      expect(arrayNode.dataRows).toHaveLength(2); // Only 2 rows before empty line
    });

    it('should stop parsing data rows at non-indented line', () => {
      const input = `hikes[3]{id,name}:
  1,First
  2,Second
other: value`;
      const ast = toon.parse(input);
      const arrayNode = ast.children[0] as StructuredArrayNode;
      expect(arrayNode.type).toBe('structured-array');
      expect(arrayNode.dataRows).toHaveLength(2);
      expect(ast.children[1].type).toBe('key-value-pair');
    });

    it('should parse structured array with no data rows', () => {
      const input = `hikes[0]{id,name}:`;
      const ast = toon.parse(input);
      const arrayNode = ast.children[0] as StructuredArrayNode;
      expect(arrayNode.type).toBe('structured-array');
      expect(arrayNode.declaredSize).toBe(0);
      expect(arrayNode.dataRows).toHaveLength(0);
    });

    it('should parse structured array with underscores in name', () => {
      const input = `my_hikes[1]{id,name}:
  1,Test`;
      const ast = toon.parse(input);
      const arrayNode = ast.children[0] as StructuredArrayNode;
      expect(arrayNode.type).toBe('structured-array');
      expect(arrayNode.name).toBe('my_hikes');
    });

    it('should parse structured array with leading whitespace', () => {
      const input = `  hikes[1]{id,name}:
    1,Test`;
      const ast = toon.parse(input);
      const arrayNode = ast.children[0] as StructuredArrayNode;
      expect(arrayNode.type).toBe('structured-array');
      expect(arrayNode.name).toBe('hikes');
      expect(arrayNode.nameRange.start.character).toBe(2);
    });

    it('should not parse invalid structured array syntax (missing colon)', () => {
      const input = `hikes[2]{id,name}`;
      const ast = toon.parse(input);
      expect(ast.children[0].type).not.toBe('structured-array');
    });

    it('should not parse invalid structured array syntax (missing braces)', () => {
      const input = `hikes[2]: 1,Test`;
      const ast = toon.parse(input);
      expect(ast.children[0].type).toBe('simple-array');
    });

    it('should set parent references correctly', () => {
      const ast = toon.parse('name: John');
      const kvNode = ast.children[0];
      expect(kvNode.parent).toBe(ast);
    });

    it('should calculate ranges correctly for key-value pairs', () => {
      const ast = toon.parse('name: John');
      const kvNode = ast.children[0] as KeyValuePairNode;

      expect(kvNode.keyRange.start.line).toBe(0);
      expect(kvNode.keyRange.start.character).toBe(0);
      expect(kvNode.keyRange.end.character).toBe(4);

      expect(kvNode.valueRange.start.line).toBe(0);
      expect(kvNode.valueRange.start.character).toBe(6);
      expect(kvNode.valueRange.end.character).toBe(10);
    });

    it('should parse key-value pair with empty value', () => {
      const ast = toon.parse('name:');
      expect(ast.children).toHaveLength(1);

      const kvNode = ast.children[0] as KeyValuePairNode;
      expect(kvNode.type).toBe('key-value-pair');
      expect(kvNode.key).toBe('name');
      expect(kvNode.value).toBe('');
      expect(kvNode.colonPosition).toBe(4);
    });

    it('should parse key-value pair with whitespace-only value', () => {
      const ast = toon.parse('name:   ');
      expect(ast.children).toHaveLength(1);

      const kvNode = ast.children[0] as KeyValuePairNode;
      expect(kvNode.type).toBe('key-value-pair');
      expect(kvNode.key).toBe('name');
      expect(kvNode.value).toBe('');
    });

    it('should parse key-value pair with empty key', () => {
      const ast = toon.parse(': value');
      expect(ast.children).toHaveLength(1);

      const kvNode = ast.children[0] as KeyValuePairNode;
      expect(kvNode.type).toBe('key-value-pair');
      expect(kvNode.key).toBe('');
      expect(kvNode.value).toBe('value');
      expect(kvNode.colonPosition).toBe(0);
    });

    it('should parse key-value pair with leading whitespace', () => {
      const ast = toon.parse('  name: John');
      expect(ast.children).toHaveLength(1);

      const kvNode = ast.children[0] as KeyValuePairNode;
      expect(kvNode.type).toBe('key-value-pair');
      expect(kvNode.key).toBe('name');
      expect(kvNode.value).toBe('John');
      expect(kvNode.keyRange.start.character).toBe(2);
    });

    it('should parse key-value pair with value containing colon', () => {
      const ast = toon.parse('url: http://example.com');
      expect(ast.children).toHaveLength(1);

      const kvNode = ast.children[0] as KeyValuePairNode;
      expect(kvNode.type).toBe('key-value-pair');
      expect(kvNode.key).toBe('url');
      expect(kvNode.value).toBe('http://example.com');
    });

    it('should not parse line without colon as key-value pair', () => {
      const ast = toon.parse('no colon here');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('empty');
    });
  });

  describe('event emission', () => {
    it('should emit parse:start event', () => {
      const handler = jest.fn();
      toon.on('parse:start', handler);

      toon.parse('name: John');

      expect(handler).toHaveBeenCalledTimes(1);
      const event: ParseStartEvent = handler.mock.calls[0][0];
      expect(event.source).toBe('name: John');
      expect(event.timestamp).toBeDefined();
    });

    it('should emit parse:complete event', () => {
      const handler = jest.fn();
      toon.on('parse:complete', handler);

      toon.parse('name: John');

      expect(handler).toHaveBeenCalledTimes(1);
      const event: ParseCompleteEvent = handler.mock.calls[0][0];
      expect(event.ast.type).toBe('document');
      expect(event.timestamp).toBeDefined();
      expect(event.duration).toBeGreaterThanOrEqual(0);
    });

    it('should emit events in correct order', () => {
      const events: string[] = [];
      toon.on('parse:start', () => events.push('start'));
      toon.on('parse:complete', () => events.push('complete'));

      toon.parse('name: John');

      expect(events).toEqual(['start', 'complete']);
    });
  });

  describe('parseDocument()', () => {
    it('should parse a TextDocument-like object', () => {
      const mockDocument = {
        getText: () => 'name: John',
        uri: 'file:///test.toon',
      };

      const ast = toon.parseDocument(mockDocument);
      expect(ast.type).toBe('document');
      expect(ast.children).toHaveLength(1);
    });
  });

  describe('mixed content', () => {
    it('should parse a document with mixed content types', () => {
      const input = `context:
  task: Our favorite hikes
  location: Boulder

friends[3]: ana,luis,sam

hikes[2]{id,name}:
  1,Blue Lake
  2,Ridge`;

      const ast = toon.parse(input);

      // Should have: block (context with children), empty, friends, empty, hikes
      const types = ast.children.map(c => c.type);
      expect(types).toContain('block'); // context: with indented children is now a BlockNode
      expect(types).toContain('simple-array');
      expect(types).toContain('structured-array');
      expect(types).toContain('empty');

      // Verify the block structure contains the key-value pairs as children
      const blockNode = ast.children.find(c => c.type === 'block');
      expect(blockNode).toBeDefined();
      if (blockNode && blockNode.type === 'block') {
        const block = blockNode as import('../../src/ast').BlockNode;
        expect(block.key).toBe('context');
        expect(block.children).toHaveLength(2);
        expect(block.children[0].type).toBe('key-value-pair');
        expect(block.children[1].type).toBe('key-value-pair');
      }
    });
  });
});
