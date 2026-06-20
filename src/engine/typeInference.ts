import type { NodeType } from "../types";

// Deeper categorical palette (no blue) — saturated to read on the light node cards.
export const TYPES: Record<NodeType, { color: string; match: RegExp }> = {
  client:  { color: "#b8654a", match: /^(client|user|browser|mobile|app|frontend)/i },
  lb:      { color: "#d98a2c", match: /(lb|balancer|gateway|proxy|ingress|cdn|nginx|envoy)/i },
  service: { color: "#c0922f", match: /(api|service|server|svc|worker|node|micro|backend|fn|lambda)/i },
  cache:   { color: "#c8587a", match: /(cache|redis|memcache)/i },
  queue:   { color: "#2f9e86", match: /(queue|kafka|rabbit|sqs|pubsub|stream|topic|bus)/i },
  db:      { color: "#5c9440", match: /(db|database|sql|postgres|mysql|mongo|store|dynamo|cassandra|s3|blob)/i },
};

const ORDER: NodeType[] = ["client", "lb", "cache", "queue", "db", "service"];

export function typeOf(name: string): NodeType {
  for (const t of ORDER) {
    if (t !== "service" && TYPES[t].match.test(name)) return t;
  }
  return "service";
}
