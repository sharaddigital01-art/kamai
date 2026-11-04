import { describe, it, expect, beforeEach } from "vitest";
import {
  getCachedUser,
  setCachedUser,
  invalidateClientCache,
  CACHE_KEY_USER,
} from "./clientCache";
import { POST as loginHandler } from "../app/api/auth/login/route";

describe("Post-Login State Invalidation & Auth Observer Synchronization", () => {
  beforeEach(() => {
    invalidateClientCache();
  });

  it("synchronously updates cached user and invalidates stale unauthenticated state", () => {
    // 1. Initial guest state cached
    setCachedUser({
      authenticated: false,
      user: null,
      isAdmin: false,
    });

    let current = getCachedUser();
    expect(current?.authenticated).toBe(false);
    expect(current?.user).toBeNull();

    // 2. Simulate post-login cache invalidation and update
    invalidateClientCache();
    expect(getCachedUser()).toBeNull();

    // 3. Seed fresh authenticated user
    const authenticatedUser = {
      id: "usr_active_99",
      email: "active_user@kamai.local",
      name: "Active Partner",
      role: "USER" as const,
      referralCode: "ACTIVE99",
      subIdPrefix: "act99",
    };

    setCachedUser({
      authenticated: true,
      user: authenticatedUser,
      isAdmin: false,
    });

    // 4. Synchronous instant retrieval (0ms)
    current = getCachedUser();
    expect(current?.authenticated).toBe(true);
    expect(current?.user?.id).toBe("usr_active_99");
    expect(current?.user?.email).toBe("active_user@kamai.local");
  });

  it("handles custom auth event dispatching for instantaneous cross-component sync", () => {
    // Setup mock window with EventTarget if running in pure node environment
    const win = typeof window !== "undefined" ? window : new EventTarget();
    if (typeof (globalThis as any).window === "undefined") {
      (globalThis as any).window = win;
    }

    let capturedUser: any = null;

    const testListener = (e: any) => {
      capturedUser = e.detail;
    };

    (globalThis as any).window.addEventListener("kamai_auth_changed", testListener);

    const testPayload = {
      id: "usr_test_sync_123",
      email: "synctest@kamai.local",
      name: "Sync User",
      role: "USER",
    };

    (globalThis as any).window.dispatchEvent(
      new CustomEvent("kamai_auth_changed", { detail: testPayload })
    );

    expect(capturedUser).toBeDefined();
    expect(capturedUser.id).toBe("usr_test_sync_123");
    expect(capturedUser.email).toBe("synctest@kamai.local");

    (globalThis as any).window.removeEventListener("kamai_auth_changed", testListener);
  });

  it("login endpoint returns structured user payload for immediate cache seeding", async () => {
    const email = "sync_partner@kamai.local";
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        otp: "123456",
      }),
    });

    const res = await loginHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(email);
    expect(data.user.id).toBeDefined();
    expect(data.user.role).toBeDefined();

    // Client can seed cache directly with returned user
    setCachedUser({
      authenticated: true,
      user: data.user,
      isAdmin: data.user.role === "ADMIN",
    });

    const cached = getCachedUser();
    expect(cached?.authenticated).toBe(true);
    expect(cached?.user?.email).toBe(email);
  });
});
