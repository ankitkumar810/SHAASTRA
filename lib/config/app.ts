const environment = process.env.NEXT_PUBLIC_APP_ENV ?? "development";

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "SHAASTRA",
  environment,
  isProduction: environment === "production",
} as const;
