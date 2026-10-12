import WebSocket from 'ws';
const CONFIG={BUY_AMOUNT:0.008,MAX_BUYS:6,MIN_LIQ:10,MAX_MC:50000,WSS:"wss://pumpportal.fun/api/data"};
let buysToday=0,lastReset=Date.now();
function canBuy(){if(Date.now()-lastReset>86400000){buysToday=0;lastReset=Date.now();}return buysToday<CONFIG.MAX_BUYS;}
function check(t){if(!t.mint)return false;return (t.vSolInBondingCurve||0)/1e9>=CONFIG.MIN_LIQ&&(t.usd_market_cap||0)<=CONFIG.MAX_MC;}
console.log("=== PUMP BOT STARTED ===");
function connect(){const ws=new WebSocket(CONFIG.WSS);ws.on('open',()=>{console.log('Connected');ws.send(JSON.stringify({method:'subscribeNewToken'}));});ws.on('message',(d)=>{try{const t=JSON.parse(d.toString());if(!t.mint)return;console.log(`New: ${t.symbol}`);if(!canBuy()||!check(t))return;console.log(`✅ BUY ${t.symbol} ${t.mint}`);buysToday++;}catch{}});ws.on('close',()=>setTimeout(connect,3000));}connect();
import http from 'http';http.createServer((_,r)=>{r.writeHead(200);r.end('Bot');}).listen(process.env.PORT||10000);
