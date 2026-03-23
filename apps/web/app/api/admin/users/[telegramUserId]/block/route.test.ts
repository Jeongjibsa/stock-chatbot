import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();

vi.mock("../../../../../../lib/db", () => ({
  getWebPool: () => ({
    query
  })
}));

import { POST } from "./route";

describe("admin user block route", () => {
  beforeEach(() => {
    query.mockReset();
    process.env.ADMIN_DASHBOARD_USERNAME = "operator";
    process.env.ADMIN_DASHBOARD_PASSWORD = "secret";
  });

  it("rejects unauthorized requests", async () => {
    const response = await POST(new Request("https://example.com/api/admin/users/1001/block"), {
      params: Promise.resolve({ telegramUserId: "1001" })
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Basic");
    expect(query).not.toHaveBeenCalled();
  });

  it("blocks a user and redirects to admin", async () => {
    query.mockResolvedValue({
      rowCount: 1
    });

    const request = new Request("https://example.com/api/admin/users/1001/block", {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from("operator:secret").toString("base64")}`
      }
    });
    const response = await POST(request, {
      params: Promise.resolve({ telegramUserId: "1001" })
    });

    expect(query).toHaveBeenCalledWith(expect.stringContaining('"is_blocked" = TRUE'), [
      "1001"
    ]);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://example.com/admin?userAction=blocked&telegramUserId=1001"
    );
  });

  it("does not allow blocking the protected admin user", async () => {
    const request = new Request("https://example.com/api/admin/users/8606362482/block", {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from("operator:secret").toString("base64")}`
      }
    });
    const response = await POST(request, {
      params: Promise.resolve({ telegramUserId: "8606362482" })
    });

    expect(query).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://example.com/admin?userAction=error_admin_protected&telegramUserId=8606362482"
    );
  });

  it("redirects with not found state when the user is missing", async () => {
    query.mockResolvedValue({
      rowCount: 0
    });

    const request = new Request("https://example.com/api/admin/users/9999/block", {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from("operator:secret").toString("base64")}`
      }
    });
    const response = await POST(request, {
      params: Promise.resolve({ telegramUserId: "9999" })
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://example.com/admin?userAction=error_not_found&telegramUserId=9999"
    );
  });
});
