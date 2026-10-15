import { supabase } from './supabase';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

/* ------------------------------- METAS ------------------------------- */
export async function obtenerMetas() {
  const { data, error } = await supabase
    .from('metas_usuario')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data; // null si aún no configuraste nada
}

export async function guardarMetas(metas) {
  return ok(
    await supabase
      .from('metas_usuario')
      .upsert({ ...metas, id: 1, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select()
      .single()
  );
}

/* ------------------------------ COMIDAS ------------------------------ */
export async function insertarComida(fila) {
  return ok(await supabase.from('registros_comidas').insert(fila).select().single());
}

export async function obtenerComidas(fecha) {
  return ok(
    await supabase
      .from('registros_comidas')
      .select('*')
      .eq('fecha', fecha)
      .order('created_at', { ascending: true })
  );
}

export async function obtenerComidasRango(desde, hasta) {
  return ok(
    await supabase
      .from('registros_comidas')
      .select('*')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: true })
  );
}

export async function eliminarComida(id) {
  ok(await supabase.from('registros_comidas').delete().eq('id', id));
}

/* ----------------------------- EJERCICIOS ---------------------------- */
export async function insertarEjercicio(fila) {
  return ok(await supabase.from('registros_ejercicios').insert(fila).select().single());
}

export async function obtenerEjercicios(fecha) {
  return ok(
    await supabase
      .from('registros_ejercicios')
      .select('*')
      .eq('fecha', fecha)
      .order('created_at', { ascending: true })
  );
}

export async function obtenerEjerciciosRango(desde, hasta) {
  return ok(
    await supabase
      .from('registros_ejercicios')
      .select('*')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: true })
  );
}

export async function eliminarEjercicio(id) {
  ok(await supabase.from('registros_ejercicios').delete().eq('id', id));
}
