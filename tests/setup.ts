import { afterEach, vi } from "vitest";

// test cron secret for testing purposes
process.env.CRON_SECRET = "test-cron-secret";

afterEach(() => {
  vi.clearAllMocks();
});
