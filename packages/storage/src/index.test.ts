import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildStorageKey, putObject, getObjectText } from "./index.js";

describe("storage", () => {
  it("round-trips local objects", async () => {
    process.env.STORAGE_ROOT = mkdtempSync(path.join(tmpdir(), "shopdata-storage-"));
    delete process.env.S3_ENDPOINT;
    const key = buildStorageKey({
      organizationId: "org-1",
      kind: "imports",
      filename: "products.csv",
    });
    await putObject({
      key,
      body: "Handle,Title\na,A\n",
      contentType: "text/csv",
    });
    expect(await getObjectText(key)).toContain("Handle,Title");
  });
});
