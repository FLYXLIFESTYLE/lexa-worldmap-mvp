# 🔧 CORS Fix Deployed - Testing Instructions

## **What Was Fixed**

Changed CORS from a static list to a **regex pattern** that allows:
- ✅ Any `localhost` port (3000, 3001, 3002, etc.)
- ✅ Any Vercel deployment (`*.vercel.app`)

**New CORS config:**
```python
allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+"
```

This is more flexible and handles all your development and production environments.

---

## **Testing Options**

### **Option 1: Test on Production (Recommended - Works Now!)**

Your production site already has CORS working:

1. Go to: `https://lexa-worldmap-mvp.vercel.app/captain/upload`
2. Sign in
3. Upload a file
4. **Should work immediately!**

### **Option 2: Test Locally (Wait 2-3 min for Render)**

After Render redeploys:

1. Check backend health:
   ```powershell
   curl.exe https://lexa-worldmap-mvp-rlss.onrender.com/health
   ```

2. Refresh browser (Ctrl+Shift+R)

3. Try upload again on `http://localhost:3000/captain/upload`

4. **Should work!**

---

## **How to Know When Render Deployed**

Run this command:
```powershell
curl.exe https://lexa-worldmap-mvp-rlss.onrender.com/health
```

If you see:
```json
{"status":"healthy", "services":{...}}
```

Then it's ready!

---

## **What You'll See When Upload Works:**

✅ **Success message:**
```
✅ Itinerary - Wellness.docx uploaded!
POIs found: 5
Experiences: 2
Trends: 1
```

✅ **File status changes to "done"**

✅ **Confidence score shows actual value**

✅ **Data saved to database**

---

**Try production first (no waiting), or wait 2-3 min for local to work! 🚀**
