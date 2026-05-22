# Incremental Dependency Graph Implementation Strategy

## Critical Development Rules

🚨 **STRICT INCREMENTAL ENGINEERING PROCESS** 🚨

1. ✅ Implement ONLY ONE small feature at a time
2. ✅ Test completely before continuing
3. ✅ Review generated code carefully
4. ✅ Verify no existing functionality breaks
5. ✅ Validate UI manually after every change
6. ✅ Commit stable checkpoints frequently
7. ✅ NEVER continue if current layer is unstable

## Additional Critical Rule: Minimal Code Changes

🚨 **BEFORE MODIFYING ANY EXISTING FILE** 🚨

1. ✅ Inspect current implementation carefully
2. ✅ Understand existing data flow
3. ✅ Avoid replacing stable logic unnecessarily
4. ✅ Prefer additive changes over destructive refactors

**When editing existing files:**
- ✅ Preserve backward compatibility
- ✅ Preserve existing exports/interfaces
- ✅ Preserve current Architecture V2 functionality
- ✅ Do NOT aggressively clean/refactor unrelated code
- ✅ Only touch MINIMUM code required for current milestone
- ✅ If uncertain, choose safer/minimal implementation path

## Current Milestone ONLY

**Goal:** Generate accurate dependency graph JSON from real imports/exports and visualize it in new "File Dependencies" Architecture V2 mode.

**NOTHING MORE.**

## Incremental Implementation Phases

### Phase 1: Core Dependency Graph Engine (Isolated)

**Objective:** Create `buildDependencyGraph.js` that generates graph JSON

**Steps:**
1. Create new file `src/utils/repository/buildDependencyGraph.js`
2. Implement ONLY basic functions (no integration yet)
3. Add comprehensive JSDoc comments
4. Test functions in isolation

**Testing Checkpoint:**
- [ ] File created successfully
- [ ] No syntax errors
- [ ] No import errors
- [ ] App still builds (`npm start`)
- [ ] Existing features unaffected

**Files Changed:** 1 (CREATE)
**Risk Level:** LOW (isolated new file)

---

### Phase 2: Enhance Import Extraction (Minimal Changes)

**Objective:** Add export detection to existing `extractImports.js`

**Steps:**
1. Add `extractJSExports()` function
2. Add `extractJSImportsWithMetadata()` function
3. Keep existing functions unchanged
4. Add JSDoc comments

**Testing Checkpoint:**
- [ ] New functions added
- [ ] Existing functions still work
- [ ] No breaking changes
- [ ] App still builds
- [ ] Architecture V2 still works

**Files Changed:** 1 (ENHANCE)
**Risk Level:** LOW (additive only)

---

### Phase 3: Integration with Analysis Pipeline (Careful)

**Objective:** Add dependency graph generation to `analyzeRepository.js`

**Steps:**
1. Import `buildDependencyGraph`
2. Add ONE line to call it
3. Add `dependencyGraph` to return object
4. Keep all existing code unchanged

**Testing Checkpoint:**
- [ ] Import successful
- [ ] Function called correctly
- [ ] Return object includes new field
- [ ] Existing fields unchanged
- [ ] App still builds
- [ ] Repository analysis still works
- [ ] No crashes on analyze

**Files Changed:** 1 (MODIFY - minimal)
**Risk Level:** MEDIUM (touches analysis pipeline)

**STOP HERE AND TEST THOROUGHLY**

---

### Phase 4: Add View Mode to UI (Conservative)

**Objective:** Add "File Dependencies" tab to Architecture V2

**Steps:**
1. Add ONE entry to `VIEW_MODES` array in `ArchitectureV2.jsx`
2. Do NOT modify existing view modes
3. Do NOT change any styling yet

**Testing Checkpoint:**
- [ ] New tab appears in UI
- [ ] Existing tabs still work
- [ ] No visual regressions
- [ ] No console errors
- [ ] App still builds
- [ ] Can switch between modes

**Files Changed:** 1 (MODIFY - minimal)
**Risk Level:** LOW (UI only, additive)

---

### Phase 5: Graph Rendering Logic (Isolated)

