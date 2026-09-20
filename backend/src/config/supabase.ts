import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Falta SUPABASE_URL en el archivo .env"
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Falta SUPABASE_ANON_KEY en el archivo .env"
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "Falta SUPABASE_SERVICE_ROLE_KEY en el archivo .env"
  );
}

/*
 * Cliente normal.
 *
 * Se utiliza para operaciones que deben respetar
 * las políticas RLS del usuario autenticado.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

/*
 * Cliente administrativo.
 *
 * Utiliza la Service Role Key y permite al backend
 * realizar operaciones administrativas sin quedar
 * limitado por las políticas RLS del usuario.
 *
 * IMPORTANTE:
 * Esta clave nunca debe enviarse al frontend.
 */
export const supabaseAdmin =
  createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );