import { describe, expect, it } from "vitest";
import { createLocalStorage } from "./index.js";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

describe("local storage", () => {
  it("writes objects", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "pp-"));
    const storage = createLocalStorage({ localRoot: root, publicUrl: "http://x/media" });
    const result = await storage.putObject({
      body: Buffer.from("hi"),
      contentType: "text/plain",
      prefix: "t",
    });
    expect(result.url).toContain("http://x/media/");
    expect(result.key).toMatch(/^t\//);
  });
});
