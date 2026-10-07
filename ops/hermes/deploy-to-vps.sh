#!/usr/bin/env bash
# Atacama OS · despliegue SEGURO de un archivo a la VPS de Hermes (Bloque 3 — protección tras los incidentes del 7-oct:
# script de alertas roto por sintaxis y archivo vacío desplegado por una ruta relativa).
#
# Uso:   ops/hermes/deploy-to-vps.sh <archivo_local> </opt/data/ruta/destino> ["comando de prueba posterior"]
# Hace, en este orden, y ABORTA sin tocar nada si algo falla:
#   1. el archivo local existe, no está vacío y su ruta se resuelve a absoluta (nunca depende del directorio actual);
#   2. el destino está dentro de /opt/data;
#   3. sube a «<destino>.new» y valida ahí: no vacío, sintaxis según extensión (.py py_compile · .sh bash -n · .json json válido), y tamaño ≥ 40 % del actual;
#   4. respalda el actual como «<destino>.bak-<fecha>» y reemplaza con mv (atómico);
#   5. corre el comando de prueba (si se da); si falla, RESTAURA el respaldo y sale con error.
# Requiere el acceso SSH de mantenimiento (HERMES_OPS_DIR, por defecto ~/hermes-ops con .env y .ssh_hermes_ops). No imprime secretos.
set -uo pipefail

src_in="${1:-}"; dst="${2:-}"; smoke="${3:-}"
[ -n "$src_in" ] && [ -n "$dst" ] || { echo "uso: $0 <archivo_local> </opt/data/destino> [\"comando de prueba\"]"; exit 2; }
src="$(cd "$(dirname "$src_in")" 2>/dev/null && pwd)/$(basename "$src_in")"
[ -f "$src" ] || { echo "ABORTA: no existe el archivo local: $src_in"; exit 2; }
[ -s "$src" ] || { echo "ABORTA: el archivo local está VACÍO: $src"; exit 2; }
case "$dst" in /opt/data/*) ;; *) echo "ABORTA: el destino debe estar dentro de /opt/data"; exit 2;; esac
case "$dst" in *..*|*" "*|*"'"*|*'"'*|*';'*|*'$'*) echo "ABORTA: destino con caracteres no permitidos"; exit 2;; esac

OPS_DIR="${HERMES_OPS_DIR:-$HOME/hermes-ops}"
[ -f "$OPS_DIR/.env" ] && [ -f "$OPS_DIR/.ssh_hermes_ops" ] || { echo "ABORTA: falta $OPS_DIR/.env o la llave SSH"; exit 2; }
set -a; . "$OPS_DIR/.env"; set +a
RA() { ssh -i "$OPS_DIR/.ssh_hermes_ops" -o BatchMode=yes -o ConnectTimeout=20 "$VPS_USER@$VPS_HOST" "sudo hermes-exec-agent $*" 2>&1 | sed -E 's/((key|token|secret|password|bearer)[=: ]+)[A-Za-z0-9_.\-]{16,}/\1<redacted>/Ig'; }

ts="$(date -u +%Y%m%d-%H%M%S)"
case "$dst" in
  *.py) check="/opt/hermes/.venv/bin/python -m py_compile $dst.new" ;;
  *.sh) check="bash -n $dst.new" ;;
  *.json) check="/opt/hermes/.venv/bin/python -c \"import json,sys;json.load(open(sys.argv[1]))\" $dst.new" ;;
  *) check="true" ;;
esac
b64="$(base64 -w0 "$src")"
[ -n "$b64" ] || { echo "ABORTA: base64 vacío"; exit 2; }

out="$(RA "bash -c 'set -e; echo $b64 | base64 -d > $dst.new; test -s $dst.new || { echo VACIO; rm -f $dst.new; exit 3; }; $check || { echo SINTAXIS_INVALIDA; rm -f $dst.new; exit 4; }; if [ -f $dst ]; then old=\$(wc -c < $dst); new=\$(wc -c < $dst.new); if [ \$new -lt \$((old*40/100)) ]; then echo TAMANO_SOSPECHOSO_\$new_vs_\$old; rm -f $dst.new; exit 5; fi; cp -p $dst $dst.bak-$ts; fi; chmod --reference=$dst $dst.new 2>/dev/null || true; mv $dst.new $dst; echo DEPLOY_OK'")"
echo "$out" | tail -3
echo "$out" | grep -q "DEPLOY_OK" || { echo "ABORTA: no se reemplazó nada (ver arriba)."; exit 1; }

if [ -n "$smoke" ]; then
  if ! RA "bash -c '$smoke'" >/tmp/deploy-smoke.$$ 2>&1; then
    echo "PRUEBA POSTERIOR FALLÓ → restaurando el respaldo"; tail -5 /tmp/deploy-smoke.$$
    RA "bash -c 'if [ -f $dst.bak-$ts ]; then mv $dst.bak-$ts $dst && echo RESTAURADO; else echo SIN_RESPALDO; fi'"
    rm -f /tmp/deploy-smoke.$$; exit 1
  fi
  rm -f /tmp/deploy-smoke.$$
fi
echo "OK: $dst desplegado (respaldo: $dst.bak-$ts)"
