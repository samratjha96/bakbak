import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import { reactStartCookies } from "better-auth/react-start";
import { WorkspaceService } from "./workspaceService";

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
  // TODO: Re-enable hooks after testing basic workspace functionality
  // hooks: {
  //   after: [
  //     {
  //       matcher(context) {
  //         return context.path === "/sign-up/email" && context.method === "POST";
  //       },
  //       handler: async (ctx) => {
  //         if (ctx.returned?.user?.id) {
  //           await WorkspaceService.onUserSignup(
  //             ctx.returned.user.id,
  //             ctx.returned.user.email
  //           );
  //         }
  //       },
  //     },
  //   ],
  // },
});
