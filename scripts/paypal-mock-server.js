const http = require("http");
const crypto = require("crypto");

const host = "127.0.0.1";
const port = Number(process.env.PAYPAL_MOCK_PORT || 8787);
const orders = new Map();
const createRequests = new Map();
let nextCaptureMode = "complete";
let orderSequence = 0;
let oauthRequests = 0;
let createAttempts = 0;
let captureAttempts = 0;
let retrieveAttempts = 0;
let verifyAttempts = 0;

const json = (response, status, payload) => {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "application/json",
  });
  response.end(body);
};

const readText = async (request) => {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
};

const readJson = async (request) => {
  const text = await readText(request);
  return text ? JSON.parse(text) : {};
};

const completedOrder = (order, overrides = {}) => {
  const purchaseUnit = {
    ...(order.request.purchase_units?.[0] || {}),
  };
  const originalAmount = purchaseUnit.amount || { currency_code: "USD", value: "0.00" };
  const captureAmount = overrides.wrongAmount
    ? { ...originalAmount, value: (Number(originalAmount.value) + 1).toFixed(2) }
    : originalAmount;

  if (overrides.wrongCustomId) {
    purchaseUnit.custom_id = "wrong-snapshot-hash";
  }

  purchaseUnit.payee = {
    merchant_id: "PHASE36MERCHANT",
  };

  purchaseUnit.payments = {
    captures: [
      {
        amount: captureAmount,
        custom_id: purchaseUnit.custom_id,
        id: `CAPTURE${order.id.slice(-8)}`,
        status: overrides.captureStatus || "COMPLETED",
      },
    ],
  };

  return {
    id: order.id,
    intent: "CAPTURE",
    payer: {
      email_address: "phase35-buyer@local.test",
      name: {
        given_name: "Phase",
        surname: "Thirtyfive",
      },
      payer_id: "PHASE35PAYER",
    },
    purchase_units: [purchaseUnit],
    status: "COMPLETED",
  };
};

const currentOrder = (order) => {
  if (order.representation) {
    return order.representation;
  }

  return {
    id: order.id,
    intent: "CAPTURE",
    purchase_units: order.request.purchase_units || [],
    status: order.captureMode === "unapproved" ? "CREATED" : "APPROVED",
  };
};

const reset = () => {
  orders.clear();
  createRequests.clear();
  nextCaptureMode = "complete";
  orderSequence = 0;
  oauthRequests = 0;
  createAttempts = 0;
  captureAttempts = 0;
  retrieveAttempts = 0;
  verifyAttempts = 0;
};

