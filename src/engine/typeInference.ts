import type { NodeType } from "../types";

// Warm, earthy categorical palette (no blue) — still distinguishable per type.
export const TYPES: Record<NodeType, { color: string; match: RegExp }> = {
  client:  { color: "#cf9a86", match: /^(client|user|browser|mobile|app|frontend)/i },
  lb:      { color: "#e8a24e", match: /(lb|balancer|gateway|proxy|ingress|cdn|nginx|envoy)/i },
  service: { color: "#d9b56a", match: /(api|service|server|svc|worker|node|micro|backend|fn|lambda)/i },
  cache:   { color: "#e58aa6", match: /(cache|redis|memcache)/i },
  queue:   { color: "#5cc2a6", match: /(queue|kafka|rabbit|sqs|pubsub|stream|topic|bus)/i },
  db:      { color: "#8db86a", match: /(db|database|sql|postgres|mysql|mongo|store|dynamo|cassandra|s3|blob)/i },
};

const ORDER: NodeType[] = ["client", "lb", "cache", "queue", "db", "service"];

export function typeOf(name: string): NodeType {
  for (const t of ORDER) {
    if (t !== "service" && TYPES[t].match.test(name)) return t;
  }
  return "service";
}
