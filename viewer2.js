var MODEL = mobs.alex; //人物模型
var TEXTURE = b64sk.raw.alex; //预设材质
var HUMAN; //已加载的人偶
var DRAW = document.createElement("canvas"); //全身贴图
var CTX = DRAW.getContext("2d"); //上面的context
var RENDER = document.createElement("canvas"); //这个是部分身体贴图，配合DRAW快速绘制
var RCTX = RENDER.getContext("2d"); //上面的context
var SCALE = Math.min(screen.width, screen.height) / 40; //小人缩放倍数
var SKIN_INFO = {}; //皮肤数据
var SKIN_INFO_LAST;//上次保存的SKIN_INFO，用于验证是否保存。这个是字符串
var UIINFO; //ui界面数据
var UNDO_LIST = []; //可以被撤回的步骤
var REDO_LIST = []; //可以被重做的步骤
var PAINT = function () { }; //绘制函数
var TOOL = {}; //正在使用的工具
var PEN = {}; //正在使用的画笔的数据
var PALETTE; //选择画笔界面
var COPIED; //复制的图像的数据数组（不是ImageData）
var LAST_PEN_POSI; //记录上次画笔位置，避免在一个点重复绘制
var REF_CANVAS; //参考图取色画布
var FLIP_CANVAS = document.createElement("canvas"); //翻转图像用画布（技术不行，只能用这个了）

//载入新皮肤
window.addEventListener("msg", (d) => {
    d = d.detail;
    console.log(d);
    SKIN_INFO = d;
    SKIN_INFO_LAST = JSON.stringify(d);
    uploadReference(d.reference);
    MODEL = mobs[d.model];
    //document.getElementById("rightBar").firstElementChild.click();
    showFileOpr(true);
    showPalette(false);
    showClothes(false);
    showReference(false);
    changeArm(d.model);
    setTexture(d.texture);
    UNDO_LIST = [];
    REDO_LIST = [];
    setTimeout(function () {
        UNDO_LIST.push([null, CTX.getImageData(0, 0, 64, 64)]);
    });
    document.getElementById("skinName").innerText = d.name;

    let tem = document.getElementById("template");
    tem.innerHTML = "";
    (d.templatePens || []).slice().reverse().forEach(x => {
        let p = JSON.parse(x);
        let pen = document.createElement("pen-block");
        pen.ftmData = p;
        tem.appendChild(pen);
    });

    document.getElementById("history").firstElementChild.click();
});

