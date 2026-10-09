// LA CIFRA DEL ROBO, POR EL CAMINO DE VERDAD. Un /robar entra por handleMessage
// como entra del grupo, en un sandbox desechable, y se mira qué cifra sale.
// Existe porque el dueño escribía *!robar 630* y salía 34, semanas seguidas, y
// las pruebas que llamaban a cmdRobo directamente daban todas en verde.
// Uso: node scripts/robo-cifra.js <owner|miembro> <suelto> <banco> <auraVictima> "<texto>"
'use strict';
const fs=require('fs'),os=require('os'),path=require('path');
const REPO=path.join(__dirname,'..');
const ROOT=fs.mkdtempSync(path.join(os.tmpdir(),'ddb-robo-'));
fs.cpSync(path.join(REPO,'src'),path.join(ROOT,'src'),{recursive:true});
fs.mkdirSync(path.join(ROOT,'data'));fs.mkdirSync(path.join(ROOT,'temp'));
fs.symlinkSync(path.join(REPO,'node_modules'),path.join(ROOT,'node_modules'),'dir');
process.chdir(ROOT);
process.env.OWNER_NUMBER='33600000001';
const [,,quien,sL,bL,aV,texto]=process.argv;
const G='120363000000555@g.us',BOT='549199@s.whatsapp.net';
const OW={tel:'33600000001@s.whatsapp.net',lid:'111111111111111@lid'};
const MB={tel:'34600000073@s.whatsapp.net',lid:'222222222222222@lid'};
const VI={tel:'34600000074@s.whatsapp.net',lid:'333333333333333@lid'};
const L=quien==='owner'?OW:MB;
const parts=[{id:BOT,admin:'admin'},{id:OW.lid,phoneNumber:OW.tel,admin:'superadmin'},{id:MB.lid,phoneNumber:MB.tel},{id:VI.lid,phoneNumber:VI.tel}];
(async()=>{
  const A=require(ROOT+'/src/utils/auraStore');
  const set=async(j,v)=>{const c=await A.getAura(G,j);await A.addAura(G,j,v-c);};
  await set(L.lid,+sL); await set(VI.lid,+aV); if(+bL) await A.devolverACaja(G,L.lid,+bL);
  await A.flushAura();
  const {handleMessage}=require(ROOT+'/src/handlers/messageHandler');
  const cap=[];
  const sock={user:{id:BOT},sendPresenceUpdate:async()=>{},readMessages:async()=>{},
    sendMessage:async(j,c)=>{cap.push(c.text||'');return {key:{id:'r'}};},
    groupMetadata:async(j)=>({id:j,subject:'G',participants:parts}),
    groupParticipantsUpdate:async()=>[],groupFetchAllParticipating:async()=>({[G]:{id:G,participants:parts}}),
    onWhatsApp:async(j)=>[{exists:true,jid:j}]};
  const t=texto.replace('@V','@'+VI.lid.split('@')[0]);
  await handleMessage(sock,{key:{remoteJid:G,participant:L.lid,participantAlt:L.tel,addressingMode:'lid',fromMe:false,id:'M'+Math.random()},
    message:{extendedTextMessage:{text:t,contextInfo:{mentionedJid:[VI.lid]}}},pushName:'x',messageTimestamp:Math.floor(Date.now()/1000)});
  await new Promise(r=>setTimeout(r,400));
  console.log(cap.filter(Boolean).join('\n---\n'));
  try{fs.rmSync(ROOT,{recursive:true,force:true});}catch{}
  process.exit(0);
})().catch(e=>{console.log('ERROR',e.stack);process.exit(1);});
