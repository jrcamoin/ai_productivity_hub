import { expect, test } from "@playwright/test";

test("dashboard loads and opens the AI drawer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Good morning/i })).toBeVisible();
  await page.getByRole("button", { name: "Ask Orbit" }).first().click();
  await expect(page.getByText("Searching across your workspace")).toBeVisible();
});

test("task API supports a complete lifecycle", async ({ request }) => {
  const title = `E2E task ${Date.now()}`;
  const created = await request.post("/api/tasks", { data: { title, priority: "high" } });
  expect(created.status()).toBe(201);
  const task = (await created.json()).task;

  const updated = await request.patch(`/api/tasks/${task.id}`, { data: { status: "DONE" } });
  expect(updated.status()).toBe(200);
  expect((await updated.json()).task.status).toBe("DONE");

  const removed = await request.delete(`/api/tasks/${task.id}`);
  expect(removed.status()).toBe(204);
});

test("invalid task payload is rejected without leaking internals", async ({ request }) => {
  const response = await request.post("/api/tasks", { data: { title: "" } });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error).toBe("The request payload is invalid.");
  expect(body.requestId).toBeTruthy();
});
