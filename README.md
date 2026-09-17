# Atacama Labs — sitio y panel (V1)

Base Next.js 16 (App Router, TypeScript, Tailwind) para la web pública y el Control Center privado de Atacama Labs. Repositorio de código; la especificación, decisiones y contratos viven en el paquete `atacama-labs-spec/` (carpeta hermana), que gobierna qué se implementa aquí.

- Especificación y orden de ejecución: `../atacama-labs-spec/README.md`, `../atacama-labs-spec/docs/EXECUTION-ORDER.md`
- Estado de implementación: `../atacama-labs-spec/execution/STATE.md`
- Decisiones normativas: `../atacama-labs-spec/docs/DECISIONS.md`

Remoto: https://github.com/ChristianEducation/atacamalabs

## Desarrollo

```bash
npm run dev
```

Abrir http://localhost:3000.

## Build

```bash
npm run build
```

## Preview 006

Home V2 y landing de Agentes: npm run build; npm run start; abrir http://localhost:3000/ y /agentes. Evidencia y límites: [reporte](evidence/visual-006/REPORT.md), [pendientes](docs/USER-ACTIONS.md). No hay deployment de producción.
