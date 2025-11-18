import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ToonDocument } from '../parser';
import { DiagnosticValidator, DiagnosticMessages } from './diagnostic-validator';

/**
 * Validator for key-value pair syntax
 * Validates Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class KeyValuePairValidator implements DiagnosticValidator {
  validate(document: ToonDocument, textDocument: TextDocument): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (let i = 0; i < document.lines.length; i++) {
      const line = document.lines[i];

      try {
        // Skip truly empty lines (no content)
        if (line.content.trim().length === 0) {
          continue;
        }

        // Requirement 4.5: Skip array declarations and array data
        if (line.type === 'simple-array' || line.type === 'structured-array' || line.type === 'array-data') {
          continue;
        }

        // Check if line has a colon
        const colonIndex = line.content.indexOf(':');

        // Requirement 4.1: Missing colon
        // If line is marked as 'empty' but has content, it means it didn't match any pattern
        // This could be a key-value pair with missing colon
        if (colonIndex === -1) {
          if (line.type === 'empty' && line.content.trim().length > 0) {
            diagnostics.push({
              severity: DiagnosticSeverity.Error,
              range: {
                start: { line: line.lineNumber, character: 0 },
                end: { line: line.lineNumber, character: line.content.length }
              },
              message: DiagnosticMessages.MISSING_COLON,
              source: 'toon'
            });
          }
          continue;
        }

        // If we have a colon, check for empty key or value
        // This applies to both 'key-value' type and 'empty' type with colon
        const keyPart = line.content.substring(0, colonIndex).trim();
        const valuePart = line.content.substring(colonIndex + 1).trim();

        // Requirement 4.3: Empty key
        if (keyPart.length === 0) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
              start: { line: line.lineNumber, character: 0 },
              end: { line: line.lineNumber, character: colonIndex }
            },
            message: DiagnosticMessages.MISSING_KEY,
            source: 'toon'
          });
        }

        // Requirement 4.2: Empty value
        // Check if the next line is indented - if so, this is a block structure
        if (valuePart.length === 0) {
          const nextLine = i + 1 < document.lines.length ? document.lines[i + 1] : null;
          const hasIndentedNextLine = nextLine &&
            nextLine.content.trim().length > 0 &&
            this.isIndented(nextLine.content, line.content);

          // Only report error if there's no indented next line (not a block structure)
          if (!hasIndentedNextLine) {
            diagnostics.push({
              severity: DiagnosticSeverity.Error,
              range: {
                start: { line: line.lineNumber, character: colonIndex + 1 },
                end: { line: line.lineNumber, character: line.content.length }
              },
              message: DiagnosticMessages.MISSING_VALUE,
              source: 'toon'
            });
          }
        }

        // Requirement 4.4: No error when syntax is correct (implicit - no diagnostic added)
      } catch (error) {
        console.error(`KeyValuePairValidator error at line ${line.lineNumber}:`, error);
      }
    }

    return diagnostics;
  }

  /**
   * Check if a line is indented relative to another line
   */
  private isIndented(line: string, referenceLine: string): boolean {
    const lineIndent = this.getIndentLevel(line);
    const referenceIndent = this.getIndentLevel(referenceLine);
    return lineIndent > referenceIndent;
  }

  /**
   * Get the indentation level of a line (number of leading spaces)
   */
  private getIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }
}
