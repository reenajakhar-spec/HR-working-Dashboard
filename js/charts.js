const CHARTS = {};
function makeLineChart(id, labels, data, label) {
  const el = document.getElementById(id);
  if (!el) return;
  if (CHARTS[id]) CHARTS[id].destroy();
  CHARTS[id] = new Chart(el, {
    type:'line',
    data:{labels:labels,datasets:[{label:label,data:data,borderColor:'#147b8d',backgroundColor:'rgba(20,123,141,.10)',fill:true,tension:.35,pointRadius:3,borderWidth:2.4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(15,95,109,.08)'}}}}
  });
}
