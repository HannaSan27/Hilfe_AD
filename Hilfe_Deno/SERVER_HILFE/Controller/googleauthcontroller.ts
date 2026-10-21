import { Context, hash } from "./../Dependencies/dependencies.ts";
import { buscarUsuarioPorCorreo, crearUsuario } from "./../Models/usuariosModel.ts";
import { generarToken, generarTokenVerificacion } from "./../Helpers/jwtHelper.ts";
import { verificarTokenGoogle, crearTokenRegistroGoogle, leerTokenRegistroGoogle} from "./../Helpers/googlehelpers.ts";
import { crearSolicitudVerificacion, obtenerSolicitudPorUsuarioId } from "../Models/verificacionesModel.ts";
import { obtenerDocumentosLegalesVigentes, registrarAceptacionLegal } from "../Models/legalesModel.ts";
import { validarTipoDocumento, validarNumeroDocumento, validarFechaExpedicion } from "../Helpers/validaciones.ts";
import client from "../Models/conexion.ts";

function respuestaSesion(usuario: Record<string, unknown>, token: string) {
  return {
    mensaje: "Login exitoso",
    token,
    usuario: {
      id: usuario.Id_Usuario,
      nombre: usuario.Nombre,
      correo: usuario.Correo,
      rol: usuario.Id_Rol,
    },
  };
}

// POST /api/auth/google
export async function loginGoogle(ctx: Context) {
  let credential: string | undefined;
  try {
    const body = await ctx.request.body.json();
    credential = body.credential;
  } catch {
    // body vacío o inválido
  }

  if (!credential) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Falta el token de Google" };
    return;
  }

  let datosGoogle;
  try {
    datosGoogle = await verificarTokenGoogle(credential);
  } catch (error) {
    console.error("Google: token no válido:", error);
    ctx.response.status = 401;
    ctx.response.body = { mensaje: "No se pudo verificar la cuenta de Google" };
    return;
  }

  const usuario = await buscarUsuarioPorCorreo(datosGoogle.correo);

  // Cuenta existente: solo las aprobadas entran al panel.
  if (usuario) {
    if (usuario.Estado && usuario.Estado !== "Activo") {
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "Tu cuenta no está activa" };
      return;
    }

    const esAdmin = Number(usuario.Id_Rol) === 1;
    const estadoVerificacion = usuario.Estado_Verificacion || (usuario.Verificado === 1 ? "aprobado" : "pendiente");
    if (!esAdmin && estadoVerificacion !== "aprobado") {
      const solicitud = await obtenerSolicitudPorUsuarioId(Number(usuario.Id_Usuario));

      // Las cuentas Google anteriores a la verificación pueden no tener documento ni solicitud.
      // En ese caso se continúa por el formulario legal de identidad para crear una solicitud real.
      if (!solicitud) {
        ctx.response.status = 200;
        ctx.response.body = {
          existe: false,
          requiereVerificacion: true,
          rol: Number(usuario.Id_Rol),
          registroToken: await crearTokenRegistroGoogle(datosGoogle),
          correo: datosGoogle.correo,
          nombre: datosGoogle.nombre,
        };
        return;
      }

      ctx.response.status = 403;
      ctx.response.body = {
        mensaje: estadoVerificacion === "en_revision"
          ? "Tu solicitud de verificación está en revisión. Te notificaremos cuando termine el cotejo."
          : estadoVerificacion === "requiere_informacion"
            ? "Tu solicitud de verificación requiere información adicional."
            : estadoVerificacion === "rechazado"
              ? "Tu solicitud de verificación fue rechazada. Consulta el motivo con el equipo de Hilf'e."
              : "Tu cuenta está pendiente de verificación. El equipo de Hilf'e revisará tu solicitud.",
        codigo: `CUENTA_${String(estadoVerificacion).toUpperCase()}`,
        estadoVerificacion,
        token: await generarTokenVerificacion(Number(usuario.Id_Usuario), Number(usuario.Id_Rol)),
        usuario: {
          id: usuario.Id_Usuario,
          nombre: usuario.Nombre,
          correo: usuario.Correo,
          rol: usuario.Id_Rol,
        },
      };
      return;
    }

    const token = await generarToken(usuario.Id_Usuario, usuario.Id_Rol);
    ctx.response.status = 200;
    ctx.response.body = { existe: true, ...respuestaSesion(usuario, token) };
    return;
  }

  // Cuenta nueva: devolver token temporal para elegir rol
  ctx.response.status = 200;
  ctx.response.body = {
    existe: false,
    registroToken: await crearTokenRegistroGoogle(datosGoogle),
    correo: datosGoogle.correo,
    nombre: datosGoogle.nombre,
  };
}

