class Capture extends AudioWorkletProcessor{
 constructor(){super();this.buffer=[];this.enabled=false;this.position=0;this.port.onmessage=e=>{this.enabled=!!e.data.enabled;if(!this.enabled){this.buffer=[];this.position=0;}};}
 process(inputs){const samples=inputs[0]?.[0];if(!this.enabled||!samples)return true;const ratio=sampleRate/24000;while(this.position<samples.length){const a=Math.floor(this.position),f=this.position-a;this.buffer.push(samples[a]*(1-f)+(samples[Math.min(a+1,samples.length-1)]||0)*f);this.position+=ratio;}this.position-=samples.length;if(this.buffer.length>=2400){const chunk=Float32Array.from(this.buffer.splice(0,2400));this.port.postMessage(chunk,[chunk.buffer]);}return true;}
}registerProcessor('sterling-capture',Capture);
