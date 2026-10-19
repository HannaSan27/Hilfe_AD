import { Context, hash, verificarContrasena } from "./../Dependencies/dependencies.ts";
import { buscarUsuarioPorCorreo, crearUsuario, actualizarContrasena } from "./../Models/usuariosModel.ts";
import { generarToken, generarTokenVerificacion } from "./../Helpers/jwtHelper.ts";
import { enviarCodigoRecuperacion } from "./../Helpers/correoHelper.ts";
import { guardarCodigo, verificarCodigoGuardado, borrarCodigo } from "./../Helpers/codigosRecuperacion.ts";
import {
  validarTipoDocumento,
  validarNumeroDocumento,
  validarFechaExpedicion,
  validarFortalezaContrasena,
} from "./../Helpers/validaciones.ts";
import {
  crearSolicitudVerificacion,
  obtenerSolicitudPorUsuarioId,
} from "./../Models/verificacionesModel.ts";
import { obtenerDocumentosLegalesVigentes, registrarAceptacionLegal } from "./../Models/legalesModel.ts";
import client from "./../Models/conexion.ts";

// POST /api/auth/registro
export async function registrar(ctx: Context) {
  let body: any;
  try {
    body = await ctx.request.body.json();
  } catch {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El cuerpo de la solicitud no es un JSON válido" };
    return;
  }

  const {
    idRol,
    nombre,
    correo,
    contrasena,
    telefono,
    ubicacion,
    tipoDocumento,
    numeroDocumento,
    fechaExpedicionDocumento,
    aceptacionesLegales,
    idCategoriaProfesional,
    experiencia,
    descripcionProfesional,
  } = body;

  const rolNum = Number(idRol);
  if (rolNum !== 2 && rolNum !== 3) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El rol seleccionado no es válido (2: Trabajador, 3: Cliente)" };
    return;
  }

  let perfilProfesional: { idCategoria: number; experiencia: string; descripcion: string } | null = null;
  if (rolNum === 2) {
    const categoriaId = Number(idCategoriaProfesional);
    const experienciasValidas = new Set(["Menos de 1 año", "1 a 3 años", "3 a 5 años", "Más de 5 años", "Más de 10 años"]);
    if (!Number.isInteger(categoriaId) || categoriaId <= 0 || !experienciasValidas.has(experiencia) ||
      typeof descripcionProfesional !== "string" || descripcionProfesional.trim().length < 25 || descripcionProfesional.trim().length > 1500) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Completa una categoría, experiencia y descripción profesional válidas" };
      return;
    }
    const categoriaExiste = await client.query("SELECT Id_Categoria FROM categorias WHERE Id_Categoria = ?", [categoriaId]);
    if (!categoriaExiste.length) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "La categoría profesional seleccionada no está disponible" };
      return;
    }
    perfilProfesional = { idCategoria: categoriaId, experiencia, descripcion: descripcionProfesional.trim() };
  }

  if (!nombre || typeof nombre !== "string" || nombre.trim().length < 3) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El nombre completo debe tener al menos 3 caracteres" };
    return;
  }

  if (!correo || typeof correo !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El correo electrónico no tiene un formato válido" };
    return;
  }

  const valPw = validarFortalezaContrasena(contrasena);
  if (!valPw.valido) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: valPw.mensaje };
    return;
  }

  if (!tipoDocumento || !validarTipoDocumento(tipoDocumento)) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Selecciona un tipo de documento válido (CC, CE, TI, PASAPORTE, PPT)" };
    return;
  }

  const valDoc = validarNumeroDocumento(tipoDocumento, numeroDocumento);
  if (!valDoc.valido) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: valDoc.mensaje };
    return;
  }

  const valFecha = validarFechaExpedicion(fechaExpedicionDocumento);
  if (!valFecha.valido) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: valFecha.mensaje };
    return;
  }

  // Verificar aceptaciones mínimas obligatorias (Ley 1581 de 2012 y Términos)
  const documentosActuales = await obtenerDocumentosLegalesVigentes();
  const aceptaciones = new Map<string, string>();
  if (Array.isArray(aceptacionesLegales)) {
    for (const item of aceptacionesLegales) {
      if (item && typeof item.codigo === "string" && typeof item.version === "string") {
        aceptaciones.set(item.codigo, item.version);
      }
    }
  }
  const codigosRequeridos = [
    "terminos_condiciones",
    rolNum === 2 ? "condiciones_trabajador" : "condiciones_cliente",
    "politica_privacidad",
    "autorizacion_datos",
  ];
  const versionesActuales = new Map(documentosActuales.map((doc) => [doc.codigo, doc.version]));

  if (codigosRequeridos.some((codigo) => !versionesActuales.has(codigo) || aceptaciones.get(codigo) !== versionesActuales.get(codigo))) {
    ctx.response.status = 400;
    ctx.response.body = {
      mensaje: "Debes leer y aceptar los Términos y Condiciones, la Política de Privacidad y otorgar la Autorización de Datos Personales para continuar.",
    };
    return;
  }

  // Comprobar correo único
  const usuarioExistente = await buscarUsuarioPorCorreo(correo.trim().toLowerCase());
  if (usuarioExistente) {
    ctx.response.status = 409;
    ctx.response.body = { mensaje: "Ese correo ya está registrado en la plataforma" };
    return;
  }

  // Comprobar número de documento único
  const docExistente = await client.query(
    "SELECT Id_Usuario FROM usuarios WHERE Tipo_Documento = ? AND Numero_Documento = ?",
    [tipoDocumento.toUpperCase(), numeroDocumento.trim()]
  );
  if (docExistente.length > 0) {
    ctx.response.status = 409;
    ctx.response.body = { mensaje: "Ya existe una cuenta registrada con este número de documento de identidad" };
    return;
  }

  const contrasenaEncriptada = await hash(contrasena);

  const resultado = await crearUsuario(
    rolNum,
    nombre.trim(),
    correo.trim().toLowerCase(),
    contrasenaEncriptada,
    telefono ? String(telefono).trim() : "",
    ubicacion ? String(ubicacion).trim() : "",
    tipoDocumento.toUpperCase(),
    numeroDocumento.trim(),
    fechaExpedicionDocumento.trim(),
    "pendiente",
    perfilProfesional
  );

  const idUsuario = Number(resultado.lastInsertId);

  // Crear la solicitud de verificación en la base de datos
  await crearSolicitudVerificacion(
    idUsuario,
    tipoDocumento.toUpperCase(),
    numeroDocumento.trim(),
    fechaExpedicionDocumento.trim()
  );

  // Registrar evidencia de aceptación legal
  const ip = ctx.request.ip || null;
  const userAgent = ctx.request.headers.get("user-agent") || null;

  for (const codigo of codigosRequeridos) {
    await registrarAceptacionLegal(
      idUsuario,
      codigo,
      versionesActuales.get(codigo)!,
      ip,
      userAgent,
      "checkbox_confirmacion_manual"
    );
  }

  // Token para permitir subida de foto de perfil durante registro
  const token = await generarToken(idUsuario, rolNum);

  ctx.response.status = 201;
  ctx.response.body = {
    mensaje: "Cuenta registrada con éxito. Tu cuenta se encuentra en verificación.",
    idUsuario,
    token,
    estado: "pendiente",
  };
}

