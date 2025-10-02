import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// For ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Goes from middleware folder (src/middleware) up to src, then to public/temp
    cb(null, path.join(__dirname, "../../public/temp"));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

export const upload = multer({ storage });






































// import multer from "multer";

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "../public/temp")
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname);
//   }
// })

// export const upload = multer({ storage: storage })