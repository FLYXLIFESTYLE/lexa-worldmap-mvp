# Google Vision API Setup Guide

## ✅ What You've Done:

1. ✅ Enabled Google Vision API in Google Cloud Console
2. ✅ Created service account credentials
3. ✅ Downloaded JSON key file
4. ✅ Installed `google-auth-library` package
5. ✅ Updated API route to support service account auth

---

## 📝 Final Setup Steps:

### **Step 1: Place the JSON File**

Move your downloaded JSON file to the project root:

```
C:\Users\chris\OneDrive\Cursor_LEXA_MVP\lexa-worldmap-mvp\
  └── google-vision-credentials.json  ← Put your downloaded file here
```

**Rename it to:** `google-vision-credentials.json` (if it has a different name)

---

### **Step 2: Add Environment Variable**

Add this line to your `.env.local` file:

```env
# Google Vision API Service Account
GOOGLE_APPLICATION_CREDENTIALS=./google-vision-credentials.json
```

**Full `.env.local` should have:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8010

# Google Cloud
GOOGLE_PLACES_API_KEY=your-places-api-key
GOOGLE_APPLICATION_CREDENTIALS=./google-vision-credentials.json
```

---

### **Step 3: Restart Development Server**

After adding the environment variable, restart your dev server:

```bash
# Stop the server (Ctrl+C)
# Then start again:
npm run dev
```

---

## 🔒 Security:

✅ The JSON file is in `.gitignore` - it won't be committed  
✅ Never share or commit this file  
✅ Each team member needs their own service account

---

## 🧪 How to Test:

1. Go to: `https://www.luxury-travel-designer.com/admin/upload-yacht-destinations-v2`
2. Take a screenshot (Win+Shift+S)
3. Press **Ctrl+V** to paste
4. Should work now! ✅

---

## 🔧 How It Works:

The API route now supports **two authentication methods**:

### **Method 1: Service Account (Recommended)**
- Uses the JSON credentials file
- More secure
- Better for production
- No rate limits per IP

### **Method 2: API Key (Fallback)**
- Uses `GOOGLE_PLACES_API_KEY`
- Simpler but less secure
- Good for development
- Rate limited per IP

The system tries Method 1 first, falls back to Method 2 if it fails.

---

## 📊 Check Configuration:

Visit this URL to see your auth status:
```
https://www.luxury-travel-designer.com/api/admin/extract-yacht-destinations
```

Should show:
```json
{
  "message": "Upload images via POST",
  "auth_methods": {
    "service_account": "Configured ✅",
    "api_key": "Configured ✅"
  }
}
```

---

## ❓ Troubleshooting:

### **"No credentials found" error:**
- Check the JSON file is in the right location
- Check the path in `.env.local` is correct
- Restart the dev server

### **"Permission denied" error:**
- The service account needs "Cloud Vision API User" role
- Check in Google Cloud Console → IAM & Admin

### **Still not working:**
- Check the JSON file isn't corrupted
- Try using just the API key as fallback (remove GOOGLE_APPLICATION_CREDENTIALS from .env.local temporarily)

---

## 🎯 Next Steps:

1. Place the JSON file in project root
2. Add environment variable to `.env.local`
3. Restart server
4. Test with Ctrl+V
5. Start uploading yacht destinations! 🚀

