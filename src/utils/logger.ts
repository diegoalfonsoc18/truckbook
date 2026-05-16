/**
 * Logger seguro para producción.
 *
 * En desarrollo (__DEV__ = true) imprime igual que console.*.
 * En producción (__DEV__ = false) los métodos son no-op,
 * evitando filtración de datos personales (placas, emails, respuestas de API)
 * en logs accesibles vía herramientas de debug o crash reporters.
 *
 * Uso:
 *   import logger from "../utils/logger";
 *   logger.log("mensaje");
 *   logger.error("algo falló", err);
 *   logger.warn("ojo con esto");
 */

/* eslint-disable no-console */

const noop = () => {};

const logger = __DEV__
  ? {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
    }
  : {
      log: noop,
      error: noop,
      warn: noop,
    };

export default logger;
