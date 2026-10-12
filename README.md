# Mohanty Enterprises - B2B Trading Terminal

Wholesale B2B trading terminal for Cement, TMT Bars, Fertilizers, and Asbestos sheets. Built with React 19, TypeScript, Vite, and Tailwind CSS.

---

## 🚀 Deploying to Vercel from GitHub

This repository is pre-configured for **zero-config, production-ready deployment on Vercel**.

### Step-by-Step Instructions:

1. **Push to GitHub**:
   Ensure all files (including `vercel.json`, `package.json`, and `vite.config.ts`) are committed and pushed to your GitHub repository:
   ```bash
   git add .
   git commit -m "Configure production deployment for Vercel"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com) and log in.
   - Click **"Add New..."** > **"Project"**.
   - Select your GitHub repository (`mohanty-enterprises-terminal`).

3. **Verify Project Settings (Pre-Configured)**:
   Vercel will automatically detect the settings from `vercel.json`:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Deploy**:
   - Click **"Deploy"**.
   - Vercel will build the project in ~30 seconds and provide a live production URL (`https://your-project.vercel.app`).

---

## 🛠 Features Configured for Production Stability

- **SPA Fallback Routing (`vercel.json`)**: Configured with wildcard rewrites (`/(.*) -> /index.html`) so refreshing on any route will not return 404 errors.
- **Cross-Platform ESM Configuration (`vite.config.ts`)**: Configured using standard ESM directory resolution, preventing bundler issues in Linux CI/CD environments.
- **Strict TypeScript Validation (`tsc --noEmit`)**: Passes full type checking with no errors.
- **Tailwind CSS v4 Integration**: Pre-compiled and bundled for production.
