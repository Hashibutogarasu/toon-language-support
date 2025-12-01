/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import * as vscode from 'vscode';
import { workspace, ExtensionContext } from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

import { ToonFormatter } from './formatter';
import { convertJsonToToon, convertToonToJson } from './commands';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // The server is implemented in node
  // Server is now in packages/lsp/server
  const serverModule = context.asAbsolutePath(
    path.join('packages', 'lsp', 'server', 'out', 'server.js')
  );

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    }
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for Toon language documents
    documentSelector: [{ scheme: 'file', language: 'toon' }],
    synchronize: {
      // Notify the server about file changes to .toon files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/*.toon')
    }
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'toonLanguageServer',
    'Toon Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();

  // Register the Toon formatter
  const formatter = new ToonFormatter();
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { language: 'toon', scheme: 'file' },
      formatter
    )
  );

  // Register conversion commands
  context.subscriptions.push(
    vscode.commands.registerCommand('toon.convertJsonToToon', convertJsonToToon),
    vscode.commands.registerCommand('toon.convertToonToJson', convertToonToJson)
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
