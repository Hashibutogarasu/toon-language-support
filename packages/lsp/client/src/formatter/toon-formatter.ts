import * as vscode from 'vscode';
import { decode, encode } from '@toon-format/toon';

/**
 * ToonFormatter implements VSCode's DocumentFormattingEditProvider interface
 * to format .toon files using the @toon-format/toon library.
 * 
 * The formatter parses the document content using decode(), then re-encodes
 * it using encode() to produce consistently formatted output.
 */
export class ToonFormatter implements vscode.DocumentFormattingEditProvider {
  /**
   * Provides formatting edits for a Toon document.
   * 
   * @param document - The document to format
   * @param options - Formatting options (not used, Toon has its own format)
   * @param token - Cancellation token
   * @returns An array of TextEdits to apply, or empty array on error
   */
  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    const text = document.getText();

    // Handle empty documents
    if (!text.trim()) {
      return [];
    }

    try {
      // Parse the Toon content
      const parsed = decode(text);

      // Re-encode to get formatted output
      const formatted = encode(parsed);

      // If the content is already formatted, return no edits
      if (formatted === text) {
        return [];
      }

      // Create a TextEdit that replaces the entire document
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
      );

      return [vscode.TextEdit.replace(fullRange, formatted)];
    } catch (error) {
      // Handle parse errors gracefully
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to format Toon file: ${errorMessage}`);
      return [];
    }
  }
}
