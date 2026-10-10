
import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { Memory } from "./Memory.js";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }

  return value;
}

export const AppDataSource = new DataSource({
  type: "postgres",
  host: requiredEnv("DB_HOST"),
  port: Number(requiredEnv("DB_PORT")),
  username: requiredEnv("DB_USERNAME"),
  password: requiredEnv("DB_PASSWORD"),
  database: requiredEnv("DB_DATABASE"),
  entities: [Memory],
  synchronize: false,
  logging: false,
});
