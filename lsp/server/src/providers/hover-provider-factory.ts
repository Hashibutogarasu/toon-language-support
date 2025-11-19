import { HoverProvider } from './hover/hover-provider';
import { ArrayDataHoverProvider } from './hover/array-data-hover';
import { StructuredArrayHoverProvider } from './hover/structured-array-hover';
import { KeyValuePairHoverProvider } from './hover/key-value-hover';
import { SimpleArrayHoverProvider } from './hover/simple-array-hover';

export class HoverProviderFactory {
  private providers: Map<string, HoverProvider>;

  constructor() {
    this.providers = new Map();
    this.register('array-data', new ArrayDataHoverProvider());
    this.register('structured-array', new StructuredArrayHoverProvider());
    this.register('key-value', new KeyValuePairHoverProvider());
    this.register('simple-array', new SimpleArrayHoverProvider());
  }

  register(type: string, provider: HoverProvider) {
    this.providers.set(type, provider);
  }

  getProvider(type: string): HoverProvider | undefined {
    return this.providers.get(type);
  }
}
