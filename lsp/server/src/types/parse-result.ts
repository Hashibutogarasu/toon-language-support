import { ArrayData } from "./array-data";
import { KeyValuePair } from "./key-value-pair";
import { SimpleArray } from "./simple-array";
import { StructuredArray } from "./structured-array";

/**
 * Result of parsing a line (or multiple lines)
 */
export interface ParseResult {
  parsed: KeyValuePair | SimpleArray | StructuredArray | ArrayData;
  linesConsumed: number;
  type: 'key-value' | 'simple-array' | 'structured-array' | 'array-data';
}