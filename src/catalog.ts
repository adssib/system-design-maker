import type { ComponentType } from "react";
import {
  Monitor, Split, Server, Zap, Database, ListOrdered, type LucideProps,
} from "lucide-react";
import type { NodeType } from "./types";

export type LucideIcon = ComponentType<LucideProps>;

// Generic category -> Lucide glyph (always available, license-free).
export const categoryIcon: Record<NodeType, LucideIcon> = {
  client: Monitor,
  lb: Split,
  service: Server,
  cache: Zap,
  queue: ListOrdered,
  db: Database,
};

// Branded tech -> vendored devicon SVG (public/icons/<file>.svg, MIT-licensed).
const BRANDS: { match: RegExp; file: string }[] = [
  { match: /redis/i, file: "redis" },
  { match: /postgres|psql|\bpg\b/i, file: "postgresql" },
  { match: /mysql|maria/i, file: "mysql" },
  { match: /mongo/i, file: "mongodb" },
  { match: /sqlite/i, file: "sqlite" },
  { match: /nginx/i, file: "nginx" },
  { match: /docker/i, file: "docker" },
  { match: /kafka/i, file: "kafka" },
  { match: /rabbit|amqp/i, file: "rabbitmq" },
  { match: /elastic|opensearch/i, file: "elasticsearch" },
  { match: /kubernetes|k8s/i, file: "kubernetes" },
  { match: /graphql/i, file: "graphql" },
];

export function brandIconFile(name: string): string | null {
  for (const b of BRANDS) if (b.match.test(name)) return b.file;
  return null;
}

export type IconDesc =
  | { kind: "img"; src: string; alt: string }
  | { kind: "lucide"; Icon: LucideIcon };

export function iconFor(name: string, type: NodeType): IconDesc {
  const file = brandIconFile(name);
  if (file) return { kind: "img", src: `${import.meta.env.BASE_URL}icons/${file}.svg`, alt: file };
  return { kind: "lucide", Icon: categoryIcon[type] };
}

// Insertable components. `id` is the node name inserted — it drives the icon and
// category through iconFor/typeOf, so there is no duplicated icon/color data here.
// `aliases` only widen search matching (cmdk filters on the item's value).
export interface Component { id: string; label: string; aliases?: string[]; }

export const COMPONENTS: Component[] = [
  { id: "client", label: "Client", aliases: ["user", "browser", "frontend"] },
  { id: "gateway", label: "API Gateway", aliases: ["ingress"] },
  { id: "load-balancer", label: "Load Balancer", aliases: ["lb", "balancer", "proxy"] },
  { id: "service", label: "Service", aliases: ["api", "backend", "microservice"] },
  { id: "worker", label: "Worker", aliases: ["job", "consumer"] },
  { id: "cache", label: "Cache" },
  { id: "queue", label: "Queue", aliases: ["message queue", "broker"] },
  { id: "db", label: "Database", aliases: ["database", "sql"] },
  { id: "redis", label: "Redis", aliases: ["cache"] },
  { id: "postgres", label: "PostgreSQL", aliases: ["postgresql", "psql"] },
  { id: "mysql", label: "MySQL", aliases: ["mariadb"] },
  { id: "mongodb", label: "MongoDB", aliases: ["mongo", "nosql"] },
  { id: "sqlite", label: "SQLite" },
  { id: "kafka", label: "Apache Kafka", aliases: ["stream", "events"] },
  { id: "rabbitmq", label: "RabbitMQ", aliases: ["rabbit", "amqp"] },
  { id: "nginx", label: "NGINX", aliases: ["reverse proxy", "web server"] },
  { id: "elasticsearch", label: "Elasticsearch", aliases: ["search", "elastic"] },
  { id: "docker", label: "Docker", aliases: ["container"] },
  { id: "kubernetes", label: "Kubernetes", aliases: ["k8s", "orchestration"] },
  { id: "graphql", label: "GraphQL" },
];
