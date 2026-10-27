-- Atacama OS · Radar estratégico — ROLLBACK de la migración 20261024_strategic_radar.sql.
-- NO está en supabase/migrations a propósito: nada lo aplica solo. Solo se ejecuta con autorización humana explícita y DESPUÉS de un respaldo.
-- Política del spec §5.2/§14: preferir DEJAR LAS TABLAS INACTIVAS (flags en false). Este script solo borra si el módulo nunca guardó datos reales:
--   · sin oportunidades, evidencias, corridas ni chequeos;
--   · servicios: solo los 5 candidatos de la semilla, sin repositorio confirmado, sin URL ni verificación;
--   · configuración con todo apagado.
-- Si hay cualquier dato real, ABORTA con un mensaje y no toca nada (para conservar evidencia y decisiones: no se borra en cascada).
do $$
declare
  n_opp bigint; n_ev bigint; n_run bigint; n_chk bigint; n_tgt_real bigint; n_cfg_on bigint;
begin
  if to_regclass('public.strategic_opportunities') is null then
    raise notice 'No existen tablas strategic_*: nada que revertir.';
    return;
  end if;
  select count(*) into n_opp from public.strategic_opportunities;
  select count(*) into n_ev from public.strategic_evidence;
  select count(*) into n_run from public.strategic_runs;
  select count(*) into n_chk from public.strategic_prod_checks;
  select count(*) into n_tgt_real from public.strategic_prod_targets
    where status <> 'candidate' or monitor_enabled or deployment_url is not null or health_url is not null or verified_at is not null or is_test
       or logical_name not in ('Atacama Labs / OS', 'Librería Crecer', 'Pedidos Empresas', 'Registro Almuerzos', 'Casino Escolar');
  select count(*) into n_cfg_on from public.strategic_radar_config
    where production_enabled or products_enabled or partners_enabled or events_enabled or telegram_noncritical_enabled or daily_max_items <> 0;
  if n_opp + n_ev + n_run + n_chk + n_tgt_real + n_cfg_on > 0 then
    raise exception 'ROLLBACK BLOQUEADO: hay datos reales o banderas encendidas (oportunidades %, evidencias %, corridas %, chequeos %, servicios confirmados o de prueba %, config encendida %). Apaga los flags y deja las tablas inactivas, o respalda y pide autorización para borrar.', n_opp, n_ev, n_run, n_chk, n_tgt_real, n_cfg_on;
  end if;
  -- Orden por claves foráneas; sin CASCADE (la migración original usa ON DELETE RESTRICT).
  drop table public.strategic_evidence;
  drop table public.strategic_opportunities;
  drop table public.strategic_prod_checks;
  drop table public.strategic_prod_targets;
  drop table public.strategic_runs;
  drop table public.strategic_radar_config;
end $$;
