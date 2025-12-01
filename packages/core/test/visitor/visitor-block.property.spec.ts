/**
 * Property-based tests for AST Walker BlockNode traversal
 */
import * as fc from 'fast-check';
import {
  ASTVisitor,
  ASTWalker,
  ASTNode,
  BlockNode,
  KeyValuePairNode,
  DocumentNode,
  createRange,
} from '../../src';

/**
 * Helper to create a KeyValuePairNode for testing
 */
function createKeyValuePairNode(
  key: string,
  value: string,
  line: number
): KeyValuePairNode {
  return {
    type: 'key-value-pair',
    key,
    keyRange: createRange(line, 0, line, key.length),
    value,
    valueRange: createRange(line, key.length + 2, line, key.length + 2 + value.length),
    colonPosition: key.length,
    range: createRange(line, 0, line, key.length + 2 + value.length),
  };
}

/**
 * Helper to create a BlockNode for testing
 */
function createBlockNode(
  key: string,
  children: ASTNode[],
  startLine: number
): BlockNode {
  const endLine = children.length > 0
    ? children[children.length - 1].range.end.line
    : startLine;
  const endChar = children.length > 0
    ? children[children.length - 1].range.end.character
    : key.length + 1;

  const block: BlockNode = {
    type: 'block',
    key,
    keyRange: createRange(startLine, 0, startLine, key.length),
    colonPosition: key.length,
    children,
    range: createRange(startLine, 0, endLine, endChar),
  };

  // Set parent references
  for (const child of children) {
    child.parent = block;
  }

  return block;
}

/**
 * Helper to create a DocumentNode for testing
 */
function createDocumentNode(children: ASTNode[]): DocumentNode {
  const endLine = children.length > 0
    ? children[children.length - 1].range.end.line
    : 0;
  const endChar = children.length > 0
    ? children[children.length - 1].range.end.character
    : 0;

  const doc: DocumentNode = {
    type: 'document',
    children,
    range: createRange(0, 0, endLine, endChar),
  };

  // Set parent references
  for (const child of children) {
    child.parent = doc;
  }

  return doc;
}

/**
 * Arbitrary for generating valid key strings
 */
const keyArb = fc.string({ minLength: 1, maxLength: 10 })
  .filter((s) => /^[a-z_]+$/.test(s));

/**
 * Arbitrary for generating valid value strings
 */
const valueArb = fc.string({ minLength: 0, maxLength: 20 });

/**
 * Arbitrary for generating KeyValuePairNode children
 */
const keyValueChildArb = (startLine: number) =>
  fc.tuple(keyArb, valueArb).map(([key, value]: [string, string]) =>
    createKeyValuePairNode(key, value, startLine)
  );

/**
 * Arbitrary for generating a BlockNode with KeyValuePair children
 */
const blockNodeArb = (startLine: number): fc.Arbitrary<BlockNode> =>
  fc.tuple(
    keyArb,
    fc.array(keyValueChildArb(startLine + 1), { minLength: 0, maxLength: 5 })
  ).map(([key, children]: [string, KeyValuePairNode[]]) => {
    // Adjust line numbers for each child
    const adjustedChildren = children.map((child, idx) => ({
      ...child,
      range: createRange(startLine + 1 + idx, 2, startLine + 1 + idx, child.range.end.character + 2),
      keyRange: createRange(startLine + 1 + idx, 2, startLine + 1 + idx, 2 + child.key.length),
      valueRange: createRange(
        startLine + 1 + idx,
        2 + child.key.length + 2,
        startLine + 1 + idx,
        2 + child.key.length + 2 + child.value.length
      ),
    }));
    return createBlockNode(key, adjustedChildren, startLine);
  });

/**
 * Arbitrary for generating a DocumentNode containing BlockNodes
 */
