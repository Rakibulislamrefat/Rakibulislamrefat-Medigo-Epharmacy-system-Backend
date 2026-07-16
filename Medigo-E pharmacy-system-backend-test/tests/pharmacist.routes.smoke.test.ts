// @ts-nocheck
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import app from "../src/app";

let server;
let baseUrl = "";

before(async () => {
  server = app.listen(0);
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Server address unavailable");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((err: Error | undefined) => (err ? reject(err) : resolve()));
    });
  }
});

test("GET /api/v1/pharmacist/dashboard rejects unauthenticated requests", async () => {
  const response = await fetch(`${baseUrl}/api/v1/pharmacist/dashboard`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
  assert.match(body.message, /Access token is required/i);
});

test("GET /api/v1/pharmacist/requested-orders rejects unauthenticated requests", async () => {
  const response = await fetch(`${baseUrl}/api/v1/pharmacist/requested-orders`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
  assert.match(body.message, /Access token is required/i);
});
