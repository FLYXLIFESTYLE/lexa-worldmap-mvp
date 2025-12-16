# Cypher Import Guide

## Problem: Memory Limit Errors

When importing large cypher files into Neo4j Aura, you might see:
```
Neo.TransientError.General.MemoryPoolOutOfMemoryError
The allocation of an extra 2.0 MiB would use more than the limit 824.0 MiB.
```

**Cause:** Too many operations in a single transaction.

**Solution:** Use the batch import script!

---

## Solution: Batch Import Script

The `batch_import_cypher.py` script automatically:
- ✅ Splits large files into small batches (500 statements per transaction)
- ✅ Commits after each batch
- ✅ Handles errors gracefully
- ✅ Shows progress
- ✅ Avoids memory limits

---

## Usage

### Import a Single File:

```bash
cd scripts
python batch_import_cypher.py ../cypher/adriatic_(central)_part001.cypher
```

**With custom batch size:**
```bash
python batch_import_cypher.py ../cypher/adriatic_(central)_part001.cypher 250
```

---

### Import All Adriatic Central Files:

```bash
cd scripts
python batch_import_cypher.py ../cypher "adriatic_(central)*.cypher" 500
```

---

### Import ALL Cypher Files:

```bash
cd scripts
python batch_import_cypher.py ../cypher "*.cypher" 500
```

---

## Batch Size Guidelines

| Database Size | Batch Size | Speed | Memory |
|--------------|------------|-------|---------|
| Small (<10K nodes) | 1000 | Fast | Low |
| Medium (10-100K) | 500 | Medium | Medium |
| Large (>100K) | 250 | Slow | Safe |

**Default:** 500 (safe for Neo4j Aura)

---

## Example Output

```
============================================================
  LEXA Batch Cypher Import
============================================================
[OK] Connected to Neo4j at neo4j+s://xxxxx.databases.neo4j.io

[INFO] Found 73 files to import

============================================================
File 1/73
============================================================

[IMPORT] Processing: adriatic_(central)_part001.cypher
[INFO] Found 2500 statements to execute
[BATCH 1/5] Processing 500 statements...
  [OK] Batch complete: 500/500 successful
[BATCH 2/5] Processing 500 statements...
  [OK] Batch complete: 1000/1000 successful
...
[COMPLETE] adriatic_(central)_part001.cypher
  Success: 2500, Errors: 0

[SUMMARY] All files processed
Total Success: 182,500
Total Errors: 0
Success Rate: 100.0%

[SUCCESS] Import complete!
```

---

## Tips

### 1. Start with One File
Test with a single file first:
```bash
python batch_import_cypher.py ../cypher/adriatic_(central)_part001.cypher
```

### 2. Monitor Progress
The script shows:
- Current file number
- Batch progress
- Success/error counts
- Time estimates

### 3. Handle Errors
If you see errors:
- Check your Neo4j connection
- Verify credentials in `.env`
- Try smaller batch size (250)
- Check Neo4j Browser for conflicts

### 4. Resume Imports
The script skips duplicate nodes automatically.
Safe to re-run if interrupted!

---

## Troubleshooting

### "No module named 'neo4j'"
```bash
pip install neo4j python-dotenv
```

### "No files found"
Make sure you're in the `scripts` directory:
```bash
cd scripts
```

### Still Getting Memory Errors?
Reduce batch size:
```bash
python batch_import_cypher.py ../cypher/file.cypher 100
```

### Connection Timeout?
Check your Neo4j credentials in `.env`:
```
NEO4J_URI=neo4j+s://...
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
```

---

## Performance

**Typical import speeds:**
- **Single file:** 2-5 minutes
- **All Adriatic files:** 2-4 hours
- **All destinations:** 8-12 hours

**Pro tip:** Run overnight for large imports! 🌙

