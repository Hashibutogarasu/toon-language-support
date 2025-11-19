import { Hover, MarkupKind, TextDocumentPositionParams } from 'vscode-languageserver/node';
import { ToonLine, ToonDocument, StructuredArray } from '../../types';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { HoverProvider } from './hover-provider';

export class StructuredArrayHoverProvider implements HoverProvider {
  getHover(
    line: ToonLine,
    params: TextDocumentPositionParams,
    document: TextDocument,
    parsedDocument: ToonDocument
  ): Hover | null {
    if (line.type !== 'structured-array') {
      return null;
    }

    const structuredArray = line.parsed as StructuredArray;
    const position = params.position;

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

    return null;
  }
}
