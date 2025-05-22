import Medusa from "@medusajs/medusa-js";

const PUBLISHABLE_API_KEY = "pk_9d3e3480c29078014d6f10331b5a7f7cec76de05c5451bba45fd72264fb4c19f";

export const medusaClient = new Medusa({
  baseUrl: "http://localhost:9000",
  maxRetries: 3,
  publishableApiKey: PUBLISHABLE_API_KEY,
});

// If the above does not work, you can use this workaround for older medusa-js versions:
// medusaClient.client.interceptors.request.use((config) => {
//   config.headers = config.headers || {};
//   config.headers["x-publishable-api-key"] = PUBLISHABLE_API_KEY;
//   return config;
// }); 