//首次加载
function documentLoad() {
    PALETTE = document.getElementById("palettePannel");
    REF_CANVAS = document.querySelector("#pictureViewer>canvas");
    {
        let headbar = document.getElementById("headbar");
        headbar.addEventListener("actiondragmove", function (ev) {
            ev = ev.detail;
            if (ev.apprDeg == 90 && ev.offset > 7) {
                ev.end();
                showFileOpr(false);
            }
        });
        PALETTE.addEventListener("actiondragmove", function (ev) {
            ev = ev.detail;
            if (ev.event.target == PALETTE && ev.apprDeg == 180 && ev.offset > 7) {
                ev.end();
                showPalette(false);
            }
        });
        let picv = document.getElementById("pictureViewer");
        picv.addEventListener("actiondragmove", function (ev) {
            ev = ev.detail;
            if (ev.offset > 10) {
                if (ev.apprDeg == 315) {
                    picv.setAttribute("zoom", "");
                } else if (ev.apprDeg == 135) {
                    picv.removeAttribute("zoom");
                }
            }
        });
        REF_CANVAS.onclick = refGetColor;
        setTimeout(() => {
            PALETTE.hide("leftUI_hide");
            picv.hide("leftUI_hide");
        });
    }

    UIINFO = document.getElementById("uiinfo").ftmBinds;
    /*UIINFO.addEventListener("ftmdata", () => {
        UIINFO=UIINFO.ftmData;
    })*/
    document.body.style.setProperty("--partScale", SCALE * 1.5);
    let human = document.createElement("div");
    human.ftmData = {
        model: "alex"
    };
    human.setAttribute("ftm-src", "");
    human.id = "human";
    HUMAN = human;
    let scene = document.getElementById("scene");
    scene.appendChild(human);


    for (let i in MODEL) {
        let c = cube3d.gen();
        let _scale = SCALE;
        if (MODEL[i].inflate) {
            c.setAttribute("isClothes", "");
            _scale *= 1.05;
        }
        function readskin(i) {
            let { origin, size, uv } = MODEL[i];
            origin = origin.slice();
            origin[1] -= 16;
            origin = origin.map((x, i) => SCALE * (x + (size[i] / 2)) - size[i] / 2);
            origin[1] *= -1;
            origin = origin.map(x => x + "px").join(",");

            let [x, y, z] = size.map(x => x + "px"); //长宽高
            //c.faceStyles.background = "#ff444450";
            let posi;
            {
                let [x, y, z] = size;
                posi = {
                    //fromX,fromY,width,height
                    front: [z, z, x, y],
                    back: [2 * z + x, z, x, y],
                    top: [z, 0, x, z],
                    bottom: [z + x, 0, x, z],
                    left: [z + x, z, z, y],
                    right: [0, z, z, y]
                };

            }
            for (let i in c.faces) {
                let f = c.faces[i];
                let u = posi[i];
                let p = [uv[0] + u[0], uv[1] + u[1]]; //材质定位

                down = false;//画笔落下
                //画！
                function mousemove(ev, name) {
                    if (!down) return;
                    //ev.preventDefault()
                    let x = Math.floor(ev.offsetX);
                    x = x < 0 ? 0 : (x >= f.clientWidth ? f.clientWidth - 1 : x);
                    let y = Math.floor(ev.offsetY);
                    y = y < 0 ? 0 : (y >= f.clientHeight ? f.clientHeight - 1 : y);
                    if (TOOL.protect) {//透明保护
                        let dt = RCTX.getImageData(p[0] + x, p[1] + y, 1, 1).data[3];
                        if (dt == 0) return;
                    }
                    //down,move,up
                    let options = {
                        fn: PAINT.bind(null, p[0] + x, p[1] + y),
                        uv: p,
                        size: u.slice(2, 4),
                        position: [p[0] + x, p[1] + y]
                    };
                    if (typeof TOOL[name] == "function") {
                        if (name == "move") {
                            if ([x, y].join(",") == LAST_PEN_POSI) return;
                        }
                        LAST_PEN_POSI = [x, y].join(",");
                        TOOL[name].call(TOOL, options);
                    } else if (TOOL[name] == true) {
                        if (name == "down") {
                            let fn = function (opt) { opt.fn(); };
                            TOOL[name] = fn;
                            fn(options);
                        } else if (name == "move") {
                            console.log(4);
                            LAST_PEN_POSI = [x, y].join(",");
                            let fn = TOOL[name] = TOOL["down"];
                            fn.call(TOOL, options);
                        }
                    }
                    f.style.backgroundImage = "url(" + RENDER.toDataURL() + ")";
                }
                f.onpointerdown = (ev) => {
                    ev.preventDefault();
                    down = true;
                    //RCTX.fillStyle = "red";
                    RCTX.clearRect(0, 0, 64, 64);
                    RCTX.putImageData(CTX.getImageData(p[0], p[1], f.clientWidth, f.clientHeight), p[0], p[1]);
                    mousemove(ev, "down");
                };
                //f.ontouchmove = (ev) => { };
                f.onpointermove = (ev) => mousemove(ev, "move");
                f.ontouchend = () => {
                    down = false;
                    CTX.putImageData(RCTX.getImageData(p[0], p[1], f.clientWidth, f.clientHeight), p[0], p[1]);
                    SKIN_INFO.texture = DRAW.toDataURL();
                    UNDO_LIST.push([f, CTX.getImageData(0, 0, 64, 64)]);
                    REDO_LIST.splice(0);
                };
                f.onmouseup = (ev) => {
                    mousemove(ev, "up");
                };
            }

            c.setvar({
                sx: x,
                sy: y,
                sz: z,
                posi: origin,
                transform: "scale3d(" + [_scale, _scale, _scale].join(",") + ")"
            });
        }

        if (["leftArm", "rightArm", "leftSleeve", "rightSleeve"].includes(i)) {
            let f = readskin.bind(null, i);
            human.addEventListener("ftmdata", () => {
                human.ftmBinds.addPropListener("model", (val) => {
                    let m = MODEL = mobs[val];
                    f();
                });
            });
            f();
        } else readskin(i);
        c.id = i + "_cube";
        c.onclick = () => {
            let btn = document.querySelector("[button~=" + i + "]");
            let sel = btn.parentElement.ftmData.selected.ftmData.part;
            //if (sel == btn) return;
            if (sel == "whole") btn.click();
        };
        c.cubeInfo = MODEL[i];
        human.appendChild(c);
        //c.setvar({ transform: "scale3d(" + [SCALE, SCALE, SCALE].join(",") + ")" })
    }
    setTexture(TEXTURE);
    let handle = addTouchHandle(scene, false);
    handle.ontransform = (s) => {
        human.style.transform = s;
    };
    TOOL = DrawTools.pen;
}

