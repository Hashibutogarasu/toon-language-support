import { Range } from "./range";
import { StructuredArray } from "./structured-array";

/**
 * Data row in a structured array
 */
export interface ArrayData {
  lineNumber: number;
  values: string[];
  valueRanges: Range[];
  parentArray?: StructuredArray;
}