import { createHandler } from './handler.js';
import { createD1Repo } from './repo.js';

export default {
  async fetch(request, env) {
    const handler = createHandler({ repo: createD1Repo(env.DB), env });
    return handler(request);
  }
};
