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
