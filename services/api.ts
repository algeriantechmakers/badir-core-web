import axios from "axios";

/**
 * API client instance configured with a same-origin `/api` base URL.
 * _Must be used on the client-side only_
 *
 * The base URL is relative on purpose: the browser resolves it against
 * whatever origin served the page, so no NEXT_PUBLIC_* value has to be
 * inlined at build time and one image serves every environment.
 */
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export default api;
