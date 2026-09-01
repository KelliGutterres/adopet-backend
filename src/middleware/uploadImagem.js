const multer = require('multer');
const { AppError } = require('../errors/AppError');
const { MIME_PARA_EXT } = require('../services/storage.service');

const MAX_BYTES = 8 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (!MIME_PARA_EXT[file.mimetype]) {
      cb(new AppError('tipo de arquivo inválido (use JPEG, PNG ou WebP)'));
      return;
    }
    cb(null, true);
  },
});

function uploadImagem(req, res, next) {
  upload.single('imagem')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new AppError('imagem deve ter no máximo 8 MB'));
        return;
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        next(new AppError('envie o arquivo no campo imagem'));
        return;
      }
      next(new AppError('falha ao receber o arquivo'));
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}

module.exports = { uploadImagem };
