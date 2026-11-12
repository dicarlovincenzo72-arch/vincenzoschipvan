const enc=new TextEncoder();

async function makeToken(secret){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,enc.encode('vincenzos-event-compliance-authorised'));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function cookieValue(request,name){
  const cookie=request.headers.get('Cookie')||'';
  for(const part of cookie.split(';')){
    const [k,...rest]=part.trim().split('=');
    if(k===name)return rest.join('=');
  }
  return '';
}

function redirect(location,headers={}){
  return new Response(null,{status:303,headers:{Location:location,'Cache-Control':'no-store',...headers}});
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.hostname.toLowerCase()==='www.vincenzoschipvan.com'){
      url.hostname='vincenzoschipvan.com';
      return Response.redirect(url.toString(),308);
    }
    let path;
    try{path=decodeURIComponent(url.pathname).replace(/\/+/g,'/').replace(/\/+$/,'').replace(/\.html$/,'')||'/'}catch{return new Response('Invalid URL',{status:400})}
    const protectedPath=(path==='/event-compliance-documents' || path.startsWith('/event-compliance-documents/')) || path==='/compliance-docs' || path.startsWith('/compliance-docs/');
    const loginPath=path==='/event-compliance-portal/login';

    if(loginPath && request.method==='POST'){
      const form=await request.formData();
      const submitted=String(form.get('code')||'');
      const secret=env.EVENT_PORTAL_CODE;
      if(!secret)return new Response('Event Compliance Portal is not configured yet.',{status:503});
      if(submitted!==secret)return redirect('/event-compliance-portal?error=1');
      const token=await makeToken(secret);
      return redirect('/event-compliance-documents',{
        'Set-Cookie':`vincenzos_portal=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`,
        'Cache-Control':'no-store'
      });
    }

    if(protectedPath){
      const secret=env.EVENT_PORTAL_CODE;
      if(!secret)return redirect('/event-compliance-portal');
      const expected=await makeToken(secret);
      const actual=cookieValue(request,'vincenzos_portal');
      if(actual!==expected)return redirect('/event-compliance-portal');
    }

    const response=await env.ASSETS.fetch(request);
    if(!protectedPath)return response;
    const privateResponse=new Response(response.body,response);
    privateResponse.headers.set('Cache-Control','private, no-store');
    privateResponse.headers.set('X-Robots-Tag','noindex, nofollow');
    return privateResponse;
  }
};

