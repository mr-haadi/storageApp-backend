import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);


export const sanitizeInputs = (fields = []) => {
  return (req, res, next) => {
    try {
      for (const field of fields) {
        if (typeof req.body[field] === "string") {
          req.body[field] = DOMPurify
            .sanitize(req.body[field], {
              ALLOWED_TAGS: [],
              ALLOWED_ATTR: [],
            })
            .trim();
        }
      }

      next();
    } catch (err) {
      next(new Error("Invalid Inputs!"));
    }
  };
};

export const sanitizeHeaders = (headers = []) => {
  return (req, res, next) => {
    try {
      for (const header of headers) {
        if (typeof req.headers[header] === "string") {
          req.headers[header] = DOMPurify
            .sanitize(req.headers[header], {
              ALLOWED_TAGS: [],
              ALLOWED_ATTR: [],
            })
            .trim();
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};