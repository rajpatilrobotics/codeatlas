# CodeAtlas Debugging Guide for Cursor

## 🎯 Current Critical Issue

**Problem**: Relationships are not persisting to the database despite successful extraction.

**Status**: 
- ✅ Repository ingestion working
- ✅ File parsing working (7 files parsed)
- ✅ Entity extraction working (682 entities extracted)
- ❌ **Relationship persistence FAILING (0 relationships saved)**

**Root Cause Identified**: Field name mismatch in relationship data structure.

---

## 🏗️ Current Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Backend**: Express.js API
- **Database**: PostgreSQL (Neon) via Prisma ORM
- **Queue**: BullMQ with Redis (Upstash)
- **AI**: DeepSeek API
- **Embeddings**: Qdrant vector database
- **Parser**: Babel (JavaScript/TypeScript AST parsing)

### Directory Structure
```
devdock/
├── api/                          # Backend Express API
│   ├── src/
│   │   ├── server.js            # Main Express server
│   │   ├── workers/
│   │   │   └── repoAnalysisWorker.js  # BullMQ worker (CRITICAL FILE)
│   │   ├── services/
│   │   │   ├── ingestion/       # Git cloning & file filtering
│   │   │   ├── parser/          # Babel AST parsing
│   │   │   ├── extraction/      # Entity & relationship extraction
│   │   │   │   ├── entityExtractor.js
│   │   │   │   └── relationshipExtractor.js  # PROBLEM FILE
│   │   │   ├── database/        # Prisma database operations
│   │   │   └── graph/           # Graph analysis
│   │   ├── controllers/         # API route handlers
│   │   └── routes/              # Express routes
│   └── prisma/
│       └── schema.prisma        # Database schema
├── app/                         # Next.js frontend
│   └── dashboard/               # Dashboard pages
└── lib/
    └── api.js                   # Frontend API client
```

---

## 🔍 Data Pipeline Flow

### 1. Repository Ingestion (✅ Working)
```
User submits GitHub URL
  → Clone repository to api/repos/
  → Filter files (exclude node_modules, .git, etc.)
  → Store in database
```

### 2. File Parsing (✅ Working)
```
Filtered files
  → Babel parser creates AST
  → Extract functions, classes, imports, exports, variables
  → Returns parse results with entities
```

### 3. Entity Extraction (✅ Working)
```
Parse results
  → entityExtractor.js processes AST data
  → Creates entity objects with IDs
  → Normalizes and groups entities
  → Returns: { files, functions, classes, imports, exports, variables }
```

**Entity ID Format**:
- Files: `file:source_index_ts` (path with underscores)
- Functions: `function:source_index_ts:functionName`
- Imports: `import:source_index_ts:__types_ts`

### 4. Relationship Extraction (⚠️ BROKEN)
```
Entities
  → relationshipExtractor.js analyzes connections
  → Creates relationship objects
  → ❌ PROBLEM: Uses wrong field names
```

### 5. Database Persistence (❌ FAILING)
```
Entities + Relationships
  → Worker maps to database format
  → Batch insert to PostgreSQL
  → ❌ Relationships fail foreign key constraints
```

---

## 🐛 The Critical Bug

### Field Name Mismatch

**Three different naming conventions for the same data:**

1. **Relationship Extractor** (`api/src/services/extraction/relationshipExtractor.js`):
   ```javascript
   {
     id: "import:...",
     type: "IMPORTS",
     source: "file:source_index_ts",  // ❌ Wrong field name
     target: "./types",                // ❌ Wrong field name + wrong value
     metadata: { ... }
   }
   ```

2. **Prisma Schema** (`api/prisma/schema.prisma` lines 121-122):
   ```prisma
   model Relationship {
     sourceId String  // ✅ Correct field name
     targetId String  // ✅ Correct field name
   }
   ```

3. **Worker Mapping** (`api/src/workers/repoAnalysisWorker.js` lines 549-550):
   ```javascript
   const sourceId = rel.sourceId || rel.source;  // Tries both
   let targetId = rel.targetId || rel.target;    // Tries both
   ```

### Test Results

Running `api/test-extraction.js` shows:

