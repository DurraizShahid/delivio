import { createApiClient, createWSClient } from "@delivio/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";
const WS_URL = API_URL.replace(/^http/, "ws") + "/ws";

export const api = createApiClient(API_URL);
export const wsClient = createWSClient(WS_URL);
