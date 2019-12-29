function Color(){                                                           
    let define=(n,sett,def)=>{
        let va="_"+n;
        this[va]=def;
        Object.defineProperty(this,n,{
            get:()=>{
                return this[va];
            },
            set:sett
        });
    }
    function check(v){
        v=Math.floor(v);
        if(v>0xff)v=0xff;
        if(v<0)v=0;
        return v;
    }
    
}