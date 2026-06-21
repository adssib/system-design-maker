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
  orders  ~> kafka

flow "GET /users/:id":
  client  -> gateway
  gateway <-> auth
  gateway -> users
  users   <-> postgres`,
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
  {
    name: "URL shortener",
    structureText: `client -> nginx
nginx  -> api
api    -> redis
api    -> postgres`,
    flowText: `flow "POST /shorten":
  client -> nginx
  nginx  -> api
  api    <-> postgres
  api    -> redis

flow "GET /:slug":
  client -> nginx
  nginx  -> api
  api    -> redis
  api    <-> postgres`,
  },
  {
    name: "Real-time chat",
    structureText: `client  -> gateway
gateway -> ws
ws      -> redis
ws      -> kafka
kafka   -> worker
worker  -> postgres`,
    flowText: `flow "send message":
  client  -> gateway
  gateway -> ws
  ws      -> redis
  ws      ~> kafka`,
  },
  {
    name: "E-commerce",
    structureText: `client  -> cdn
cdn     -> gateway
gateway -> [catalog, cart, orders]
catalog -> redis
catalog -> postgres
cart    -> redis
orders  -> postgres
orders  -> kafka
kafka   -> worker
worker  -> postgres`,
    flowText: `flow "Browse products":
  client  -> cdn
  cdn     -> gateway
  gateway -> catalog
  catalog -> redis
  catalog <-> postgres

flow "Checkout":
  client  -> cdn
  cdn     -> gateway
  gateway -> cart
  cart    -> redis
  gateway -> orders
  orders  <-> postgres
  orders  ~> kafka`,
  },
];