const state = () => ({
  captureAttempts,
  createAttempts,
  oauthRequests,
  orderCount: orders.size,
  orders: Array.from(orders.values()).map((order) => ({
    captureMode: order.captureMode,
    id: order.id,
    retrieveFailuresRemaining: order.retrieveFailuresRemaining || 0,
    status: currentOrder(order).status,
  })),
  retrieveAttempts,
  verifyAttempts,
});

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);

    if (request.method === "POST" && url.pathname === "/v1/oauth2/token") {
      oauthRequests += 1;
      json(response, 200, {
        access_token: "phase35-mock-access-token",
        expires_in: 3600,
        token_type: "Bearer",
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/__control") {
      const payload = await readJson(request);

      if (payload.nextCaptureMode) {
        nextCaptureMode = String(payload.nextCaptureMode);
      }

      if (payload.completeOrderId) {
        const order = orders.get(String(payload.completeOrderId));

        if (!order) {
          json(response, 404, { error: "order_not_found" });
          return;
        }

        order.representation = completedOrder(order);
      }

      if (payload.retrieveFailureOrderId) {
        const order = orders.get(String(payload.retrieveFailureOrderId));

        if (!order) {
          json(response, 404, { error: "order_not_found" });
          return;
        }

        order.retrieveFailuresRemaining = Math.max(
          0,
          Number.parseInt(payload.retrieveFailuresRemaining, 10) || 0,
        );
      }

      json(response, 200, state());
      return;
    }

    if (request.method === "POST" && url.pathname === "/__reset") {
      reset();
      json(response, 200, state());
      return;
    }

    if (request.method === "GET" && url.pathname === "/__state") {
      json(response, 200, state());
      return;
    }

    if (
      request.method === "POST"
      && url.pathname === "/v1/notifications/verify-webhook-signature"
    ) {
      verifyAttempts += 1;
      const exactBody = await readText(request);
      const payload = exactBody ? JSON.parse(exactBody) : {};
      const eventMatch = exactBody.match(/,"webhook_event":([\s\S]*)}$/);
      const exactEventBody = eventMatch ? eventMatch[1] : "";
      const expectedSignature = `valid-signature-${crypto
        .createHash("sha256")
        .update(exactEventBody)
        .digest("hex")}`;
      const requiredFieldsPresent = [
        payload.auth_algo,
        payload.cert_url,
        payload.transmission_id,
        payload.transmission_time,
        payload.webhook_event,
      ].every(Boolean);
      const verified = requiredFieldsPresent
        && payload.webhook_id === "phase36-emulator-webhook"
        && payload.transmission_sig === expectedSignature;
      json(response, 200, {
        verification_status: verified ? "SUCCESS" : "FAILURE",
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v2/checkout/orders") {
      createAttempts += 1;
      const requestId = String(request.headers["paypal-request-id"] || "");
      const existingOrderId = createRequests.get(requestId);

      if (existingOrderId) {
        const existing = orders.get(existingOrderId);
        json(response, 201, { id: existing.id, status: "CREATED" });
        return;
      }

      const payload = await readJson(request);
      orderSequence += 1;
      const orderId = `PHASE35ORDER${String(orderSequence).padStart(6, "0")}`;
      const order = {
        captureMode: nextCaptureMode,
        id: orderId,
        request: payload,
        representation: null,
        retrieveFailuresRemaining: 0,
      };
      nextCaptureMode = "complete";
      orders.set(orderId, order);
      createRequests.set(requestId, orderId);
      json(response, 201, { id: orderId, status: "CREATED" });
      return;
    }

    const captureMatch = url.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)\/capture$/);

    if (request.method === "POST" && captureMatch) {
      captureAttempts += 1;
      const order = orders.get(decodeURIComponent(captureMatch[1]));

      if (!order) {
        json(response, 404, { name: "RESOURCE_NOT_FOUND" });
        return;
      }

      if (order.representation) {
        json(response, 201, order.representation);
        return;
      }

      if (order.captureMode === "error_approved") {
        json(response, 500, { name: "INTERNAL_SERVER_ERROR" });
        return;
      }

      if (order.captureMode === "unapproved") {
        json(response, 422, { name: "UNPROCESSABLE_ENTITY" });
        return;
      }

      if (order.captureMode === "error_completed") {
        order.representation = completedOrder(order);
        json(response, 500, { name: "INTERNAL_SERVER_ERROR" });
        return;
      }

      if (order.captureMode === "delayed_failed") {
        order.representation = completedOrder(order, { captureStatus: "FAILED" });
        await new Promise((resolve) => setTimeout(resolve, 3000));
        json(response, 201, order.representation);
        return;
      }

      if (order.captureMode === "pending") {
        order.representation = completedOrder(order, { captureStatus: "PENDING" });
      } else if (order.captureMode === "failed") {
        order.representation = completedOrder(order, { captureStatus: "FAILED" });
      } else if (order.captureMode === "wrong_amount") {
        order.representation = completedOrder(order, { wrongAmount: true });
      } else if (order.captureMode === "wrong_custom_id") {
        order.representation = completedOrder(order, { wrongCustomId: true });
      } else {
        order.representation = completedOrder(order);
      }

      json(response, 201, order.representation);
      return;
    }

    const orderMatch = url.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)$/);

    if (request.method === "GET" && orderMatch) {
      retrieveAttempts += 1;
      const order = orders.get(decodeURIComponent(orderMatch[1]));

      if (!order) {
        json(response, 404, { name: "RESOURCE_NOT_FOUND" });
        return;
      }

      if (order.retrieveFailuresRemaining > 0) {
        order.retrieveFailuresRemaining -= 1;
        json(response, 500, { name: "INTERNAL_SERVER_ERROR" });
        return;
      }

      json(response, 200, currentOrder(order));
      return;
    }

    json(response, 404, { error: "not_found" });
  } catch (error) {
    json(response, 500, { error: error.message });
  }
});

server.listen(port, host, () => {
  process.stdout.write(`PayPal mock listening on http://${host}:${port}\n`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
