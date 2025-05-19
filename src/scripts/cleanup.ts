// This script helps identify and clean up unused imports and variables
// Run with: npx ts-node src/scripts/cleanup.ts

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const projectRoot = path.resolve(__dirname, '../../');
const tsConfigPath = path.join(projectRoot, 'tsconfig.json');

function findUnusedImportsAndVariables(filePath: string) {
  const sourceFile = ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, 'utf-8'),
    ts.ScriptTarget.Latest,
    true
  );

  const unusedNodes: ts.Node[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) || ts.isVariableDeclaration(node)) {
      const symbol = (node as any).symbol;
      if (symbol && !symbol.references) {
        unusedNodes.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return unusedNodes;
}

function processFile(filePath: string) {
  console.log(`Processing ${filePath}...`);
  const unusedNodes = findUnusedImportsAndVariables(filePath);
  
  if (unusedNodes.length > 0) {
    console.log('Found unused declarations:');
    unusedNodes.forEach(node => {
      console.log(`- ${node.getText()}`);
    });
  }
}

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      processFile(filePath);
    }
  });
}

// Start processing from src directory
walkDir(path.join(projectRoot, 'src')); 