import { describe, expect, it } from "vitest";

import {
  decodeBasicAuthCredentials,
  isAuthorizedAdminRequest
} from "./admin-auth";

describe("admin-auth", () => {
  it("decodes basic auth credentials", () => {
    const encoded = Buffer.from("operator:secret").toString("base64");

    expect(decodeBasicAuthCredentials(`Basic ${encoded}`)).toEqual({
      username: "operator",
      password: "secret"
    });
  });

  it("allows access when dashboard auth is not configured", () => {
    expect(isAuthorizedAdminRequest(new Headers(), {})).toBe(true);
  });

  it("rejects invalid credentials when auth is configured", () => {
    const headers = new Headers({
      authorization: `Basic ${Buffer.from("operator:wrong").toString("base64")}`
    });

    expect(
      isAuthorizedAdminRequest(headers, {
        ADMIN_DASHBOARD_USERNAME: "operator",
        ADMIN_DASHBOARD_PASSWORD: "secret"
      })
    ).toBe(false);
  });

  it("accepts matching credentials when auth is configured", () => {
    const headers = new Headers({
      authorization: `Basic ${Buffer.from("operator:secret").toString("base64")}`
    });

    expect(
      isAuthorizedAdminRequest(headers, {
        ADMIN_DASHBOARD_USERNAME: "operator",
        ADMIN_DASHBOARD_PASSWORD: "secret"
      })
    ).toBe(true);
  });
});
