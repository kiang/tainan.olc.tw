import{s as L,o as x,a as N,g as z,c as A,L as l,f as J}from"./index.DFaZQrVy.js";const I={__name:"LeafletMap",props:{center:{type:Array,default:()=>[23.004582,120.198]},zoom:{type:Number,default:14},geoJsonUrl:{type:String,default:""},boundaryUrl:{type:String,default:""},mapType:{type:String,default:"district"}},emits:["featureClick"],setup(b,{emit:k}){const n=b,g=k,d=J(null);let a=null,u=null,m=null;const s={primary:"#28c8c8",primaryDark:"#1a9a9a",boundary:"#50a5a4",lineHover:"#ff6b6b",superAged:"rgba(220, 53, 69, 0.5)",aged:"rgba(255, 193, 7, 0.5)",aging:"rgba(255, 193, 7, 0.3)",normal:"rgba(40, 200, 200, 0.2)"};function y(o,e=!1){return n.mapType==="district"?v(o,e):n.mapType==="lines"?w(o,e):{}}function f(o,e=!1){const t=Math.min(24+o*3,48),r=e?"#ff6b6b":s.primary;return l.divIcon({className:"point-marker",html:`<div class="marker-content" style="
      width: ${t}px;
      height: ${t}px;
      background: ${r};
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: ${t>36?14:12}px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.2s;
    ">${o}</div>`,iconSize:[t,t],iconAnchor:[t/2,t/2]})}function v(o,e){const t=o.properties;let r=s.normal;return t.age_type==="super-aged"?r=s.superAged:t.age_type==="aged"?r=s.aged:t.age_type==="aging"&&(r=s.aging),{fillColor:e?s.primary:r,fillOpacity:e?.6:.5,color:e?s.primaryDark:"#333",weight:e?3:1}}function w(o,e){return{color:e?s.lineHover:s.primary,weight:e?5:3,opacity:e?1:.8}}function S(){return{fillColor:s.boundary,fillOpacity:.15,color:s.primaryDark,weight:2}}function T(o){const e=String(o),t=e.substring(0,4),r=e.substring(4,6),p=e.substring(6,8),i=e.substring(8,10);return`${t}/${r}/${p} ${i}:00`}function h(o){const e=o.properties;if(n.mapType==="district"){let t=`<div class="map-popup">
      <h4>${e.VILLNAME||"未知"}</h4>`;return e.p_cnt&&(t+=`<p><strong>人口數：</strong>${e.p_cnt.toLocaleString()}</p>`),e.area&&(t+=`<p><strong>面積：</strong>${e.area.toFixed(2)} km²</p>`),e.rate_elder&&(t+=`<p><strong>老年人口比例：</strong>${e.rate_elder.toFixed(1)}%</p>`),t+="</div>",t}else if(n.mapType==="lines"){let t='<div class="map-popup">';return e.ymdh&&(t+=`<p><strong>時間：</strong>${T(e.ymdh)}</p>`),e.v&&(t+=`<p>
        <a href="https://www.youtube.com/watch?v=${e.v}" target="_blank" rel="noopener" class="video-link">
          觀看影片
        </a>
      </p>`),t+="</div>",t}else if(n.mapType==="points")return`<div class="map-popup">
      <h4>${e.key||"未知地點"}</h4>
      <p><strong>街講次數：</strong>${e.count} 次</p>
    </div>`;return""}async function $(){if(!(!n.geoJsonUrl||!a))try{const e=await(await fetch(n.geoJsonUrl)).json();u&&a.removeLayer(u),n.mapType==="points"?u=l.geoJSON(e,{pointToLayer:(t,r)=>{const p=t.properties.count||1;return l.marker(r,{icon:f(p)})},onEachFeature:(t,r)=>{const p=h(t);p&&r.bindPopup(p,{className:"custom-popup"}),r.on({mouseover:i=>{const c=t.properties.count||1;i.target.setIcon(f(c,!0))},mouseout:i=>{const c=t.properties.count||1;i.target.setIcon(f(c,!1))},click:i=>{g("featureClick",t)}})}}).addTo(a):u=l.geoJSON(e,{style:t=>y(t),onEachFeature:(t,r)=>{const p=h(t);if(p&&r.bindPopup(p,{className:"custom-popup"}),r.on({mouseover:i=>{const c=i.target;c.setStyle(y(t,!0)),n.mapType==="district"&&c.bringToFront()},mouseout:i=>{i.target.setStyle(y(t,!1))},click:i=>{g("featureClick",t)}}),n.mapType==="district"&&t.properties.VILLNAME){const i=r.getBounds().getCenter(),c=l.marker(i,{icon:l.divIcon({className:"village-label",html:`<span>${t.properties.VILLNAME}</span>`,iconSize:[100,20],iconAnchor:[50,10]}),interactive:!0});c.on("click",()=>{g("featureClick",t)}),c.addTo(a)}}}).addTo(a)}catch(o){console.error("Failed to load GeoJSON:",o)}}async function _(){if(!(!n.boundaryUrl||!a))try{const e=await(await fetch(n.boundaryUrl)).json();m&&a.removeLayer(m),m=l.geoJSON(e,{style:S}).addTo(a),u&&m.bringToBack()}catch(o){console.error("Failed to load boundary:",o)}}function C(){d.value&&(a=l.map(d.value,{center:n.center,zoom:n.zoom,zoomControl:!0}),l.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',subdomains:"abcd",maxZoom:19}).addTo(a),_(),$())}return L(()=>n.zoom,o=>{a&&a.setZoom(o)}),x(()=>{C()}),N(()=>{a&&(a.remove(),a=null)}),(o,e)=>(z(),A("div",{ref_key:"mapContainer",ref:d,class:"leaflet-map"},null,512))}};export{I as _};
