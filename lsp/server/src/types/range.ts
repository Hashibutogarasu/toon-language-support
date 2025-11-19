/**
 * Range representing a position in the document
 */
export interface Range {
  start: { line: number; character: number };
  end: { line: number; character: number };
}