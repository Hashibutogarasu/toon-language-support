import { ArrayData } from "./array-data";
import { Field } from "./field";
import { Range } from "./range";

/**
 * Structured array (e.g., "hikes[3]{id,name,distance}")
 */
export interface StructuredArray {
  name: string;
  nameRange: Range;
  declaredSize: number;
  sizeRange: Range;
  fields: Field[];
  dataLines: ArrayData[];
}