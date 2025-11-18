import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ToonDocument, StructuredArray, ArrayData } from '../parser';
import { DiagnosticValidator, DiagnosticMessages } from './diagnostic-validator';

/**
 * Validator for structured array field count mismatches
 * Validates Requirements 3.1, 3.2, 3.3, 3.4
 */
export class StructuredArrayFieldValidator implements DiagnosticValidator {
  validate(document: ToonDocument, textDocument: TextDocument): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const line of document.lines) {
      try {
        // Check structured array data lines
        if (line.type === 'array-data' && line.parsed) {
          const arrayData = line.parsed as ArrayData;
          
          // Only validate if we have a parent array reference
          if (arrayData.parentArray) {
            const expectedFieldCount = arrayData.parentArray.fields.length;
            const actualFieldCount = arrayData.values.length;

            // Check if field count matches
            if (actualFieldCount !== expectedFieldCount) {
              let message: string;
              if (actualFieldCount < expectedFieldCount) {
                // Requirement 3.1: Field count insufficient
                message = DiagnosticMessages.FIELD_COUNT_INSUFFICIENT
                  .replace('{expected}', expectedFieldCount.toString())
                  .replace('{actual}', actualFieldCount.toString());
              } else {
                // Requirement 3.2: Field count exceeded
                message = DiagnosticMessages.FIELD_COUNT_EXCEEDED
                  .replace('{expected}', expectedFieldCount.toString())
                  .replace('{actual}', actualFieldCount.toString());
              }

              // Requirement 3.4: Each inconsistent row gets its own diagnostic
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
            // Requirement 3.3: No error when field counts match (implicit - no diagnostic added)
          }
        }
      } catch (error) {
        console.error(`StructuredArrayFieldValidator error at line ${line.lineNumber}:`, error);
      }
    }

    return diagnostics;
  }
}
