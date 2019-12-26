const blocky = {                                                                                       
    
    
    Cube: function (obje) {
        /*
        obj:{
            transfirm:方块基本变换
            size:方块尺寸
            texture:原贴图
            uv:取样点，按照Minecraft标准
            name:名字，给方块集用
        }
        */
        this.findName;
        this.name=obje.name;
        this.uv = obje.uv;
        this.texture;
        this.faces;
        this.forEachFace;
        this.size;
        this.updateTransform;
        this.transform;
        this.element = document.createElement("div");
        let box = this.element;
        
        box.style["transform-style"] = "preserve-3d";
        box.style["transform-origin"] = "center";
        
        //制造方块
        function plane(){
            /*
            name:名字
            uv:当前texture读取位置
            texture:当前平面使用的部分材质
            size:大小
            */
            let e = document.createElement("div");
            let s = e.style;
            s.position = "absolute";
            s["box-sizing"] = "border-box";
            s["transform-style"] = "preserve-3d";
            s["background-repeat"]="no-repeat";
            return e;
        }
        let cube=(function(){
            let c=["top","bottom","left","right","front","back"];
            let o={};
            for(let i of c){
                let p=o[i]=plane();
                p.name=i;
                box.appendChild(p);
            }
            return o;
        })()
        
        this.faces = cube;
        this.forEachFace=function(fn){
            for(let i in cube){
                let m=fn(cube[i],i);
            }
        }
        
        //设置贴图
        let _texture;
        Object.defineProperty(this,"texture",{
            set:(texture)=>{
            if(!texture)return;
            let uv=this.uv;
            let [x,y,z]=this.size;
            if(!uv)throw "Cannot set texture before set UVs"
            if (typeof texture!="string") {
                texture=URL.createObjectURL(new Blob([texture]));
            }
            let posi = {
                //fromX,fromY,width,height
                front: [z, z, x, y],
                back: [2 * z + x, z, x, y],
                top: [z, 0, x, z],
                bottom: [z + x, 0, x, z],
                left: [z + x, z, z, y],
                right: [0, z, z, y]
            }
            let workCanvas = document.createElement("canvas");
            for (let i in posi) {
                let cu=cube[i];
                let po=posi[i];
                let s=cu.style;
                s["background-image"] = "url('"+texture+"')";
                s["background-position"]=(-uv[0]-po[0])+"px "+(-uv[1]-po[1])+"px";
        
                cu.uv=uv.map((e,ind)=>e+po[ind]);
            }
            _texture=texture;
        },
        get:()=>{
            return _texture;
        }
        });
        
        let _size=[0,0,0];
        Object.defineProperty(this,"size",{
            get:()=>{
                return _size;
            },
            set:(v)=>{
                let [x,y,z]=v;
                let stg={
                    front: [[0, 0, 0],[-x / 2, -y / 2, z / 2], [x, y]],
                    back: [[0, "180deg", 0], [-x / 2, -y / 2, -z / 2], [x, y]],
                    top: [["90deg", 0, 0], [-x / 2, -z / 2 - y / 2, 0], [x, z]],
                    bottom: [["90deg", 0, 0], [-x / 2, -z / 2 + y / 2, 0], [x, z]],
                    left: [[0, "90deg", 0], [-z / 2 + x / 2, -y / 2, 0], [z, y]],
                    right: [[0, "270deg", 0], [-z / 2 - x / 2, -y / 2, 0], [z, y]]
                }
                for(let i in stg){
                    let q=cube[i];
                    let t=stg[i];
                    q.style.transform =
                        "translateX(" + t[1][0] + "px)" +
                        "translateY(" + t[1][1] + "px)" +
                        "translateZ(" + t[1][2] + "px)" +
                        "rotateX(" + t[0][0] + ")" +
                        "rotateY(" + t[0][1] + ")" +
                        "rotateZ(" + t[0][2] + ")";
                    let s=q.style;
                    s.width=t[2][0]+"px";
                    s.height=t[2][1]+"px";
                    q.size=t[2];
                }
                _size=v;
            }
        })
        
        if(obje.transform){
            let o=obje.transform;
            this.position=o.position||[0,0,0];
            this.rotate=o.rotate||[0,0,0];
            this.scale=o.scale||[1,1,1];
        };
        
        {
            let globalTran=new blocky.Transform(box);
            //设置标准转换的getter和setter
            let obj=new blocky.Transform();
            let tr={};
            let def=(name)=>{
                tr[name]=this[name];
                Object.defineProperty(this,name,{
                    get:()=>{
                        return tr[name]
                    },
                    set:(v)=>{
                        if(name=="scale"&&!(v instanceof Array)){
                            v=[v,v,v];
                        }
                        tr[name]=v;
                        foo();
                    }
                })
            }
            def("rotate");
            def("position");
            def("scale");
            function foo(){
                obj.clear();
                obj.translate(tr.position||[]);
                obj.rotate(tr.rotate||[]);
                obj.scale(tr.scale||[]);
                globalTran.update();
            }
            this.updateTransform=foo;
            this.transform=new blocky.Transform();
            globalTran.add(obj);
            globalTran.add(this.transform);
            foo()
        }
        
        this.findName=(obj)=>{
            for(let i in this.faces){
                if(this.faces[i]==obj)return i;
            }
        }
        
        if(obje.size)this.size=obje.size;
        if(obje.texture)this.texture=obje.texture;
    },
    
    
    CubeSet: function (element_) {
        let ele=this.element=element_||document.createElement("div");
        let chi=this.children = {
            _unnamed_:[]
        };
        this.forEach=(fn)=>{
            chi._unnamed_.forEach(fn);
            for(let i in chi){
                if(i=="_unnamed_")continue;
                fn(chi[i],i);
            }
        }
        ele.style["transform-style"] = "preserve-3d";
        this.add = (cube) => {
            if(typeof cube.name!="string")
                chi["_unnamed_"].push(cube)
             else
                chi[cube.name]=cube
            ele.appendChild(cube.element);
            return this;
        },
        
        this.remove=(cube)=>{
            for(let i in chi){
                if((typeof cube=="string"&&
                  chi[i].id!=cube)||
                  cube!=chi[i])continue;
                if(cube.name){
                  delete chi[cube.name];
                }else{
                  chi.splice(i,1);
                }
                ele.removeChild(cube.element);
                return true;
            }
            return false;
        }
        this.findName=(obj)=>{
            for(let i in children){
                if(i=="_unnamed_")continue;
                if(children[i]==obj)return i;
            }
        }
        
        let tra=this.transform=new blocky.Transform(ele);
    },
    
    
    Transform:function(ele){
        let r=this.rules=[];
        this.identify=Symbol("id");
        this.element=ele;
        this.addRaw=(code,id)=>{
            r.push({
                raw:code,
                id:id||null
            });
            this.update();
        }
        this.add=(name,arr,unit,id)=>{
            if(name instanceof blocky.Transform
                || typeof name=="object"){
                //这里的name仅指第一个参数
                r.push(name);
                this.update();
                return;
            }
            arr=arr.map((x)=>{
                if(typeof x=="number")return Number(x.toFixed(4));
                else return x
            });
            r.push({
                name:name,
                params:arr,
                unit:unit,
                id:id||null
            });
            this.update();
        }
        this.update=()=>{
            if(!ele||!this.enabled)return;
            let str="";
            let foo=(e)=>{
                if(e.raw){
                    str+=e.raw;
                }else if(e instanceof blocky.Transform){
                    e.rules.forEach(foo);
                }else{
                    //alert(JSON.stringify(q))
                    let {name,params=[],unit=""}=e;
                    params=params.map(x=>x+String(unit));
                    str+=name+"("+params.join(",")+")";
                }
            }
            r.forEach(foo)
            ele.style.transform=str;
            //alert(str)
        }
        this.getById=function(id){
            for(let i of r){
                if(i.id==id)return i
            }
            return null;
        }
        this.scale=function(arr){
            this.add("scale3d",arr)
        }
        this.translate=function(arr){
            this.add("translate3d",arr,"px")
        }
        this.rotate=function(arr){
            let n=(sy,a)=>{
                this.add("rotate"+sy,[arr[a]],"turn")
            }
            n("X",0);
            n("Y",1);
            n("Z",2);
        }
        this.clear=function(){
            this.rules=r=[];
            this.update();
        }
        this.remove=function(id){
            r.forEach((e,i)=>{
                if(e.id==id||e==id){
                    r.splice(i,1);
                }
            });
            this.update();
        }
        this.enabled=true;
    }
}