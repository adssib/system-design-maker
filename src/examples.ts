// Starter templates. Each is internally valid: every flow hop is a real
// structure edge. Names are chosen so branded devicon icons light up.
export interface Example {
  name: string;
  structureText: string;
  flowText: string;
}

export const EXAMPLES: Example[] = [
  {
    name: "Simple web app",
    structureText: `client -> nginx
nginx -> api
api -> redis
api -> postgres`,
    flowText: `flow "GET /profile":
  client -> nginx
  nginx  -> api
  api    -> redis
  api    <-> postgres`,
  },
  {
    name: "Microservices",
    structureText: `client  -> gateway
gateway -> [auth, orders, users]
auth    -> redis
orders  -> postgres
orders  -> kafka
users   -> postgres
kafka   -> worker
worker  -> postgres`,
    flowText: `flow "POST /orders":
  client  -> gateway
  gateway <-> auth
  gateway -> orders
  orders  <-> postgres
  orders  ~> kafka`,
  },
  {
    name: "High-scale system",
    structureText: `client -> cdn
cdn    -> gateway
gateway -> [auth, api, search]
auth   -> redis
api    -> [redis, postgres, kafka]
api    -> s3
search -> elasticsearch
kafka  -> [worker, analytics]
worker -> postgres
analytics -> elasticsearch`,
    flowText: `flow "GET /feed":
  client  -> cdn
  cdn     -> gateway
  gateway <-> auth
  gateway -> api
  api     -> redis
  api     <-> postgres
  api     ~> kafka
  api     ~> s3`,
  },
];
