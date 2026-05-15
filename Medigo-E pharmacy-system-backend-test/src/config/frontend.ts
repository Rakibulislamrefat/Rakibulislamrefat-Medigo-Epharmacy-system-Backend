import env from "./env";

const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

export const frontendConfig = {
  app: {
    name: "Medigo E-Pharmacy",
    environment: env.NODE_ENV,
  },
  urls: {
    apiBaseUrl: `${trimTrailingSlash(env.BACKEND_URL)}/api/v1`,
    frontendUrl: trimTrailingSlash(env.FRONTEND_URL || env.CLIENT_URL),
  },
  features: {
    sslcommerz: Boolean(env.SSL_APP_STORE_ID && env.SSL_APP_PASSWORD),
    sslcommerzLive: env.SSL_IS_LIVE === "true",
    cloudinaryUploads: Boolean(env.CLOUDINARY_CLOUD_NAME),
  },
  endpoints: {
    auth: {
      login: "/auth/login",
      register: "/auth/register",
      me: "/auth/me",
      logout: "/auth/logout",
    },
    orders: {
      create: "/orders",
      myOrders: "/orders/me",
      details: "/orders/:idOrNumber",
      tracking: "/orders/:idOrNumber/tracking",
    },
    payments: {
      sslcommerzInitiate: "/sslcommerz/initiate",
      sslcommerzValidate: "/sslcommerz/validate/:transactionId",
    },
    products: {
      list: "/products",
      details: "/products/:id",
    },
    cart: {
      mine: "/carts/me",
      add: "/carts/add",
      clear: "/carts/me/items",
    },
  },
} as const;

export default frontendConfig;
