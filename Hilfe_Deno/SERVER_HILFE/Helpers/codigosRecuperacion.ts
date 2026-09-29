interface CodigoGuardado {
  codigo: string;
  correo: string;
  expira: number; // fecha límite en milisegundos
}

// Guarda los códigos activos mientras el servidor está corriendo
const codigosActivos = new Map<string, CodigoGuardado>();

export function guardarCodigo(correo: string): string {
  const codigo = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
  const expira = Date.now() + 15 * 60 * 1000; // 15 minutos desde ahora

  codigosActivos.set(correo, { codigo, correo, expira });
  return codigo;
}

export function verificarCodigoGuardado(correo: string, codigo: string): boolean {
  const guardado = codigosActivos.get(correo);

  if (!guardado) return false;
  if (Date.now() > guardado.expira) {
    codigosActivos.delete(correo);
    return false;
  }
  return guardado.codigo === codigo;
}

export function borrarCodigo(correo: string) {
  codigosActivos.delete(correo);
}