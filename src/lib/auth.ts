import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import { reactStartCookies } from "better-auth/react-start";

export const auth = betterAuth({
  database: new Database("./data/sqlite.db"),
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://bakbak.techbrohomelab.xyz"
      : "http://localhost:3010",
  trustedOrigins: ["http://localhost:3010", "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [reactStartCookies()],
});
