import { describe, expect, test } from "bun:test";
import { randomUUIDCompat } from "./random-id";

describe("randomUUIDCompat", () => {
  test("uses crypto.randomUUID when available", () => {
    const fakeCrypto = {
      randomUUID: () => "11111111-1111-4111-8111-111111111111",
      getRandomValues: () => {
        throw new Error("should not be called");
      },
    } as unknown as Crypto;

    const value = randomUUIDCompat(fakeCrypto);

    expect(value).toBe("11111111-1111-4111-8111-111111111111");
  });

  test("falls back to getRandomValues when randomUUID is unavailable", () => {
    const fakeCrypto = {
      getRandomValues: <T extends ArrayBufferView | null>(array: T) => {
        const bytes = array as Uint8Array;
        bytes.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
        return array;
      },
    } as unknown as Crypto;

    const value = randomUUIDCompat(fakeCrypto);

    expect(value).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
  });

  test("returns a v4 UUID string even without Web Crypto helpers", () => {
    const value = randomUUIDCompat(undefined);

    expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