// POST /api/auth/login
export async function login(ctx: Context) {
  let body: any;
  try {
    body = await ctx.request.body.json();
  } catch {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Cuerpo de solicitud inválido" };
    return;
  }

  const { correo, contrasena } = body;

  if (!correo || !contrasena) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Correo y contraseña son obligatorios" };
    return;
  }

  const usuario = await buscarUsuarioPorCorreo(correo.trim().toLowerCase());
  if (!usuario) {
    ctx.response.status = 401;
    ctx.response.body = { mensaje: "Correo o contraseña incorrectos" };
    return;
  }

  let contrasenaValida = false;
  const contrasenaAlmacenada = usuario.Contrasena;
  const hashBcryptValido =
    typeof contrasenaAlmacenada === "string" &&
    /^\$2[aby]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(contrasenaAlmacenada);

  if (hashBcryptValido) {
    contrasenaValida = await verificarContrasena(contrasena, contrasenaAlmacenada);
  } else if (contrasenaAlmacenada === contrasena) {
    const contrasenaEncriptada = await hash(contrasena);
    await actualizarContrasena(correo, contrasenaEncriptada);
    contrasenaValida = true;
  }

  if (!contrasenaValida) {
    ctx.response.status = 401;
    ctx.response.body = { mensaje: "Correo o contraseña incorrectos" };
    return;
  }

  // Verificación de estado de autorización
  const esAdmin = Number(usuario.Id_Rol) === 1;
  const estadoVerif = usuario.Estado_Verificacion || (usuario.Verificado === 1 ? "aprobado" : "pendiente");
  const tokenVerificacion = !esAdmin && estadoVerif !== "aprobado"
    ? await generarTokenVerificacion(Number(usuario.Id_Usuario), Number(usuario.Id_Rol))
    : null;

  if (!esAdmin && estadoVerif !== "aprobado") {
    const solicitud = await obtenerSolicitudPorUsuarioId(Number(usuario.Id_Usuario));

    if (estadoVerif === "pendiente") {
      ctx.response.status = 403;
      ctx.response.body = {
        mensaje: "Tu cuenta está en verificación. Te autorizaremos lo más rápido posible. Mientras tanto, no podrás utilizar todas las funciones de Hilf'e.",
        codigo: "CUENTA_PENDIENTE",
        estadoVerificacion: "pendiente",
        token: tokenVerificacion,
        usuario: {
          id: usuario.Id_Usuario,
          nombre: usuario.Nombre,
          correo: usuario.Correo,
          rol: usuario.Id_Rol,
        },
      };
      return;
    }

    if (estadoVerif === "en_revision") {
      ctx.response.status = 403;
      ctx.response.body = {
        mensaje: "Tu cuenta está siendo revisada por el equipo de verificación de Hilf'e. En breve te notificaremos.",
        codigo: "CUENTA_EN_REVISION",
        estadoVerificacion: "en_revision",
        token: tokenVerificacion,
        usuario: {
          id: usuario.Id_Usuario,
          nombre: usuario.Nombre,
          correo: usuario.Correo,
          rol: usuario.Id_Rol,
        },
      };
      return;
    }

    if (estadoVerif === "requiere_informacion") {
      ctx.response.status = 403;
      ctx.response.body = {
        mensaje: `Tu solicitud de verificación requiere información adicional o corrección de datos${solicitud?.Informacion_Requerida ? `: "${solicitud.Informacion_Requerida}"` : ""}. Puedes actualizar tus datos para continuar el proceso.`,
        codigo: "CUENTA_REQUIERE_INFO",
        estadoVerificacion: "requiere_informacion",
        token: tokenVerificacion,
        infoRequerida: solicitud?.Informacion_Requerida || null,
        usuario: {
          id: usuario.Id_Usuario,
          nombre: usuario.Nombre,
          correo: usuario.Correo,
          rol: usuario.Id_Rol,
        },
      };
      return;
    }

    if (estadoVerif === "rechazado") {
      ctx.response.status = 403;
      ctx.response.body = {
        mensaje: `En este momento no podemos aprobar tu cuenta de Hilf'e porque la información proporcionada no ha podido validarse.${solicitud?.Motivo_Rechazo ? ` Motivo: "${solicitud.Motivo_Rechazo}".` : ""} Consulta las opciones disponibles para solicitar una revisión cuando corresponda.`,
        codigo: "CUENTA_RECHAZADA",
        estadoVerificacion: "rechazado",
        token: tokenVerificacion,
        motivoRechazo: solicitud?.Motivo_Rechazo || null,
        usuario: {
          id: usuario.Id_Usuario,
          nombre: usuario.Nombre,
          correo: usuario.Correo,
          rol: usuario.Id_Rol,
        },
      };
      return;
    }

    ctx.response.status = 403;
    ctx.response.body = {
      mensaje: "Tu cuenta aún no está habilitada. Consulta el estado de verificación o contacta al equipo de Hilf'e.",
      codigo: "CUENTA_NO_HABILITADA",
      estadoVerificacion: estadoVerif,
      token: tokenVerificacion,
      usuario: { id: usuario.Id_Usuario, nombre: usuario.Nombre, rol: usuario.Id_Rol },
    };
    return;
  }

  const token = await generarToken(usuario.Id_Usuario, usuario.Id_Rol);

  ctx.response.status = 200;
  ctx.response.body = {
    mensaje: "Login exitoso",
    token: token,
    usuario: {
      id: usuario.Id_Usuario,
      nombre: usuario.Nombre,
      correo: usuario.Correo,
      rol: usuario.Id_Rol,
      verificado: usuario.Verificado === 1 || esAdmin,
      estadoVerificacion: esAdmin ? "aprobado" : estadoVerif,
    },
  };
}

