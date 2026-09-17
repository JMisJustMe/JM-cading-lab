(()=>{
'use strict';
const NS=window.JMVisualCampaign;let last=performance.now(),frames=0,windowStart=last,slowWindows=0;
function loop(now){frames++;const delta=now-last;last=now;NS.state.frameMs=NS.state.frameMs*.9+delta*.1;if(now-windowStart>=1000){NS.state.fps=frames*1000/(now-windowStart);frames=0;windowStart=now;if(NS.settings.quality==='auto'){if(NS.state.fps<42)slowWindows++;else slowWindows=Math.max(0,slowWindows-1);if(slowWindows>=2&&NS.state.qualityTier>0){NS.state.qualityTier--;slowWindows=0;NS.emit('quality',{tier:NS.state.qualityTier,reason:'frame budget'})}if(NS.state.fps>57&&NS.state.qualityTier<2){NS.state.qualityTier++;NS.emit('quality',{tier:NS.state.qualityTier,reason:'headroom'})}}}
 document.documentElement.dataset.jmvcQuality=String(NS.settings.quality==='auto'?NS.state.qualityTier:NS.settings.quality);
 requestAnimationFrame(loop)}requestAnimationFrame(loop);
NS.performanceBudget=()=>{const tier=NS.settings.quality==='auto'?NS.state.qualityTier:Number(NS.settings.quality);return{tier,dpr:tier===0?1:tier===1?1.5:Math.min(2,devicePixelRatio||1),particles:tier===0?28:tier===1?64:110,trails:tier>0}};
})();