// POST /api/auth/google/completar
export async function completarGoogle(ctx: Context) {
  let registroToken: string | undefined;
  let rol: number | undefined;
  let body: Record<string, unknown> = {};
  try {
    body = await ctx.request.body.json();
    registroToken = String(body.registroToken || "");
    rol = Number(body.rol);
  } catch {
    // body vacío o inválido
  }

  // Solo trabajador (2) o cliente (3). Nunca admin.
  if (!registroToken || (rol !== 2 && rol !== 3)) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Datos o rol no válidos" };
    return;
  }

  let datosGoogle;
  try {
    datosGoogle = await leerTokenRegistroGoogle(registroToken);
  } catch {
    ctx.response.status = 401;
    ctx.response.body = { mensaje: "La sesión de Google expiró, intenta de nuevo" };
    return;
  }

  const usuarioExistente = await buscarUsuarioPorCorreo(datosGoogle.correo);

  const nombre = String(body.nombre || "").trim();
  const telefono = String(body.telefono || "").trim();
  const ubicacion = String(body.ubicacion || "").trim();
  const tipoDocumento = String(body.tipoDocumento || "").trim().toUpperCase();
  const numeroDocumento = String(body.numeroDocumento || "").trim();
  const fechaExpedicionDocumento = String(body.fechaExpedicionDocumento || "").trim();
  const aceptacionesLegales = Array.isArray(body.aceptacionesLegales) ? body.aceptacionesLegales as Array<{ codigo?: string; version?: string }> : [];

  if (nombre.length < 3 || telefono.length < 7 || telefono.length > 10 || !/^\d+$/.test(telefono) || !ubicacion) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Completa tu nombre, teléfono y ubicación para continuar." };
    return;
  }

  const numeroValido = validarNumeroDocumento(tipoDocumento, numeroDocumento);
  const fechaValida = validarFechaExpedicion(fechaExpedicionDocumento);
  if (!validarTipoDocumento(tipoDocumento) || !numeroValido.valido || !fechaValida.valido) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: numeroValido.mensaje || fechaValida.mensaje || "Los datos del documento no son válidos." };
    return;
  }

  let perfilProfesional: { idCategoria: number; experiencia: string; descripcion: string } | null = null;
  if (rol === 2) {
    const idCategoria = Number(body.idCategoriaProfesional);
    const experiencia = String(body.experiencia || "");
    const descripcion = String(body.descripcionProfesional || "").trim();
    const experienciasValidas = new Set(["Menos de 1 año", "1 a 3 años", "3 a 5 años", "Más de 5 años", "Más de 10 años"]);
    if (!Number.isInteger(idCategoria) || idCategoria <= 0 || !experienciasValidas.has(experiencia) || descripcion.length < 25 || descripcion.length > 1500) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Completa una categoría, experiencia y descripción profesional válidas." };
      return;
    }
    const categoriaExiste = await client.query("SELECT Id_Categoria FROM categorias WHERE Id_Categoria = ?", [idCategoria]);
    if (!categoriaExiste.length) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "La categoría profesional seleccionada no está disponible." };
      return;
    }
    perfilProfesional = { idCategoria, experiencia, descripcion };
  }

  if (usuarioExistente && (Number(usuarioExistente.Id_Rol) !== rol || Number(usuarioExistente.Id_Rol) === 1)) {
    ctx.response.status = 409;
    ctx.response.body = { mensaje: "La cuenta existente pertenece a otro rol y no se puede cambiar durante el registro." };
    return;
  }

  if (usuarioExistente) {
    const solicitudExistente = await obtenerSolicitudPorUsuarioId(Number(usuarioExistente.Id_Usuario));
    if (solicitudExistente) {
      ctx.response.status = 409;
      ctx.response.body = { mensaje: "Esta cuenta ya tiene una solicitud de verificación. Inicia sesión con Google para consultar su estado." };
      return;
    }
  }

  const documentosActuales = await obtenerDocumentosLegalesVigentes();
  const aceptaciones = new Map<string, string>();
  for (const item of aceptacionesLegales) {
    if (item && typeof item.codigo === "string" && typeof item.version === "string") {
      aceptaciones.set(item.codigo, item.version);
    }
  }
  const codigosRequeridos = [
    "terminos_condiciones",
    rol === 2 ? "condiciones_trabajador" : "condiciones_cliente",
    "politica_privacidad",
    "autorizacion_datos",
  ];
  const versionesActuales = new Map(documentosActuales.map((doc) => [doc.codigo, doc.version]));
  if (codigosRequeridos.some((codigo) => !versionesActuales.has(codigo) || aceptaciones.get(codigo) !== versionesActuales.get(codigo))) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Debes aceptar los documentos legales vigentes para enviar tu solicitud de revisión." };
    return;
  }

  const documentoEnUso = await client.query(
    "SELECT Id_Usuario FROM usuarios WHERE Tipo_Documento = ? AND Numero_Documento = ? AND Id_Usuario <> ?",
    [tipoDocumento, numeroDocumento, Number(usuarioExistente?.Id_Usuario || 0)]
  );
  if (documentoEnUso.length) {
    ctx.response.status = 409;
    ctx.response.body = { mensaje: "Ya existe una cuenta registrada con este número de documento de identidad." };
    return;
  }

  // Contraseña aleatoria con hash: la columna queda llena y nadie puede
  // entrar con contraseña a esta cuenta (solo con Google o recuperándola).
  let idUsuario: number;
  if (usuarioExistente) {
    idUsuario = Number(usuarioExistente.Id_Usuario);
    await client.execute(
      `UPDATE usuarios
       SET Nombre = ?, Telefono = ?, Ubicacion = ?, Tipo_Documento = ?, Numero_Documento = ?,
           Fecha_Expedicion_Documento = ?, Estado_Verificacion = 'pendiente', Verificado = 0,
           Categoria_Profesional = ?, Experiencia = ?, Descripcion_Profesional = ?
       WHERE Id_Usuario = ?`,
      [nombre, telefono, ubicacion, tipoDocumento, numeroDocumento, fechaExpedicionDocumento,
        perfilProfesional?.idCategoria ?? null, perfilProfesional?.experiencia ?? null,
        perfilProfesional?.descripcion ?? null, idUsuario]
    );
  } else {
    const contrasenaAleatoria = await hash(crypto.randomUUID() + crypto.randomUUID());
    const resultado = await crearUsuario(
      rol,
      nombre,
      datosGoogle.correo,
      contrasenaAleatoria,
      telefono,
      ubicacion,
      tipoDocumento,
      numeroDocumento,
      fechaExpedicionDocumento,
      "pendiente",
      perfilProfesional
    );
    idUsuario = Number(resultado.lastInsertId);
  }
  await crearSolicitudVerificacion(idUsuario, tipoDocumento, numeroDocumento, fechaExpedicionDocumento);

  const ip = ctx.request.ip || null;
  const userAgent = ctx.request.headers.get("user-agent") || null;
  for (const codigo of codigosRequeridos) {
    await registrarAceptacionLegal(idUsuario, codigo, versionesActuales.get(codigo)!, ip, userAgent, "google_y_checkbox_confirmacion_manual");
  }

  const usuario = await buscarUsuarioPorCorreo(datosGoogle.correo);
  const token = await generarToken(usuario.Id_Usuario, usuario.Id_Rol);

  ctx.response.status = 201;
  ctx.response.body = {
    ...respuestaSesion(usuario, token),
    idUsuario,
    estado: "pendiente",
    mensaje: "Cuenta creada. Tu solicitud de verificación quedó pendiente de revisión.",
  };
}
