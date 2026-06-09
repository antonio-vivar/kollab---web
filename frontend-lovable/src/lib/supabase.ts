import { createClient } from "@supabase/supabase-js";

// Conexión a Supabase (mismo proyecto que el backend en backend/schema.sql).
// La "publishable key" es pública por diseño; la seguridad real la impone el RLS.
const SUPABASE_URL = "https://rctqyvadzizjtgkdcpcb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Jf-wrS6EQIERE8K_i5osag_qlFkIIlO";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Credenciales demo (los 3 usuarios reales creados en Supabase Auth).
// Se usan para rellenar el formulario al pulsar los botones de rol.
export const DEMO_CREDENTIALS: Record<string, { email: string; password: string }> = {
  admin: { email: "admin@kollab.cl", password: "admin123" },
  gerente: { email: "ceo@kollab.cl", password: "gerente123" },
  colaborador: { email: "colaborador@kollab.cl", password: "colab123" },
};
