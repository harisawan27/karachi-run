/** A sustained two-tone air horn, with a short call followed by a longer one.
 * Fixed brass harmonics and a held envelope avoid the old low sliding buzz.
 * The caller supplies the existing SFX bus, so mute/mixer settings still apply.
 */
export function playTruckHorn(context,output,{pan=0,volume=.065}={}){
 const at=context.currentTime,real=new Float32Array(6),imaginary=new Float32Array([0,1,.34,.14,.06,.025]);
 const reed=context.createPeriodicWave(real,imaginary),filter=context.createBiquadFilter();
 filter.type='lowpass';filter.frequency.value=2600;filter.Q.value=.55;
 const panner=context.createStereoPanner();panner.pan.value=Math.max(-1,Math.min(1,pan));filter.connect(panner);panner.connect(output);
 const calls=[{offset:0,hold:.10},{offset:.23,hold:.30}];let remaining=calls.length*2;
 for(const call of calls)for(const [frequency,level]of [[349.23,1],[440,.72]]){
  const oscillator=context.createOscillator(),gain=context.createGain(),start=at+call.offset,release=start+.022+call.hold,end=release+.075;
  oscillator.setPeriodicWave(reed);oscillator.frequency.setValueAtTime(frequency*1.025,start);oscillator.frequency.linearRampToValueAtTime(frequency,start+.025);
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume*level,start+.018);gain.gain.setValueAtTime(volume*level,release);gain.gain.exponentialRampToValueAtTime(.0001,end);
  oscillator.connect(gain);gain.connect(filter);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();if(--remaining===0){filter.disconnect();panner.disconnect();}};oscillator.start(start);oscillator.stop(end+.01);
 }
}
