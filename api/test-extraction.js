import parserService from './src/services/parser/index.js';
import extractionService from './src/services/extraction/index.js';

const testFiles = [
  {
    path: 'source/index.ts',
    language: 'typescript',
    content: `import { foo } from './types';
import { bar } from './utils';

export function main() {
  return foo + bar;
}`
  },
  {
    path: 'source/types.ts',
    language: 'typescript',
    content: `export const foo = 'hello';
export type MyType = string;`
  },
  {
    path: 'source/utils.ts',
    language: 'typescript',
    content: `export const bar = 'world';`
  }
];

console.log('🧪 Testing extraction pipeline...\n');

// Step 1: Parse files
console.log('📝 Step 1: Parsing files...');
const parseResult = await parserService.parseFiles(testFiles);

console.log('Parse Results:');
console.log('  Total files:', testFiles.length);
console.log('  Successful parses:', parseResult.results.length);
console.log('  Failed parses:', parseResult.errors?.length || 0);

if (parseResult.errors?.length > 0) {
  console.log('\n❌ Parse failures detected!');
  parseResult.errors.forEach((e) => {
    const err = e.error?.message || e.error;
    console.log(`  - ${e.path}: ${err}`);
  });
}

// Step 2: Extract entities and relationships
console.log('\n🔍 Step 2: Extracting entities and relationships...');
const extractionResult = await extractionService.extract(parseResult.results);

console.log('\nExtraction Results:');
console.log('  Success:', extractionResult.success);
console.log('  Entities (flat):', extractionResult.entities?.length || 0);
console.log('  Relationships:', extractionResult.relationships?.length || 0);

if (extractionResult.entitiesGrouped) {
  console.log('\nEntities by type:');
  console.log('  Files:', extractionResult.entitiesGrouped.files?.length || 0);
  console.log('  Functions:', extractionResult.entitiesGrouped.functions?.length || 0);
  console.log('  Classes:', extractionResult.entitiesGrouped.classes?.length || 0);
  console.log('  Imports:', extractionResult.entitiesGrouped.imports?.length || 0);
  console.log('  Exports:', extractionResult.entitiesGrouped.exports?.length || 0);
  console.log('  Variables:', extractionResult.entitiesGrouped.variables?.length || 0);
}

if (extractionResult.statistics) {
  console.log('\nStatistics:');
  console.log('  Entity stats:', JSON.stringify(extractionResult.statistics.entities, null, 2));
  console.log('  Relationship stats:', JSON.stringify(extractionResult.statistics.relationships, null, 2));
}

// Step 3: Show sample relationships
if (extractionResult.relationships && extractionResult.relationships.length > 0) {
  console.log('\n✅ Sample relationships (first 5):');
  extractionResult.relationships.slice(0, 5).forEach((rel, i) => {
    console.log(`\n${i + 1}. Type: ${rel.type}`);
    console.log(`   SourceId: ${rel.sourceId}`);
    console.log(`   TargetId: ${rel.targetId}`);
    if (rel.metadata) {
      console.log(`   Metadata:`, rel.metadata);
    }
  });
} else {
  console.log('\n❌ NO RELATIONSHIPS EXTRACTED!');
  console.log('This indicates the relationship extraction is failing.');
}

// Step 4: Show sample entities
if (extractionResult.entities && extractionResult.entities.length > 0) {
  console.log('\n✅ Sample entities (first 5):');
  extractionResult.entities.slice(0, 5).forEach((entity, i) => {
    console.log(`\n${i + 1}. ${entity.type}: ${entity.name}`);
    console.log(`   ID: ${entity.id}`);
    console.log(`   File: ${entity.filePath}`);
  });
} else {
  console.log('\n❌ NO ENTITIES EXTRACTED!');
}

console.log('\n✅ Test complete!');

// Made with Bob
