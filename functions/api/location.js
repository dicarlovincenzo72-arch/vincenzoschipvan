// Same-origin bridge for the public van location.
// The secret Traccar upload URL never belongs in this file.
const UPSTREAM = 'https://vincenzos-van-live.dicarlo-vincenzo72.chatgpt.site/api/location';
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'}
});
export async function onRequestGet() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(UPSTREAM, {headers:{Accept:'application/json'},signal:controller.signal,cache:'no-store'});
    if (!response.ok) return json({live:false,error:'upstream_error'}, 503);
    const location = await response.json();
    if (location?.live !== true) return json({live:false});
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (!Number.isFinite(latitude) || Math.abs(latitude)>90 || !Number.isFinite(longitude) || Math.abs(longitude)>180) {
      return json({live:false,error:'invalid_coordinates'}, 503);
    }
    // The upstream service is the authority for live/offline state. Its timestamp
    // is optional and may be ISO text, Unix seconds or Unix milliseconds.
    const rawTime = location.updatedAt ?? location.timestamp ?? location.fixTime ?? location.deviceTime;
    let updatedAt = null;
    if (rawTime !== null && rawTime !== undefined && rawTime !== '') {
      const numeric = typeof rawTime === 'number' || /^\\d+$/.test(String(rawTime));
      updatedAt = numeric ? Number(rawTime) * (Number(rawTime) < 1e11 ? 1000 : 1) : Date.parse(String(rawTime));
      if (!Number.isFinite(updatedAt)) updatedAt = null;
    }
    // Reject stale coordinates when the server provides a usable timestamp.
    // Without one, honour the upstream's explicit live=true and don't invent
    // an update time.
    if (updatedAt !== null && (Date.now()-updatedAt>5*60*1000 || updatedAt>Date.now()+60*1000)) return json({live:false});
    return json({live:true,latitude,longitude,updatedAt:updatedAt===null?null:new Date(updatedAt).toISOString()});
  } catch {
    return json({live:false,error:'gps_service_unreachable'}, 503);
  } finally {
    clearTimeout(timer);
  }
}
