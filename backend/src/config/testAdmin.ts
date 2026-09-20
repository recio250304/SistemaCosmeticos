import { supabaseAdmin } from "./supabaseAdmin.js";

async function probarClienteAdmin() {
  const { data, error } =
    await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

  if (error) {
    console.error("ERROR EN CLIENTE ADMIN:");
    console.error(error);
    process.exit(1);
  }

  console.log("CLIENTE ADMINISTRATIVO FUNCIONANDO.");
  console.log(`Usuarios encontrados: ${data.users.length}`);
}

probarClienteAdmin();