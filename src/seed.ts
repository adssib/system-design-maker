export const SEED = {
  structureText: `client  -> gateway
gateway -> [auth, api]
api     -> [cache, db]
api     -> queue
queue   -> worker
worker  -> db`,
  flowText: `flow "GET /profile":
  client  -> gateway
  gateway <-> auth
  gateway -> api
  api     -> cache
  api     <-> db
  api     ~> queue`,
};
