import { createApiClient, createWSClient } from "@delivio/api";

const DEFAULT_API_URL = __DEV__
  ? "http://localhost:8080"
  : "https://delivio-production.up.railway.app";

const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
const WS_URL = API_URL.replace(/^http/, "ws") + "/ws";

export const api = createApiClient(API_URL);
export const wsClient = createWSClient(WS_URL);
