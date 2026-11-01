import { onRequestGet as __api_garmin_js_onRequestGet } from "/workspaces/project-me/functions/api/garmin.js"
import { onRequestGet as __api_gcal_js_onRequestGet } from "/workspaces/project-me/functions/api/gcal.js"
import { onRequestGet as __api_state_js_onRequestGet } from "/workspaces/project-me/functions/api/state.js"
import { onRequestPut as __api_state_js_onRequestPut } from "/workspaces/project-me/functions/api/state.js"

export const routes = [
    {
      routePath: "/api/garmin",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_garmin_js_onRequestGet],
    },
  {
      routePath: "/api/gcal",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_gcal_js_onRequestGet],
    },
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