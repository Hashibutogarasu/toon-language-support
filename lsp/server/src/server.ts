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
  Hover
} from 'vscode-languageserver/node';

import {
  TextDocument
} from 'vscode-languageserver-textdocument';

import {
  parseToonDocument,
} from './parser';
import {
  DiagnosticValidator,
  ArraySizeValidator,
  StructuredArrayFieldValidator,
  KeyValuePairValidator,
  ArraySyntaxValidator
} from './validators';
import {
  findFieldDefinitionLocation
} from './definition-provider';
import { ToonDocument } from './types';
import { HoverProviderFactory } from './providers/hover-provider-factory';
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

// Cache for parsed documents
const documentCache = new Map<string, ToonDocument>();

function getCachedDocument(uri: string): ToonDocument | undefined {
  return documentCache.get(uri);
}

function setCachedDocument(uri: string, document: ToonDocument): void {
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
    // Parse the document and cache it
    const parsedDocument = parseToonDocument(textDocument);
    setCachedDocument(textDocument.uri, parsedDocument);

    // Run validators
    const diagnostics: Diagnostic[] = [];

    const validators: DiagnosticValidator[] = [
      new ArraySizeValidator(),
      new StructuredArrayFieldValidator(),
      new KeyValuePairValidator(),
      new ArraySyntaxValidator()
    ];

    for (const validator of validators) {
      try {
        const results = validator.validate(parsedDocument, textDocument);
        diagnostics.push(...results);
      } catch (error) {
        connection.console.error(`Validator ${validator.constructor.name} failed: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
          connection.console.error(`Stack trace: ${error.stack}`);
        }
      }
    }

    return diagnostics;
  }, []);
}

const hoverFactory = new HoverProviderFactory();
connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  return safeExecute(connection, 'Hover handler', () => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      connection.console.log(`Hover: Document not found for URI ${params.textDocument.uri}`);
      return null;
    }

    const parsedDocument = getCachedDocument(params.textDocument.uri);
    if (!parsedDocument) {
      connection.console.log(`Hover: Parsed document not in cache for URI ${params.textDocument.uri}`);
      return null;
    }

    const position = params.position;
    const line = parsedDocument.lines.find(l => l.lineNumber === position.line);

    if (!line) {
      return null;
    }

    const provider = hoverFactory.getProvider(line.type);
    if (provider) {
      return provider.getHover(line, params, document, parsedDocument);
    }

    return null;
  }, null);
});

/**
 * Handle definition requests (Go to Definition)
 */
connection.onDefinition((params: TextDocumentPositionParams) => {
  return safeExecute(connection, 'Definition handler', () => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      connection.console.log(`Definition: Document not found for URI ${params.textDocument.uri}`);
      return null;
    }

    const parsedDocument = getCachedDocument(params.textDocument.uri);
    if (!parsedDocument) {
      connection.console.log(`Definition: Parsed document not in cache for URI ${params.textDocument.uri}`);
      return null;
    }

    return findFieldDefinitionLocation(
      params.position,
      parsedDocument,
      params.textDocument.uri
    );
  }, null);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();