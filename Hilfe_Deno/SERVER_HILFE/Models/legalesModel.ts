import client from "./conexion.ts";
import { DOCUMENTOS_LEGALES, type DocumentoLegal } from "../Helpers/documentosLegales.ts";

export async function sincronizarDocumentosLegales(): Promise<void> {
  for (const doc of DOCUMENTOS_LEGALES) {
    await client.execute(
      "UPDATE terminos_legales SET Es_Vigente = 0 WHERE Codigo_Documento = ?",
      [doc.codigo]
    );
    const existe = await client.query(
      "SELECT Id_Termino FROM terminos_legales WHERE Codigo_Documento = ? AND Version = ?",
      [doc.codigo, doc.version]
    );
    if (!existe || existe.length === 0) {
      await client.execute(
        `INSERT INTO terminos_legales (Codigo_Documento, Titulo, Version, Contenido, Es_Vigente)
         VALUES (?, ?, ?, ?, 1)`,
        [doc.codigo, doc.titulo, doc.version, doc.contenido]
      );
    } else {
      await client.execute(
        "UPDATE terminos_legales SET Es_Vigente = 1 WHERE Codigo_Documento = ? AND Version = ?",
        [doc.codigo, doc.version]
      );
    }
  }
}

export async function obtenerDocumentosLegalesVigentes(): Promise<DocumentoLegal[]> {
  await sincronizarDocumentosLegales();
  const resultados = await client.query(
    `SELECT Codigo_Documento AS codigo, Titulo AS titulo, Version AS version, Contenido AS contenido
     FROM terminos_legales
     WHERE Es_Vigente = 1`
  );
  return resultados;
}

export async function registrarAceptacionLegal(
  idUsuario: number,
  codigoDocumento: string,
  version: string,
  ip: string | null = null,
  userAgent: string | null = null,
  accionAfirmativa = "checkbox_confirmacion_manual"
): Promise<void> {
  await client.execute(
    `INSERT INTO aceptaciones_legales (Id_Usuario, Codigo_Documento, Version, Fecha_Aceptacion, Direccion_IP, User_Agent, Accion_Afirmativa)
     VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
    [idUsuario, codigoDocumento, version, ip, userAgent, accionAfirmativa]
  );
}

export async function consultarAceptacionesUsuario(idUsuario: number) {
  const aceptaciones = await client.query(
    `SELECT a.Id_Aceptacion, a.Codigo_Documento, a.Version, a.Fecha_Aceptacion, a.Accion_Afirmativa, t.Titulo
     FROM aceptaciones_legales a
     LEFT JOIN terminos_legales t ON a.Codigo_Documento = t.Codigo_Documento AND a.Version = t.Version
     WHERE a.Id_Usuario = ?
     ORDER BY a.Fecha_Aceptacion DESC`,
    [idUsuario]
  );
  return aceptaciones;
}
