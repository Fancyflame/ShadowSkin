let Effect;
{
    var header = "_" + Math.round(Math.random() * (36 ** 5)).toString(36).padStart(5, "0");
    //const head = (s) => 
    function head(s) {
        return header + s;
    }

    function _Effect(el) {
        if (el instanceof HTMLElement) {
            el.hide = function (name) {
                el.setAttribute("Hiding", "true");
                el.style.animationName = name || (el.id || "") + "_hide";
                el.setAttribute(head("Disappearing"), "");
                el.addEventListener("animationend", function () {
                    el.removeAttribute(head("Disappearing"));
                    el.setAttribute(head("EffectHidden"), "true");
                    el.style.animationName = "";
                }, { once: true });
            };
            el.show = function (name) {
                el.removeAttribute("Hiding");
                el.style.animationName = name || (el.id || "") + "_hide";
                el.setAttribute(head("Entering"), "");
                el.removeAttribute(head("EffectHidden"));
                el.addEventListener("animationend", function () {
                    el.removeAttribute(head("Entering"));
                    el.removeAttribute(head("EffectHidden"));
                    el.style.animationName = "";
                }, { once: true });
            };
            el.setAttribute(head("WithEffect"), "true");
            {
                let down = false;
                let sx, sy;
                el.addEventListener("pointerdown", (ev) => {
                    down = true;
                    sx = ev.offsetX;
                    sy = ev.offsetY;
                    dispatchEv("actiondragstart", ev);
                });
                function dispatchEv(name, ev) {
                    if (!down) return;
                    let x = ev.offsetX;
                    let y = ev.offsetY;
                    let outOfEle = x < 0 || x > el.clientWidth || y < 0 || y > el.clientHeight;
                    let offset = Math.sqrt((x - sx) ** 2 + (sy - y) ** 2);
                    let angle, apprDeg;
                    {
                        let sin = (sy - y) / offset;
                        let cos = (x - sx) / offset;
                        angle = Math.asin(sin);
                        if (cos < 0) angle = (angle > 0 ? Math.PI : -Math.PI) - angle;
                        if (angle < 0) angle += Math.PI * 2;
                        let ftf = Math.PI / 4;//45度
                        apprDeg = Math.floor(angle / ftf);
                        apprDeg += Math.round(angle % ftf / ftf);
                        apprDeg *= ftf;
                        if (apprDeg >= Math.PI * 2) apprDeg -= Math.PI * 2;
                        apprDeg = apprDeg / Math.PI * 180;
                    }
                    let cus = new CustomEvent(name, {
                        detail: {
                            outOfEle, angle, apprDeg, offset, x, y,
                            event: ev, start: [sx, sy],
                            end: () => { down = false; }
                        }
                        /*
                        {
                            outOfEle:光标是否已滑到元素外，如果是鼠标永远是false
                            angle:光标拖动角度，弧度制
                            apprDeg:光标拖动大致角度，以45°划分，角度制
                            offset:拖动距离
                            x:offsetX
                            y:offsetY
                            target:产生源事件
                            start:光标开始按下的位置
                            end:此次停止响应
                        }
                        */
                    });
                    el.dispatchEvent(cus);
                }
                el.addEventListener("pointermove", (ev) => {
                    dispatchEv("actiondragmove", ev);
                });
                el.addEventListener("pointerup", (ev) => {
                    dispatchEv("actiondragend", ev);
                    down = false;
                });
            }
        } else throw "parameter 1 must be a HTMLElement";
    }
    Effect = _Effect;
    let st = document.createElement("style");
    st.innerHTML = `
        [${header}WithEffect=true]{
            animation-duration:.2s;
        }
        [${header}EffectHidden=true]{
            display:none !important;
        }
        [${header}Entering]{
            animation-direction:reverse !important;
        }
        [${header}Disappearing]{
            animation-direction:normal !important;
        }
    `;
    document.body.appendChild(st);
    window.addEventListener("load", function () {
        for (let o of document.querySelectorAll("[effect-handle]")) {
            Effect(o);
        }
    });
} 
