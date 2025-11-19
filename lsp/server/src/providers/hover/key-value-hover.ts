import { Hover, MarkupKind, TextDocumentPositionParams } from 'vscode-languageserver/node';
import { ToonLine, ToonDocument, KeyValuePair } from '../../types';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { HoverProvider } from './hover-provider';

export class KeyValuePairHoverProvider implements HoverProvider {
  getHover(
    line: ToonLine,
    params: TextDocumentPositionParams,
    document: TextDocument,
    parsedDocument: ToonDocument
  ): Hover | null {
    if (line.type !== 'key-value') {
      return null;
    }

    const keyValuePair = line.parsed as KeyValuePair;
    const position = params.position;

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

    return null;
  }
}
