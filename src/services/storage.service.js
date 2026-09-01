const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { AppError } = require('../errors/AppError');

const MIME_PARA_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function extensaoDeMime(mimetype) {
  return MIME_PARA_EXT[mimetype] || null;
}

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET;
  if (!url || !key || !bucket) {
    throw new AppError('Serviço de imagens indisponível', 503);
  }
  return { url, key, bucket };
}

function getClient() {
  const { url, key, bucket } = getConfig();
  return { supabase: createClient(url, key), bucket };
}

function pathFromPublicUrl(urlImagem) {
  if (!urlImagem || typeof urlImagem !== 'string') {
    return null;
  }
  let bucket;
  try {
    ({ bucket } = getConfig());
  } catch {
    return null;
  }
  const marker = `/object/public/${bucket}/`;
  const idx = urlImagem.indexOf(marker);
  if (idx === -1) {
    return null;
  }
  const path = urlImagem.slice(idx + marker.length).split('?')[0];
  return path ? decodeURIComponent(path) : null;
}

async function uploadImagemAnimal(idAnimal, file) {
  const ext = extensaoDeMime(file.mimetype);
  if (!ext) {
    throw new AppError('tipo de arquivo inválido (use JPEG, PNG ou WebP)');
  }

  const { supabase, bucket } = getClient();
  const path = `${idAnimal}/${crypto.randomUUID()}.${ext}`;
  const contentType = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;

  const { error } = await supabase.storage.from(bucket).upload(path, file.buffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    console.error(error);
    throw new AppError('Serviço de imagens indisponível', 503);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new AppError('Serviço de imagens indisponível', 503);
  }
  return data.publicUrl;
}

async function removerObjeto(urlImagem) {
  const path = pathFromPublicUrl(urlImagem);
  if (!path) {
    return;
  }
  try {
    const { supabase, bucket } = getClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      console.error(error);
    }
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  MIME_PARA_EXT,
  extensaoDeMime,
  uploadImagemAnimal,
  removerObjeto,
};
