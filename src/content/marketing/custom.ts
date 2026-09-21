/** Copy de /a-medida (H1–H8). */

export const CUSTOM_META =
  "Diseñamos automatizaciones, integraciones y software alrededor de tu operación. Explora cómo una necesidad se convierte en un sistema conectado.";

export const CUSTOM_MODULES = [
  { id: "flujos", anchor: "flujos", title: "Definimos el proceso", body: "Empezamos por la necesidad y el recorrido de cada paso." },
  { id: "software", anchor: "software", title: "Preparamos la información", body: "Ordenamos los datos y documentos que el proceso necesita." },
  { id: "proceso", anchor: "proceso", title: "Conectamos las piezas", body: "Integramos las herramientas y verificamos los intercambios." },
  { id: "interfaz", anchor: "interfaz", title: "Ordenamos el trabajo", body: "Un panel para que el equipo vea qué hacer." },
] as const;

export const CUSTOM_GROUPS = [
  {
    title: "Automatizaciones e integraciones",
    body: "Haz que la información pase al siguiente paso sin volver a copiarla.",
  },
  {
    title: "Dashboards y backoffice",
    body: "Reúne pendientes, responsables y estados en una vista útil para tu equipo.",
  },
  {
    title: "Apps y portales",
    body: "Dale a cada persona una forma clara de consultar, solicitar o actualizar información.",
  },
  {
    title: "Plataformas y sistemas internos",
    body: "Ordena una operación completa cuando las herramientas aisladas ya no alcanzan.",
  },
] as const;

export const CUSTOM_PROCESS = [
  { title: "Diagnóstico", body: "Entendemos entradas, personas, herramientas y el resultado esperado." },
  { title: "Diseño", body: "Definimos el flujo, la interfaz y qué debe resolver la primera versión." },
  { title: "Construcción", body: "Desarrollamos por partes que puedas revisar y probar." },
  { title: "Integración", body: "Conectamos los sistemas acordados y verificamos los intercambios." },
  { title: "Lanzamiento", body: "Revisamos el recorrido completo y dejamos claro cómo operar la solución." },
] as const;

export const CUSTOM_FAQ = [
  {
    question: "¿Debemos cambiar las herramientas que usamos?",
    answer:
      "Primero revisamos qué puede conectarse y qué conviene conservar. Un reemplazo se propone solo si el proceso lo necesita.",
  },
  {
    question: "¿Pueden desarrollar una plataforma completa?",
    answer:
      "Podemos evaluar apps, portales y sistemas internos. Definimos módulos, usuarios e integraciones para acordar una primera versión con alcance claro.",
  },
  {
    question: "¿Dónde se alojará?",
    answer:
      "Se decide según la solución, los accesos y los requisitos operativos. Hosting, infraestructura y mantenimiento deben quedar detallados en la propuesta.",
  },
  {
    question: "¿Cómo se cotiza?",
    answer:
      "Revisamos el proceso, las conexiones y la interfaz necesaria. La cotización distingue entregables, etapas y servicios posteriores; esta línea no tiene un precio fijo universal.",
  },
] as const;
