import { describe, expect, it } from "vitest";
import { NdjsonDecoder } from "./ndjson";

describe("NdjsonDecoder", () => {
  it("reassembles events split across transport chunks", () => {
    const decoder = new NdjsonDecoder();
    expect(decoder.push('{"type":"session.status","status":"run')).toEqual([]);
    expect(decoder.push('ning"}\n{"type":"part.delta","partId":"1","delta":"你')).toEqual([
      { type: "session.status", status: "running" },
    ]);
    expect(decoder.push('好"}\n')).toEqual([
      { type: "part.delta", partId: "1", delta: "你好" },
    ]);
    expect(decoder.finish()).toEqual([]);
  });

  it("flushes a final line without a newline", () => {
    const decoder = new NdjsonDecoder();
    decoder.push('{"type":"session.status","status":"idle"}');
    expect(decoder.finish()).toEqual([{ type: "session.status", status: "idle" }]);
  });
});
