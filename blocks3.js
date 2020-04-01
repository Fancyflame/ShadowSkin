//请使用cube.css!!否则脚本运行无效
const cube3d = {};
{
    cube3d.gen = function () {
        let main = document.createElement("div");
        let faces = {};//记录每个面
        main.className = "cube3d";
        "front back left right top bottom".split(" ").forEach((e) => {
            let div = document.createElement("div");
            div.setAttribute(e, "");
            faces[e] = div;
            main.appendChild(div);
        });
        main.faceStyles = new Proxy({}, {
            get: function (tar, name) {
                return main.firstChild.style[name];
            },
            set: function (tar, name, val) {
                [...main.children].forEach((e) => {
                    e.style[name] = val;
                });
            }
        });
        main.setvar = function (prop, val) {
            if (typeof prop != "object" && val) {
                main.style.setProperty(String("--" + prop), val);
            } else {
                for (let i in prop) {
                    main.style.setProperty(String("--" + i), prop[i]);
                }
            }
        };
        main.getvar = function (prop) {
            let one = false;
            let arr = [];
            if (!prop instanceof Array) {
                prop = [prop];
                one = true;
            }
            prop.forEach((e) => {
                arr.push(main.style.getPropertyValue("--" + e));
            });
            return one ? arr[0] : arr;
        };
        Object.defineProperties(main, {
            faces: {
                get: function () {
                    return Object.assign({}, faces);
                }
            }
        });
        return main;
    };
}