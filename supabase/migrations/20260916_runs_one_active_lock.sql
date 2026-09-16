-- 003/00 Orchestrator: lock atomico para evitar ejecuciones superpuestas del mismo
-- icp_pack. Aditivo, no afecta filas existentes (runs de EnBandeja siguen igual).
-- Un INSERT de un nuevo run 'running' para un pack que ya tiene uno 'running' viola
-- este indice y falla atomicamente -- el propio orquestador captura ese error como "lock
-- ya tomado" en vez de usar un mecanismo de lectura-luego-escritura no atomico.
create unique index if not exists runs_one_active_per_pack
  on public.runs (icp_pack_id)
  where status = 'running';

comment on index public.runs_one_active_per_pack is
  'Lock atomico: como mucho un run en status=running por icp_pack_id. Usado por Atacama Labs - 00 Orchestrator para evitar ejecuciones superpuestas.';
