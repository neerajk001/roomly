export interface PresignPutInput {
  key: string;
  contentType: string;
  contentLength?: number;
  expiresInSeconds?: number;
}

export interface HeadResult {
  exists: boolean;
  contentLength: number;
  contentType: string | undefined;
}

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}
