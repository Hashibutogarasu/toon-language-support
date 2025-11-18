import {
  createConnection,
  TextDocuments,
  Diagnostic,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  DocumentDiagnosticReportKind,
  type DocumentDiagnosticReport,
  Hover,
  MarkupKind
} from 'vscode-languageserver/node';

import {
  TextDocument
} from 'vscode-languageserver-textdocument';

import {
  parseToonDocument,
  ToonDocument,
  StructuredArray,
  SimpleArray,
  KeyValuePair,
  ArrayData
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

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  // Log initialization
  connection.console.log('Toon Language Server initializing...');
  connection.console.log(`Client capabilities: configuration=${hasConfigurationCapability}, workspaceFolders=${hasWorkspaceFolderCapability}`);

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
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// The Toon Language Server settings
interface ToonSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ToonSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ToonSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings = new Map<string, Thenable<ToonSettings>>();

connection.onDidChangeConfiguration(change => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = (
      (change.settings.toonLanguageServer || defaultSettings)
    );
  }
  // Refresh the diagnostics since the `maxNumberOfProblems` could have changed.
  // We could optimize things here and re-fetch the setting first can compare it
  // to the existing setting, but this is out of scope for this example.
  connection.languages.diagnostics.refresh();
});

function getDocumentSettings(resource: string): Thenable<ToonSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'toonLanguageServer'
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Cache for parsed documents
const documentCache = new Map<string, ToonDocument>();

function getCachedDocument(uri: string): ToonDocument | undefined {
  return documentCache.get(uri);
}

function setCachedDocument(uri: string, document: ToonDocument): void {
  documentCache.set(uri, document);
}

function invalidateCache(uri: string): void {
  documentCache.delete(uri);
}

// Only keep settings for open documents
documents.onDidClose(e => {
  documentSettings.delete(e.document.uri);
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
  // In this simple example we get the settings for every validate run.
  const settings = await getDocumentSettings(textDocument.uri);

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
}

connection.onDidChangeWatchedFiles(_change => {
  // Write code to handle file changes if necessary
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    // TODO: Implement Toon language-specific completion
    return [];
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    // TODO: Implement Toon language-specific completion details
    return item;
  }
);

/**
 * Handle hover requests
 */
connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  try {
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

    // Handle structured array data values
    if (line.type === 'array-data') {
      const arrayData = line.parsed as ArrayData;
      if (!arrayData.parentArray) {
        return null;
      }

      // Find which value the cursor is on
      for (let i = 0; i < arrayData.valueRanges.length; i++) {
        const valueRange = arrayData.valueRanges[i];
        if (
          position.character >= valueRange.start.character &&
          position.character <= valueRange.end.character
        ) {
          const field = arrayData.parentArray.fields[i];
          if (field) {
            const fieldDefLine = arrayData.parentArray.nameRange.start.line;
            const hoverContent = [
              `**Field:** ${field.name}`,
              ``,
              `[Go to definition](command:editor.action.goToLocations?${encodeURIComponent(JSON.stringify([
                params.textDocument.uri,
                params.position,
                [{
                  uri: params.textDocument.uri,
                  range: field.range
                }]
              ]))})`
            ].join('\n');

            return {
              contents: {
                kind: MarkupKind.Markdown,
                value: hoverContent
              },
              range: valueRange
            };
          }
        }
      }
    }

    // Handle structured array field definitions
    if (line.type === 'structured-array') {
      const structuredArray = line.parsed as StructuredArray;

      for (const field of structuredArray.fields) {
        if (
          position.character >= field.range.start.character &&
          position.character <= field.range.end.character
        ) {
          return {
            contents: {
              kind: MarkupKind.Markdown,
              value: `**Field:** ${field.name}\n\n**Position:** ${field.index + 1} of ${structuredArray.fields.length}`
            },
            range: field.range
          };
        }
      }
    }

    // Handle key-value pairs
    if (line.type === 'key-value') {
      const keyValuePair = line.parsed as KeyValuePair;

      // Check if cursor is on the key
      if (
        position.character >= keyValuePair.keyRange.start.character &&
        position.character <= keyValuePair.keyRange.end.character
      ) {
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: `**Key:** ${keyValuePair.key}`
          },
          range: keyValuePair.keyRange
        };
      }
    }

    // Handle simple array values
    if (line.type === 'simple-array') {
      const simpleArray = line.parsed as SimpleArray;

      for (let i = 0; i < simpleArray.valueRanges.length; i++) {
        const valueRange = simpleArray.valueRanges[i];
        if (
          position.character >= valueRange.start.character &&
          position.character <= valueRange.end.character
        ) {
          return {
            contents: {
              kind: MarkupKind.Markdown,
              value: `**Array:** ${simpleArray.name}\n\n**Index:** ${i}`
            },
            range: valueRange
          };
        }
      }
    }

    return null;
  } catch (error) {
    connection.console.error(`Hover handler failed: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      connection.console.error(`Stack trace: ${error.stack}`);
    }
    return null;
  }
});

/**
 * Handle definition requests (Go to Definition)
 */
connection.onDefinition((params: TextDocumentPositionParams) => {
  try {
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
  } catch (error) {
    connection.console.error(`Definition handler failed: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      connection.console.error(`Stack trace: ${error.stack}`);
    }
    return null;
  }
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();