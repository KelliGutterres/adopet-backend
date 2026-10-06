const base = 'http://localhost:3000';

async function json(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${method} ${path} ${res.status} ${text}`);
  }
  return data;
}

async function main() {
  const user = await json('/auth/usuarios/login', {
    method: 'POST',
    body: { email: 'usuario@adopet.local', senha: 'senha123' },
  });
  const criado = await json('/animais', {
    method: 'POST',
    token: user.token,
    body: {
      nome: 'Bolinha',
      descricao: 'Cadastro temporario para validar o sino',
      status: 'P',
      especie: 'CAO',
      cidade: { nome: 'Lajeado', uf: 'RS' },
      raca: { nome: 'Vira-lata' },
    },
  });
  console.log(criado.animal.idAnimal);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
