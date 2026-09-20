import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Falta SUPABASE_URL en el archivo .env"
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Falta SUPABASE_SERVICE_ROLE_KEY en el archivo .env"
  );
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const email =
  "josemiguelloteka@gmail.com";

/*
 * ESCRIBE AQUÍ LA NUEVA CONTRASEÑA
 * No me la envíes.
 */
const nuevaPassword =
  "Ampherny2503@";

async function main() {
  console.log(
    "Buscando usuario en Supabase Auth..."
  );

  const { data, error } =
    await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100
    });

  if (error) {
    throw new Error(
      `Error buscando usuarios: ${error.message}`
    );
  }

  const usuario = data.users.find(
    (user) =>
      user.email?.toLowerCase() ===
      email.toLowerCase()
  );

  if (!usuario) {
    throw new Error(
      "No se encontró el usuario en Supabase Auth."
    );
  }

  console.log(
    "Usuario encontrado:",
    usuario.email
  );

  console.log(
    "Actualizando contraseña..."
  );

  const { error: updateError } =
    await supabaseAdmin.auth.admin.updateUserById(
      usuario.id,
      {
        password: nuevaPassword
      }
    );

  if (updateError) {
    throw new Error(
      `Error actualizando contraseña: ${updateError.message}`
    );
  }

  console.log(
    "Contraseña actualizada correctamente."
  );

  console.log(
    "Ahora puedes probar el login con operador1."
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : error
  );

  process.exit(1);
});