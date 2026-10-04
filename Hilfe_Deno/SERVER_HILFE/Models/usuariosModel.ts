import client from "./conexion.ts";

export async function buscarUsuarioPorCorreo(correo: string) {
  const resultado = await client.query(
    "SELECT * FROM usuarios WHERE Correo = ?",
    [correo]
  );
  return resultado[0];
}

export async function buscarUsuarioPorId(id: number) {
  const resultado = await client.query(
    "SELECT Id_Usuario, Id_Rol, Nombre, Correo, Telefono, Ubicacion, Foto_Perfil, Estado FROM usuarios WHERE Id_Usuario = ?",
    [id]
  );
  return resultado[0];
}

export async function crearUsuario(
  idRol: number,
  nombre: string,
  correo: string,
  contrasenaEncriptada: string,
  telefono: string,
  ubicacion: string
) {
  const resultado = await client.execute(
    `INSERT INTO usuarios (Id_Rol, Nombre, Correo, Contrasena, Telefono, Ubicacion, Fecha_Registro, Estado)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), 'Activo')`,
    [idRol, nombre, correo, contrasenaEncriptada, telefono, ubicacion]
  );
  return resultado;
}

// Actualiza nombre, teléfono y ubicación (según EditarPerfil del proyecto en C#)
export async function actualizarUsuario(
  id: number,
  nombre: string,
  telefono: string,
  ubicacion: string
) {
  const resultado = await client.execute(
    "UPDATE usuarios SET Nombre = ?, Telefono = ?, Ubicacion = ? WHERE Id_Usuario = ?",
    [nombre, telefono, ubicacion, id]
  );
  return resultado;
}

export async function actualizarFotoPerfil(id: number, fotoPerfil: string) {
  const resultado = await client.execute(
    "UPDATE usuarios SET Foto_Perfil = ? WHERE Id_Usuario = ?",
    [fotoPerfil, id]
  );
  return resultado;
}

export async function actualizarContrasena(correo: string, contrasenaEncriptada: string) {
  const resultado = await client.execute(
    "UPDATE usuarios SET Contrasena = ? WHERE Correo = ?",
    [contrasenaEncriptada, correo]
  );
  return resultado;
}
