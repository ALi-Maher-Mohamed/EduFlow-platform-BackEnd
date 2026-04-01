const { ZodError } = require("zod");
const ApiError = require("../utils/ApiError");

/**
 * Zod validation middleware wrapper
 * Extracts body, query, and params from the request and validates against schema
 */
const validate = (schema) => async (req, res, next) => {
  try {
    const validatedData = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Update req properties with potentially transformed/coerced values from validator
    req.body = validatedData.body || req.body;
    req.query = validatedData.query || req.query;
    req.params = validatedData.params || req.params;

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      // Pass the ZodError directly to our global errorHandler
      next(error);
    } else {
      next(new ApiError("Internal validation error", 500));
    }
  }
};

module.exports = validate;
