import { describe, expect, it } from "vitest";
import { restoreMultipartFilename } from "./multipart.js";

function asLatin1Mojibake(name: string): string {
  return Buffer.from(name, "utf8").toString("latin1");
}

describe("restoreMultipartFilename", () => {
  it("restores UTF-8 Chinese and emoji filenames decoded as Latin-1", () => {
    const filename = "经营数据-📈.xlsx";
    expect(restoreMultipartFilename(asLatin1Mojibake(filename))).toBe(filename);
  });

  it("leaves ASCII filenames unchanged", () => {
    expect(restoreMultipartFilename("quarterly-report.csv")).toBe("quarterly-report.csv");
  });

  it("preserves a filename that is not valid UTF-8 bytes", () => {
    expect(restoreMultipartFilename("café.txt")).toBe("café.txt");
  });
});
