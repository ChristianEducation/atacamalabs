import { CODE, ASSOC, PIPELINE, LOCATION } from './won-to-client.mjs';
// Pruebas de la lógica de los nodos Code de «11 Won to Client». Ejecutar: node n8n/build/won-to-client.test.mjs
const run=(code,{nodes={},json={},input=[]})=>{const $=(n)=>({first:()=>({json:nodes[n]}),all:()=>[].concat(nodes[n]).map(j=>({json:j})),item:{json:nodes[n]}});const f=new Function('$','$json','$input','$items',code);return f($,json,{first:()=>({json:input[0]||json}),all:()=>input.map(j=>({json:j}))},null)};
let pass=0,fail=0;const t=(n,c)=>{c?pass++:fail++;console.log(c?'ok  ':'FAIL',n)};
// validate (entrada compatible con el Webhook estándar de GHL; dry_run seguro por defecto)
const OID = 'AmZ0SvcICFgIUitsCSF0';
const val = (body) => run(CODE.validate, { input: [{ headers: {}, body }] })[0].json;
const rejects = (body) => { try { val(body); return false; } catch { return true; } };
t('validate: raíz + boolean true → dry_run true', val({ opportunity_id: OID, dry_run: true }).dryRun === true);
t('validate: raíz + boolean false → dry_run false', val({ opportunity_id: OID, dry_run: false }).dryRun === false);
t('validate: customData + "true" → dry_run true', val({ customData: { opportunity_id: OID, dry_run: 'true' } }).dryRun === true);
t('validate: customData + "false" → dry_run false', val({ customData: { opportunity_id: OID, dry_run: 'false' } }).dryRun === false);
t('validate: customData lee opportunity_id', val({ customData: { opportunity_id: OID, dry_run: 'false' } }).opportunityId === OID);
t('validate: dry_run ausente → true', val({ opportunity_id: OID }).dryRun === true);
t('validate: dry_run ausente con customData → true', val({ customData: { opportunity_id: OID } }).dryRun === true);
for (const bad of ['yes', 'no', '0', '', ' ', 0, 1, null, {}, [], 'falsee', 'verdadero'])
  t('validate: dry_run inválido ' + JSON.stringify(bad) + ' → true', val({ opportunity_id: OID, dry_run: bad }).dryRun === true);
t('validate: customData inválido → true', val({ customData: { opportunity_id: OID, dry_run: 'nope' } }).dryRun === true);
t('validate: contradictorio (raíz false, customData true) → true', val({ opportunity_id: OID, dry_run: false, customData: { dry_run: 'true' } }).dryRun === true);
t('validate: contradictorio (raíz true, customData "false") → true', val({ opportunity_id: OID, dry_run: true, customData: { dry_run: 'false' } }).dryRun === true);
t('validate: raíz false + customData "false" → false', val({ opportunity_id: OID, dry_run: false, customData: { dry_run: 'false' } }).dryRun === false);
t('validate: "FALSE " (mayúsculas/espacio) → false', val({ opportunity_id: OID, dry_run: ' FALSE ' }).dryRun === false);
t('validate: sin envoltorio body (cuerpo directo)', run(CODE.validate, { input: [{ opportunity_id: OID, dry_run: false }] })[0].json.dryRun === false);
t('validate: opportunity_id ausente → rechazo', rejects({ dry_run: false }));
t('validate: opportunity_id ausente en customData → rechazo', rejects({ customData: { dry_run: 'false' } }));
t('validate: opportunity_id vacío → rechazo', rejects({ opportunity_id: '', customData: { opportunity_id: '' } }));
t('validate: opportunity_id inválido → rechazo', rejects({ opportunity_id: 'bad' }));
t('validate: opportunity_id con caracteres peligrosos → rechazo', rejects({ opportunity_id: OID + '/../x' }));
t('validate: customData no objeto se ignora', rejects({ customData: 'texto', dry_run: false }));
// guard
const V={opportunityId:'OPP1',dryRun:true};
const g=(opp)=>run(CODE.guard,{nodes:{'Validate Input':V},json:{opportunity:opp}})[0].json;
t('guard: open → skip',g({id:'OPP1',locationId:LOCATION,pipelineId:PIPELINE,status:'open',contactId:'C1'}).proceed===false);
t('guard: won otro pipeline → skip',g({id:'OPP1',locationId:LOCATION,pipelineId:'otro',status:'won',contactId:'C1'}).proceed===false);
t('guard: no encontrada → skip',g(undefined).proceed===false);
const gw=g({id:'OPP1',name:'Ana - Clínica Sol',locationId:LOCATION,pipelineId:PIPELINE,status:'won',contactId:'C1',customFields:[{id:'yY5sqFov8GeXcx5G9vuy',fieldValueString:'Agentes'}]});
t('guard: won OK',gw.proceed===true&&gw.solucion==='Agentes');
// plan
const plan=(contact,rels,biz,g2=gw)=>run(CODE.plan,{nodes:{'Guard Won':g2,'Get Contact':{contact},'Get Opp Relations':{relations:rels}},json:{businesses:biz}})[0].json;
let p=plan({companyName:'Clínica Sol'},[],[{id:'B9',name:'(Example) Dunder Mifflin'}]);
t('plan: crea business nueva si no existe',p.action==='create'&&p.createBusiness&&p.businessId===null&&p.servicio.servicio_producto==='Agente de IA'&&p.proyecto.tipo==='Agente'&&p.servicio.estado==='Onboarding');
t('plan: no inventa montos/fechas',!('mrr' in p.servicio)&&!('fecha_de_inicio' in p.servicio));
p=plan({companyName:'clinica sol'},[],[{id:'B7',name:'Clínica Sol'}]);
t('plan: reutiliza business por nombre',p.businessId==='B7'&&!p.createBusiness);
p=plan({companyName:'X',businessId:'B5'},[{associationId:ASSOC.business_opportunity,firstRecordId:'B8',secondRecordId:'OPP1'}],[]);
t('plan: prioriza relación existente de la oportunidad',p.businessId==='B8'&&p.oppHasBusinessRel);
p=plan({},[],[],{...gw,oppName:'Juan Pérez - Prueba'});
t('plan: toma empresa del nombre de la oportunidad',p.companyName==='Prueba');
p=plan({},[],[],{...gw,oppName:'Solo Nombre'});
t('plan: sin empresa → needs_human',p.action==='needs_human');
p=plan({companyName:'Clínica Sol'},[{associationId:ASSOC.servicio_opportunity,firstRecordId:'S1',secondRecordId:'OPP1'}],[]);
t('plan: idempotente (ya tiene Servicio)',p.action==='already_processed');
p=plan({companyName:'Clínica Sol'},[],[],{...gw,solucion:'No definido'});
t('plan: producto Otro → sin Proyecto',p.servicio.servicio_producto==='Otro'&&p.proyecto===null);
// relaciones
const ctx={...plan({companyName:'Clínica Sol'},[],[]),businessId:'B1'};
const rl=run(CODE.relations,{nodes:{Context:ctx,'Create Servicio':{record:{id:'S1'}},'Create Proyecto':{record:{id:'P1'}}}});
t('relaciones: 6 con proyecto (so, sb, bo, bc, pb, sp)',rl.length===6&&rl[0].json.associationId===ASSOC.servicio_opportunity);
const ctx2={...ctx,proyecto:null};
t('relaciones: 4 sin proyecto',run(CODE.relations,{nodes:{Context:ctx2,'Create Servicio':{record:{id:'S1'}}}}).length===4);
console.log(pass, 'ok', fail, 'fallos'); process.exit(fail ? 1 : 0);