//设置贴图
function setTexture(src) {
    let img = new Image();
    img.src = src;
    img.onload = function () {
        DRAW.width = img.width;
        DRAW.height = img.height;
        CTX.drawImage(img, 0, 0);
        UNDO_LIST.push([null, CTX.getImageData(0, 0, 64, 64)]);
    };
    for (let c of HUMAN.children) {
        //这里的c就是每个身体部位了
        let {
            size: [x, y, z],
            uv
        } = c.cubeInfo;
        let [uvx, uvy] = uv.map(x => x + "px");
        c.faceStyles.backgroundImage = "";
        c.setvar({
            texture: "url(" + src + ")",
            uvx, uvy
        });
        /*let posi = {
            //fromX,fromY,width,height
            front: [z, z, x, y],
            back: [2 * z + x, z, x, y],
            top: [z, 0, x, z],
            bottom: [z + x, 0, x, z],
            left: [z + x, z, z, y],
            right: [0, z, z, y]
        }
        for (let fc in c.faces) {
            let cvs = document.createElement("canvas");
            let [fx, fy, wd, ht] = posi[fc];
            let ctx = cvs.getContext("2d");
            cvs.width = wd;
            cvs.height = ht;
            ctx.drawImage(img, uv[0] + fx, uv[1] + fy, wd, ht, 0, 0, wd, ht);
            c.faces[fc].appendChild(cvs);
        }*/
    };
}

//选择显示的身体部位
function showBodyPart(old, ne) {
    ne.parentNode.ftmData.selected = ne;
    aaa(old.ftmData.part);
    aaa(old.ftmData.clothes);
    function aaa(oldName) {
        if (oldName == "whole") {
            HUMAN.setAttribute("showWhole", false);
        } else {
            let Old = document.getElementById(oldName + "_cube");
            Old.setAttribute("showPart", false);
        }
    }
    ne.setAttribute("showPart", true);
    UIINFO.viewingPart = ne;
    bbb(ne.ftmData.part);
    bbb(ne.ftmData.clothes);
    function bbb(newName) {
        if (newName == "whole") {
            HUMAN.setAttribute("showWhole", true);
        } else {
            let New = document.getElementById(newName + "_cube");
            New.setAttribute("showPart", true);
        }
    }

}

//右侧栏共性
function rightBarDo(btn, show) {
    btn = document.getElementById(btn);
    //如果show没定义就反转其值
    show = show === undefined ? (btn.ftmData.value != "true") : show;
    btn.ftmData.value = show + "";
    btn.ftmData.color = show ? "palegreen" : "lightgrey";
    return show;
}

//切换手臂粗细
function changeArm(to) {
    let div = document.getElementById("arm");
    if (!to) to = div.ftmData.value == "alex" ? "steve" : "alex";
    MODEL = mobs[to];
    div.ftmData.value = to;
    div.ftmData.color = to == "alex" ? "lightpink" : "skyblue";
    HUMAN.ftmData.model = to;
    SKIN_INFO.model = to;
}