```
✅ Entities extracted: 11
✅ Relationships extracted: 9

❌ Sample relationship:
   Type: IMPORTS
   From: undefined  ⚠️ CRITICAL
   To: undefined    ⚠️ CRITICAL
   Metadata: {
     importType: 'named',
     filePath: 'source/index.ts',
     targetPath: './types'  // This is a relative path, not an entity ID!
   }
```

**The Problem**:
1. Extractor creates `source` and `target` fields (not `sourceId`/`targetId`)
2. `target` contains relative import path (`./types`) instead of entity ID (`file:source_types_ts`)
3. Worker tries to resolve paths but fails
4. Database insert fails because foreign keys don't exist

---

## 🔧 Files That Need Fixing

### 1. `api/src/services/extraction/relationshipExtractor.js`

**Current Code** (lines 84-97):
```javascript
relationships.push({
  id: `import:${imp.filePath}:${imp.source}:${spec.name}`,
  type: 'IMPORTS',
  source: sourceFile.id,           // ❌ Should be sourceId
  target: imp.source,              // ❌ Should be targetId + entity ID
  metadata: {
    importType: spec.type,
    importedName: spec.imported || spec.name,
    localName: spec.name,
    filePath: imp.filePath,
    targetPath: imp.source
  }
});
```

**What It Should Be**:
```javascript
// Need to resolve import path to entity ID
const targetFile = resolveImportToFile(imp.source, imp.filePath, entities.files);

relationships.push({
  id: `import:${imp.filePath}:${imp.source}:${spec.name}`,
  type: 'IMPORTS',
  sourceId: sourceFile.id,         // ✅ Correct field name
  targetId: targetFile?.id || null, // ✅ Correct field name + entity ID
  metadata: {
    importType: spec.type,
    importedName: spec.imported || spec.name,
    localName: spec.name,
    filePath: imp.filePath,
    targetPath: imp.source
  }
});
```

**Similar Issues in**:
- Line 122: `source` → `sourceId`
- Line 123: `target` → `targetId`
- Line 161: `source` → `sourceId`
- Line 162: `target` → `targetId`
- Line 220: `source` → `sourceId`
- Line 221: `target` → `targetId`
- Line 266: `source` → `sourceId`
- Line 267: `target` → `targetId`

### 2. Path Resolution Logic Needed

The extractor needs a function to resolve relative import paths to entity IDs:

```javascript
function resolveImportToFile(importPath, currentFilePath, allFiles) {
  // Remove leading './' or '../'
  // Resolve relative to current file
  // Find matching file entity
  // Return file entity ID
  
  // Example:
  // importPath: './types'
  // currentFilePath: 'source/index.ts'
  // Should resolve to: 'file:source_types_ts'
}
```

---

## 📊 Database Schema

### Entity Model
```prisma
model Entity {
  id           String   @id @default(cuid())
  repositoryId String
  fileId       String?  // Optional for imports
  type         String   // function, class, import, export, etc.
  name         String
  // ... other fields
  
  outgoingRelationships Relationship[] @relation("SourceEntity")
  incomingRelationships Relationship[] @relation("TargetEntity")
}
```

### Relationship Model
```prisma
model Relationship {
  id           String   @id @default(cuid())
  repositoryId String
  type         String   // IMPORTS, CALLS, EXTENDS, etc.
  sourceId     String   // ✅ Must be valid Entity.id
  targetId     String   // ✅ Must be valid Entity.id
  metadata     Json?
  
  source       Entity @relation("SourceEntity", fields: [sourceId], references: [id])
  target       Entity @relation("TargetEntity", fields: [targetId], references: [id])
  
  @@unique([repositoryId, sourceId, targetId, type])
}
```

**Foreign Key Constraints**:
- `sourceId` MUST reference an existing `Entity.id`
- `targetId` MUST reference an existing `Entity.id`
- If either is invalid, Prisma throws error

---

## 🧪 Testing

### Run Extraction Test
```bash
cd api
node test-extraction.js
```

**Expected Output**:
- ✅ Entities: > 0
- ❌ Relationships: > 0 but with undefined from/to

### Check Database
```bash
cd api
node check-relationships.js
```

**Current Result**: 0 relationships in database

### Re-analyze Repository
```bash
cd api
node reanalyze-express.js
```

---

## 🎯 What Needs to Be Done

### Immediate Fix (Priority 1)

