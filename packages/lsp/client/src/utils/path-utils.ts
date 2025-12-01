import * as path from 'path';

/**
 * Transforms a source file path to a target path with a different extension.
 * 
 * @param sourcePath - The source file path (e.g., "file.json" or "/path/to/file.toon")
 * @param targetExtension - The target extension including the dot (e.g., ".toon" or ".json")
 * @returns The target path with the new extension
 */
export function getTargetPath(sourcePath: string, targetExtension: string): string {
    const dir = path.dirname(sourcePath);
    const ext = path.extname(sourcePath);
    const baseName = path.basename(sourcePath, ext);
    
    // Handle files with no extension - just append the target extension
    if (!ext) {
        return path.join(dir, baseName + targetExtension);
    }
    
    // Replace the extension with the target extension
    return path.join(dir, baseName + targetExtension);
}
