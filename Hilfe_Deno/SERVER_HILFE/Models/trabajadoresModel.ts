import client from "./conexion.ts";

// Lista todos los usuarios con rol de Trabajador (Id_Rol = 2)
export async function listarTrabajadores() {
  const resultado = await client.query(
    "SELECT Id_Usuario, Nombre, Ubicacion, Foto_Perfil FROM usuarios WHERE Id_Rol = 2 AND Estado = 'Activo'"
  );
  return resultado;
}

// Trae el perfil público de un trabajador específico
export async function buscarTrabajadorPorId(id: number) {
  const resultado = await client.query(
    "SELECT Id_Usuario, Nombre, Telefono, Ubicacion, Foto_Perfil FROM usuarios WHERE Id_Usuario = ? AND Id_Rol = 2",
    [id]
  );
  return resultado[0];
}