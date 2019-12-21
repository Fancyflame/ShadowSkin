/*
用法：
nodejs:
const jf=require("jsonformat.js");
html:
<script src="jsonformat.js">
属性：
formatJSON.bestLength - 最佳换行字数
formatJSON.indent - 缩进空格数
formatJSON(Object) - 格式化object
*/
function formatJSON(k){                                                 
  const maxl=formatJSON.bestLength;//最佳折行字数
  const mul=formatJSON.indent;//缩进字数
  if(typeof k!="object")
    k=String(k)
  if(typeof k=="string")
    try{
      k=JSON.parse(k)
    }catch(err){throw "Cannot parse the string"};
  let idt=0;
  function read(obj){
    if(typeof obj!="object"||
      obj instanceof Array)
      return readValue(obj)
    idt++;
    if(!obj)return "{}";
    let white=Array(idt*mul+1).join(" ");
    let elements=[];
    for(let i in obj){
      let s='"'+i+'":';
      let x=obj[i];
      let m=readValue(x);
      if(m===undefined)continue;
      elements.push(s+m);
    }
    
    function readValue(x){
      idt++;
      let ot;
      let white=Array(idt*mul+1).join(" ");
      let sli=white.slice(mul);
      if(x instanceof Array){
        let Stri=[];
        let stri=[];
        for(let i of x){
          let m=readValue(i);//添加数据
          let j1=stri.join(",").length;//原数据长
          let j2=j1+m.length+1;//添加后长度
          if(j2>maxl){
            //添加后长度大于maxl(算上逗号)
            if(j2-maxl>maxl-j1){
              if(stri.length>0)Stri.push(stri.join(","));
              stri=[m];
            }else{
              stri.push(m);
              Stri.push(stri.join(","));
              stri=[];
            }
          }else stri.push(m)
        }
        if(stri.length>0)Stri.push(stri);
        if(Stri.toString().length<maxl)ot="["+Stri+"]"
        else ot="[\n"+
          white+Stri.join(",\n"+white)+
          "\n"+sli+"]";
      }else if(typeof x=="object"){
        if(x==null)ot=x
        else{
          idt--;
          ot=read(x);
          idt++;
        }
      }else{
        x=JSON.stringify(x);
        if(x)ot=x;
      }
      idt--;
      return ot;
    }
    let r="{"+elements.join(",")+"}";
    idt--;
    if(r.length<maxl)return r
    else return "{\n"+
      white+elements.join(",\n"+white)+
      "\n"+white.slice(mul)+"}";
  }
  return read(k);
}
formatJSON.bestLength=20;
formatJSON.indent=2;
if(module&&module.exports)module.exports=formatJSON;
/*console.log(formatJSON({
  a:{
    a:[12,2,3,3,4,89,99,8,7,76,6,],
    b:[727,2,3,3,3]
  },
  b:[
    {
      a:282828,
      b:"dddd"
    },
    {
      c:99,
      d:"--"
    },
    [2333,2,2,2245,2,2,2,3344]
  ],
  c:20
}))*/