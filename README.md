# Mohanty Enterprises - B2B Accounting & Trading Portal

Non-GST commercial billing, double-entry Cash/Bank books, inventory valuation, and party ledger management built with React 19, TypeScript, Vite, Tailwind CSS v4, and Firebase Firestore.

---

## Deploying to Vercel from GitHub

This project is pre-configured for zero-config production deployment on Vercel via `vercel.json` and `.npmrc`.

### 1. Push to GitHub
Commit and push the workspace files to your GitHub repository:
```bash
git init
git add .
git commit -m "Production ready release"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Import into Vercel
1. Open [vercel.com](https://vercel.com), click **Add New... → Project**, and select your repository.
2. Confirm the detected build settings (loaded from `vercel.json`):
   - **Framework Preset**: `Vite`
   - **Install Command**: `npm install --legacy-peer-deps`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. *(Optional)* Add Firebase environment variables under **Project Settings → Environment Variables** if targeting a separate Firebase project (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_FIRESTORE_DATABASE_ID`). Otherwise, `src/firebase/config.ts` loads the bundled configuration automatically.
4. Click **Deploy**.

---

## Initial Production Setup (First Run)

The database starts clean with **zero sample data**. After signing in:
1. Open **Configuration → Settings** to set your Company Trade Name, Registered Address, Phone, Voucher Prefixes, and Corporate Bank Accounts with opening balances.
2. Add your initial warehouse material SKUs under **Reports → Stock Report** (or post a **Purchase Voucher** to register new SKUs automatically).
3. Use **Settings → Clear Database & Start Fresh** at any time to reset all vouchers and restore clean production defaults.

---

## Key Production Features
- **Double-Entry Books**: Sales Vouchers, Purchase Vouchers, Cash Book, Bank Book, Contra Entries, Party Outstandings, and Supplier Payables stay synchronized in real time via Firestore.
- **SPA Routing & Immutable Asset Caching (`vercel.json`)**: Wildcard rewrites serve `index.html` cleanly across refreshes while caching `/assets/*` bundles.
- **Strict TypeScript Validation**: Passes `tsc --noEmit` and `vite build` cleanly.
