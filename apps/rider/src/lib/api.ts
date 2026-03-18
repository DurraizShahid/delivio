import { createApiClient } from "@delivio/api";

const DEFAULT_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://delivio-production.up.railway.app"
    : "http://localhost:8080";

const API_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

export const api = createApiClient(API_URL);
