const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../catalog-inquiry.js'),'utf8');
function setup({mobile=false,endpoint='https://example.test/inquiries',mode='ok'}={}){
 const ids={},listeners={},requests=[];let seq=0;
 const el=()=>({value:'',hidden:false,disabled:false,textContent:'',listeners:{},addEventListener(e,f){this.listeners[e]=f},showModal(){},close(){},reportValidity(){return true},querySelectorAll(){return []}});
 for(const id of ['contact-dialog','catalog-inquiry-form','inquiry-send','contact-close','inquiry-error','inquiry-success','contact-number','contact-title','inquiry-product','inquiry-message','inquiry-name','inquiry-contact','inquiry-website'])ids[id]=el();
 const link={textContent:'Text about this door →',getAttribute:()=> 'sms:9044035261?body=test',closest:()=>({id:'door-8',querySelector:()=>({textContent:'Oval Door'})})};
 const context={document:{currentScript:{dataset:{endpoint}},getElementById:id=>ids[id],querySelectorAll:()=>[link],addEventListener:(e,f)=>listeners[e]=f},navigator:{userAgent:mobile?'iPhone':'desktop'},crypto:{randomUUID:()=>`test-${++seq}`},AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{const body=JSON.parse(options.body);requests.push(body);if(mode==='network')throw Error('offline');return {ok:mode!=='reject',json:async()=>mode==='unconfirmed'?{}:{received:true,requestId:body.requestId}};}};
 vm.runInNewContext(source,context);
 function open(){listeners.click({preventDefault(){},target:{closest:()=>link}})}
 if(!mobile){open();ids['inquiry-name'].value='Test Customer';ids['inquiry-contact'].value='customer@example.test';}
 return {ids,requests,link,listeners,submit:()=>ids['catalog-inquiry-form'].listeners.submit({preventDefault(){}})};
}
test('mobile keeps native SMS and installs no desktop handlers',()=>{const h=setup({mobile:true});assert.equal(h.link.textContent,'Text about this door →');assert.equal(h.listeners.click,undefined)});
test('confirmed submission carries product and reply contact',async()=>{const h=setup();await h.submit();assert.equal(h.requests.length,1);assert.equal(h.requests[0].product.name,'Oval Door');assert.equal(h.requests[0].contact,'customer@example.test');assert.equal(h.ids['inquiry-success'].hidden,false);assert.equal(h.ids['catalog-inquiry-form'].hidden,true)});
test('invalid contact never sends',async()=>{const h=setup();h.ids['inquiry-contact'].value='not a contact';await h.submit();assert.equal(h.requests.length,0);assert.equal(h.ids['inquiry-error'].hidden,false)});
test('missing endpoint never simulates sending',async()=>{const h=setup({endpoint:''});await h.submit();assert.equal(h.requests.length,0);assert.equal(h.ids['inquiry-success'].hidden,true);assert.match(h.ids['inquiry-error'].textContent,/not been sent/)});
for(const mode of ['network','reject','unconfirmed'])test(mode+' preserves details, reports no success, and reuses retry ID',async()=>{const h=setup({mode});await h.submit();await h.submit();assert.equal(h.requests[0].requestId,h.requests[1].requestId);assert.equal(h.ids['inquiry-name'].value,'Test Customer');assert.equal(h.ids['inquiry-send'].disabled,false);assert.equal(h.ids['inquiry-success'].hidden,true);assert.equal(h.ids['inquiry-error'].hidden,false)});
