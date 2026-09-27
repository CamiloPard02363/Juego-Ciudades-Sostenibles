// Vista previa por defecto. --apply exige --backup con una ruta local no versionada.
// node server/scripts/update-identidad-oculta-card.mjs --env-file server/test/.env
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { parse } from 'dotenv';
import { BSON, MongoClient } from 'mongodb';

const args = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];
const target = {
  _id: '71fb158c-0b6d-42e9-b2e8-dbc363db661b',
  slug: 'quien-es-de-banderas',
  gameType: 'GUESS_WHO',
};
const title = 'Identidad Oculta';
const description = 'Invita a un amigo a conectarse y descubre quién o qué se esconde mediante preguntas, pistas y características.';
const unchanged = ({ title, description, updatedAt, version, ...rest }) => rest;

async function main() {
  const envFile = args.includes('--env-file') ? option('--env-file') : null;
  const env = envFile ? parse(readFileSync(envFile)) : process.env;
  assert.ok(env.MONGODB_URI, 'Falta MONGODB_URI');
  const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const games = client.db().collection('games');
    const before = await games.findOne(target);
    assert.ok(before, 'No se encontró la actividad esperada');
    if (before.title === title && before.description === description) {
      console.log(JSON.stringify({ status: 'already_updated', id: before._id, title, description, slug: before.slug }));
      return;
    }
    assert.equal(before.title, '¿Quién Es? de Banderas', 'El nombre cambió; revisar antes de actualizar');
    assert.equal(before.status, 'PUBLISHED');
    if (!args.includes('--apply')) {
      console.log(JSON.stringify({ status: 'preview', id: before._id, before: { title: before.title, description: before.description }, after: { title, description }, slugPreserved: before.slug }));
      return;
    }
    assert.ok(args.includes('--backup') && option('--backup'), 'Se requiere --backup');
    writeFileSync(option('--backup'), BSON.EJSON.stringify(before, null, 2, { relaxed: false }), { flag: 'wx', mode: 0o600 });
    const result = await games.updateOne({
      ...target,
      title: before.title,
      description: before.description,
      status: before.status,
      version: before.version === undefined ? { $exists: false } : before.version,
      updatedAt: before.updatedAt === undefined ? { $exists: false } : before.updatedAt,
    }, {
      $set: { title, description, updatedAt: new Date() },
      $inc: { version: 1 },
    });
    assert.equal(result.matchedCount, 1, 'El registro cambió concurrentemente; no se actualizó');
    assert.equal(result.modifiedCount, 1);
    const after = await games.findOne({ _id: before._id });
    assert.equal(after.title, title);
    assert.equal(after.description, description);
    assert.equal(after.version, (before.version ?? 0) + 1);
    assert.deepEqual(unchanged(after), unchanged(before), 'Cambió un campo ajeno al cambio solicitado');
    console.log(JSON.stringify({ status: 'verified', modifiedCount: result.modifiedCount, id: after._id, title: after.title, description: after.description, slug: after.slug, otherGameFieldsUnchanged: true }));
  } finally {
    await client.close();
  }
}

main().catch(error => {
  // Los errores de conexión pueden contener credenciales: no imprimir su mensaje.
  console.error(JSON.stringify({ status: 'failed', type: error.name, code: error.code, message: error.name === 'AssertionError' ? error.message : 'Operación fallida; detalles de conexión omitidos.' }));
  process.exitCode = 1;
});
