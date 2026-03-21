type Environment = Record<string, string | undefined>;

type BasicAuthCredentials = {
  password: string;
  username: string;
};

export function decodeBasicAuthCredentials(
  authorizationHeader: string | null
): BasicAuthCredentials | null {
  if (!authorizationHeader?.startsWith("Basic ")) {
    return null;
  }

  const encoded = authorizationHeader.slice("Basic ".length).trim();

  if (!encoded) {
    return null;
  }

  try {
    const decoded = decodeBase64(encoded);
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1)
    };
  } catch {
    return null;
  }
}

function decodeBase64(value: string): string {
  if (typeof atob === "function") {
    return atob(value);
  }

  return Buffer.from(value, "base64").toString("utf8");
}

export function isAuthorizedAdminRequest(
  requestHeaders: Headers,
  env: Environment = process.env
): boolean {
  const expectedUsername = env.ADMIN_DASHBOARD_USERNAME?.trim();
  const expectedPassword = env.ADMIN_DASHBOARD_PASSWORD?.trim();

  if (!expectedUsername && !expectedPassword) {
    return true;
  }

  if (!expectedUsername || !expectedPassword) {
    return false;
  }

  const credentials = decodeBasicAuthCredentials(
    requestHeaders.get("authorization")
  );

  return (
    credentials?.username === expectedUsername &&
    credentials.password === expectedPassword
  );
}
