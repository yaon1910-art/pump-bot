import dotenv from 'dotenv'; dotenv.config();
import WebSocket from 'ws';
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import http from 'http';

const CONFIG = {
  BUY_AMOUNT: "0.008",
  PROFIT: 100,
  STOP: -50,
  WSS: "wss://pumpportal.fun/api/data",
  RPC: process.env.RPC_URL || "https://api.mainnet-beta.solana.com"
};

const keypair = process.env.PRIVATE_KEY? Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY)) : null;
const connection = new Connection(CONFIG.RPC, "confirmed");
let positions = new Map();

console.log("=== BOT READY ===", keypair? keypair.publicKey.toBase58() : "NO KEY - RADAR MODE");

async function trade(action, mint, amount){
  if(!keypair) { console.log("Radar only - no key"); return null; }
  try{
    const res = await fetch("https://pumpportal.fun/api/trade-local",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        publicKey: keypair.publicKey.toBase58(),
        action, mint, denominatedInSol: "true",
        amount, slippage: 10, priorityFee: 0.0005, pool: "pump"
      })
    });
    const buf = await res.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(buf));
    tx.sign([keypair]);
    const sig = await connection.sendTransaction(tx);
    console.log(`${action.toUpperCase()} ${sig}`);
    return sig;
  }catch(e){ console.log("Trade error", e.message); return null; }
}

function connect(){
  const ws = new WebSocket(CONFIG.WSS);
  ws.on('open',()=>{ ws.send(JSON.stringify({method:"subscribeNewToken"})); console.log("Connected pumpportal"); });
  ws.on('message', async(m)=>{
    try{
      const t = JSON.parse(m.toString());
      if(!t.mint) return;
      const liq = (t.vSolInBondingCurve||0)/1e9;
      const mc = t.usd_market_cap||0;
      if(liq < 10 || mc > 45000 || mc < 1000) return;
      console.log(`🔥 NEW ${t.symbol} MC:$${Math.round(mc)} ${t.mint}`);
      const sig = await trade("buy", t.mint, CONFIG.BUY_AMOUNT);
      if(sig) positions.set(t.mint, {buyMc: mc, time: Date.now()});
    }catch{}
  });
  ws.on('close',()=>setTimeout(connect,3000));
}
connect();
http.createServer((_,r)=>r.end("Bot Running")).listen(process.env.PORT||10000);
