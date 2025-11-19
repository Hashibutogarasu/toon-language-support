import { Hover, MarkupKind, TextDocumentPositionParams } from 'vscode-languageserver/node';
import { ToonLine, ToonDocument, ArrayData } from '../../types';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { HoverProvider } from './hover-provider';

export class ArrayDataHoverProvider implements HoverProvider {
  getHover(
    line: ToonLine,
    params: TextDocumentPositionParams,
    document: TextDocument,
    parsedDocument: ToonDocument
  ): Hover | null {
    if (line.type !== 'array-data') {
      return null;
    }

    const arrayData = line.parsed as ArrayData;
    if (!arrayData.parentArray) {
      return null;
    }

    const position = params.position;

    // Find which value the cursor is on
    for (let i = 0; i < arrayData.valueRanges.length; i++) {
      const valueRange = arrayData.valueRanges[i];
      if (
        position.character >= valueRange.start.character &&
        position.character <= valueRange.end.character
      ) {
        const field = arrayData.parentArray.fields[i];
        if (field) {
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

    return null;
  }
}
