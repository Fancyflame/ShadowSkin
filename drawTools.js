function calcColor(color) {
    let s = color.match(/\w{2}/g);
    let num = 0;
    s.forEach(x => num += x);
    if (num > 0x17e) return "#333";
    else return "#fff";
}