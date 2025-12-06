# DNA Queue Error Fixes

## ✅ Error 1 Fixed: Null tmdb_id PostgreSQL Error

### Error:
```
[DNAQueue] Error fetching existing DNA:
{"code": "22P02", "message": "invalid input syntax for type integer: \"null\""}
```

### Root Cause:
The query was including `null` or invalid tmdb_ids in the `.in()` clause, causing PostgreSQL to fail.

### Fix Applied:
**File:** [dnaComputationQueue.ts:240-247](src/services/dnaComputationQueue.ts#L240-L247)

```typescript
// BEFORE (line 240):
const tmdbIds = watchlistItems.map(item => item.tmdb_id);

// AFTER (lines 240-247):
const tmdbIds = watchlistItems
  .map(item => item.tmdb_id)
  .filter(id => id != null && id !== 'null' && !isNaN(Number(id)));

if (tmdbIds.length === 0) {
  console.log('[DNAQueue] No valid tmdb_ids to check');
  return;
}
```

**Also updated missingDNA filter (lines 269-276):**
```typescript
// BEFORE:
const missingDNA = watchlistItems.filter(item => {
  const key = `${item.media_type}-${item.tmdb_id}`;
  return !existingDNASet.has(key);
});

// AFTER:
const missingDNA = watchlistItems.filter(item => {
  // Skip items with invalid tmdb_id
  if (!item.tmdb_id || item.tmdb_id === 'null' || isNaN(Number(item.tmdb_id))) {
    return false;
  }
  const key = `${item.media_type}-${item.tmdb_id}`;
  return !existingDNASet.has(key);
});
```

### Result:
✅ Only valid tmdb_ids are queried
✅ Null/invalid items are skipped gracefully
✅ PostgreSQL no longer receives invalid input

---

## ⚠️ Error 2: React.Fragment Invalid Prop

### Error:
```
Invalid prop `%s` supplied to `React.Fragment`.
React.Fragment can only have `key` and `children` props.
```

### Investigation:
I thoroughly searched the Settings file and related components:
- ✅ Fragment usage at lines 609-664 is correct (using `<>` and `</>`)
- ✅ No props passed to Fragment
- ✅ SettingItem component has no Fragment usage
- ✅ No `.map()` functions with Fragment and `index` prop found

### Possible Causes:
1. **Different Component** - Error might be from a component outside Settings
2. **Transient Error** - May have been a hot-reload issue
3. **React Native Internal** - Could be from RN's internal rendering

### Recommendation:
If the error persists:
1. Check the full error stack trace to identify the exact component
2. Search for patterns like:
   ```typescript
   // WRONG:
   {items.map((item, index) => (
     <React.Fragment index={index}>  // ERROR
       ...
     </React.Fragment>
   ))}

   // CORRECT:
   {items.map((item, index) => (
     <React.Fragment key={index}>  // Use 'key', not 'index'
       ...
     </React.Fragment>
   ))}
   ```
3. Check recently modified components in the watchlist/dashboard areas

### Files Checked:
- ✅ [SettingsScreen.tsx](src/features/settings/screens/SettingsScreen.tsx) - No Fragment errors found
- ✅ SettingItem component - No Fragment usage
- ✅ Developer section (lines 609-664) - Correct Fragment usage

---

## Summary

### Fixed:
✅ **DNA Queue Null Error** - Filters out null/invalid tmdb_ids before querying

### Could Not Locate:
⚠️ **Fragment Error** - Not found in Settings file, may be elsewhere or already resolved

### Next Steps:
1. Test DNA building in Settings → Developer → "Build Content DNA"
2. If Fragment error persists, check full error stack trace
3. Search for Fragment usage in recently modified files
