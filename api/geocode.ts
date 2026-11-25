import { createRuntimeHandlers } from '../server/runtime.js';

const handlers = createRuntimeHandlers();
export default { fetch: handlers.geocode };
