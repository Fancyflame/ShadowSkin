/*API
1.在网页中使用<h-frame>标签来使用跨域框架
实例：<h-frame src="demo.html"></h-frame>
使用<script src="hframe" defer></script>
来使用脚本，必须声明defer！
2.脚本应用后自动向父窗口开启连接
3.若不慎丢失hframe.window或失效(基本上不会)，可以将
父级hframe.window设置成null，子级发送任意数据来重新
连接，父级会将此数据内容作废，并同样触发connect事件
4.需要在子窗口也使用hframe脚本

HFrame.send(msg,target)：向target发送信息，若未指
    定target则向父窗口发送信息
hframe.connect事件()：当通道连接完成后触发
hframe.msg事件(msg)：有来自本窗口的消息时触发
hframe.window：已建立通道的窗口，若未建立则是null
hframe.src：定义地址
hframw.fullScreen：全屏
window.msg事件(msg):有从父级窗口发来消息时触发
*/

//try{
class HFrame extends HTMLElement {
    constructor() {
        try {
            //事件：msg,connect
            super();
            this._fullScreen = false;
            this._style = "";
            let ifr = this.iframe = document.createElement("iframe");
            this.window = null;
            this.appendChild(ifr);
            ifr.style = "width:100%;height:100%;border:none;margin:0;";
            //ifr.sandbox="allow-same-origin allow-top-navigation allow-forms allow-scripts";
            window.addEventListener("message", (message) => {
                let { data, source } = message;
                if (source != ifr.contentWindow) {
                    return;
                }
                if (!this.window) {
                    this.window = source;
                    this._emit("connect");
                    return;
                }
                this._emit("msg", data);
            }, false);

            ifr.addEventListener("load", () => {
                this.window = null;
            });
            this._iframe = ifr;

            this.src = this.getAttribute("src") || "";
        } catch (err) { alert(err); }
    }

    _emit(name, obj, bb, cc) {
        HFrame.emit(this, name, obj, bb, cc);
    }

    set src(v) {
        this.iframe.src = v;
        this.window = null;
    }
    get src() {
        return this.iframe.src;
    }

    set fullScreen(v) {
        v = Boolean(v);
        if (v == this._fullScreen) return;
        if (v) {
            this._style = this.getAttribute("style");
            super.style =
                `display:block;
                 position:fixed;
                 width:100%;height:100%;
                 margin:0;padding:0;
                 box-sizing:border-box;
                 background-color:white;`;
        } else {
            //super.style="";
            try {
                super.style = this._style;
            } catch (err) { alert(err); }
        }
        this._fullScreen = v;
    }
    get fullScreen() {
        return this._fullScreen;
    }

    set style(v) {
        if (this._fullScreen)
            throw "Only cancel the full screen mode can you set style";
        super.style = v;
    }
    get style() {
        return super.style;
    }

    send(msg) {
        if (!this.window) throw "The frame cannot be call without connection.";
        this.window.postMessage(msg, "*");
    }

    static send(msg, tar = window.parent) {
        tar.postMessage(msg, "*");
    }

    static emit(ref, name, obj, bb, cc) {
        let a = new CustomEvent(name, {
            detail: obj,
            bubbles: bb || false,
            cancelable: cc || false
        });
        ref.dispatchEvent(a);
    }
}
customElements.define("h-frame", HFrame);
window.addEventListener("load", () => {
    if (window.parent != window) HFrame.send("");
});
if (window.parent != window)
    window.addEventListener("message", (message) => {
        let { data, source } = message;
        if (source != window.parent) return;
        HFrame.emit(window, "msg", data, true);
    });
//}catch(err){alert(err)}