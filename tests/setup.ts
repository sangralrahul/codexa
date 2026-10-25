import { config } from "dotenv";
config({ path: ".env.test" });
config({ path: ".env.local" });
config();
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
Object.assign(process.env, { NODE_ENV: process.env.NODE_ENV ?? "test" });
