const fs=require('fs'),path=require('path'),vm=require('vm');
const {createCanvas,Path2D}=require('@napi-rs/canvas');
const root='/Users/jtshaw/projects/willsbackyard';
const sandbox={Path2D,Math,console,parseInt,document:{createElement:()=>createCanvas(16,16)}};
sandbox.globalThis=sandbox; vm.createContext(sandbox);
for(const f of fs.readdirSync(path.join(root,'web/art')).filter(f=>f.endsWith('.js')).sort())
  vm.runInContext(fs.readFileSync(path.join(root,'web/art',f),'utf8'),sandbox,{filename:f});
const ART=vm.runInContext('ART',sandbox);
const want=process.argv.slice(2);
const S=3; const pad=24;
let W=pad, H=0;
for(const n of want){ W+=ART[n].w*S/2+pad; H=Math.max(H,ART[n].h*S/2); }
const cv=createCanvas(W,H+pad*3); const c=cv.getContext('2d');
c.fillStyle='#cfd8dc'; c.fillRect(0,0,cv.width,cv.height);
let x=pad;
for(const n of want){
  const s=ART[n], w=s.w*S/2, h=s.h*S/2;
  // baseline + origin guides
  c.strokeStyle='rgba(200,0,0,.5)'; c.lineWidth=1;
  c.beginPath(); c.moveTo(x,pad); c.lineTo(x,pad+h); c.moveTo(x,pad); c.lineTo(x+w,pad); c.stroke();
  const tmp=createCanvas(s.w,s.h); const tc=tmp.getContext('2d'); s.draw(tc,s.w,s.h);
  c.drawImage(tmp,x,pad,w,h);
  c.fillStyle='#222'; c.font='16px sans-serif'; c.fillText(n+'  '+s.w+'x'+s.h, x, H+pad*2);
  x+=w+pad;
}
fs.writeFileSync('/Users/jtshaw/projects/willsbackyard/build/sprites.png',cv.toBuffer('image/png'));
console.log('wrote build/sprites.png');
