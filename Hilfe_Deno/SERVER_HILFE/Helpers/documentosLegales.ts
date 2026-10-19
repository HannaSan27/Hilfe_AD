// Documentos Legales para Hilf'e Colombia (Borrador técnico fundamentado en Ley 1581 de 2012 y normas de comercio electrónico)
// AVISO OBLIGATORIO: Borrador con finalidad técnica y regulatoria preliminar. Requiere revisión jurídica profesional antes de lanzamiento comercial.

export interface DocumentoLegal {
  codigo: string;
  titulo: string;
  version: string;
  resumen: string;
  contenido: string;
}

export const DOCUMENTOS_LEGALES: DocumentoLegal[] = [
  {
    codigo: "terminos_condiciones",
    titulo: "Términos y Condiciones Generales de Uso de Hilf'e",
    version: "1.0.0",
    resumen: "Regula el acceso, uso, intermediación tecnológica de servicios y responsabilidades generales en la plataforma Hilf'e.",
    contenido: `
# TÉRMINOS Y CONDICIONES GENERALES DE USO — PLATAFORMA HILF'E
**Versión:** 1.0.0 (Vigente)
*Aviso legal:* Este texto es un borrador operativo preliminar y requiere revisión y validación por un abogado colegiado en Colombia antes del inicio de operaciones comerciales.

## 1. NATURALEZA Y OBJETO DE LA PLATAFORMA
Hilf'e es una plataforma tecnológica de intermediación digital que facilita el contacto y la comunicación entre personas naturales o jurídicas que requieren la ejecución de tareas, oficios o servicios específicos ("Clientes") y profesionales, técnicos u operarios independientes capacitados para ejecutarlos ("Trabajadores").

Hilf'e **NO** presta directamente los servicios domésticos, técnicos ni profesionales ofrecidos por los Trabajadores. La relación contractual material del servicio se establece de forma directa, bilateral e independiente entre el Cliente y el Trabajador.

## 2. REQUISITOS DE CAPACIDAD Y REGISTRO
- Toda persona registrada debe ser mayor de edad (18 años cumplidos conforme al Código Civil Colombiano).
- Cada usuario se compromete a suministrar información verídica, exacta, actual y comprobable sobre su identidad, ubicación y calidades.
- Queda prohibida la suplantación de identidad, el uso de documentos ajenos y la creación de múltiples cuentas no autorizadas.

## 3. PROCESO DE VERIFICACIÓN DE IDENTIDAD
- Hilf'e implementa una etapa de verificación manual de identidad contra fuentes públicas legítimas (como la Registraduría Nacional del Estado Civil).
- **Alcance de la verificación:** La aprobación del documento certifica únicamente la vigencia y correspondencia formal del documento al momento de la revisión. **NO constituye una certificación de idoneidad técnica, moralidad, antecedentes judiciales ni garantía de satisfacción en el trabajo realizado.**
- Hilf'e se reserva la facultad de suspender cuentas cuando existan indicios de fraude, inconsistencia documental o incumplimiento reiterado.

## 4. OBLIGACIONES DE LAS PARTES
### Obligaciones del Cliente:
- Describir con veracidad el requerimiento del servicio, el lugar de ejecución y las condiciones de seguridad en el inmueble.
- Cumplir con los pagos acordados conforme a los mecanismos habilitados.
- Mantener un trato respetuoso y libre de discriminación o violencia.

### Obligaciones del Trabajador:
- Cumplir con los horarios, presupuestos y especificaciones acordadas.
- Desarrollar las labores con la debida diligencia, pericia y cuidado.
- Contar con afiliación vigente al Sistema de Seguridad Social Integral según su calidad de contratista independiente cuando la ley lo exija.

## 5. RECLAMACIONES, CONDUCTAS ABUSIVAS Y TERMINACIÓN
Hilf'e dispone de un canal de soporte y resolución de controversias (soportehilfe2@gmail.com). La reiteración de quejas, conductas delictivas, violencia o intentos de elusión de seguridad motivará la cancelación inmediata de la cuenta.
    `.trim(),
  },
  {
    codigo: "politica_privacidad",
    titulo: "Política de Tratamiento y Protección de Datos Personales",
    version: "1.0.0",
    resumen: "Establece las directrices para el tratamiento de datos personales bajo la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013 de Colombia.",
    contenido: `
# POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES — HILF'E
**Versión:** 1.0.0 | **Marco Normativo:** Ley 1581 de 2012, Decreto 1377 de 2013, Circular Externa SIC.
*Aviso legal:* Borrador normativo para la implementación técnica de privacidad. Debe ser formalizado por la administración jurídica de Hilf'e.

## 1. IDENTIFICACIÓN DEL RESPONSABLE
- **Plataforma:** Hilf'e Colombia
- **Contacto de Protección de Datos:** soportehilfe2@gmail.com
- **Finalidad del contacto:** Ejercicio de derechos Habeas Data (consulta, rectificación, supresión y revocatoria).

## 2. FINALIDADES DEL TRATAMIENTO DE DATOS
Hilf'e recolecta datos personales (nombre, correo, teléfono, ubicación, tipo y número de documento, fecha de expedición y fotografía) exclusivamente para:
1. Validar la identidad de los usuarios y mitigar fraudes o suplantaciones.
2. Posibilitar el contacto directo entre Cliente y Trabajador para la prestación del servicio coordinado.
3. Emitir notificaciones sobre el estado de solicitudes, citas y verificación de cuenta.
4. Cumplir con deberes legales, requerimientos de autoridades judiciales o policivas en Colombia.

## 3. DATOS SENSIBLES Y DE MENORES DE EDAD
Hilf'e no recopila datos de menores de 18 años. Los datos biométricos o fotografías de perfil se utilizan únicamente para la visualización del perfil profesional y no se destinan a reconocimiento biométrico automatizado sin consentimiento previo y expreso.

## 4. DERECHOS DE LOS TITULARES (ART. 8 LEY 1581 DE 2012)
El Titular de los datos tiene derecho a:
- Conocer, actualizar y rectificar sus datos personales frente a Hilf'e.
- Solicitar prueba de la autorización otorgada para el tratamiento.
- Ser informado del uso dado a sus datos personales.
- Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).
- Revocar la autorización y/o solicitar la supresión del dato cuando no medie un deber legal o contractual de conservarlo.

## 5. MEDIDAS DE SEGURIDAD DE LA INFORMACIÓN
Hilf'e almacena las contraseñas encriptadas mediante algoritmos criptográficos robustos de un solo sentido (bcrypt), restringe la visibilidad del documento de identidad en listados públicos y audita internamente los accesos administrativos a la información de identidad.
    `.trim(),
  },
  {
    codigo: "autorizacion_datos",
    titulo: "Autorización Expresa para el Tratamiento de Datos Personales",
    version: "1.0.0",
    resumen: "Consentimiento informado, previo y expreso del titular para el almacenamiento y cotejo documental de identidad.",
    contenido: `
# AUTORIZACIÓN EXPRESA PARA EL TRATAMIENTO DE DATOS PERSONALES
**Versión:** 1.0.0

De manera previa, informada, expresa e inequívoca, manifiesto que autorizo a Hilf'e para que recolecte, almacene, procese, consulte y coteje mis datos personales básicos e identificativos (incluyendo nombres, tipo y número de documento de identidad, fecha de expedición, correo, teléfono y ubicación) de conformidad con la Política de Tratamiento de Datos Personales y la Ley 1581 de 2012 de la República de Colombia.

Reconozco y acepto que:
1. Mis datos de identidad serán cotejados con el propósito exclusivo de validar la autenticidad y correspondencia de mi documento para seguridad de la comunidad Hilf'e.
2. Fui informado(a) de que no estoy obligado(a) a autorizar el tratamiento de datos sensibles.
3. Puedo ejercer en cualquier momento mis derechos de conocer, actualizar, rectificar y suprimir mis datos mediante solicitud dirigida al correo soportehilfe2@gmail.com.
    `.trim(),
  },
  {
    codigo: "condiciones_cliente",
    titulo: "Términos Específicos para Clientes",
    version: "1.0.0",
    resumen: "Derechos y deberes del cliente al solicitar servicios, coordinar visitas y gestionar cancelaciones o pagos.",
    contenido: `
# CONDICIONES ESPECÍFICAS PARA CLIENTES
**Versión:** 1.0.0

## 1. SOLICITUDES Y DETALLE DEL TRABAJO
El Cliente se compromete a ingresar especificaciones claras y precisas sobre el servicio requerido, evitando inducir a error al Trabajador respecto a la complejidad, herramientas necesarias o riesgos del entorno.

## 2. ACCESO AL LUGAR DE PRESTACIÓN
El Cliente debe garantizar el acceso seguro al inmueble donde se prestará el servicio, asegurando un ambiente de respeto e integridad para el Trabajador asignado.

## 3. CANCELACIONES Y REPROGRAMACIONES
Las cancelaciones deben efectuarse con la debida anticipación a través de los canales de la plataforma para no perjudicar la disponibilidad del Trabajador.

## 4. RESPONSABILIDAD DE VALORACIÓN
El Cliente se compromete a emitir calificaciones y comentarios veraces, objetivos y sustentados en la experiencia real del servicio recibido.
    `.trim(),
  },
  {
    codigo: "condiciones_trabajador",
    titulo: "Términos Específicos para Trabajadores",
    version: "1.0.0",
    resumen: "Independencia laboral, acreditación de perfiles, compromiso de servicio y deberes de seguridad del prestador.",
    contenido: `
# CONDICIONES ESPECÍFICAS PARA TRABAJADORES INDEPENDIENTES
**Versión:** 1.0.0

## 1. NATURALEZA AUTÓNOMA E INDEPENDIENTE
El Trabajador actúa en todo momento como contratista independiente, asumiendo su propio riesgo técnico y económico. No existe relación laboral, de subordinación, agencia comercial ni sociedad entre Hilf'e y el Trabajador.

## 2. SEGURIDAD SOCIAL Y RIESGOS LABORALES
El Trabajador es el único responsable de su afiliación y aportes al Sistema General de Seguridad Social (Salud, Pensión y Riesgos Laborales ARL), conforme a la legislación laboral y tributaria colombiana aplicable a prestadores de servicios por cuenta propia.

## 3. CUMPLIMIENTO Y BUENAS PRÁCTICAS
- El Trabajador debe ejecutar el servicio convenido utilizando las mejores prácticas de su oficio, protegiendo los bienes del Cliente.
- Está prohibido solicitar o presionar al Cliente para cancelar reservas dentro de la plataforma con la intención de evadir mecanismos de control o auditoría.

## 4. VERIFICACIÓN Y PUBLICACIÓN DE SERVICIOS
La cuenta del Trabajador queda en estado PENDIENTE tras su registro y únicamente podrá publicar servicios y coordinar atenciones tras la aprobación formal de la verificación por parte del equipo administrativo de Hilf'e.
    `.trim(),
  },
];
