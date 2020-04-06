/*
    FastTemplate
    Author:FancyFlame
*/
let FTM;
{
    const templates = {};
    const DataSource = function (node, once) {
        /*if (node._ftmComputed) { return; }
        else {
            //console.log(node.ftmAlive);
        }*/
        if (!new.target) return new DataSource(...arguments);
        let data = this;
        let watchPool = new Set();
        let ftmData = {};
        let ftmProxy;
        {
            let obj = {
                $watch: function (watcher) {
                    watchPool.add(watcher);
                    Object.entries(ftmData).forEach(x => watcher.render(...x));
                },
                $unwatch: function (watcher) {
                    watchPool.delete(watcher);
                },
                $getValue: function () {
                    return ftmData;
                }
            };
            for (let i in obj) {
                (function (i) {
                    Object.defineProperty(data, i, {
                        get: function () {
                            return obj[i];
                        }
                    });
                })(i);
            }
        }
        //设置ftmProxy选项
        let haveSettedData = false;
        //console.log(target.ftmData);
        Object.defineProperty(node, "ftmData", {
            get: function () {
                return data;
            },
            set: function (v) {
                //劫持get和set
                if (once && haveSettedData) return;
                haveSettedData = true;
                Object.keys(ftmData).forEach(x => {
                    delete data[x];
                });
                ftmData = Object.assign({}, v);
                Object.entries(v).forEach(array => {
                    let prop = array[0];
                    let options = {
                        get: function () {
                            return ftmData[prop];
                        },
                        set: function (v) {
                            //更新数据
                            if (once) return;
                            ftmData[prop] = v;
                            watchPool.forEach(x => {
                                x.render(prop, v);
                            });
                        },
                        configurable: true,
                        enumerable: true
                    };
                    Object.defineProperty(v, prop, options);
                    Object.defineProperty(data, prop, options);
                    watchPool.forEach(x => {
                        x.render(...array);
                    });
                });
                if (once) {
                    Object.seal(v);//禁止修改
                }
                ftmProxy = v;
                /*ftmData = {};
                ftmProxy = new Proxy(ftmData, {
                    set: function (target, prop, value) {
                        target[prop] = value;
                        setNode(prop);
                    }
                });
                for (let i in v) {
                    ftmProxy[i] = v[i];
                }*/
            }
        });
    };
    const Binds = function (node) {
        let binds = this;
        let sources = new Set(); //绑定到的数据源
        let cache = {}; //缓存的DataSource
        binds.ele = node;
        binds.connectTo = function (data) {
            if (data instanceof Array) {
                data.forEach(binds.connectTo);
                return;
            }
            //if (sources.has(data)) return;
            sources.add(data);
            data.$watch(binds);
        };
        binds.disconnectFrom = function (data) {
            if (data instanceof Array) {
                data.forEach(binds.disconnectFrom);
                return;
            }
            //if (!sources.has(data)) return;
            sources.delete(data);
            data.$unwatch(binds);
        };
        Object.defineProperties(binds, {
            firstData: {
                get: function () {
                    return sources.values().next().value || null;
                }
            }
        });
        binds.getValue = DataSource.getValue;
        binds.connectedData = sources;
        const listeners = {
            //模板里头绑定的数据
            /*
            var1:{
                attr:Map {
                    [object HTMLDivElement]:{
                        attrname1:"%{foo}",
                        attrname2:"abcde%{bar}"
                    }
                },
                innr:Map {
                    [object #Text]:"%{name} is a text node!!"
                },
                func:[function]
            }
            */
        };

        //这块负责读取需要的模块
        const detectVar = (name) => {
            //创建一个观察变量
            if (!listeners[name]) {
                (listeners[name] = {
                    attr: new Map(),
                    innr: new Map(),
                    func: []
                });
            }
            return listeners[name];
        };
        detectVar("##javascript");

        //监听属性变化
        binds.addPropListener = function (prop, f) {
            let q = detectVar(prop);
            q.func.push(f);
        };
        binds.removePropListener = function (prop, f) {
            let q = listeners[prop];
            if (!q) return;
            let list = q.func;
            let ind = list.indexOf(f);
            if (ind >= 0) list.splice(ind, 1);
        };

        function getRequirement(refe) {
            if (refe.nodeType === 1) {
                //元素节点
                for (let i = 0; i < refe.attributes.length; i++) {
                    let a = refe.attributes[i];
                    let arr = readBlock(a.value);
                    arr.forEach((e) => {
                        //e = e.slice(2, -1);//去除%{和}
                        let obj = detectVar(e);
                        let current = obj.attr.get(refe);//变量的属性的当前元素分区
                        if (!current) {
                            current = {};
                            obj.attr.set(refe, current);
                        }
                        current[a.name] = a.value;
                    });
                }
                refe.childNodes.forEach(e => { if (!e._ftmComputed) DOMchange(e, binds); });
            } else if (refe.nodeType === 3) {
                //文本节点
                let arr = readBlock(refe.nodeValue);
                refe.ftmObs = node;
                arr.forEach((e) => {
                    //e = e.slice(2, -1);//去除%{和}
                    let obj = detectVar(e);
                    obj.innr.set(refe, refe.nodeValue);
                });
            }
        }
        binds.watch = getRequirement;
        if (node) getRequirement(node);

        //辅助读取ftmBlock
        function _readBlock(str) {
            let blocks = [];//里面提供：[<number Start>,<string completeContent>,<string requires>]
            let reg = /%{/g;
            //检测每个可能是ftmBlock的块
            while (true) {
                if (!reg.exec(str)) break;//这里还有记录lastIndex的作用，此时lastIndex是完整的ftmBlock开端
                let startIndex = reg.lastIndex - 2;
                let rest = str.slice(reg.lastIndex);//从完整的ftmBlock开端开始截取后面的字符串
                let type = rest.match(/^js\:|^glb-js\:|^html\:|^[\w\$]+(?=\})/);
                type = type && type[0];
                if (!type) {
                    //不符合要求
                    continue;
                }
                //深入ftmBlock检测所需变量
                switch (type) {
                    case null:
                        break;
                    case "glb-js:":
                    case "js:":
                        let stacks = 1;//记录大括号
                        let quotes = null;
                        let reg2 = /(?<!\\)[`"'\/]|[{}]/g;
                        while (true) {
                            let spliter = reg2.exec(rest)[0];
                            if (!spliter) break;//括号未闭合
                            if (/["'`\/]/.test(spliter)) {
                                //是引号
                                if (!quotes) quotes = spliter;
                                else if (quotes == spliter) quotes = null;
                            } else {
                                if (quotes) continue;//如果被包含在引号内则跳过
                                if (spliter == "{") stacks++;
                                else if (spliter == "}") {
                                    if (--stacks == 0) {
                                        //js引用结束，输出也包含}
                                        let ctt = str.slice(startIndex, reg.lastIndex + reg2.lastIndex);
                                        if (type == "glb-js:") blocks.push([startIndex, ctt, "##javascript"]);
                                        else {
                                            let raw = ctt.slice(ctt.indexOf(":") + 1, -1);
                                            let detect = raw.match(/(?<=(?<![\w\$])data\.)([\w\$]+)/g);
                                            blocks.push([startIndex, ctt, detect]);
                                        }
                                        reg.lastIndex += ctt.length - 2;
                                        break;
                                    }
                                }
                            }
                        }
                        break;
                    case "html:": {//这个括号创建局部环境
                        let skip = rest.indexOf("}");
                        blocks.push([
                            startIndex,
                            "%{" + rest.slice(0, skip) + "}",  //不用skip+1是因为这样利于理解
                            rest.slice(rest.indexOf(":") + 1, skip)
                        ]);
                        reg.lastIndex += skip + 1 - 2;
                        break;
                    }
                    default: {
                        let skip = rest.indexOf("}");
                        blocks.push([
                            startIndex, "%{" + rest.slice(0, skip) + "}", rest.slice(0, skip)
                        ]);
                        reg.lastIndex += skip + 1 - 2;
                        break;
                    }
                }
            }
            return blocks;
        }
        //给出需要绑定的变量
        function readBlock(str) {
            let newarr = [];
            _readBlock(str).forEach(x => {
                let el = x[2];
                if (el instanceof Array) newarr = newarr.concat(el);
                else newarr.push(el);
            });
            return newarr;
        }
        //实例化一个模板
        function overrideBlock(str) {
            if (!sources.size) throw "Please connect to a Data object first";
            let offset = 0;
            let arr = _readBlock(str);
            for (let o of arr) {
                let [start, content] = o;
                let rawctt = content.slice(content.indexOf(":") > -1 ? content.indexOf(":") + 1 : 2, -1);//裁剪出来的有效部分
                let type = content.indexOf(":");
                type = type == -1 ? "string" : content.slice(2, type);
                let repla = "<Err_Unknown_Type>";
                if (type == "string") {
                    repla = cache[rawctt];
                    if (repla instanceof Node) return repla;
                    else repla = String(repla);
                } else if (type == "js" || type == "glb-js") {
                    try {
                        repla = new Function("data", "return (" + rawctt + ")").call(node, cache);
                        if (repla instanceof Node) return repla;
                        else repla = String(repla);
                    } catch (err) {
                        repla = err.toString();
                    }
                } else if (type == "html") {
                    let html = ftmData[rawctt];
                    return html.cloneNode(true);
                }
                str = str.slice(0, start + offset) + repla + str.slice(start + offset + content.length);
                offset += repla.length - content.length;
            }
            return str;
        }
        //写入
        function setNode(prop) {
            if (!listeners[prop]) {
                //console.log(binds);
                return;
            }
            let { attr, innr, func } = listeners[prop];
            //执行函数
            for (let o of func) {
                o.call(node, cache[prop], prop);
            }
            let isHTML = false;
            //写入属性
            for (let o of attr) {
                let [ele, a] = o;
                if (ele.getRootNode() == ele) {
                    attr.delete(ele);
                    return;
                }
                //a是个普通的object，储存了属性的键值信息
                for (let n in a) {
                    let str = a[n];//属性模板字符串
                    str = overrideBlock(str);
                    let isJSAttr = n.slice(0, 4) == "ftm:";
                    let isDomAttr = n.slice(0, 5) == "ftm::";
                    let attrname = isDomAttr ? n.slice(5) : (isJSAttr ? n.slice(4) : n);
                    if (attrname == "ftm-use-html") {
                        if (str instanceof Node && str.childNodes.length > 0) {
                            ele.innerHTML = "";
                            ele.appendChild(str);
                            isHTML = true;
                        }
                    }
                    if (isJSAttr && !isDomAttr) ele[attrname] = str;
                    else ele.setAttribute(attrname, str);
                }
            }
            //写入文本
            if (!isHTML) {
                innr.forEach((str, va) => {
                    if (va.getRootNode() == va) {
                        innr.delete(va);
                        return;
                    }
                    str = overrideBlock(str);
                    va.nodeValue = String(str);
                });
            }
        }

        //延迟渲染
        let waitingRender = new Set();
        function renderAfterFinished(prop, v) {

            if (waitingRender.size == 0) {
                setTimeout(() => {
                    waitingRender.add("##javascript");
                    waitingRender.forEach(e => {
                        setNode(e);
                    });
                    waitingRender.clear();
                });
            }
            cache[prop] = v;
            waitingRender.add(prop);
        }
        binds.render = renderAfterFinished;
        Object.seal(binds);
    };

    FTM = DOMchange;
    function DOMchange(target, parentBinds, isAdd = true) {
        if (target.nodeName.toLowerCase() == "template" && target.hasAttribute("ftm-el")) {
            //录入模板
            let temname = target.getAttribute("ftm-el");
            if (isAdd) {
                templates[temname] = target;
            } else {
                delete templates[temname];
            }
        } else if (isAdd) {
            if (target._ftmComputed) return;
            target._ftmComputed = true;
            let isSource;
            if (target.nodeType == 1) {
                isSource = target.nodeName == "FTM-SRC" || target.hasAttribute("ftm-src");
            }
            //匿名模板，即自身
            let tem = isSource ? target.cloneNode(true) : templates[target.nodeName.toLowerCase()];
            function getLoader() {
                let n = target.parentElement;
                while (n && !n.ftmData) {
                    n = n.parentElement;
                }
                return n;
            }
            //如果又不是实例化的模板又不是数据源那就是普通元素了
            if (!tem && !isSource) {
                if (!parentBinds) {
                    let n = getLoader();
                    if (n && n.ftmBinds) parentBinds = n.ftmBinds;
                    else return;
                }
                parentBinds.watch(target);
                target.ftmObs = parentBinds.ele;
                return;
            }


            if (!isSource)
                for (let attr of tem.attributes) {
                    let { name: i, value: o } = attr;
                    let isftm = /^ftm-|^ftm:/;
                    //如果属性是以ftm-开头并且不是ftm-el也不是ftm-src并且当前元素没有声明这个属性
                    if (isftm.test(i) && i != "ftm-el" && i != "ftm-src" && !target.hasAttribute(i)) {
                        target.setAttribute(i.replace(/^ftm:/, ""), o);
                    }
                }
            let once = target.getAttribute("ftm-once");
            once = once == "true" || once == "";
            let _source = new Set();//要连接到的其它ftmData
            let _ftmData = (function () {
                /*if (target.tagName == "BIG-CODE") debugger;
                else console.log(target.tagName);*/
                if (target.ftmData) return target.ftmData;
                let obj = {};
                function getFtmData(s) {
                    let data = s == "^" ? getLoader() : (() => {
                        try {
                            return document.querySelector(s.replace(/&gt;/g, ">"));
                        } catch (err) {
                            console.warn("Invalid selector " + s);
                            return null;
                        }
                    })();
                    if (data && !data.ftmData) {
                        console.warn("The element attach to must has ftmData");
                        console.warn(data);
                        return null;
                    }
                    return data && data.ftmData;
                }
                {//与其它数据源的绑定和继承关系
                    function calc(attr, fn) {
                        let foo = target.getAttribute(attr);
                        if (foo) {
                            let arr = foo.split(",");
                            arr.forEach(x => {
                                let d = getFtmData(x);
                                if (d) fn(d);
                            });
                        }
                    }
                    calc("ftm-cpdata", (d) => {
                        Object.assign(obj, DataSource.getValue(d));
                    });
                    calc("ftm-bddata", (d) => {
                        _source.add(d);
                    });
                }

                let args = target.getAttribute("ftm-args");
                if (target.childNodes.length < 1) return obj;
                let dataFrom = target.querySelector("pre[ftm-data]") ||
                    (target.firstChild.nodeType == 3 ? target.firstChild : document.createTextNode(""));
                dataFrom.parentElement.removeChild(dataFrom);
                str = dataFrom.nodeType == 1 ? dataFrom.innerHTML : dataFrom.nodeValue;
                //这个是用来读取可作为变量的节点用的
                function getKeyNode(x) {
                    let inHTML = (x.hasAttribute("ftm-in-html") ? x.getAttribute("ftm-in-html") : target.getAttribute("ftm-in-html"));
                    if (inHTML == "true" || inHTML == "") {
                        if (x.tagName == "TEMPLATE") {
                            x = x.content.cloneNode(true);
                        } else {
                            let fra = document.createDocumentFragment();
                            for (let y of Array.from(x.childNodes)) {//childNodes是实时的，所以需要先转换成Array
                                fra.appendChild(y);
                            }
                            x = fra;
                        }
                    }
                    return x;
                }
                if (args) {
                    //识别快捷参数
                    let r = args.trim().split(/ +/);
                    str = str.trim();
                    str = str ? str.split(/ +/) : [];
                    str = str.concat([...target.childNodes]);//str变成所有可读取的值
                    if (str.indexOf(dataFrom) > -1) str.splice(str.indexOf(dataFrom), 1);
                    r.forEach((k, i) => {
                        if (str[i]) {
                            let v = str[i];
                            v = typeof v == "string" ? v.replace(/\\s/g, " ") : v; //将所有的\s替换成空格
                            try {
                                obj[k] = v instanceof Node ? getKeyNode(v) : JSON.parse('"' + v + '"');
                            } catch (err) {
                                obj[k] = null;
                            }
                        } else {
                            //这个是没有字符串变量的时候会触发
                            str.splice(i, 1);
                            obj[k] = null;
                        };
                    });
                } else {
                    //识别标准键值对
                    str = str.replace(/^\s*\n|\n\s*$/g, "");//去掉头尾无用空白符，保留缩进
                    str = str.split("\n");
                    let keyIndent = str[0].match(/^\s*/)[0];
                    let lastkey;
                    for (let i in str) {
                        let x = str[i];
                        let s;
                        x = x.replace(/^\s*/, function (match) {
                            s = match;
                            return "";
                        });
                        if (!x) continue;
                        if (s == keyIndent) {
                            let isCopy = /^\+\{[^\}]+\}$/;
                            if (isCopy.test(x)) {
                                //复制一份
                                let data = getFtmData(x.match(isCopy)[0].slice(2, -1));
                                if (data) {
                                    Object.assign(obj, data);
                                }
                                continue;
                            }
                            //匹配开端
                            let foo = x.split(":");
                            //缩进是关键字缩进
                            lastkey = foo[0];
                            obj[lastkey] = foo.slice(1).join("");
                        } else {
                            obj[lastkey] += "\n" + (s > keyIndent ? s.slice(keyIndent.length) : "") + x;
                        }
                    }

                    //获取子html元素设定为参数
                    for (let x of target.children) {
                        let key = x.getAttribute("ftm-key");
                        if (key === null) continue;
                        obj[key] = getKeyNode(x);
                    }
                }
                return obj;
            })();
            //配置
            let ftmData = new DataSource(target, once);
            target.ftmData = _ftmData;
            let binds = new Binds(isSource ? null : target);
            target.ftmBinds = binds;
            let w = [ftmData, ..._source];
            binds.connectTo(w);
            //导入模板
            if (!isSource) {
                target.innerHTML = "";
                let ctt = document.importNode(tem.content, true);
                target.appendChild(ctt);
            }
            //处理oncreate事件
            target.addEventListener("ftmdata", function (event) {
                if (target.hasAttribute("ftm-oncreate")) {
                    new Function("event", target.getAttribute("ftm-oncreate")).call(target, event);
                }
            });
            target.dispatchEvent(new CustomEvent("ftmdata", {
                detail: {
                    ftmData, ftmBinds: binds
                }
            }));
        }
    }
    let mutobs = new MutationObserver((records) => {
        for (let o of records) {
            //只有childList选项
            let isAdd = Boolean(o.addedNodes.length > 0);
            let nodes = isAdd ? o.addedNodes : o.removedNodes;
            nodes.forEach((o) => {
                DOMchange(o, null, isAdd);
            });
        }
    });
    mutobs.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
    /*window.addEventListener("load", () => {
        DOMchange({
            addedNodes: [document.documentElement]
        });
    });*/
}