1. **Fix `relationshipExtractor.js`**:
   - Change all `source` → `sourceId`
   - Change all `target` → `targetId`
   - Add path resolution logic
   - Ensure `targetId` is always a valid entity ID or null

2. **Add Path Resolution Function**:
   ```javascript
   function resolveImportPath(importPath, currentFilePath, allFiles) {
     // Handle relative paths: ./, ../
     // Handle absolute paths: @/, ~/
     // Handle node_modules: react, lodash
     // Try with extensions: .ts, .tsx, .js, .jsx
     // Return entity ID or null
   }
   ```

3. **Test**:
   - Run `test-extraction.js`
   - Verify relationships have valid `sourceId` and `targetId`
   - Re-analyze a repository
   - Check database for relationships

### Secondary Fixes (Priority 2)

4. **Remove Worker Path Resolution**:
   - Lines 454-541 in `repoAnalysisWorker.js`
   - This logic should be in the extractor, not the worker

5. **Update Database Service**:
   - Ensure proper error handling for foreign key violations
   - Add validation before batch insert

---

## 📝 Recent Changes & Fixes

### Issues Fixed
1. ✅ File filter rejecting all files
2. ✅ Babel traverse import error
3. ✅ Worker module import failures
4. ✅ Entity `name` field missing
5. ✅ Field name mismatch (`entityType` vs `type`)
6. ✅ Entity `fileId` required but null (made optional)
7. ✅ Batch insert failures (added batching)
8. ✅ Files and entities persisting successfully

### Current Status
- **Files**: 7 saved ✅
- **Entities**: 682 saved ✅
- **Relationships**: 0 saved ❌

---

## 🚀 Quick Start for Debugging

1. **Start the services**:
   ```bash
   # Terminal 1: Frontend
   npm run dev
   
   # Terminal 2: Backend
   cd api && npm run dev
   ```

2. **Check logs**:
   - Worker logs: Terminal 2
   - API logs: Terminal 2
   - Frontend logs: Browser console

3. **Test extraction**:
   ```bash
   cd api
   node test-extraction.js
   ```

4. **Check database**:
   ```bash
   cd api
   npx prisma studio
   ```

---

## 🔗 Key Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `api/src/services/extraction/relationshipExtractor.js` | Creates relationships | ❌ BROKEN |
| `api/src/workers/repoAnalysisWorker.js` | Orchestrates analysis | ⚠️ Workaround code |
| `api/src/services/database/index.js` | Database operations | ✅ Working |
| `api/prisma/schema.prisma` | Database schema | ✅ Correct |
| `api/test-extraction.js` | Test script | ✅ Working |

---

## 💡 Debugging Tips

1. **Check relationship structure**:
   ```javascript
   console.log('Relationship:', JSON.stringify(rel, null, 2));
   ```

2. **Verify entity IDs exist**:
   ```javascript
   const entityIds = new Set(entities.map(e => e.id));
   console.log('Source exists:', entityIds.has(rel.sourceId));
   console.log('Target exists:', entityIds.has(rel.targetId));
   ```

3. **Test path resolution**:
   ```javascript
   const resolved = resolveImportPath('./types', 'source/index.ts', files);
   console.log('Resolved:', resolved); // Should be: file:source_types_ts
   ```

---

## 📞 Context for AI

**What we're building**: CodeAtlas - A tool that analyzes GitHub repositories and creates interactive dependency graphs with AI-powered chat.

**What works**: Repository cloning, file parsing, entity extraction, database persistence for files and entities.

**What's broken**: Relationship extraction creates objects with wrong field names and unresolved import paths, causing database foreign key constraint failures.

**The fix**: Update `relationshipExtractor.js` to use `sourceId`/`targetId` field names and resolve import paths to entity IDs before creating relationship objects.

---

## 🎯 Success Criteria

When fixed, you should see:
1. ✅ `test-extraction.js` shows relationships with valid `sourceId` and `targetId`
2. ✅ Database contains > 0 relationships after analysis
3. ✅ Frontend graph displays nodes and edges
4. ✅ No foreign key constraint errors in logs

---

**Last Updated**: 2026-05-18  
**Current Cost**: $91.80  
**Files Modified**: 24+  
**Issues Fixed**: 20+  
**Remaining Issues**: 1 (relationship persistence)

---

Made with Bob 🤖