import { ArrayData } from "./array-data";
import { KeyValuePair } from "./key-value-pair";
import { SimpleArray } from "./simple-array";
import { StructuredArray } from "./structured-array";

/**
 * Parsed line in a toon document
 */
export interface ToonLine {
  type: 'key-value' | 'simple-array' | 'structured-array' | 'array-data' | 'empty';
  lineNumber: number;
  content: string;
  parsed?: KeyValuePair | SimpleArray | StructuredArray | ArrayData;
}