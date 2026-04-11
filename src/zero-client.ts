import { useZero } from "@rocicorp/zero/react";
import { Schema } from "./schema";

let zeroInstance: ReturnType<typeof useZero<Schema>> | null = null;

export function initZero(z: ReturnType<typeof useZero<Schema>>) {
  zeroInstance = z;
}

export function getZero() {
  if (!zeroInstance) {
    throw new Error("Zero not initialized. Call initZero first.");
  }
  return zeroInstance;
}

export const zero = {
  get query() {
    return getZero().query;
  },
  get mutate() {
    return getZero().mutate;
  },
  get userID() {
    return getZero().userID;
  }
};

export { useZero };
