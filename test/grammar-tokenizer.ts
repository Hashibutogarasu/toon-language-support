import * as fs from 'fs';
import * as path from 'path';

interface Grammar {
  scopeName: string;
  patterns: Pattern[];
  repository: Record<string, RepositoryItem>;
}

interface Pattern {
  include?: string;
  match?: string;
  name?: string;
  captures?: Record<string, { name: string }>;
}

interface RepositoryItem {
  name?: string;
  match?: string;
  patterns?: Pattern[];
  captures?: Record<string, { name?: string; patterns?: Pattern[] }>;
}

interface Token {
  text: string;
  scopes: string[];
}

export class GrammarTokenizer {
  private grammar: Grammar;

  constructor(grammarPath: string) {
    const grammarContent = fs.readFileSync(grammarPath, 'utf-8');
    this.grammar = JSON.parse(grammarContent);
  }

  /**
   * Tokenize a single line of text using the grammar
   */
  tokenizeLine(line: string): Token[] {
    const tokens: Token[] = [];
    
    // First try to match top-level patterns (including indented ones)
    const topLevelMatch = this.matchTopLevelPattern(line);
    if (topLevelMatch) {
      return topLevelMatch;
    }
    
    // Check if this is a data row (starts with whitespace and doesn't match any pattern)
    if (/^\s+/.test(line)) {
      // This is a data row for a structured array
      return this.tokenizeDataRow(line);
    }
    
    // Fall back to value-level matching
    let remaining = line;

    while (remaining.length > 0) {
      const match = this.findMatch(remaining);
      
      if (match) {
        if (match.start > 0) {
          // Add unmatched text as plain token
          tokens.push({
            text: remaining.substring(0, match.start),
            scopes: ['source.toon']
          });
          remaining = remaining.substring(match.start);
        }
        
        tokens.push({
          text: match.text,
          scopes: ['source.toon', match.scope]
        });
        
        remaining = remaining.substring(match.text.length);
      } else {
        // No match found, treat rest as plain text
        if (remaining.length > 0) {
          tokens.push({
            text: remaining,
            scopes: ['source.toon']
          });
        }
        break;
      }
    }

    return tokens;
  }

  private tokenizeDataRow(line: string): Token[] {
    const tokens: Token[] = [];
    
    // Extract leading whitespace
    const wsMatch = line.match(/^(\s+)/);
    if (wsMatch) {
      tokens.push({
        text: wsMatch[1],
        scopes: ['source.toon']
      });
    }
    
    // Tokenize the rest as a value list
    const content = line.trim();
    const valueTokens = this.tokenizeValueList(content);
    tokens.push(...valueTokens);
    
    return tokens;
  }

  private matchTopLevelPattern(line: string): Token[] | null {
    // Try patterns in priority order: structured-array, simple-array, then key-value-pair
    const patternNames = ['structured-array', 'simple-array', 'key-value-pair'];
    
    for (const patternName of patternNames) {
      const pattern = this.grammar.repository[patternName];
      
      // Handle structured-array with begin-end pattern
      if (patternName === 'structured-array' && pattern && (pattern as any).begin) {
        const beginRegex = new RegExp((pattern as any).begin);
        const match = line.match(beginRegex);
        
        if (match && (pattern as any).beginCaptures) {
          const tokens: Token[] = [];
          const captures = (pattern as any).beginCaptures;
          
          // Process captures
          for (let i = 1; i < match.length; i++) {
            if (match[i] !== undefined) {
              const capture = captures[i.toString()];
              if (capture) {
                if (capture.name) {
                  tokens.push({
                    text: match[i],
                    scopes: ['source.toon', capture.name]
                  });
                } else if (capture.patterns) {
                  // Process field definitions
                  const fieldTokens = this.tokenizeFields(match[i]);
                  tokens.push(...fieldTokens);
                }
              }
            }
          }
          
          return tokens;
        }
      }
      
      // Handle regular match patterns
      if (pattern && (pattern as any).match) {
        const regex = new RegExp((pattern as any).match);
        const match = line.match(regex);
        
        if (match && (pattern as any).captures) {
          const tokens: Token[] = [];
          
          // Process captures
          for (let i = 1; i < match.length; i++) {
            if (match[i] !== undefined) {
              const capture = (pattern as any).captures[i.toString()];
              if (capture) {
                if (capture.name) {
                  tokens.push({
                    text: match[i],
                    scopes: ['source.toon', capture.name]
                  });
                } else if (capture.patterns) {
                  // Process value part with value patterns
                  const valueTokens = patternName === 'simple-array' 
                    ? this.tokenizeValueList(match[i])
                    : this.tokenizeValue(match[i]);
                  tokens.push(...valueTokens);
                }
              }
            }
          }
          
          return tokens;
        }
      }
    }
    
    return null;
  }

