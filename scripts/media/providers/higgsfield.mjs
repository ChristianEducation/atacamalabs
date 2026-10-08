// Proveedor «higgsfield» (generativo): PREPARADO, APAGADO Y NO VERIFICADO.
//
// Este adaptador define la interfaz que debe cumplir cualquier proveedor generativo (generate, edit, variation, fromReference, video, status), pero NO está
// implementado: Atacama OS no declara operativa ninguna capacidad generativa externa que no se haya probado de verdad. Para activarlo hacen falta, en orden:
//   1) autorización explícita de Christian (costos) y saldo API real (los créditos web/promocionales NO sirven para la API);
//   2) content_config.media_generative_enabled = true y media_generative_budget_usd > 0;
//   3) MEDIA_HIGGSFIELD_ENABLED=1 y HIGGSFIELD_API_KEY en .env.local;
//   4) implementar estas funciones contra la API real y pasar una prueba de punta a punta (con un solo asset de costo conocido);
//   5) recién entonces marcar verified:true en mgProviders.
// Mientras tanto cualquier llamada falla con un error VISIBLE y no gasta nada.
export const capabilities = { needs: ['editorial_image', 'conceptual_image', 'short_video'], operations: ['generate', 'edit', 'variation', 'from_reference', 'video'], cost_usd: null };

export class ProviderOff extends Error {
  constructor(message) { super(message); this.code = 'provider_off'; }
}

function guard(env) {
  if (env.MEDIA_HIGGSFIELD_ENABLED !== '1' || !env.HIGGSFIELD_API_KEY) throw new ProviderOff('Higgsfield está apagado: falta MEDIA_HIGGSFIELD_ENABLED=1 y HIGGSFIELD_API_KEY, y la autorización de Christian para el costo. No se generó ni se cobró nada.');
  throw new ProviderOff('Higgsfield está habilitado pero el adaptador NO está implementado ni verificado contra la API real: no se genera nada. Implementarlo y probarlo con un solo asset de costo conocido antes de usarlo.');
}

export async function generate(env /*, { prompt, brand, aspect } */) { guard(env); }
export async function edit(env /*, { sourceUrl, prompt } */) { guard(env); }
export async function variation(env /*, { sourceUrl, prompt } */) { guard(env); }
export async function fromReference(env /*, { referenceUrl, prompt } */) { guard(env); }
export async function video(env /*, { prompt, seconds } */) { guard(env); }
export async function status(env /*, { jobId } */) { guard(env); }
export async function produce(env, asset) {
  const op = asset.operation === 'video' ? video : asset.operation === 'edit' ? edit : asset.operation === 'variation' ? variation : asset.operation === 'from_reference' ? fromReference : generate;
  return op(env, { prompt: asset.prompt, referenceUrl: asset.reference_url });
}