// POST /api/auth/recuperar/solicitar
export async function solicitarRecuperacion(ctx: Context) {
  const body = await ctx.request.body.json();
  const { correo } = body;

  if (!correo) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El correo es obligatorio" };
    return;
  }

  const usuario = await buscarUsuarioPorCorreo(correo);
  if (!usuario) {
    // No decimos "el correo no existe" por seguridad (para no revelar qué correos están registrados)
    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Si el correo existe, se envió un código" };
    return;
  }

  const codigo = guardarCodigo(correo);
  await enviarCodigoRecuperacion(correo, codigo);

  ctx.response.status = 200;
  ctx.response.body = { mensaje: "Si el correo existe, se envió un código" };
}

// POST /api/auth/recuperar/verificar
export async function verificarCodigo(ctx: Context) {
  const body = await ctx.request.body.json();
  const { correo, codigo } = body;

  if (!correo || !codigo) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Correo y código son obligatorios" };
    return;
  }

  const esValido = verificarCodigoGuardado(correo, codigo);
  if (!esValido) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Código inválido o vencido" };
    return;
  }

  ctx.response.status = 200;
  ctx.response.body = { mensaje: "Código válido" };
}

// POST /api/auth/recuperar/nueva-contrasena
export async function restablecerContrasena(ctx: Context) {
  const body = await ctx.request.body.json();
  const { correo, codigo, nuevaContrasena } = body;

  if (!correo || !codigo || !nuevaContrasena) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Correo, código y nueva contraseña son obligatorios" };
    return;
  }

  const esValido = verificarCodigoGuardado(correo, codigo);
  if (!esValido) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Código inválido o vencido" };
    return;
  }

  const contrasenaEncriptada = await hash(nuevaContrasena);
  await actualizarContrasena(correo, contrasenaEncriptada);
  borrarCodigo(correo);

  ctx.response.status = 200;
  ctx.response.body = { mensaje: "Contraseña actualizada correctamente" };
}
