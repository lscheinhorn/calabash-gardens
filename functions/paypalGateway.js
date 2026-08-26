class PayPalGatewayError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "PayPalGatewayError";
    this.payload = details.payload || null;
    this.status = details.status || 0;
  }
}

const cleanText = (value) => String(value || "").trim();

const projectIdFrom = (env) => {
  if (env.GCLOUD_PROJECT || env.GOOGLE_CLOUD_PROJECT) {
    return cleanText(env.GCLOUD_PROJECT || env.GOOGLE_CLOUD_PROJECT);
  }

  try {
    return cleanText(JSON.parse(env.FIREBASE_CONFIG || "{}").projectId);
  } catch (error) {
    return "";
  }
};

const apiBaseFrom = (env, HttpsError) => {
  const override = cleanText(env.PAYPAL_API_BASE_URL);

  if (!override) {
    return env.PAYPAL_ENV === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  }

  let url;

  try {
    url = new URL(override);
  } catch (error) {
    throw new HttpsError("failed-precondition", "The PayPal API override is invalid.");
  }

  const isLoopback = ["127.0.0.1", "localhost"].includes(url.hostname);
  const isSafeEmulator = env.FUNCTIONS_EMULATOR === "true"
    && projectIdFrom(env) === "demo-calabash-gardens"
    && isLoopback
    && url.protocol === "http:";

  if (!isSafeEmulator) {
    throw new HttpsError(
      "failed-precondition",
      "The PayPal API override is available only to the isolated local emulator project.",
    );
  }

  return override.replace(/\/$/, "");
};

const createPayPalGateway = ({ env, fetchImpl, HttpsError, logger }) => {
  const assertEnabled = () => {
    if (env.PAYPAL_CHECKOUT_ENABLED !== "true") {
      throw new HttpsError("failed-precondition", "Server PayPal checkout is not enabled.");
    }

    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
      throw new HttpsError("failed-precondition", "PayPal server credentials are not configured.");
    }
  };

  const getAccessToken = async () => {
    assertEnabled();
    const apiBase = apiBaseFrom(env, HttpsError);
    const credentials = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64");
    let response;

    try {
      response = await fetchImpl(`${apiBase}/v1/oauth2/token`, {
        body: "grant_type=client_credentials",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
      });
    } catch (error) {
      throw new PayPalGatewayError("PayPal access token request did not complete.");
    }

    const text = await response.text();
    let payload = {};

    try {
      payload = text ? JSON.parse(text) : {};
    } catch (error) {
      payload = { rawText: text };
    }

    if (!response.ok || !payload.access_token) {
      logger.error("PayPal access token request failed", {
        payload,
        status: response.status,
      });
      throw new PayPalGatewayError("PayPal credentials could not be verified.", {
        payload,
        status: response.status,
      });
    }

    return { accessToken: payload.access_token, apiBase };
  };

  const request = async (path, options = {}) => {
    const { accessToken, apiBase } = await getAccessToken();
    let response;

    try {
      response = await fetchImpl(`${apiBase}${path}`, {
        body: options.body ? JSON.stringify(options.body) : undefined,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
        method: options.method || "GET",
      });
    } catch (error) {
      throw new PayPalGatewayError("PayPal request did not complete.");
    }

    const text = await response.text();
    let payload = {};

    try {
      payload = text ? JSON.parse(text) : {};
    } catch (error) {
      logger.error("PayPal returned a non-JSON response", {
        path,
        status: response.status,
        text,
      });
      throw new PayPalGatewayError("PayPal returned an unexpected response.", {
        payload: { rawText: text },
        status: response.status,
      });
    }

    if (!response.ok) {
      logger.error("PayPal request failed", {
        path,
        payload,
        status: response.status,
      });
      throw new PayPalGatewayError("PayPal request failed.", {
        payload,
        status: response.status,
      });
    }

    return payload;
  };

  return {
    assertEnabled,
    request,
  };
};

module.exports = {
  createPayPalGateway,
  PayPalGatewayError,
};
