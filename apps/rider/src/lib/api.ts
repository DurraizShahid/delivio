import { createApiClient } from "@delivio/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const api = createApiClient(API_URL);