**Objective:** Add rendering logic for new view mode in `buildArchitectureV2Graph.js`

**Steps:**
1. Add `if (viewMode === 'filedeps')` block
2. Use dependency graph data if available
3. Return empty graph if data missing (graceful fallback)
4. Keep all existing view mode logic unchanged

**Testing Checkpoint:**
- [ ] New view mode renders
- [ ] Shows graph or empty state
- [ ] Existing view modes unaffected
- [ ] No crashes when switching modes
- [ ] ReactFlow still works
- [ ] ELK layout still works

**Files Changed:** 1 (MODIFY - additive)
**Risk Level:** MEDIUM (touches graph rendering)

**STOP HERE AND TEST THOROUGHLY**

---

### Phase 6: Manual Validation (Critical)

**Objective:** Verify graph accuracy and stability

**Manual Tests:**
1. Analyze a small repository (< 50 files)
2. Switch to "File Dependencies" mode
3. Inspect graph JSON in console
4. Verify nodes represent actual files
5. Verify edges represent actual imports
6. Check for unresolved imports
7. Test zoom, pan, select
8. Switch back to other modes
9. Verify no crashes or errors

**Validation Checklist:**
- [ ] Graph renders correctly
- [ ] Nodes show file names
- [ ] Edges show import relationships
- [ ] Import resolution works
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Existing modes still work
- [ ] No visual regressions

**STOP IF ANY ISSUES FOUND**

---

## File Change Summary

| Phase | File | Action | Risk |
|-------|------|--------|------|
| 1 | `buildDependencyGraph.js` | CREATE | LOW |
| 2 | `extractImports.js` | ENHANCE | LOW |
| 3 | `analyzeRepository.js` | MODIFY | MEDIUM |
| 4 | `ArchitectureV2.jsx` | MODIFY | LOW |
| 5 | `buildArchitectureV2Graph.js` | MODIFY | MEDIUM |

**Total Files Changed: 5**
**Total New Files: 1**

## Testing Strategy

### After Each Phase

```bash
# 1. Build check
npm start

# 2. Console check
# Look for errors in browser console

# 3. Manual UI check
# Navigate to Architecture V2
# Test existing view modes
# Test new view mode (if applicable)

# 4. Functionality check
# Analyze a repository
# Verify all tabs work
# Check for crashes
```

### Critical Test Cases

1. **Existing Functionality**
   - System view still works
   - Modules view still works
   - Dependencies view still works
   - Flow view still works
   - Tech Stack view still works

2. **New Functionality**
   - File Dependencies tab appears
   - Graph renders or shows empty state
   - No crashes when switching modes
   - Import resolution works

3. **Edge Cases**
   - Empty repository
   - Repository with no imports
   - Repository with circular imports
   - Large repository (> 100 files)

## Rollback Plan

If ANY phase causes instability:

1. **STOP immediately**
2. Revert changes from that phase
3. Verify app returns to stable state
4. Analyze what went wrong
5. Fix issue before continuing

## Success Criteria

✅ New "File Dependencies" view mode appears
✅ Graph shows real file-to-file imports
✅ Import paths correctly resolved
✅ No breaking changes to existing features
✅ No console errors
✅ No visual regressions
✅ Performance acceptable
✅ Code is clean and documented

## What We're NOT Doing

❌ Blast radius traversal
❌ Hub/danger detection algorithms
❌ Centrality analysis
❌ Circular dependency detection
❌ Heatmap visualization
❌ Incremental hashing
❌ Performance optimization
❌ Multi-language support
❌ Advanced filtering UI

**These are FUTURE enhancements.**

## Development Timeline

- Phase 1: 30-45 minutes
- Phase 2: 30-45 minutes
- Phase 3: 30-45 minutes
- Phase 4: 15-30 minutes
- Phase 5: 45-60 minutes
- Phase 6: 30-60 minutes

**Total: 3-5 hours** (with testing)

## Next Step

Ready to switch to **Code mode** and begin **Phase 1** ONLY.

After Phase 1 completion:
- STOP
- TEST
- VERIFY
- Then proceed to Phase 2

**System stability is TOP priority.**
**Slow stable progress > fast unstable rewrites.**