(() => {
'use strict';
const $ = id => document.getElementById(id);
const repo = 'https://api.github.com/repos/lance087-svg/norwood-website';
let token = '', head = '', source = '', doors = [], selected = null, pendingPhoto = null;
let dirty = false, formDirty = false, busy = false, connected = false;
const photos = new Map();
const status = text => { $('status').textContent = text; };
function controls() {
  $('publish').disabled = busy || !connected || !dirty || formDirty;
  $('download').disabled = busy || !source || formDirty;
  $('add').disabled = busy || !source;
  $('connect').disabled = busy || connected;
  $('disconnect').hidden = !connected;
  $('disconnect').disabled = busy;
}
async function api(path, method = 'GET', data) {
  const response = await fetch(repo + path, {method, headers: {Accept:'application/vnd.github+json', ...(token ? {Authorization:'Bearer ' + token} : {}), ...(data ? {'Content-Type':'application/json'} : {})}, ...(data ? {body:JSON.stringify(data)} : {}), cache:'no-store'});
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'GitHub denied access. Check the token, expiration, and repository Contents permission.' : response.status === 409 || response.status === 422 ? 'The website changed while you were editing. Download your draft backup before reloading; nothing was overwritten.' : 'GitHub request failed (' + response.status + '). Your draft is still in this tab.');
  return response.json();
}
function parse(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc.querySelector('.catalog-grid')) throw new Error('Could not recognize this catalog.');
  return [...doc.querySelectorAll('.catalog-card')].map(c => ({id:c.id, name:c.querySelector('h3').textContent, category:c.dataset.cat, price:c.querySelector('.catalog-price').textContent.replace(/[^\d.]/g,''), description:c.querySelector('.catalog-body p').textContent, image:c.querySelector('img').getAttribute('src')}));
}
function list() {
  $('doors').replaceChildren(); $('count').textContent = '(' + doors.length + ')';
  doors.forEach(door => {
    const b = document.createElement('button'); b.type='button'; b.classList.toggle('selected',selected===door.id);
    const img=document.createElement('img'); img.src=photos.get(door.image)?.url || door.image; img.alt='';
    const text=document.createElement('span'); text.textContent=door.name;
    b.append(img,text); b.onclick=()=> select(door.id); $('doors').append(b);
  }); controls();
}
function mayLeave() { return !formDirty || confirm('Discard the changes in this form? Saved draft changes will be kept.'); }
function select(id, force=false) {
  if (!force && !mayLeave()) return;
  const door=doors.find(d=>d.id===id); selected=id; pendingPhoto=null; formDirty=false;
  $('edit').hidden=!door; if (!door) {list(); return;}
  $('name').value=door.name; $('category').value=door.category; $('price').value=door.price;
  $('description').value=door.description; $('preview').src=photos.get(door.image)?.url || door.image;
  $('photo').value=''; list();
}
function catalogHTML() {
  const doc=new DOMParser().parseFromString(source,'text/html'); const grid=doc.querySelector('.catalog-grid'); grid.replaceChildren();
  const node=(tag,cls,text)=>{const el=doc.createElement(tag); if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const products=[];
  doors.forEach((d,i)=>{
    const card=node('article','catalog-card');card.id=d.id;card.dataset.cat=d.category;
    const image=node('div','catalog-image'), img=node('img');img.src=d.image;img.alt=d.name;img.loading='lazy';image.append(img,node('span','catalog-tag',d.category==='interior'?'Interior':'Exterior'));
    const body=node('div','catalog-body');body.append(node('h3','',d.name),node('div','catalog-price',d.price===''?'Request a quote':'$'+Number(d.price).toLocaleString('en-US',{maximumFractionDigits:2})),node('p','',d.description));
    const url='https://www.norwoodsupply.com/catalog.html#'+d.id;
    const call=node('a','catalog-cta','Call about this door');call.href='tel:9047686818';
    const text=node('a','catalog-cta catalog-text','Text about this door');text.href='sms:9044035261?body='+encodeURIComponent('Hi Norwood Supply, is this door available? '+d.name+' '+url);
    body.append(call,text);card.append(image,body);grid.append(card);
    const product={'@type':'Product',position:i+1,'@id':url,name:d.name,category:d.category==='interior'?'Interior Door':'Exterior Door',description:d.description,image:new URL(d.image,'https://www.norwoodsupply.com/').href,brand:{'@type':'Brand',name:'Norwood Supply'}};
    if(d.price!=='')product.offers={'@type':'Offer',price:String(Number(d.price)),priceCurrency:'USD',url,seller:{'@type':'Organization',name:'Norwood Supply'}};
    products.push(product);
  });
  doc.querySelectorAll('.filter-tab').forEach(tab=>{const cat=tab.dataset.filter;tab.querySelector('.filter-count').textContent='('+doors.filter(d=>cat==='all'||d.category===cat).length+')';});
  doc.getElementById('catalog-results').textContent='Showing '+doors.length+' doors';
  const schema=doc.querySelector('script[type="application/ld+json"]');
  if(schema)schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'ItemList',name:'Norwood Supply Door Catalog',url:'https://www.norwoodsupply.com/catalog.html',itemListElement:products}).replace(/</g,'\\u003c');
  return '<!DOCTYPE html>\n'+doc.documentElement.outerHTML;
}
$('edit').addEventListener('input',()=>{formDirty=true;controls();});
$('photo').onchange=async()=>{
  const file=$('photo').files[0];if(!file)return;
  const selection=selected;
  try {
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw Error('Choose a JPG, PNG, or WebP photo smaller than 20 MB.');
    const bitmap=await createImageBitmap(file); const scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const url=canvas.toDataURL('image/jpeg',.86);if(selected!==selection)return;
    pendingPhoto={path:'images/catalog/upload-'+crypto.randomUUID()+'.jpg',url};$('preview').src=url;formDirty=true;status('Photo ready. Save to draft to use it.');
  } catch(e){status(e.message);$('photo').value='';}controls();
};
$('edit').onsubmit=e=>{
  e.preventDefault(); if(!$('edit').reportValidity())return;
  const d=doors.find(d=>d.id===selected); if(!$('name').value.trim()){status('Enter a door name.');return;}
  if(!d.image&&!pendingPhoto){status('Upload a photo for this new door.');return;}
  Object.assign(d,{name:$('name').value.trim(),category:$('category').value,price:$('price').value,description:$('description').value.trim()});
  if(pendingPhoto){d.image=pendingPhoto.path;photos.set(d.image,{url:pendingPhoto.url});pendingPhoto=null;}
  dirty=true;formDirty=false;list();status('Saved to draft. Publish when you are ready to update the website.');
};
$('add').onclick=()=>{
  if(!mayLeave())return;
  const d={id:'door-'+crypto.randomUUID(),name:'New door',category:'exterior',price:'',description:'',image:''};doors.push(d);dirty=true;select(d.id,true);status('Add the door name and photo, then save to draft.');formDirty=true;controls();
};
$('remove').onclick=()=>{if(confirm('Remove this door from the draft? The website changes only after publishing.')){doors=doors.filter(d=>d.id!==selected);dirty=true;formDirty=false;select(doors[0]?.id,true);status('Door removed from draft.');}};
$('connect').onclick=async()=>{
  if(dirty||formDirty){status('Download your draft backup first, then reload and connect before editing.');return;}
  token=$('token').value.trim();$('token').value='';if(!token){status('Enter your GitHub access token.');return;}
  busy=true;controls();
  try{
    const r=await api('/git/ref/heads/main');const file=await api('/contents/catalog.html?ref='+r.object.sha);
    if(file.encoding!=='base64')throw Error('Catalog content could not be loaded.');
    const html=new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
    const parsed=parse(html);source=html;head=r.object.sha;doors=parsed;connected=true;photos.clear();select(doors[0]?.id,true);status('Connected. Choose a door to edit, or add a new one.');
  }catch(e){token='';status(e.message);}finally{busy=false;controls();}
};
$('disconnect').onclick=()=>{token='';connected=false;head='';status('Disconnected. Download a backup to keep any draft changes before closing.');controls();};
$('download').onclick=()=>{
  const used=new Set(doors.map(d=>d.image));const backup={format:'norwood-catalog-draft-v1',catalog:catalogHTML(),photos:[...photos].filter(([p])=>used.has(p)).map(([path,p])=>({path,data:p.url}))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(backup)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='norwood-catalog-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Draft backup downloaded. It contains the catalog and your new photos; you can send it to your website editor to recover changes.');
};
$('publish').onclick=async()=>{
  if(!connected||busy||formDirty)return;
  if(doors.some(d=>!d.image||!d.name.trim())){status('Every door needs a name and photo. Save or remove the unfinished door.');return;}
  if(!confirm('Publish these '+doors.length+' doors to the public Norwood Supply website?'))return;
  busy=true;controls();$('edit').inert=true;$('doors').inert=true;status('Publishing catalog and photos…');
  try{
    const current=await api('/git/ref/heads/main');if(current.object.sha!==head)throw Error('The website changed while you were editing. Download your draft backup before reloading; nothing was overwritten.');
    const parent=await api('/git/commits/'+head), entries=[];
    for(const path of new Set(doors.map(d=>d.image))){if(photos.has(path)){const blob=await api('/git/blobs','POST',{encoding:'base64',content:photos.get(path).url.split(',')[1]});entries.push({path,mode:'100644',type:'blob',sha:blob.sha});}}
    const html=catalogHTML();entries.push({path:'catalog.html',mode:'100644',type:'blob',content:html});
    const tree=await api('/git/trees','POST',{base_tree:parent.tree.sha,tree:entries});
    const commit=await api('/git/commits','POST',{message:'Update door catalog and photos',tree:tree.sha,parents:[head]});
    await api('/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});
    const verified=await api('/git/ref/heads/main');if(verified.object.sha!==commit.sha)throw Error('GitHub accepted the update but another change followed. Check the website before publishing again.');
    head=commit.sha;source=html;dirty=false;status('Saved to GitHub. Website deployment is pending and may take a few minutes. Open “View website” to check the new pictures.');
  }catch(e){status(e.message);}finally{busy=false;$('edit').inert=false;$('doors').inert=false;controls();}
};
window.addEventListener('beforeunload',e=>{if(dirty||formDirty){e.preventDefault();e.returnValue='';}});
fetch('catalog.html',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Could not load catalog.');return r.text();}).then(html=>{source=html;doors=parse(html);select(doors[0]?.id,true);status('Catalog loaded. Connect GitHub before editing if you want to publish directly.');}).catch(e=>status(e.message));
})();
