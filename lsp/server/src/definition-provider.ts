import { Position, Location } from 'vscode-languageserver/node';
import { ArrayData, Field, ToonDocument } from './types';

/**
 * Get the field definition for a value at a given position in a structured array
 */
export function getFieldDefinitionForValue(
  position: Position,
  document: ToonDocument
): Field | null {
  try {
    // Find the line at the given position
    const line = document.lines.find(l => l.lineNumber === position.line);

    if (!line || line.type !== 'array-data') {
      return null;
    }

    const arrayData = line.parsed as ArrayData;
    if (!arrayData.parentArray) {
      return null;
    }

    // Find which value the cursor is on
    for (let i = 0; i < arrayData.valueRanges.length; i++) {
      const valueRange = arrayData.valueRanges[i];
      if (
        position.character >= valueRange.start.character &&
        position.character <= valueRange.end.character
      ) {
        // Return the corresponding field definition
        const fields = arrayData.parentArray.fields;
        if (i < fields.length) {
          return fields[i];
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to find field definition:', error);
    return null;
  }
}

/**
 * Find the location of a field definition for a value at the given position
 */
export function findFieldDefinitionLocation(
  position: Position,
  document: ToonDocument,
  documentUri: string
): Location | null {
  try {
    const field = getFieldDefinitionForValue(position, document);

    if (!field) {
      return null;
    }

    return {
      uri: documentUri,
      range: field.range
    };
  } catch (error) {
    console.error('Failed to find field definition location:', error);
    return null;
  }
}
