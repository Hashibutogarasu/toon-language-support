import * as vscode from 'vscode';
import { decode } from '@toon-format/toon';
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
 * Converts a Toon file to JSON format.
 * 
 * This command:
 * 1. Reads the source Toon file
 * 2. Parses the Toon content using decode()
 * 3. Converts it to JSON with 2-space indentation
 * 4. Prompts for overwrite confirmation if target exists
 * 5. Writes the JSON file
 * 6. Opens the newly created file in the editor
 * 
 * @param uri - The URI of the Toon file to convert (optional, uses active editor if not provided)
 * @returns A ConversionResult indicating success or failure
 */
export async function convertToonToJson(uri?: vscode.Uri): Promise<ConversionResult> {
  // Get the source URI from parameter or active editor
  const sourceUri = uri ?? vscode.window.activeTextEditor?.document.uri;

  if (!sourceUri) {
    const error = 'No Toon file selected';
    vscode.window.showErrorMessage(error);
    return { success: false, error };
  }

  // Verify it's a Toon file
  if (!sourceUri.fsPath.endsWith('.toon')) {
    const error = 'Selected file is not a Toon file';
    vscode.window.showErrorMessage(error);
    return { success: false, error };
  }

  try {
    // Read the source file
    const sourceContent = await vscode.workspace.fs.readFile(sourceUri);
    const toonText = Buffer.from(sourceContent).toString('utf-8');

    // Parse the Toon content
    let jsonData: unknown;
    try {
      jsonData = decode(toonText);
    } catch (parseError) {
      const error = `Invalid Toon syntax: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(error);
      return { success: false, error };
    }

    // Convert to JSON with 2-space indentation (Requirement 3.7)
    const jsonContent = JSON.stringify(jsonData, null, 2);

    // Calculate target path
    const targetPath = getTargetPath(sourceUri.fsPath, '.json');
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

    // Write the JSON file
    await vscode.workspace.fs.writeFile(targetUri, Buffer.from(jsonContent, 'utf-8'));

    // Open the newly created file in the editor
    const document = await vscode.workspace.openTextDocument(targetUri);
    await vscode.window.showTextDocument(document);

    return { success: true, outputPath: targetPath };
  } catch (error) {
    const errorMessage = `Failed to convert Toon to JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
    vscode.window.showErrorMessage(errorMessage);
    return { success: false, error: errorMessage };
  }
}
