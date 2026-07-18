import { describe, expect, it, vi } from "vitest";
import { BRIDGE_TOOLS, createRpcPeer } from "./protocol.js";

describe("createRpcPeer", () => {
  it("resolves a call when the matching response arrives", async () => {
    const sent: string[] = [];
    const peer = createRpcPeer((json) => sent.push(json));
    const promise = peer.call("get_document");
    const req = JSON.parse(sent[0]);
    expect(req.method).toBe("get_document");
    peer.handleMessage(JSON.stringify({ id: req.id, result: { outline: "root: page" } }));
    await expect(promise).resolves.toEqual({ outline: "root: page" });
  });

  it("rejects when the response carries an error", async () => {
    const sent: string[] = [];
    const peer = createRpcPeer((json) => sent.push(json));
    const promise = peer.call("export", { target: "html" });
    const req = JSON.parse(sent[0]);
    peer.handleMessage(JSON.stringify({ id: req.id, error: "no document" }));
    await expect(promise).rejects.toThrow("no document");
  });

  it("correlates out-of-order responses by id", async () => {
    const sent: string[] = [];
    const peer = createRpcPeer((json) => sent.push(json));
    const a = peer.call("a");
    const b = peer.call("b");
    const [reqA, reqB] = sent.map((s) => JSON.parse(s));
    peer.handleMessage(JSON.stringify({ id: reqB.id, result: "B" }));
    peer.handleMessage(JSON.stringify({ id: reqA.id, result: "A" }));
    await expect(b).resolves.toBe("B");
    await expect(a).resolves.toBe("A");
  });

  it("times out when no response arrives", async () => {
    vi.useFakeTimers();
    try {
      const peer = createRpcPeer(() => {}, { timeoutMs: 100 });
      const promise = peer.call("screenshot");
      const assertion = expect(promise).rejects.toThrow(/timed out/);
      vi.advanceTimersByTime(150);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejectAll rejects every pending call", async () => {
    const peer = createRpcPeer(() => {});
    const a = peer.call("a");
    const b = peer.call("b");
    peer.rejectAll("playground disconnected");
    await expect(a).rejects.toThrow("playground disconnected");
    await expect(b).rejects.toThrow("playground disconnected");
  });

  it("rejects immediately when send throws", async () => {
    const peer = createRpcPeer(() => {
      throw new Error("socket closed");
    });
    await expect(peer.call("a")).rejects.toThrow("socket closed");
  });

  it("ignores malformed or unknown messages", async () => {
    const sent: string[] = [];
    const peer = createRpcPeer((json) => sent.push(json));
    const promise = peer.call("a");
    peer.handleMessage("not json");
    peer.handleMessage(JSON.stringify({ hello: true }));
    peer.handleMessage(JSON.stringify({ id: 999, result: "stray" }));
    const req = JSON.parse(sent[0]);
    peer.handleMessage(JSON.stringify({ id: req.id, result: "ok" }));
    await expect(promise).resolves.toBe("ok");
  });
});

describe("BRIDGE_TOOLS", () => {
  it("declares the seven bridge tools with object schemas", () => {
    const names = BRIDGE_TOOLS.map((t) => t.name);
    expect(names).toEqual([
      "get_document",
      "list_element_types",
      "set_page",
      "apply_plan",
      "set_theme",
      "export",
      "screenshot",
    ]);
    for (const tool of BRIDGE_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.inputSchema).toMatchObject({ type: "object" });
    }
  });
});
