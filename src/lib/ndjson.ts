import type { WorkshopStreamEvent } from "../../shared/contracts";

export class NdjsonDecoder {
  private pending = "";

  push(chunk: string): WorkshopStreamEvent[] {
    this.pending += chunk;
    const lines = this.pending.split("\n");
    this.pending = lines.pop() ?? "";
    return lines.filter((line) => line.trim()).map((line) => JSON.parse(line) as WorkshopStreamEvent);
  }

  finish(): WorkshopStreamEvent[] {
    const tail = this.pending.trim();
    this.pending = "";
    return tail ? [JSON.parse(tail) as WorkshopStreamEvent] : [];
  }
}
