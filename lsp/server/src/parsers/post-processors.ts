import { ToonLine, StructuredArray } from '../types';

/**
 * Interface for document post-processors
 */
export interface DocumentPostProcessor {
  /**
   * Process the parsed lines and modify them if necessary
   * @param lines The parsed lines
   * @param textLines The original text lines
   * @returns The modified lines
   */
  process(lines: ToonLine[], textLines: string[]): ToonLine[];
}

/**
 * Post-processor for structured arrays
 * Adds data lines for structured arrays
 */
export class StructuredArrayPostProcessor implements DocumentPostProcessor {
  process(lines: ToonLine[], textLines: string[]): ToonLine[] {
    const result: ToonLine[] = [];
    
    // We need to iterate through the lines and expand structured arrays
    // Since we're building a new array, we don't need to worry about index shifting in the original array
    // but we do need to be careful about the order
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      result.push(line);
      
      if (line.type === 'structured-array') {
        const structuredArray = line.parsed as StructuredArray;
        
        for (let j = 0; j < structuredArray.dataLines.length; j++) {
          const dataLine = structuredArray.dataLines[j];
          // The line number in dataLine is already correct (relative to the document)
          // because it was calculated during parsing based on the start line
          
          result.push({
            type: 'array-data',
            lineNumber: dataLine.lineNumber,
            content: textLines[dataLine.lineNumber],
            parsed: dataLine
          });
        }
      }
    }
    
    return result;
  }
}
