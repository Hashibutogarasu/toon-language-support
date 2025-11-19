import { Hover, TextDocumentPositionParams } from 'vscode-languageserver/node';
import { ToonLine, ToonDocument } from '../../types';
import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Interface for hover providers
 */
export interface HoverProvider {
  /**
   * Get hover information
   * @param line The parsed line
   * @param params The hover request parameters
   * @param document The text document
   * @param parsedDocument The parsed toon document
   * @returns Hover information or null
   */
  getHover(
    line: ToonLine,
    params: TextDocumentPositionParams,
    document: TextDocument,
    parsedDocument: ToonDocument
  ): Hover | null;
}