//添加参照
function addReference() {
    let file = document.getElementById("upl_ref");
    file.value = "";
    file.click();
}
//上传图片
function uploadReference(file) {
    if (typeof file == "string") {
        read(file);
    } else if (file instanceof Blob) {
        let fr = new FileReader();
        fr.readAsDataURL(file);
        fr.onload = () => read(fr.result);
    } else {
        let div = document.getElementById("pictureViewer");
        REF_CANVAS.width = "";
        REF_CANVAS.height = "";
        div.ftmData.image = null;
        let s = div.style;
        s.width = s.height = "";
    }
    function read(data) {
        let img = new Image();
        img.src = data;
        img.onload = function () {
            SKIN_INFO.reference = data;
            let div = document.getElementById("pictureViewer");
            let size;
            let maxSize = [window.screen.width / 3 * 2, window.screen.height / 5 * 2];
            if (img.width > img.height) {
                size = [maxSize[0], img.height * maxSize[0] / img.width];
            } else {
                size = [img.width * maxSize[1] / img.height, maxSize[1]];
            }
            size = size.map(x => Math.round(x));

            REF_CANVAS.width = size[0];
            REF_CANVAS.height = size[1];
            let ctx = REF_CANVAS.getContext("2d");
            ctx.drawImage(img, 0, 0, ...size);

            div.ftmData.image = data;
            let s = div.style;
            //s.backgroundImage = "url(" + data + ")";
            //s.backgroundSize = size.join(" ");
            s.width = size[0] + "px";
            s.height = size[1] + "px";
        };
        img.onerror = function () {
            alert("无法加载参考图！");
        };
    };
}

//显示衣物
function showClothes(show) {
    show = rightBarDo("clothes", show);
    document.body.style.setProperty("--showClothes", show ? "block" : "none");
    document.body.style.setProperty("--showBody", show ? "none" : "block");
    UIINFO.firstData.showClothes = show;
    //let o = document.getElementById("rightBar").ftmData.selected;
    //showBodyPart(o, o, !show);
}

//显示文件操作
function showFileOpr(show) {
    show = rightBarDo("file", show);
    let bar = document.getElementById("headbar");
    if (show) bar.show();
    else bar.hide();
}

//显示参照
function showReference(show) {
    show = rightBarDo("show_ref", show);
    let vw = document.getElementById("pictureViewer");
    if (show) vw.show("leftUI_hide");
    else vw.hide("leftUI_hide");
}

//显示调色板
function showPalette(show) {
    show = rightBarDo("palette", show);
    if (show) PALETTE.show("leftUI_hide");
    else PALETTE.hide("leftUI_hide");
}

//与index的互动
function skinOpr(event) {
    if (!event) return;
    if (event == "save") {
        HFrame.send({
            event,
            save: SKIN_INFO
        });
        SKIN_INFO_LAST = JSON.stringify(SKIN_INFO);
    } else if (event == "close") {
        if (JSON.stringify(SKIN_INFO) != SKIN_INFO_LAST) {
            let q = prompt("您的工程还未保存，要保存后返回吗？(Y|n|*)");
            q = q ? q.toLowerCase() : q;
            if (q == "y" || q == "")
                HFrame.send({
                    event,
                    save: SKIN_INFO
                });
            else if (q == "n")
                HFrame.send({ event });
        } else {
            HFrame.send({ event });
        }
    } else if (event == "copy") {
        let m = prompt("复制的新皮肤的名字是：");
        if (m === null) return;
        m = m.trim().replace(/\n/g, "").slice(0, 10);
        if (!m) alert("名字不能全是空白字符");
        else HFrame.send({
            event, name: m
        });
    } else if (event == "delete") {
        if (confirm("确定要删除皮肤吗？不能恢复的哟") && !confirm("按“取消”来删除")) {
            HFrame.send({ event });
        }
    }
}

//导出皮肤或工程
function outputFile(type) {
    let a = document.createElement("a");
    a.download = SKIN_INFO.name + "." + (type == "skin" ? "png" : "json");
    if (!confirm("要导出" + (type == "skin" ? "皮肤" : "工程") + "吗？")) return;
    let s;
    if (type == "skin") {
        s = DRAW.toBlob();
    } else {
        s = JSON.stringify(SKIN_INFO);
        s = new Blob([s], { type: "application/octet-stream" });
    }
    s = URL.createObjectURL(s);
    a.href = s;
    a.click();
    URL.revokeObjectURL(s);

}

//改名
function rename(ele) {
    let m = ele.innerText;
    m = m.trim().replace(/\n/g, "").slice(0, 10);
    if (!m) ele.innerText = SKIN_INFO.name;
    else {
        SKIN_INFO.name = m;
        ele.innerText = m;
    }
}