const documentWithBlocksArb: fc.Arbitrary<DocumentNode> = fc
  .array(blockNodeArb(0), { minLength: 1, maxLength: 3 })
  .map((blocks) => {
    // Adjust line numbers for each block
    let currentLine = 0;
    const adjustedBlocks = blocks.map((block) => {
      const adjustedBlock = {
        ...block,
        range: createRange(
          currentLine,
          0,
          currentLine + block.children.length,
          block.children.length > 0
            ? block.children[block.children.length - 1].range.end.character
            : block.key.length + 1
        ),
        keyRange: createRange(currentLine, 0, currentLine, block.key.length),
        children: block.children.map((child, idx) => ({
          ...child,
          range: createRange(
            currentLine + 1 + idx,
            2,
            currentLine + 1 + idx,
            (child as KeyValuePairNode).range.end.character
          ),
        })),
      };
      currentLine += block.children.length + 1;
      return adjustedBlock;
    });
    return createDocumentNode(adjustedBlocks);
  });

describe('AST Walker BlockNode Traversal - Property Tests', () => {
  /**
   * For any AST containing BlockNodes, the walker SHALL call visitBlock 
   * for each BlockNode and recursively visit all children.
   */
  it('should call visitBlock for each BlockNode in the AST', () => {
    fc.assert(
      fc.property(documentWithBlocksArb, (doc) => {
        const walker = new ASTWalker();
        const visitedBlocks: BlockNode[] = [];

        const visitor: ASTVisitor = {
          visitBlock: (node) => {
            visitedBlocks.push(node);
          },
        };

        walker.walk(doc, visitor);

        // Count expected BlockNodes
        const expectedBlockCount = doc.children.filter(
          (child) => child.type === 'block'
        ).length;

        // Verify visitBlock was called for each BlockNode
        return visitedBlocks.length === expectedBlockCount;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any BlockNode, the walker SHALL recursively visit all children.
   */
  it('should recursively visit all children of BlockNodes', () => {
    fc.assert(
      fc.property(documentWithBlocksArb, (doc) => {
        const visitedNodes: ASTNode[] = [];

        const walkerWithCallback = new ASTWalker({
          onNodeVisit: (node) => visitedNodes.push(node),
        });

        walkerWithCallback.walk(doc, {});

        // Count all nodes that should be visited
        let expectedCount = 1; // document
        for (const child of doc.children) {
          expectedCount++; // the block itself
          if (child.type === 'block') {
            expectedCount += (child as BlockNode).children.length;
          }
        }

        // Verify all nodes were visited
        return visitedNodes.length === expectedCount;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any BlockNode, children should be visited after the block itself.
   */
  it('should visit BlockNode before its children', () => {
    fc.assert(
      fc.property(blockNodeArb(0), (block) => {
        const doc = createDocumentNode([block]);
        const visitOrder: string[] = [];

        const walkerWithCallback = new ASTWalker({
          onNodeVisit: (node) => visitOrder.push(node.type),
        });

        walkerWithCallback.walk(doc, {});

        // Find the index of 'block' in visit order
        const blockIndex = visitOrder.indexOf('block');

        // If there are children, they should come after the block
        if (block.children.length > 0) {
          const firstChildIndex = visitOrder.indexOf('key-value-pair');
          return blockIndex < firstChildIndex;
        }

        return blockIndex >= 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any BlockNode, depth tracking should be correct for children.
   */
  it('should track correct depth for BlockNode children', () => {
    fc.assert(
      fc.property(blockNodeArb(0), (block) => {
        const doc = createDocumentNode([block]);
        const depths = new Map<string, number>();

        const walkerWithCallback = new ASTWalker({
          onNodeVisit: (node, depth) => {
            if (!depths.has(node.type)) {
              depths.set(node.type, depth);
            }
          },
        });

        walkerWithCallback.walk(doc, {});

        // Document should be at depth 0
        const docDepth = depths.get('document');
        // Block should be at depth 1
        const blockDepth = depths.get('block');
        // Children should be at depth 2
        const childDepth = depths.get('key-value-pair');

        if (docDepth !== 0) { return false; }
        if (blockDepth !== 1) { return false; }
        if (block.children.length > 0 && childDepth !== 2) { return false; }

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
