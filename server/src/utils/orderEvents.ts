import { EventEmitter } from "events";

export const orderEvents = new EventEmitter();

// Maximize listeners limit to support multiple concurrent active client streams
orderEvents.setMaxListeners(200);