  private tokenizeFields(text: string): Token[] {
    const tokens: Token[] = [];
    let remaining = text.trim();

    while (remaining.length > 0) {
      // Check for comma
      if (remaining[0] === ',') {
        tokens.push({
          text: ',',
          scopes: ['source.toon', 'punctuation.separator.comma.toon']
        });
        remaining = remaining.substring(1).trim();
        continue;
      }

      // Try to match a field name (word characters)
      const fieldMatch = remaining.match(/^\w+/);
      if (fieldMatch) {
        tokens.push({
          text: fieldMatch[0],
          scopes: ['source.toon', 'variable.parameter.toon']
        });
        remaining = remaining.substring(fieldMatch[0].length).trim();
      } else {
        // No match, consume one character
        tokens.push({
          text: remaining[0],
          scopes: ['source.toon']
        });
        remaining = remaining.substring(1);
      }
    }

    return tokens;
  }

  private tokenizeValue(text: string): Token[] {
    const tokens: Token[] = [];
    let remaining = text.trim();

    while (remaining.length > 0) {
      const match = this.findValueMatch(remaining);
      
      if (match && match.start === 0) {
        tokens.push({
          text: match.text,
          scopes: ['source.toon', match.scope]
        });
        remaining = remaining.substring(match.text.length).trim();
      } else {
        // No match at start, consume one character
        tokens.push({
          text: remaining[0],
          scopes: ['source.toon']
        });
        remaining = remaining.substring(1);
      }
    }

    return tokens;
  }

  private tokenizeValueList(text: string): Token[] {
    const tokens: Token[] = [];
    let remaining = text.trim();

    while (remaining.length > 0) {
      // Check for comma
      if (remaining[0] === ',') {
        tokens.push({
          text: ',',
          scopes: ['source.toon', 'punctuation.separator.comma.toon']
        });
        remaining = remaining.substring(1).trim();
        continue;
      }

      // Try to match a value
      const match = this.findValueMatch(remaining);
      
      if (match && match.start === 0) {
        tokens.push({
          text: match.text,
          scopes: ['source.toon', match.scope]
        });
        remaining = remaining.substring(match.text.length).trim();
      } else {
        // No match at start, consume one character
        tokens.push({
          text: remaining[0],
          scopes: ['source.toon']
        });
        remaining = remaining.substring(1);
      }
    }

    return tokens;
  }

  private findValueMatch(text: string): { text: string; scope: string; start: number } | null {
    // Try to match value patterns in priority order: boolean, number, string
    // Boolean and number should be tried before string to avoid partial matches
    const patterns = ['boolean', 'number', 'string'];
    
    for (const patternName of patterns) {
      const pattern = this.grammar.repository[patternName];
      if (pattern && pattern.match) {
        const regex = new RegExp(`^${pattern.match}`);
        const match = text.match(regex);
        
        if (match) {
          return {
            text: match[0],
            scope: pattern.name || '',
            start: 0
          };
        }
      }
    }
    
    return null;
  }

  private findMatch(text: string): { text: string; scope: string; start: number } | null {
    // Try to match against repository patterns
    const patterns = ['number', 'boolean', 'string', 'escape-sequence'];
    
    for (const patternName of patterns) {
      const pattern = this.grammar.repository[patternName];
      if (pattern && pattern.match) {
        const regex = new RegExp(pattern.match);
        const match = text.match(regex);
        
        if (match && match.index !== undefined) {
          return {
            text: match[0],
            scope: pattern.name || '',
            start: match.index
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Check if a text matches a specific pattern in the grammar
   */
  matchesPattern(text: string, patternName: string): boolean {
    const pattern = this.grammar.repository[patternName];
    if (!pattern || !pattern.match) {
      return false;
    }
    
    const regex = new RegExp(`^${pattern.match}$`);
    return regex.test(text);
  }

  /**
   * Get the scope name for a matched pattern
   */
  getScopeForPattern(patternName: string): string | undefined {
    const pattern = this.grammar.repository[patternName];
    return pattern?.name;
  }
}
