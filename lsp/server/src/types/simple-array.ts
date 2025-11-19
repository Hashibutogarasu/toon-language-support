import { Range } from "./range";

/**
 * Simple array (e.g., "friends[3]: ana,luis,sam")
 */
export interface SimpleArray {
  name: string;
  nameRange: Range;
  declaredSize: number;
  sizeRange: Range;
  values: string[];
  valueRanges: Range[];
}