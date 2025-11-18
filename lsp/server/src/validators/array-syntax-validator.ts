import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ToonDocument } from '../parser';
import { DiagnosticValidator, DiagnosticMessages } from './diagnostic-validator';

/**
 * Validator for array declaration syntax
 * Validates Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class ArraySyntaxValidator implements DiagnosticValidator {
  validate(document: ToonDocument, textDocument: TextDocument): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const line of document.lines) {
      try {
        // Only validate lines that might be array declarations
        // Skip empty lines and array data lines
        if (line.type === 'empty' || line.type === 'array-data') {
          continue;
        }

        const content = line.content.trim();

        // Check if line contains array declaration pattern (has '[')
        if (!content.includes('[')) {
          continue;
        }

        // Check for opening bracket
        const openBracketIndex = content.indexOf('[');
        if (openBracketIndex === -1) {
          continue;
        }

        // Requirement 5.1: Check for closing bracket
        const closeBracketIndex = content.indexOf(']', openBracketIndex);
        if (closeBracketIndex === -1) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
              start: { line: line.lineNumber, character: line.content.indexOf('[') },
              end: { line: line.lineNumber, character: line.content.length }
            },
            message: DiagnosticMessages.MISSING_CLOSING_BRACKET,
            source: 'toon'
          });
          continue;
        }

        // Extract size string between brackets
        const sizeStr = content.substring(openBracketIndex + 1, closeBracketIndex).trim();

        // Requirement 5.2: Check if size is specified
        if (sizeStr.length === 0) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
              start: { line: line.lineNumber, character: line.content.indexOf('[') },
              end: { line: line.lineNumber, character: line.content.indexOf(']') + 1 }
            },
            message: DiagnosticMessages.MISSING_ARRAY_SIZE,
            source: 'toon'
          });
          continue;
        }

        // Requirement 5.3: Check if size is numeric
        if (!/^\d+$/.test(sizeStr)) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
              start: { line: line.lineNumber, character: line.content.indexOf('[') },
              end: { line: line.lineNumber, character: line.content.indexOf(']') + 1 }
            },
            message: DiagnosticMessages.INVALID_ARRAY_SIZE,
            source: 'toon'
          });
          continue;
        }

        // Requirement 5.4: Check for structured array brace syntax
        // Only check if this looks like a structured array (has '{')
        const openBraceIndex = content.indexOf('{', closeBracketIndex);
        if (openBraceIndex !== -1) {
          const closeBraceIndex = content.indexOf('}', openBraceIndex);
          if (closeBraceIndex === -1) {
            diagnostics.push({
              severity: DiagnosticSeverity.Error,
              range: {
                start: { line: line.lineNumber, character: line.content.indexOf('{') },
                end: { line: line.lineNumber, character: line.content.length }
              },
              message: DiagnosticMessages.MISSING_CLOSING_BRACE,
              source: 'toon'
            });
            continue;
          }
        }

        // Requirement 5.5: No error when syntax is correct (implicit - no diagnostic added)
      } catch (error) {
        console.error(`ArraySyntaxValidator error at line ${line.lineNumber}:`, error);
      }
    }

    return diagnostics;
  }
}
