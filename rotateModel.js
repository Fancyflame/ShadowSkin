function addTouchHandle(parent, allowBubble = true) {
  let ontrans = () => { };
  let total = [];
  let limitLock = true;
  //ROTATE
  {
    const pi2 = Math.PI * 2;
    const DEBUG = 0;
    let MOUSEDOWN = false;
    let mov = [0.875, 0.25];//横竖总位移，用于计算总角度
    if (!DEBUG) mov = [0, 0];
    let ltp;//上次坐标位置
    function start(ev) {
      ev.preventDefault();
      ev.cancelBubble = true;
      if (!allowBubble && ev.target != parent) return;
      MOUSEDOWN = true;
      //ev.preventDefault();
      let t = ev.touches ? ev.touches[0] : ev;
      ltp = [t.pageX, t.pageY];
      if (DEBUG) move(ev);
    }
    function end(ev) {
      MOUSEDOWN = false;
      ltp = null;
    }
    function move(ev) {
      ev.preventDefault();
      ev.cancelBubble = true;
      if (!MOUSEDOWN) return;
      let lm = [0, 0];//上一次旋转角
      let cm = [0, 0];//这一次旋转角
      let out = [];//最终输出
      {

        let a = ev.touches[0];
        lm = mov.slice();
        mov = mov.map((x) => {
          if (x > 1) return x - 1;
          else if (x < 0) return x + 1;
          else return x;
        });
        let b = [(a.pageX - ltp[0]) / 1000, (a.pageY - ltp[1]) / 1000];
        {
          let p = (parent.offsetTop + parent.clientHeight / 2
            - a.pageY) * 2 / parent.clientHeight;
          let spl = Math.cos((mov[1] + p / 10) * pi2);

          if (spl < 0) b[0] *= -1;
        }
        mov[0] += b[0];
        mov[1] += b[1];
        let lock = 0.25;
        if (limitLock && Math.cos(mov[1] * pi2) < Math.cos(lock * pi2)) {
          mov[1] = mov[1] < 0.5 ? lock : -lock;
        }
        cm = mov.slice();
        //alert(mov)
        ltp = [a.pageX, a.pageY];
      }
      //绕轴旋转时注意手指滑动坐标
      //与所绕轴相反。
      //思路是将各坐标轴转为世界坐标轴
      //再处理
      //绕y轴旋转
      {
        let vec = [0, 1, 0];
        //先复位
        //再相对旋转
        vec.push(cm[0]);
        out.push(vec);
      }

      //绕x轴旋转
      {
        let vec = [1, 0, 0];
        vec = rtty(vec, cm[0]);
        vec.push(-cm[1]);
        out.push(vec);
      }
      out = out.map(x => {
        x = x.map((y, i) => {
          if (true) return y.toFixed(4);
          else return y;
        });
        return `rotate3d(${x.join(",")}turn)`;
      }
      );
      //alert(out)
      total[0] = (out.join(""));
      apply();
    }
    //x轴旋转
    function rttx(v, t) {
      t *= pi2;
      v = v.slice();
      let len = Math.sqrt(v[1] ** 2 + v[2] ** 2);
      if (len == 0) return v;
      let sin1 = Math.sin(t),
        cos1 = Math.cos(t),
        sin2 = v[1] / len,
        cos2 = v[2] / len;

      v[1] = (sin1 * cos2 + cos1 * sin2) * len;
      v[2] = (cos1 * cos2 - sin1 * sin2) * len;
      return v;
    }
    //y轴旋转
    function rtty(v, t) {
      t *= pi2;
      v = v.slice();
      let len = Math.sqrt(v[0] ** 2 + v[2] ** 2);
      if (len == 0) return v;
      let sin1 = Math.sin(t),
        cos1 = Math.cos(t),
        sin2 = v[2] / len,
        cos2 = v[0] / len;

      v[0] = (cos1 * cos2 - sin1 * sin2) * len;
      v[2] = (cos1 * sin2 + cos2 * sin1) * len;
      return v;
    }

    let events = {
      touchstart: start,
      mmousedown: start,
      touchmove: move,
      mmousemove: move,
      touchend: end,
      mmouseup: end
    };
    for (let i in events) {
      parent.addEventListener(i, events[i]);
    }
  }


  function apply() {
    ontrans.call(null, total.join(""));
    //alert(total.join(""))
  }
  return {
    set ontransform(v) {
      if (typeof v == "function")
        ontrans = v;
      else if (typeof v == "string")
        ontrans = new Function(v);
      else
        ontrans = () => { };
    },
    get ontransform() {
      return ontrans;
    },
    set limitLock(v) {
      limitLock = Boolean(v);
    },
    get limitLock() {
      return limitLock;
    }
  };
}