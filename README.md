# Toon Language Support

A Visual Studio Code extension providing comprehensive language support for Toon files, including syntax highlighting, hover information, jump-to-definition, and real-time error detection.

## Overview

**Toon** stands for **Token-Oriented Object Notation** - a structured data format language optimized for AI systems. Toon provides a clean, readable syntax for representing configuration data, metadata, and structured information in a way that's both human-friendly and ideal for AI-driven workflows.

Toon is designed to be simple yet powerful, supporting three main syntax patterns: key-value pairs for configuration, simple arrays with size validation, and structured arrays for tabular data with typed columns.

## Features

### Language Syntax

Toon supports three primary syntax patterns for organizing data:

#### Key-Value Pairs

Simple key-value pairs for configuration and metadata. Perfect for storing context, settings, and properties.

```toon
context:
  task: Our favorite hikes together
  location: Boulder
  season: spring_2025
```

**Use case**: Configuration files, metadata, simple data structures

#### Simple Arrays

Arrays with explicit size declarations and comma-separated values. The extension validates that the number of values matches the declared size.

```toon
friends[3]: ana,luis,sam
```

**Use case**: Lists of items where size validation is important

#### Structured Arrays

Tabular data with field definitions and multi-line data rows. Each row must have values matching the declared fields.

```toon
hikes[3]{id,name,distanceKm,elevationGain,companion,wasSunny}:
  1,Blue Lake Trail,7.5,320,ana,true
  2,Ridge Overlook,9.2,540,luis,false
  3,Wildflower Loop,5.1,180,sam,true
```

**Use case**: Structured data, tables, records with multiple fields

### Extension Capabilities

#### Syntax Highlighting

The extension automatically recognizes `.toon` files and provides color coding for:

- Keys and field names
- Values and data
- Array declarations and sizes
- Structural elements (brackets, braces, colons)

#### Hover Information

Hover over elements in your Toon files to see contextual information:

- **Structured array values**: Displays the field name for each value
- **Array elements**: Shows index information
- **Keys**: Displays key information for key-value pairs

Simply hover your mouse over any element to see its details.

#### Jump to Definition

Navigate quickly from structured array data values to their field definitions:

- **F12**: Jump to definition
- **Ctrl+Click** (Cmd+Click on macOS): Jump to definition

This feature works with structured arrays, allowing you to jump from a data value back to the field declaration.

#### Error Detection

The extension provides real-time validation with four specialized validators:

**ArraySizeValidator**

- Detects when the number of array values doesn't match the declared size
- Reports both insufficient and exceeded array sizes
- Works for both simple arrays and structured array row counts

**StructuredArrayFieldValidator**

- Validates that each data row has the correct number of fields
- Detects missing fields (insufficient count)
- Detects extra fields (exceeded count)
- Each inconsistent row gets its own diagnostic

**KeyValuePairValidator**

- Ensures key-value pairs have proper syntax
- Detects missing colons
- Detects empty keys or values
- Validates key-value pair structure

**ArraySyntaxValidator**

- Validates array declaration syntax
- Checks for missing closing brackets
- Ensures array size is specified
- Validates that size is numeric
- Checks structured array brace syntax

All errors are displayed inline with red squiggly underlines and appear in the Problems panel.

## Getting Started

### Installation

1. Open Visual Studio Code
2. Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X on macOS)
3. Search for "Toon Language Support"
4. Click Install

### Usage

1. Create a new file with the `.toon` extension
2. Start writing Toon syntax - syntax highlighting will activate automatically
3. Use hover, jump-to-definition, and error detection features as you work
4. Check the Problems panel for any validation errors

## Examples

Here's a complete example demonstrating all Toon features:

```toon
context:
  task: Our favorite hikes together
  location: Boulder
  season: spring_2025

friends[3]: ana,luis,sam

hikes[3]{id,name,distanceKm,elevationGain,companion,wasSunny}:
  1,Blue Lake Trail,7.5,320,ana,true
  2,Ridge Overlook,9.2,540,luis,false
  3,Wildflower Loop,5.1,180,sam,true
```

More examples can be found in the `example/` directory of this repository:

- `simple.toon` - Key-value pairs
- `array.toon` - Simple arrays
- `array_with_keys.toon` - Structured arrays
