import {
  createConnection,
  TextDocuments,
  Diagnostic,
  ProposedFeatures,
  InitializeParams,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  DocumentDiagnosticReportKind,
  type DocumentDiagnosticReport,
  Hover,
  Location
} from 'vscode-languageserver/node';

import {
  TextDocument
} from 'vscode-languageserver-textdocument';

// Import Toon class and AST types from @toon/core
import {
  Toon,
  DocumentNode,
  ASTWalker,
  Position as ASTPosition
} from '@toon/core';

// Import AST-based validators and providers
import { ASTDiagnosticValidator } from './validators/ast-diagnostic-validator';
import { ASTHoverProvider } from './providers/hover/ast-hover-provider';
import { ASTDefinitionProvider } from './providers/definition/ast-definition-provider';
import { safeExecute, safeExecuteAsync } from './utils/error-handler';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  // Log initialization
  connection.console.log('Toon Language Server initializing...');
  connection.console.log(`Client capabilities: workspaceFolders=${hasWorkspaceFolderCapability}`);

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true
      },
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false
      },
      // Tell the client that this server supports hover
      hoverProvider: true,
      // Tell the client that this server supports go to definition
      definitionProvider: true
    }
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }

  connection.console.log('Toon Language Server initialized successfully');
  connection.console.log('Registered capabilities: hover, definition, diagnostics, completion');

  return result;
});

connection.onInitialized(() => {
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// Create Toon parser instance with event handlers
const toon = new Toon();

// Set up event handlers for parse events
toon.on('parse:start', (_event) => {
  connection.console.log('Parse started');
});

toon.on('parse:complete', (event) => {
  connection.console.log(`Parse complete: ${event.ast.children.length} top-level nodes`);
});

toon.on('parse:error', (event) => {
  connection.console.error(`Parse error: ${event.error.message}`);
});

// Cache for parsed AST documents
const documentCache = new Map<string, DocumentNode>();

function getCachedDocument(uri: string): DocumentNode | undefined {
  return documentCache.get(uri);
}

function setCachedDocument(uri: string, document: DocumentNode): void {
  documentCache.set(uri, document);
}

// Only keep settings for open documents
documents.onDidClose(e => {
  documentCache.delete(e.document.uri);
});

connection.languages.diagnostics.on(async (params) => {
  const document = documents.get(params.textDocument.uri);
  if (document !== undefined) {
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: await validateTextDocument(document)
    } satisfies DocumentDiagnosticReport;
  } else {
    // We don't know the document. We can either try to read it from disk
    // or we don't report problems for it.
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: []
    } satisfies DocumentDiagnosticReport;
  }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<Diagnostic[]> {
  return safeExecuteAsync(connection, 'validateTextDocument', async () => {
    // Parse the document using Toon class and cache the AST
    const ast = toon.parseDocument(textDocument);
    setCachedDocument(textDocument.uri, ast);

    // Run AST-based validator using visitor pattern
    const validator = new ASTDiagnosticValidator();
    const walker = new ASTWalker();

    try {
      walker.walk(ast, validator);
    } catch (error) {
      connection.console.error(`AST validation failed: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        connection.console.error(`Stack trace: ${error.stack}`);
      }
    }

    return validator.getDiagnostics();
  }, []);
}

connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  return safeExecute(connection, 'Hover handler', () => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      connection.console.log(`Hover: Document not found for URI ${params.textDocument.uri}`);
      return null;
    }

    const ast = getCachedDocument(params.textDocument.uri);
    if (!ast) {
      connection.console.log(`Hover: AST not in cache for URI ${params.textDocument.uri}`);
      return null;
    }

    // Convert LSP position to AST position
    const astPosition: ASTPosition = {
      line: params.position.line,
      character: params.position.character
    };

    // Use AST-based hover provider with visitor pattern
    const hoverProvider = new ASTHoverProvider(astPosition, params.textDocument.uri);
    const walker = new ASTWalker();
    walker.walk(ast, hoverProvider);

    return hoverProvider.getHover();
  }, null);
});

/**
 * Handle definition requests (Go to Definition)
 */
connection.onDefinition((params: TextDocumentPositionParams): Location | null => {
  return safeExecute(connection, 'Definition handler', () => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      connection.console.log(`Definition: Document not found for URI ${params.textDocument.uri}`);
      return null;
    }

    const ast = getCachedDocument(params.textDocument.uri);
    if (!ast) {
      connection.console.log(`Definition: AST not in cache for URI ${params.textDocument.uri}`);
      return null;
    }

    // Convert LSP position to AST position
    const astPosition: ASTPosition = {
      line: params.position.line,
      character: params.position.character
    };

    // Use AST-based definition provider with visitor pattern
    const definitionProvider = new ASTDefinitionProvider(astPosition, params.textDocument.uri);
    const walker = new ASTWalker();
    walker.walk(ast, definitionProvider);

    return definitionProvider.getDefinition();
  }, null);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
