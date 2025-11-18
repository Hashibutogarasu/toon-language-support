import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  DocumentDiagnosticReportKind,
  type DocumentDiagnosticReport
} from 'vscode-languageserver/node';

import {
  TextDocument
} from 'vscode-languageserver-textdocument';

import { parseToonDocument, ToonDocument, ToonLine, SimpleArray, StructuredArray } from './parser';

// Diagnostic messages
const DiagnosticMessages = {
  ARRAY_SIZE_INSUFFICIENT: '配列の要素数が不足しています（宣言: {declared}, 実際: {actual}）',
  ARRAY_SIZE_EXCEEDED: '配列の要素数が超過しています（宣言: {declared}, 実際: {actual}）',
  ARRAY_ROWS_MISMATCH: '配列の行数が宣言と一致しません（宣言: {declared}, 実際: {actual}）',
  FIELD_COUNT_INSUFFICIENT: 'フィールド数が不足しています（期待: {expected}, 実際: {actual}）',
  FIELD_COUNT_EXCEEDED: 'フィールド数が超過しています（期待: {expected}, 実際: {actual}）',
  MISSING_COLON: 'コロンが見つかりません',
  MISSING_VALUE: '値が指定されていません',
  MISSING_KEY: 'キーが指定されていません',
  MISSING_CLOSING_BRACKET: '閉じ角括弧が見つかりません',
  MISSING_ARRAY_SIZE: '配列サイズが指定されていません',
  INVALID_ARRAY_SIZE: '配列サイズは数値である必要があります',
  MISSING_CLOSING_BRACE: '閉じ波括弧が見つかりません'
};

// Validator interface
interface DiagnosticValidator {
  validate(document: ToonDocument, textDocument: TextDocument): Diagnostic[];
}

// Array Size Validator
class ArraySizeValidator implements DiagnosticValidator {
  validate(document: ToonDocument, textDocument: TextDocument): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const line of document.lines) {
      try {
        if (line.type === 'simple-array' && line.parsed) {
          const simpleArray = line.parsed as SimpleArray;
          const actualCount = simpleArray.values.length;
          const declaredSize = simpleArray.declaredSize;

          if (actualCount !== declaredSize) {
            let message: string;
            if (actualCount < declaredSize) {
              message = DiagnosticMessages.ARRAY_SIZE_INSUFFICIENT
                .replace('{declared}', declaredSize.toString())
                .replace('{actual}', actualCount.toString());
            } else {
              message = DiagnosticMessages.ARRAY_SIZE_EXCEEDED
                .replace('{declared}', declaredSize.toString())
                .replace('{actual}', actualCount.toString());
            }

            diagnostics.push({
              severity: DiagnosticSeverity.Error,
              range: {
                start: { line: line.lineNumber, character: 0 },
                end: { line: line.lineNumber, character: line.content.length }
              },
              message,
              source: 'toon'
            });
          }
        } else if (line.type === 'structured-array' && line.parsed) {
          const structuredArray = line.parsed as StructuredArray;
          const actualRows = structuredArray.dataLines.length;
          const declaredSize = structuredArray.declaredSize;

          if (actualRows !== declaredSize) {
            const message = DiagnosticMessages.ARRAY_ROWS_MISMATCH
              .replace('{declared}', declaredSize.toString())
              .replace('{actual}', actualRows.toString());

            diagnostics.push({
              severity: DiagnosticSeverity.Error,
              range: {
                start: { line: line.lineNumber, character: 0 },
                end: { line: line.lineNumber, character: line.content.length }
              },
              message,
              source: 'toon'
            });
          }
        }
      } catch (error) {
        console.error(`ArraySizeValidator error at line ${line.lineNumber}:`, error);
      }
    }

    return diagnostics;
  }
}

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
      }
    }
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }
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
    new ArraySizeValidator()
  ];

  for (const validator of validators) {
    try {
      const results = validator.validate(parsedDocument, textDocument);
      diagnostics.push(...results);
    } catch (error) {
      console.error(`Validator ${validator.constructor.name} failed:`, error);
    }
  }

  return diagnostics;
}

connection.onDidChangeWatchedFiles(_change => {
  // Monitored files have change in VSCode
  connection.console.log('We received a file change event');
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

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();