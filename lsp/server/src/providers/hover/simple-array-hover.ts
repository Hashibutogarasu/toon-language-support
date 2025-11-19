import { Hover, MarkupKind, TextDocumentPositionParams } from 'vscode-languageserver/node';
import { ToonLine, ToonDocument, SimpleArray } from '../../types';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { HoverProvider } from './hover-provider';

export class SimpleArrayHoverProvider implements HoverProvider {
  getHover(
    line: ToonLine,
    params: TextDocumentPositionParams,
    document: TextDocument,
    parsedDocument: ToonDocument
  ): Hover | null {
    if (line.type !== 'simple-array') {
      return null;
    }

    const simpleArray = line.parsed as SimpleArray;
    const position = params.position;

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

    return null;
  }
}
