import { onRequestGet as __api_state_js_onRequestGet } from "/workspaces/project-me/functions/api/state.js"
import { onRequestPut as __api_state_js_onRequestPut } from "/workspaces/project-me/functions/api/state.js"

export const routes = [
    {
      routePath: "/api/state",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_state_js_onRequestGet],
    },
  {
      routePath: "/api/state",
      mountPath: "/api",
      method: "PUT",
      middlewares: [],
      modules: [__api_state_js_onRequestPut],
    },
  ]