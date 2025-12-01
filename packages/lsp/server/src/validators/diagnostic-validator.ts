/**
 * Diagnostic messages used across validators
 */
export const DiagnosticMessages = {
  ARRAY_SIZE_INSUFFICIENT: '配列の要素数が不足しています（宣言: {declared}, 実際: {actual}）',
  ARRAY_SIZE_EXCEEDED: '配列の要素数が超過しています（宣言: {declared}, 実際: {actual}）',
  ARRAY_ROWS_MISMATCH: '配列の行数が宣言と一致しません（宣言: {declared}, 実際: {actual}）',
  FIELD_COUNT_INSUFFICIENT: 'フィールド数が不足しています（期待: {expected}, 実際: {actual}）',
  FIELD_COUNT_EXCEEDED: 'フィールド数が超過しています（期待: {expected}, 実際: {actual}）',
  MISSING_COLON: 'コロンが見つかりません',
  MISSING_VALUE: '値が指定されていません',
  MISSING_KEY: 'キーが指定されていません',
  MISSING_CLOSING_BRACKET: '閉じ角括弧が見つかりません',
  MISSING_ARRAY_SIZE: '配列サイズが指定されていません',
  INVALID_ARRAY_SIZE: '配列サイズは数値である必要があります',
  MISSING_CLOSING_BRACE: '閉じ波括弧が見つかりません'
};
