import type { NodeType } from "../types";

export const TYPES: Record<NodeType, { color: string; match: RegExp }> = {
  client:  { color: "#9b8cff", match: /^(client|user|browser|mobile|app|frontend)/i },
  lb:      { color: "#ffb454", match: /(lb|balancer|gateway|proxy|ingress|cdn|nginx|envoy)/i },
  service: { color: "#5b9dff", match: /(api|service|server|svc|worker|node|micro|backend|fn|lambda)/i },
  cache:   { color: "#ff7eb6", match: /(cache|redis|memcache)/i },
  queue:   { color: "#36e0c0", match: /(queue|kafka|rabbit|sqs|pubsub|stream|topic|bus)/i },
  db:      { color: "#46d369", match: /(db|database|sql|postgres|mysql|mongo|store|dynamo|cassandra|s3|blob)/i },
};

const ORDER: NodeType[] = ["client", "lb", "cache", "queue", "db", "service"];

export function typeOf(name: string): NodeType {
  for (const t of ORDER) {
    if (t !== "service" && TYPES[t].match.test(name)) return t;
  }
  return "service";
}
