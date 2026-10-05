declare module 'swagger-ui-express' {
  import type { RequestHandler } from 'express';

  const swaggerUi: {
    serve: RequestHandler[];
    setup: (swaggerDocument: object) => RequestHandler;
  };

  export default swaggerUi;
}
