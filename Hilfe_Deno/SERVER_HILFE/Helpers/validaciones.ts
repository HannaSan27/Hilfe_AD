// Validaciones estrictas de datos de identidad, fechas y seguridad para Hilf'e

export const TIPOS_DOCUMENTO_VALIDOS = ["CC", "CE", "TI", "PASAPORTE", "PPT"] as const;
export type TipoDocumento = typeof TIPOS_DOCUMENTO_VALIDOS[number];

export function validarTipoDocumento(tipo: string): boolean {
  return TIPOS_DOCUMENTO_VALIDOS.includes(tipo?.toUpperCase() as TipoDocumento);
}

export function validarNumeroDocumento(tipo: string, numero: string): { valido: boolean; mensaje?: string } {
  if (!numero || typeof numero !== "string") {
    return { valido: false, mensaje: "El número de documento es obligatorio." };
  }
  const limpio = numero.trim();
  const tipoUpper = (tipo || "").toUpperCase();

  if (tipoUpper === "CC" || tipoUpper === "TI") {
    if (!/^\d{5,12}$/.test(limpio)) {
      return { valido: false, mensaje: "La cédula o tarjeta de identidad debe contener entre 5 y 12 dígitos numéricos." };
    }
  } else if (tipoUpper === "CE") {
    if (!/^\d{5,12}$/.test(limpio)) {
      return { valido: false, mensaje: "La cédula de extranjería debe contener entre 5 y 12 dígitos." };
    }
  } else if (tipoUpper === "PASAPORTE") {
    if (!/^[A-Za-z0-9]{6,16}$/.test(limpio)) {
      return { valido: false, mensaje: "El pasaporte debe contener entre 6 y 16 caracteres alfanuméricos." };
    }
  } else if (tipoUpper === "PPT") {
    if (!/^[A-Za-z0-9]{6,16}$/.test(limpio)) {
      return { valido: false, mensaje: "El Permiso por Protección Temporal debe contener entre 6 y 16 caracteres alfanuméricos." };
    }
  } else {
    if (!/^[A-Za-z0-9\-\.]{4,20}$/.test(limpio)) {
      return { valido: false, mensaje: "El formato de documento ingresado no es válido." };
    }
  }

  return { valido: true };
}

/**
 * Valida que una fecha sea real, válida en el calendario gregoriano (incluyendo años bisiestos)
 * y que no sea futura ni anterior a 1910.
 */
export function validarFechaExpedicion(fechaIso: string): { valido: boolean; mensaje?: string } {
  if (!fechaIso || typeof fechaIso !== "string") {
    return { valido: false, mensaje: "La fecha de expedición es obligatoria." };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaIso.trim());
  if (!match) {
    return { valido: false, mensaje: "La fecha de expedición debe tener formato AAAA-MM-DD." };
  }

  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);

  if (mes < 1 || mes > 12) {
    return { valido: false, mensaje: "El mes de expedición es inválido (1-12)." };
  }

  // Días máximos por mes considerando bisiestos
  const esBisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  const diasPorMes = [31, esBisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDias = diasPorMes[mes - 1];

  if (dia < 1 || dia > maxDias) {
    return { valido: false, mensaje: `El día ${dia} no es válido para el mes ${mes} del año ${anio}.` };
  }

  const fechaObj = new Date(anio, mes - 1, dia, 0, 0, 0, 0);
  const ahora = new Date();
  ahora.setHours(23, 59, 59, 999);

  if (fechaObj > ahora) {
    return { valido: false, mensaje: "La fecha de expedición no puede ser una fecha futura." };
  }

  if (anio < 1920) {
    return { valido: false, mensaje: "El año de expedición no puede ser anterior a 1920." };
  }

  return { valido: true };
}

export function validarFortalezaContrasena(contrasena: string): { valido: boolean; mensaje?: string } {
  if (!contrasena || contrasena.length < 8) {
    return { valido: false, mensaje: "La contraseña debe tener mínimo 8 caracteres." };
  }
  if (!/[A-Z]/.test(contrasena)) {
    return { valido: false, mensaje: "La contraseña debe incluir al menos una letra mayúscula." };
  }
  if (!/[a-z]/.test(contrasena)) {
    return { valido: false, mensaje: "La contraseña debe incluir al menos una letra minúscula." };
  }
  if (!/\d/.test(contrasena)) {
    return { valido: false, mensaje: "La contraseña debe incluir al menos un número." };
  }
  if (!/[^A-Za-z0-9]/.test(contrasena)) {
    return { valido: false, mensaje: "La contraseña debe incluir al menos un símbolo especial." };
  }
  return { valido: true };
}
