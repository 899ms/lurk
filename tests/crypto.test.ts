import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, generateEncryptionKey } from "@/lib/crypto";

describe("crypto", () => {
  const key = generateEncryptionKey();

  it("round-trips a refresh token", () => {
    const token = "aa_rt_example_refresh_token";
    expect(decryptSecret(encryptSecret(token, key), key)).toBe(token);
  });

  it("never produces the same ciphertext twice", () => {
    expect(encryptSecret("same", key)).not.toBe(encryptSecret("same", key));
  });

  it("rejects a key of the wrong length", () => {
    expect(() => encryptSecret("x", Buffer.from("short").toString("base64"))).toThrow();
  });

  it("rejects a ciphertext that was tampered with", () => {
    const payload = Buffer.from(encryptSecret("secret", key), "base64");
    payload[payload.length - 1] ^= 0xff;
    expect(() => decryptSecret(payload.toString("base64"), key)).toThrow();
  });

  it("rejects the right ciphertext under the wrong key", () => {
    expect(() => decryptSecret(encryptSecret("secret", key), generateEncryptionKey())).toThrow();
  });
});
