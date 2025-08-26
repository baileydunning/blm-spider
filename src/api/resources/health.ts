import { Resource } from "harperdb";
import { json, corsPreflight } from "../middleware/http";

export class Health extends Resource {
  allowRead() { return true; }
  async options() { return corsPreflight(); }
  async get() {
    return json({ status: "ok", timestamp: new Date().toISOString() });
  }
}