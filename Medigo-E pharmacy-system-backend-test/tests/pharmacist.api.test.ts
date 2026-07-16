import test from "node:test";
import assert from "node:assert/strict";
import { ApiResponse } from "../src/shared/utils/ApiResponse";

test("ApiResponse wraps payloads with success, message, and data", () => {
  const response = new ApiResponse(200, "Dashboard loaded successfully", { totalOrdersToday: 2 });

  assert.equal(response.success, true);
  assert.equal(response.message, "Dashboard loaded successfully");
  assert.deepEqual(response.data, { totalOrdersToday: 2 });
});

test("ApiResponse marks errors as unsuccessful", () => {
  const response = new ApiResponse(400, "Bad request", null);

  assert.equal(response.success, false);
  assert.equal(response.statusCode, 400);
});
