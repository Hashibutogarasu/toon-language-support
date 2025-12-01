import * as vscode from 'vscode';
import { encode } from '@toon-format/toon';
import { getTargetPath } from '../utils/path-utils';

/**
 * Result of a conversion operation.
 */
export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

/**
 * Converts a JSON file to Toon format.
 * 
 * This command:
 * 1. Reads the source JSON file
 * 2. Parses the JSON content
 * 3. Encodes it to Toon format
 * 4. Prompts for overwrite confirmation if target exists
 * 5. Writes the Toon file
 * 6. Opens the newly created file in the editor
 * 
 * @param uri - The URI of the JSON file to convert (optional, uses active editor if not provided)
 * @returns A ConversionResult indicating success or failure
 */
export async function convertJsonToToon(uri?: vscode.Uri): Promise<ConversionResult> {
  // Get the source URI from parameter or active editor
  const sourceUri = uri ?? vscode.window.activeTextEditor?.document.uri;

  if (!sourceUri) {
    const error = 'No JSON file selected';
    vscode.window.showErrorMessage(error);
    return { success: false, error };
  }

  // Verify it's a JSON file
  if (!sourceUri.fsPath.endsWith('.json')) {
    const error = 'Selected file is not a JSON file';
    vscode.window.showErrorMessage(error);
    return { success: false, error };
  }

  try {
    // Read the source file
    const sourceContent = await vscode.workspace.fs.readFile(sourceUri);
    const jsonText = Buffer.from(sourceContent).toString('utf-8');

    // Parse the JSON content
    let jsonData: unknown;
    try {
      jsonData = JSON.parse(jsonText);
    } catch (parseError) {
      const error = `Invalid JSON syntax: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(error);
      return { success: false, error };
    }


    // Encode to Toon format
    const toonContent = encode(jsonData);

    // Calculate target path
    const targetPath = getTargetPath(sourceUri.fsPath, '.toon');
    const targetUri = vscode.Uri.file(targetPath);

    // Check if target file exists and prompt for overwrite
    try {
      await vscode.workspace.fs.stat(targetUri);
      // File exists, prompt for confirmation
      const choice = await vscode.window.showWarningMessage(
        `File "${targetPath}" already exists. Do you want to overwrite it?`,
        'Yes',
        'No'
      );

      if (choice !== 'Yes') {
        return { success: false, error: 'Conversion cancelled by user' };
      }
    } catch {
      // File doesn't exist, proceed with creation
    }

    // Write the Toon file
    await vscode.workspace.fs.writeFile(targetUri, Buffer.from(toonContent, 'utf-8'));

    // Open the newly created file in the editor
    const document = await vscode.workspace.openTextDocument(targetUri);
    await vscode.window.showTextDocument(document);

    return { success: true, outputPath: targetPath };
  } catch (error) {
    const errorMessage = `Failed to convert JSON to Toon: ${error instanceof Error ? error.message : 'Unknown error'}`;
    vscode.window.showErrorMessage(errorMessage);
    return { success: false, error: errorMessage };
  }
}