//撤销
function undo() {
    if (UNDO_LIST.length <= 1) return;
    let m = UNDO_LIST.pop();
    REDO_LIST.push(m);
    CTX.putImageData(UNDO_LIST[UNDO_LIST.length - 1][1], 0, 0);
    m[0].style.backgroundImage = "url(" + DRAW.toDataURL() + ")";
}

//重做
function redo() {
    if (REDO_LIST.length <= 0) return;
    let m = REDO_LIST.pop();
    UNDO_LIST.push(m);
    CTX.putImageData(m[1], 0, 0);
    m[0].style.backgroundImage = "url(" + DRAW.toDataURL() + ")";
}

//添加绘图工具
function drawToolCreate(eve) {
    let tar = eve.target;
    Effect(tar);
    //eve.target.addEventListener("touchmove", function (ev) { ev.preventDefault() })
    let tool = DrawTools[tar.ftmData.tool];
    if (tool && tool.modes) {//如果支持多模式
        tool.mode = 0;
        tar.addEventListener("actiondragmove", function (ev) {
            let d = ev.detail;
            if (d.apprDeg == 90 && d.offset > 9) {
                d.end();
                tar.getElementsByTagName("img")[0].click();
                if (++tool.mode >= tool.modes.length) tool.mode = 0;
                tar.ftmData.mode = tool.modes[tool.mode];
                usePen(PEN);
            }
        });
    }
}

//画板界面
function onPaletteLoad(pal) {

}

//调色板界面被修改
function paletteInput(event) {
    let { name, value } = event.target;
    PALETTE.ftmData[name] = value;
}

//选择画笔
function selectPen() {
    showPalette(false);
    let pen = document.createElement("pen-block");
    let data = Object.assign({}, PALETTE.ftmData.$getValue());
    pen.ftmData = data;
    let history = document.getElementById("history");
    history.insertBefore(pen, history.firstElementChild);
    usePen(pen.ftmData, true);
}

//使用画笔
function usePen(data, dontSet) {
    RCTX.globalCompositeOperation = "source-over";
    RCTX.fillStyle = data.color;
    RCTX.globalAlpha = data.opacity / 100;
    PAINT = function (x, y) {
        let sz = data.size;
        if (data.nib == "rect") {
            sz--;
            RCTX.fillRect(x - sz, y - sz, 2 * sz + 1, 2 * sz + 1);
        } else if (data.nib == "circle") {
            RCTX.beginPath();
            RCTX.arc(x, y, sz, 0, Math.PI * 2);
            RCTX.fill();
        } else if (data.nib == "all") {
            RCTX.fillRect(0, 0, 64, 64);
        }
    };
    TOOL.load.call(TOOL, TOOL.modes ? TOOL.modes[TOOL.mode] : null);
    PEN = Object.assign({}, data);
    if (!dontSet) PALETTE.ftmData = PEN;
    //PALETTE.ftmData.color = data.color;
}

//加载画笔
function loadPen(el) {
    Effect(el);
    el.addEventListener("actiondragmove", function (ev) {
        ev = ev.detail;
        if (ev.offset > 9) {
            let t = document.getElementById("template");
            let isTem = el.parentNode == t;
            let data = JSON.stringify(el.ftmData);
            let ar = SKIN_INFO.templatePens || (SKIN_INFO.templatePens = []);
            if (ev.apprDeg == 90) {
                ev.end();
                if (ar.includes(data)) ar.splice(ar.indexOf(data), 1);
                ar.push(data);
                t.insertBefore(el, t.firstElementChild);
            } else if (ev.apprDeg == 270 && ev.offset > 220) {
                ev.end();
                if (isTem && !confirm("要删除这个画笔吗？")) {
                    return;
                }
                if (isTem && ar.includes(data)) {
                    ar.splice(ar.indexOf(data), 1);
                }
                el.parentNode.removeChild(el);
            }
        }
    });
}

//计算画笔块文字颜色
function calcColor(color) {
    let s = color.match(/\w{2}/g);
    let num = 0;
    s.forEach(x => num += parseInt(x, 16));
    if (num > 0x1ae) return "#333";
    else return "#fff";
}

