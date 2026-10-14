#!/usr/bin/env bash
# Atacama OS · login de Higgsfield en la VPS (Frente B) SIN que nadie pegue códigos: el navegador de Christian vuelve a «127.0.0.1:PORT» de SU PC,
# un túnel SSH lleva esa llamada al contenedor de Hermes y el CLI recibe la autorización directamente. Yo (Claude) nunca veo ni toco el código.
#
#   ops/hermes/higgs-login.sh start    → prepara el túnel y el login; imprime el ENLACE que Christian debe abrir en su navegador y pulsar «Autorizar»
#   ops/hermes/higgs-login.sh status   → ¿quedó iniciada la sesión? (saldo y gasto de la semana)
#   ops/hermes/higgs-login.sh stop     → cierra el túnel y los procesos temporales
# Requiere ~/hermes-ops (.env y llave SSH). No imprime secretos.
set -uo pipefail
OPS="${HERMES_OPS_DIR:-$HOME/hermes-ops}"; PORT="${HIGGS_LOGIN_PORT:-7788}"
set -a; . "$OPS/.env"; set +a
SSH=(ssh -i "$OPS/.ssh_hermes_ops" -o BatchMode=yes -o ConnectTimeout=20 "$VPS_USER@$VPS_HOST")
RA() { "${SSH[@]}" "sudo hermes-exec-agent bash -c '$1'"; }
PIDF="${TMPDIR:-/tmp}/higgs-login-tunnel.pid"

stop() {
  [ -f "$PIDF" ] && kill "$(cat "$PIDF")" 2>/dev/null; rm -f "$PIDF"
  RA 'pkill -f "[h]iggsfield auth login" 2>/dev/null; pkill -f "[h]l-proxy.mjs" 2>/dev/null; rm -rf /opt/data/higgsfield-auth-* /tmp/hl-proxy.mjs /tmp/hl.log; echo cerrado' 2>&1 | tail -1
}

case "${1:-}" in
  start)
    stop >/dev/null 2>&1
    IP="$(RA 'hostname -i' | tail -1 | awk '{print $1}')"
    [ -n "$IP" ] || { echo "No pude obtener la IP del contenedor"; exit 1; }
    # 1) el CLI elige SU puerto de retorno (solo algunos están registrados en Higgsfield: forzar otro da «redirect_uri does not match»); se lee de la URL
    RA "cd /opt/data/motion-studio; (HOME=/opt/data nohup timeout 1800 node_modules/.bin/higgsfield auth login >/tmp/hl.log 2>&1 &); sleep 4; echo listo" | tail -1
    URL="$(RA 'f=$(ls -td /opt/data/higgsfield-auth-*/sign-in.html 2>/dev/null | head -1); [ -n "$f" ] && grep -o "https://[^\"<> ]*" "$f" | head -1 | sed "s/&amp;/\&/g"')"
    [ -n "$URL" ] || { echo "No encontré el enlace de autorización (revisa el log del contenedor)"; exit 1; }
    PORT="$(printf '%s' "$URL" | sed -n 's/.*redirect_uri=http%3A%2F%2Flocalhost%3A\([0-9]*\)%2F.*/\1/p')"
    [ -n "$PORT" ] || { echo "No pude leer el puerto de retorno del enlace"; exit 1; }
    # 2) relé: el CLI escucha solo en 127.0.0.1 del contenedor; este relé lo expone en la IP del contenedor para el túnel
    JS="import net from \"node:net\"; net.createServer((c) => { const u = net.connect($PORT, \"127.0.0.1\"); c.pipe(u); u.pipe(c); c.on(\"error\", () => u.destroy()); u.on(\"error\", () => c.destroy()); }).listen($PORT, \"$IP\");"
    B64="$(printf '%s' "$JS" | base64 -w0)"
    RA "echo $B64 | base64 -d > /tmp/hl-proxy.mjs; cd /opt/data/motion-studio; (nohup node /tmp/hl-proxy.mjs >/tmp/hl-proxy.log 2>&1 &); sleep 1; echo relé" | tail -1
    ssh -i "$OPS/.ssh_hermes_ops" -o BatchMode=yes -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -N -L "$PORT:$IP:$PORT" "$VPS_USER@$VPS_HOST" >/dev/null 2>&1 &
    echo $! > "$PIDF"; sleep 2
    echo "PUERTO_DE_RETORNO: $PORT"
    echo "ENLACE_PARA_CHRISTIAN: $URL"
    echo "(el túnel queda abierto 30 minutos; después de autorizar, ejecuta: $0 status)"
    ;;
  status) RA 'HOME=/opt/data /opt/data/scripts/higgs.sh status' ;;
  stop) stop ;;
  *) echo "uso: $0 start | status | stop"; exit 2 ;;
esac
