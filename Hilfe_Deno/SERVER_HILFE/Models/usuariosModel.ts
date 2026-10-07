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

// Cuenta únicamente los cambios reales del nombre completo en el mes calendario actual.
export async function actualizarUsuarioConLimiteNombre(
  id: number,
  nombre: string,
  telefono: string,
  ubicacion: string
) {
  return await client.execute(
    `UPDATE usuarios
     SET Nombre_Cambios_Mes = CASE
           WHEN NOT (BINARY Nombre <=> BINARY ?) THEN
             CASE WHEN Mes_Cambio_Nombre = DATE_FORMAT(CURDATE(), '%Y-%m')
               THEN Nombre_Cambios_Mes + 1 ELSE 1 END
           ELSE Nombre_Cambios_Mes
         END,
         Mes_Cambio_Nombre = CASE
           WHEN NOT (BINARY Nombre <=> BINARY ?) THEN DATE_FORMAT(CURDATE(), '%Y-%m')
           ELSE Mes_Cambio_Nombre
         END,
         Telefono = ?, Ubicacion = ?, Nombre = ?
     WHERE Id_Usuario = ?
       AND (BINARY Nombre <=> BINARY ?
         OR Mes_Cambio_Nombre IS NULL
         OR Mes_Cambio_Nombre <> DATE_FORMAT(CURDATE(), '%Y-%m')
         OR Nombre_Cambios_Mes < 3)`,
    [nombre, nombre, telefono, ubicacion, nombre, id, nombre]
  );
}

export async function consultarCambiosNombreRestantes(id: number) {
  const resultado = await client.query(
    `SELECT CASE
       WHEN Mes_Cambio_Nombre = DATE_FORMAT(CURDATE(), '%Y-%m')
         THEN GREATEST(0, 3 - Nombre_Cambios_Mes)
       ELSE 3
     END AS cambiosNombreRestantes
     FROM usuarios WHERE Id_Usuario = ?`,
    [id]
  );
  return Number(resultado[0]?.cambiosNombreRestantes ?? 3);
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
