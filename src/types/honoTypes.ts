// Bindings type for environment variables
export type Bindings = {
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_BUCKET_NAME: string;
  AWS_ENDPOINT: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  UNKEY_API_ID: string;
  UNKEY_ROOT_KEY: string;
};

export type AppBindings = {
  Bindings: Bindings;
};
