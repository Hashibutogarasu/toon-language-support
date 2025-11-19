import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticValidator, DiagnosticMessages } from './diagnostic-validator';
import { SimpleArray, StructuredArray, ToonDocument } from '../types';

/**
 * Validator for array size mismatches
 */
export class ArraySizeValidator implements DiagnosticValidator {
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
