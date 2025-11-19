import { Range } from "./range";

/**
 * Field definition in a structured array
 */
export interface Field {
  name: string;
  range: Range;
  index: number;
}