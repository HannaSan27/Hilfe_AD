import client from "./conexion.ts";

// Lista todos los usuarios con rol de Trabajador (Id_Rol = 2)
export async function listarTrabajadores() {
  const resultado = await client.query(
    `SELECT u.Id_Usuario, u.Nombre, u.Ubicacion, u.Foto_Perfil, u.Verificado,
            u.Experiencia, u.Descripcion_Profesional, c.Nombre_Categoria AS Categoria
     FROM usuarios u
     LEFT JOIN categorias c ON c.Id_Categoria = u.Categoria_Profesional
     WHERE u.Id_Rol = 2 AND u.Estado = 'Activo'
       AND u.Verificado = 1 AND u.Estado_Verificacion = 'aprobado'`
  );
  return resultado;
}

// Trae el perfil público de un trabajador específico
export async function buscarTrabajadorPorId(id: number) {
  const resultado = await client.query(
    `SELECT u.Id_Usuario, u.Nombre, u.Telefono, u.Ubicacion, u.Foto_Perfil, u.Verificado,
            u.Experiencia, u.Descripcion_Profesional, c.Nombre_Categoria AS Categoria
     FROM usuarios u
     LEFT JOIN categorias c ON c.Id_Categoria = u.Categoria_Profesional
     WHERE u.Id_Usuario = ? AND u.Id_Rol = 2 AND u.Estado = 'Activo'
       AND u.Verificado = 1 AND u.Estado_Verificacion = 'aprobado'`,
    [id]
  );
  return resultado[0];
}
