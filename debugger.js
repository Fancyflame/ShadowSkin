
{
    let recordErr = [];
    function beforeload(error) {
        recordErr.push(error);
    }
    window.addEventListener("error", beforeload);
    window.addEventListener("load", load);
    function load() {
        window.removeEventListener("error", beforeload);
        const baseUrl = (function () {
            let u = window.location.href;
            let i = u.lastIndexOf("/");
            return u.slice(0, i);
        })();
        let icon = document.createElement("button");
        let errors = 0;
        icon.style = `
        border-radius:1000%;
        border:none;
        box-shadow:0px 0px 15px -2px dimgrey;
        color:white;
        font-weight:bold;
        width:120px;
        height:120px;
        position:fixed;
        z-index:9999;
        font-size:40px;
    `;
        {
            let posi = function () {
                return [10, 10];
                let q = window.screen;
                return [q.availWidth || 20, q.availHeight || 20];
            }();//总位移
            let start;//起始坐标
            let pressed = false;
            icon.ontouchstart = (ev) => {
                ev = ev.touches[0];
                start = [ev.pageX, ev.pageY];
                pressed = true;
            };
            icon.ontouchmove = (ev) => {
                if (!pressed) return;
                ev.preventDefault();
                ev = ev.touches[0];
                ev = [ev.pageX, ev.pageY];
                posi = posi.map((x, i) => (x + ev[i] - start[i]));
                icon.style.left = posi[0] + "px";
                icon.style.top = posi[1] + "px";
                start = ev;
            };
            icon.ontouchend = () => {
                pressed = false;
            };
            icon.style.left = posi[0] + "px";
            icon.style.top = posi[1] + "px";
        }
        function clearError() {
            let s = icon.style;
            s["background-color"] = "limegreen";
            s.background = "linear-gradient(45deg,limegreen,greenyellow 130%)";
            icon.innerText = errors = 0;
        }
        function addError() {
            if (!errors) {
                let s = icon.style;
                s["background-color"] = "tomato";
                s.background = "linear-gradient(135deg,orangered,red 130%)";
            }
            errors++;
            icon.innerText = errors > 99 ? "99+" : errors;
        }
        clearError();
        document.body.appendChild(icon);


        let win = document.createElement("div");
        document.body.appendChild(win);
        win.style = `
      position:fixed;
      width:100%;
      opacity:0.95;
      box-sizing:border-box;
      border:1px solid whitesmoke;
      background:white;
      bottom:0px;
      display:none;
      overflow-y:scroll;
    `;


        let close = document.createElement("button");
        close.style = `
        position:fixed;
        right:10px;
        top:calc(50% - 70px);
        width:70px;
        height:70px;
        background:#eee;
        color:dimgrey;
        font-weight:bold;
        display:block;
        border:2px solid whitesmoke;
        border-radius:10px;
    `;
        close.innerText = "X";
        close.onclick = () => {
            win.style.display = "none";
            clearError();
        };

        icon.onclick = _ => {
            if (!win.style.display) {
                close.click();
                return;
            }
            win.style.display = "";
            clearError();
        };
        win.appendChild(close);


        function resize() {
            win.style.height = (document.body.clientHeight / 2) + "px";
        }
        window.addEventListener("resize", resize);
        resize();

        let hideInfo = () => { };
        window.addEventListener("error", addDiv);


        function addDiv(error) {
            const htmlsrc = document.documentElement.outerHTML.split("\n");
            /*if(win.childNodes.length>=10){
                win.removeChild(win.childNodes[0]);
            }*/
            try {
                let time = new Date().getTime();
                let { message: msg, filename: sou, lineno: ln, colno: cn, error: err } = error;

                addError();
                let div = document.createElement("div");
                div.style = `
          border-bottom:3px solid lightpink;
          padding:3px;
          background-color:lavenderblush;
          width:100%;
          height:auto;
          color:red;
          overflow:scroll;
        `;
                div.setAttribute("tabindex", "10");

                //简述
                let sketch = document.createElement("span");
                sketch.innerText = msg;

                //详情
                let detail = document.createElement("div");
                detail.innerHTML =
                    `<p style="font-weight:bold">${msg}</p>` +
                    `<span style="` +
                    `word-wrap:break-word;word-break:break-all;">` +
                    `at ${sou}</span><br><br>` +
                    `at position ${ln}:${cn}<br>` +
                    `triggered <span time></span> ago`;
                if (err && err.stack) {
                    let p = document.createElement("p");

                    p.style = "word-wrap:break-word;word-break:break-all;";

                    let stack = "Stack:\n" + err.stack.replace(/\n/g, "\n\n");

                    while (true) {
                        let o = stack.indexOf(baseUrl);
                        if (o < 0) break;
                        stack = stack.replace(baseUrl, "");
                    }

                    p.innerText = stack;
                    detail.appendChild(p);
                }/*else{
            let p=document.createElement("p");
            let info="Target:\n"+error.currentTarget||"???";
            p.innerText=info;
            detail.appendChild(p);
        }
        if(sou==window.location.href){
            let s=htmlsrc[ln];
            let reg=/(\w+|.)/;
            reg.lastIndex=cn-1;
            s=s=s.replace(reg,"<u>$1</u>");
            s=s.slice(cn-15<0?0:cn-15,cn+16);
            s="<u>"+s+"</u>";
            let p="<p>"+s+"</p>";
            detail.innerHTML+=p;
        }*/
                function showDetails(b) {
                    if (b) {
                        let s = (new Date().getTime() - time) / 1000;
                        function calc(m, mod) {

                            return Math.floor(mod ? s % (60 ** m) : s / (60 ** m));
                        }
                        if (s > 3600) {
                            s = calc(2) + "h " + calc(2, true) + "min ";
                        } else if (s > 60) {
                            s = calc(1) + "min " + calc(1, true) + "s ";
                        } else {
                            s = s.toFixed(1) + "s ";
                        }
                        detail.querySelector("[time]").innerText = s;
                    }
                    sketch.style.display = b ? "none" : "";
                    detail.style.display = b ? "" : "none";
                }
                div.onfocus = _ => {
                    hideInfo();
                    hideInfo = () => {
                        showDetails(false);
                    };
                    showDetails(true);
                };
                //div.onblur=_=>showDetails(false);
                detail.onclick = () => {
                    div.blur();
                    showDetails(false);
                    hideInfo = () => { };
                };
                showDetails(false);

                div.appendChild(sketch);
                div.appendChild(detail);
                win.insertBefore(div, win.childNodes[0] || null);
            } catch (err) { alert(err.stack); }
        }
        recordErr.forEach((e) => {
            addDiv(e);
        });
    }
}