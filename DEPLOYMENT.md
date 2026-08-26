# 🚀 PulseRoute AI — Production Deployment Guide

This guide walks you through deploying PulseRoute AI to production using **Render** (for the FastAPI backend) and **Vercel** (for the React Vite frontend).

---

## 🛠️ Step 1: Deploy Backend on Render (Free Tier)

1. Go to [Render.com](https://render.com) and Sign In with your GitHub account.
2. Click **New +** $\to$ Select **Web Service**.
3. Connect your GitHub repository: `Rural-healthcare-Routing-coderush-2026`.
4. Configure the Web Service settings:
   - **Name**: `pulseroute-backend`
   - **Region**: Closest to you (e.g. *Singapore* / *Frankfurt* / *Oregon*)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
5. Click **Create Web Service**.
6. Once deployed, copy your live backend URL (e.g., `https://pulseroute-backend.onrender.com`).

---

## 🌐 Step 2: Deploy Frontend on Vercel (Free Tier)

1. Go to [Vercel.com](https://vercel.com) and Sign In with GitHub.
2. Click **Add New...** $\to$ **Project**.
3. Import your GitHub repository: `Rural-healthcare-Routing-coderush-2026`.
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`frontend`**
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:
   - `VITE_API_BASE` = `https://pulseroute-backend.onrender.com` *(Use your actual Render URL)*
   - `VITE_WS_BASE` = `wss://pulseroute-backend.onrender.com/ws/live` *(Replace `https://` with `wss://`)*
6. Click **Deploy**.

---

## ✅ Step 3: Verify Your Live App

1. Open your Vercel URL (e.g., `https://pulseroute.vercel.app`).
2. Verify that the top status bar shows **`Connected (Live 600ms)`**.
3. Run **`1. Heart Attack Emergency`** or click any village to test live emergency routing, 4-term cost score breakdown, and real-time GPS tracking!
