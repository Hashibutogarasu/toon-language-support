import { Range } from "./range";

/**
 * Key-value pair (e.g., "task: Our favorite hikes")
 */
export interface KeyValuePair {
  key: string;
  keyRange: Range;
  value: string;
  valueRange: Range;
  colonPosition: number;
}