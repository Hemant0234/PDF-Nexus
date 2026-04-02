/**
 * api.js — Centralized API base URL
 * Dev:  falls back to http://127.0.0.1:5000 (Flask backend running locally)
 * Prod: set VITE_API_URL=https://your-backend.onrender.com in Vercel env vars
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

export default API_BASE;