//工具预设
/*
load和unload没有传入值，load是必须的。
down,move,up有传入值，是{
    fn:绘制函数,
    uv:材质起点,
    size:材质大小
    position:绝对落笔位置
}
down如果值为true就是直接执行绘制函数，move如果是true就使用down,up则忽略
modes属性是当前工具的所有模式，mode是当前工具模式的下标
this是工具本身
*/
const DrawTools = {
    pen: {
        down: true, move: true
    },
    eraser: {
        down: function (opt) {
            let q = opt.position;
            RCTX.clearRect(q[0], q[1], 1, 1);
        },
        move: true
    },
    straw: {
        down: function (arg) {
            let { position: p } = arg;
            let dt = RCTX.getImageData(p[0], p[1], 1, 1).data;
            let pn = PALETTE;
            pn.ftmData.color = "#" + [...dt.slice(0, 3)].map(x => x.toString(16).padStart(2, "0")).join("");
            pn.ftmData.opacity = Math.round(dt[3] / 0x100 * 100);
            showPalette(true);
        }
    },
    water: {
        down: function (arg) {
            RCTX.fillStyle = Math.random() > 0.5 ? "#00000030" : "#ffffff30";
            arg.fn();
        }, move: true,
        protect: true
    },
    torch: {
        load: function (m) {
            RCTX.globalCompositeOperation = m == "lighter" ? "color-dodge" : "color-burn";
            RCTX.globalAlpha /= 4;
        },
        down: true, move: true,
        modes: ["lighter", "darker"],
        protect: true
    },
    blackwhite: {
        load: function (m) {
            let color = m == "white" ? "#ffffff10" : "#00000010";
            RCTX.fillStyle = color;
        },
        down: true, move: true,
        modes: ["white", "black"],
        protect: true
    },
    saturation: {
        load: function () {
            RCTX.globalCompositeOperation = "saturation";
        },
        down: true, move: true,
        protect: true
    },
    change_color: {
        load: function () {
            RCTX.globalCompositeOperation = "color";
        },
        down: true, move: true,
        protect: true
    },
    flip: {
        load: function () {
            RCTX.globalCompositeOperation = "copy";
        },
        down: function (opt) {
            let { uv, size } = opt;
            let ish = this.modes[this.mode] == "vertical" ? -1 : 1;
            FLIP_CANVAS.width = size[0];
            FLIP_CANVAS.height = size[1];
            let fx = FLIP_CANVAS.getContext("2d");
            fx.globalCompositeOperation = "copy";
            fx.save();
            let args = [RENDER, ...uv, ...size, 0, 0, ...size];
            fx.drawImage(...args);
            fx.scale(ish, -ish);
            if (ish == -1) fx.translate(-size[0], 0);
            else fx.translate(0, -size[1]);
            fx.drawImage(FLIP_CANVAS, 0, 0);
            //fx.setTransform(1, 0, 0, 1, 0, 0);
            RCTX.drawImage(FLIP_CANVAS, 0, 0, ...size, ...uv, ...size);
            fx.restore();
            console.log(args);
        },
        modes: ["vertical", "horizontal"]
    },
    copy: {
        load: function () {
            RCTX.globalAlpha = 1;
        },
        down: function (opt) {
            let { uv, size } = opt;
            let img = new Image();
            img.src = DRAW.toDataURL();
            COPIED = [img, ...uv, ...size];
        }
    },
    paste: {
        load: function () {
            RCTX.globalAlpha = 1;
        },
        down: function (opt) {
            let { uv, size } = opt;
            RCTX.drawImage(...COPIED, ...uv, ...size);
        }
    }
};
for (let i in DrawTools) {
    let m = DrawTools[i];
    if (m.load === undefined) DrawTools[i].load = function () { };
}

//选择工具
function useTool(name) {
    if (TOOL.unload) TOOL.unload();
    let t = typeof name == "string" ? DrawTools[name] : name;
    TOOL = t;
    usePen(PEN);
}

//参考图取色
function refGetColor(ev) {
    let x = ev.offsetX;
    let y = ev.offsetY;
    let dt = REF_CANVAS.getContext("2d").getImageData(x, y, 1, 1).data;
    PALETTE.ftmData.color = "#" + [...dt.slice(0, 3)].map(x => x.toString(16).padStart(2, "0")).join("");
    PALETTE.ftmData.opacity = Math.round(dt[3] / 0x100 * 100);
    showPalette(true);
}