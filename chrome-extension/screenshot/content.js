for (var n, aa = "function" == typeof Object.defineProperties ? Object.defineProperty : function (a, b, c) {
    a != Array.prototype && a != Object.prototype && (a[b] = c.value)
}
    , t = "undefined" != typeof window && window === this ? this : "undefined" != typeof global && null != global ? global : this, ba = ["Array", "prototype", "fill"], ca = 0; ca < ba.length - 1; ca++) {
    var da = ba[ca];
    da in t || (t[da] = {});
    t = t[da]
}
var ea = ba[ba.length - 1]
    , fa = t[ea]
    , ha = fa ? fa : function (a, b, c) {
        var d = this.length || 0;
        0 > b && (b = Math.max(0, d + b));
        if (null == c || c > d)
            c = d;
        c = Number(c);
        0 > c && (c = Math.max(0, d + c));
        for (b = Number(b || 0); b < c; b++)
            this[b] = a;
        return this
    }
    ;
ha != fa && null != ha && aa(t, ea, {
    configurable: !0,
    writable: !0,
    value: ha
});
function w() {
    this.callbacks = []
}
w.prototype.add = function (a) {
    this.callbacks.push(a)
}
    ;
w.prototype.remove = function (a) {
    for (; ;) {
        var b = this.callbacks.indexOf(a);
        if (-1 == b)
            break;
        this.callbacks.splice(b, 1)
    }
}
    ;
w.prototype.fire = function (a) {
    this.callbacks.forEach(function (b) {
        b.call("stub callback this", a)
    })
}
    ;
function ia() {
    var a = [["edge", /Edge\/([0-9\._]+)/], ["chrome", /Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/], ["firefox", /Firefox\/([0-9\.]+)(?:\s|$)/], ["opera", /Opera\/([0-9\.]+)(?:\s|$)/], ["ie", /Trident\/7\.0.*rv\:([0-9\.]+)\).*Gecko$/], ["ie", /MSIE\s([0-9\.]+);.*Trident\/[4-7].0/], ["ie", /MSIE\s(7\.0)/], ["bb10", /BB10;\sTouch.*Version\/([0-9\.]+)/], ["android", /Android\s([0-9\.]+)/], ["ios", /iPad\;\sCPU\sOS\s([0-9\._]+)/], ["ios", /iPhone\;\sCPU\siPhone\sOS\s([0-9\._]+)/], ["safari", /Safari\/([0-9\._]+)/]], b, c = [];
    for (b = 0; b < a.length; b++) {
        var d = b;
        var f = a[b];
        f = f.concat(f[1].exec(navigator.userAgent));
        a[d] = f;
        a[b][2] && c.push(a[b])
    }
    for (b = (a = c[0]) && a[3].split(/[._]/).slice(0, 3); b && 3 > b.length;)
        b.push("0");
    c = {};
    c.name = a && a[0];
    c.version = b && b.join(".");
    c.versionInt = parseInt(c.version, 10);
    return c
}
; function ja(a) {
    function b() {
        d || (d = $("<div></div>").css({
            position: "absolute",
            top: -9999,
            left: -9999,
            width: "auto",
            height: "auto",
            padding: 0,
            margin: 0,
            webkitTransform: c.css("webkitTransform"),
            webkitTransformOrigin: c.css("webkitTransformOrigin"),
            resize: "none"
        }).appendTo(document.getElementsByTagName("body")[0]));
        d.css({
            fontSize: c.css("fontSize"),
            fontFamily: c.css("fontFamily"),
            lineHeight: c.css("lineHeight")
        });
        var b = a.value.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&/g, "&amp;").replace(/$/, "&nbsp;").replace(/\n/g, "&nbsp;<br/>").replace(/\s/g, "&nbsp;")
            , e = b.split("<br/>").length - 1;
        d.html(b);
        c.css({
            width: d.width() + f + "px"
        });
        c.attr("rows", e + 2)
    }
    var c = $(a)
        , d = null
        , f = Number.parseInt(c.css("font-size"));
    c.css({
        overflow: "hidden"
    });
    c.keyup(b).keydown(b).keypress(b).change(b).change()
}
; function A(a, b) {
    this.x = this.y = 0;
    "undefined" !== typeof a && "undefined" !== typeof b && (this.x = a,
        this.y = b)
}
A.prototype.isEqual = function (a) {
    return this.x === a.x && this.y === a.y
}
    ;
function F(a, b) {
    this.c = this.b = 0;
    "undefined" !== typeof a && "undefined" !== typeof b && (this.c = a,
        this.b = b)
}
F.prototype.isEqual = function (a) {
    return this.c === a.c && this.b === a.b
}
    ;
function I(a, b) {
    this.x = this.c = this.y = this.b = 0;
    a && ("undefined" !== typeof a.T && "undefined" !== typeof a.V && "undefined" !== typeof a.U && "undefined" !== typeof a.W ? (this.x = Math.min(a.T, a.U),
        this.c = Math.abs(a.U - a.T),
        this.y = Math.min(a.V, a.W),
        this.b = Math.abs(a.W - a.V)) : "undefined" !== typeof a.x && "undefined" !== typeof a.y && "undefined" !== typeof a.c && "undefined" !== typeof a.b ? (this.x = a.x,
            this.c = a.c,
            this.y = a.y,
            this.b = a.b) : "undefined" !== typeof a.left && "undefined" !== typeof a.top && "undefined" !== typeof a.right && "undefined" !== typeof a.bottom ? (this.x = a.left,
                this.c = a.right - a.left,
                this.y = a.top,
                this.b = a.top - a.bottom) : "undefined" !== typeof a.x && "undefined" !== typeof a.y && "undefined" !== typeof b.c && "undefined" !== typeof b.b && (this.x = a.x,
                    this.c = b.c,
                    this.y = a.y,
                    this.b = b.b))
}
function ka(a, b, c) {
    b = null == b ? 1 : b;
    c = null == c ? b : c;
    a.x -= b;
    a.y -= c;
    a.c += 2 * b;
    a.b += 2 * c
}
function J(a, b) {
    return b.x >= a.x && b.x <= a.x + a.c && b.y >= a.y && b.y <= a.y + a.b
}
function la(a, b) {
    return J(a, ma(b)) && J(a, K(b)) && J(a, M(b)) && J(a, N(b))
}
function na(a, b) {
    var c = a.x
        , d = a.y
        , f = b.x
        , k = b.y;
    var e = c + a.c;
    a = d + a.b;
    var g = f + b.c;
    b = k + b.b;
    c < f && (c = f);
    d < k && (d = k);
    e > g && (e = g);
    a > b && (a = b);
    e -= c;
    a -= d;
    return 0 < e && 0 < a ? new I({
        x: c,
        y: d,
        c: e,
        b: a
    }) : new I
}
I.prototype.isEqual = function (a) {
    a = new I(a);
    return this.x === a.x && this.y === a.y && this.c === a.c && this.b === a.b
}
    ;
I.prototype.A = function () {
    return 0 === this.c || 0 === this.b
}
    ;
function ma(a) {
    return new A(a.x, a.y)
}
function K(a) {
    return new A(a.x + a.c, a.y)
}
function M(a) {
    return new A(a.x, a.y + a.b)
}
function N(a) {
    return new A(a.x + a.c, a.y + a.b)
}
I.prototype.size = function () {
    return new F(this.c, this.b)
}
    ;
function oa(a, b) {
    if (la(b, a)) {
        var c = b.b / 2
            , d = a.b / 2;
        a.x = b.x + b.c / 2 - a.c / 2;
        a.y = b.y + c - d
    }
}
var O = {
    Ja: function (a, b) {
        return new I({
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            c: Math.abs(a.x - b.x),
            b: Math.abs(a.y - b.y)
        })
    },
    K: function (a, b) {
        return new I({
            T: a.x - b,
            V: a.y - b,
            U: a.x + b,
            W: a.y + b
        })
    },
    ab: function (a, b, c) {
        return a.x == b.x ? new I({
            T: Math.min(a.x, c.x),
            U: Math.max(a.x, c.x),
            V: Math.min(a.y, b.y),
            W: Math.max(a.y, b.y)
        }) : new I({
            T: Math.min(a.x, b.x),
            U: Math.max(a.x, b.x),
            V: Math.min(a.y, c.y),
            W: Math.max(a.y, c.y)
        })
    }
};
var pa = {
    la: function (a) {
        return a + Math.random()
    },
    rb: function (a) {
        for (var b = a.length, c, d; 0 !== b;)
            d = Math.floor(Math.random() * b),
                --b,
                c = a[b],
                a[b] = a[d],
                a[d] = c;
        return a
    },
    qb: function (a, b) {
        return Math.floor(Math.random() * (b - a + 1) + a)
    }
}
    , qa = {
        Ua: function (a) {
            var b = window.location.href;
            b = b.substring(b.indexOf("?") + 1);
            -1 != b.indexOf("#") && (b = b.split("#")[1]);
            b = b.split("&");
            for (var c = 0; c < b.length; c++) {
                var d = b[c].split("=");
                if (1 < d.length && d[0] == a)
                    return d[1]
            }
            return null
        }
    }
    , P = {
        ma: function (a) {
            a = /matrix\([^\)]+\)/.exec(window.getComputedStyle(a)["-webkit-transform"]);
            var b = {
                x: 1,
                y: 1
            };
            a && (a = a[0].replace("matrix(", "").replace(")", "").split(", "),
                b.x = parseFloat(a[0]),
                b.y = parseFloat(a[3]));
            return b
        },
        qa: function (a) {
            1 != window.devicePixelRatio && (a.style.webkitTransform = "scale(" + 1 / window.devicePixelRatio + ")",
                a.style.webkitTransformOrigin = "0 0")
        },
        Na: function (a, b) {
            a.style.webkitTransform = b.style.webkitTransform;
            a.style.webkitTransformOrigin = b.style.webkitTransformOrigin
        },
        Ka: function (a, b, c) {
            a.style.position = "absolute";
            a.style.left = b + "px";
            a.style.top = c + "px"
        }
    }
    , Q = {
        extend: function (a, b) {
            function c() { }
            c.prototype = b.prototype;
            a.prototype = new c;
            a.prototype.constructor = a;
            a.s = b.prototype
        }
    }
    , ra = {
        gb: function (a, b, c) {
            var d = pa.la(a);
            a = {};
            a[d] = b;
            chrome.storage.local.set(a, function () {
                c && c(d)
            })
        },
        ob: function (a, b) {
            chrome.storage.local.get(a, function (c) {
                chrome.storage.local.remove(a, function () {
                    b && b(c[a])
                })
            })
        }
    }
    , S = function () {
        var a = [[-12, 0], [-12, -4], [0, 0], [-12, 4]];
        return {
            bb: function (a, c, d, f, k, e, g) {
                var b = a.fillStyle
                    , h = a.strokeStyle;
                a.beginPath();
                a.fillStyle = g;
                a.moveTo(c + e, d);
                a.lineTo(c + f - e, d);
                a.quadraticCurveTo(c + f, d, c + f, d + e);
                a.lineTo(c + f, d + k - e);
                a.quadraticCurveTo(c + f, d + k, c + f - e, d + k);
                a.lineTo(c + e, d + k);
                a.quadraticCurveTo(c, d + k, c, d + k - e);
                a.lineTo(c, d + e);
                a.quadraticCurveTo(c, d, c + e, d);
                a.fill();
                a.closePath();
                a.fillStyle = b;
                a.strokeStyle = h
            },
            Pa: function (b, c, d, f, k, e, g) {
                b.strokeStyle = e;
                b.fillStyle = e;
                b.lineWidth = g;
                e = Math.atan2(k - d, f - c);
                var y = g / 2;
                g = [];
                for (var h in a)
                    g.push([a[h][0] * y, a[h][1] * y]);
                if (0 == e)
                    var v = g;
                else {
                    h = [];
                    for (v in g) {
                        y = g[v][0];
                        var E = g[v][1];
                        h.push([y * Math.cos(e) - E * Math.sin(e), y * Math.sin(e) + E * Math.cos(e)])
                    }
                    v = h
                }
                e = [];
                for (var L in v)
                    e.push([v[L][0] + f, v[L][1] + k]);
                b.beginPath();
                b.moveTo(e[0][0], e[0][1]);
                for (var l in e)
                    0 < l && b.lineTo(e[l][0], e[l][1]);
                b.lineTo(e[0][0], e[0][1]);
                b.fill();
                Math.sqrt(Math.pow(f - c, 2) + Math.pow(k - d, 2)) > Math.sqrt(Math.pow(e[0][0] - c, 2) + Math.pow(e[0][1] - d, 2)) && (b.beginPath(),
                    b.moveTo(c, d),
                    b.lineTo(e[0][0], e[0][1]),
                    b.stroke())
            },
            ra: function (a, c, d, f, k) {
                var b = a.lineWidth / 2;
                c = new I({
                    x: c,
                    y: d,
                    c: f,
                    b: k
                });
                ka(c, -b, -b);
                a.strokeRect(c.x, c.y, c.c, c.b)
            }
        }
    }()
    , T = {
        f: function (a) {
            return chrome.i18n.getMessage(a)
        }
    }
    , sa = function () {
        function a(a) {
            var b = "unknown";
            -1 != a.navigator.appVersion.indexOf("Win") ? b = "windows" : -1 != a.navigator.appVersion.indexOf("Mac") ? b = "macos" : -1 != a.navigator.appVersion.indexOf("X11") ? b = "unix" : -1 != a.navigator.appVersion.indexOf("Linux") && (b = "linux");
            return b
        }
        return {
            nb: a,
            Ca: function (b) {
                var c = {
                    id: "ctrl",
                    display: "Ctrl"
                };
                "macos" === a(b) && (c = {
                    id: "meta",
                    display: "\u2318"
                });
                return c
            }
        }
    }();
(function () {
    function a() {
        $("#announce_do_not_show").is(":checked") ? b(function () {
            $("#announce").hide()
        }) : $("#announce").hide();
        return !1
    }
    function b(a) {
        chrome.storage.local.get("lightshot_announces", function (b) {
            b.lightshot_announces || (b.lightshot_announces = {});
            b.lightshot_announces["ann_" + null.id] = "do_not_show";
            chrome.storage.local.set(b, function () {
                a()
            })
        })
    }
    $(function () {
        $("#announce_hide").click(a).html(T.f("screenshot_plugin_close"));
        $("#announce_close_cross").click(a);
        $("#announce_do_not_show_label").html(T.f("screenshot_plugin_announce_do_not_show"))
    })
}
)();
function ta(a) {
    this.a = a;
    this.Ya = this.a.getContext("2d")
}
ta.prototype.v = function () {
    return new F(this.a.width, this.a.height)
}
    ;
function U(a, b) {
    var c = a.a.getBoundingClientRect();
    a = P.ma(a.a);
    return new I({
        x: b.x * a.x + c.left + $(document).scrollLeft(),
        y: b.y * a.y + c.top + $(document).scrollTop(),
        c: b.c * a.x,
        b: b.b * a.y
    })
}
function ua(a, b) {
    var c = a.a.getBoundingClientRect();
    a = P.ma(a.a);
    return new A(Math.round((b.x - c.left - $(document).scrollLeft()) / a.x), Math.round((b.y - c.top - $(document).scrollTop()) / a.y))
}
function V(a, b) {
    return ua(a, new A(b.pageX, b.pageY))
}
function va(a) {
    var b = document.getElementsByTagName("body")[0].appendChild(document.createElement("canvas"));
    va.s.constructor.call(this, b);
    this.Ea = a;
    P.Na(this.a, this.Ea);
    this.ta()
}
Q.extend(va, ta);
va.prototype.ta = function () {
    var a = $(this.Ea);
    this.a.width = a.width();
    this.a.height = a.height();
    this.a.style.position = "absolute";
    this.a.style.left = a.offset().left + "px";
    this.a.style.top = a.offset().top + "px"
}
    ;
function wa(a) {
    var b = {
        ia: "selectStart",
        N: "selectEnd",
        L: "redraw"
    }
        , c = function () {
            function a() {
                d = new I;
                y = !1
            }
            function b(a) {
                d = a;
                y = !0;
                a = 3 * window.devicePixelRatio;
                var b = Math.floor(d.c / 2)
                    , c = Math.floor(d.b / 2);
                h.right = O.K(new A(d.x + d.c, d.y + c), a);
                h.left = O.K(new A(d.x, d.y + c), a);
                h.top = O.K(new A(d.x + b, d.y), a);
                h.bottom = O.K(new A(d.x + b, d.y + d.b), a);
                h.topleft = O.K(new A(d.x, d.y), a);
                h.topright = O.K(new A(d.x + d.c, d.y), a);
                h.bottomleft = O.K(new A(d.x, d.y + d.b), a);
                h.bottomright = O.K(new A(d.x + d.c, d.y + d.b), a);
                h.move = d
            }
            function c(a) {
                if (y)
                    for (var b in h)
                        if (!a(h[b], b))
                            break
            }
            var d = new I
                , y = !1
                , h = {}
                , v = null;
            return {
                set: b,
                get: function () {
                    return d
                },
                clear: a,
                Xa: function () {
                    return y
                },
                na: function (a) {
                    var b = "none";
                    y && c(function (c, d) {
                        c = new I(c);
                        ka(c, 1);
                        return J(c, a) ? (b = d,
                            !1) : !0
                    });
                    return b
                },
                kb: c,
                Aa: function () {
                    v = d
                },
                restore: function () {
                    v ? b(v) : a()
                }
            }
        }()
        , d = function () {
            function a(a) {
                if (G)
                    return !0;
                a = V(l, a);
                "move" === c.na(a) && L();
                return !1
            }
            function d(a) {
                1 !== a.which && y();
                return !1
            }
            function e(a) {
                m = a = V(l, a);
                if (G)
                    return !0;
                switch (B) {
                    case "left":
                    case "right":
                    case "top":
                    case "bottom":
                        c.set(O.ab(u, H, a));
                        break;
                    case "topleft":
                    case "topright":
                    case "bottomleft":
                    case "bottomright":
                        c.set(O.Ja(u, a));
                        break;
                    case "move":
                        var b = l.v();
                        c.set(new I({
                            T: Math.min(Math.max(a.x - C.left, 0), b.c),
                            V: Math.min(Math.max(a.y - C.top, 0), b.b),
                            U: Math.max(Math.min(a.x + C.right, b.c), 0),
                            W: Math.max(Math.min(a.y + C.bottom, b.b), 0)
                        }))
                }
                E();
                v(a);
                return !1
            }
            function g() {
                y();
                return !1
            }
            function y() {
                B = "none";
                H = u = C = null;
                var a = l.a;
                $(a).off("mouseup", g);
                $(a).off("mouseenter", d);
                c.get().A() ? (c.restore(),
                    E()) : c.Aa();
                z[b.N].fire({
                    rect: U(l, c.get())
                })
            }
            function h(a) {
                if (1 != a.which || G)
                    return !0;
                a = V(l, a);
                B = c.na(a);
                switch (B) {
                    case "left":
                        u = K(c.get());
                        H = N(c.get());
                        break;
                    case "right":
                        u = ma(c.get());
                        H = M(c.get());
                        break;
                    case "top":
                        u = M(c.get());
                        H = N(c.get());
                        break;
                    case "bottom":
                        u = ma(c.get());
                        H = K(c.get());
                        break;
                    case "topleft":
                        u = N(c.get());
                        break;
                    case "topright":
                        u = M(c.get());
                        break;
                    case "bottomleft":
                        u = K(c.get());
                        break;
                    case "bottomright":
                        u = ma(c.get());
                        break;
                    case "move":
                        var r = c.get();
                        C = {
                            left: a.x - r.x,
                            top: a.y - r.y,
                            right: r.x + r.c - a.x,
                            bottom: r.y + r.b - a.y
                        };
                        break;
                    case "none":
                        u = a;
                        B = "bottomright";
                        break;
                    default:
                        alert("ERROR onMouseDown -> switch -> default")
                }
                a = l.a;
                $(a).on("mouseup", g);
                $(a).on("mouseenter", d);
                z[b.ia].fire();
                return !1
            }
            function v(a) {
                var b = "none";
                "none" !== B ? b = B : a && (b = c.na(a));
                a = l.a;
                switch (b) {
                    case "left":
                    case "right":
                        a.style.cursor = "ew-resize";
                        break;
                    case "top":
                    case "bottom":
                        a.style.cursor = "ns-resize";
                        break;
                    case "topright":
                    case "bottomleft":
                        a.style.cursor = "nesw-resize";
                        break;
                    case "topleft":
                    case "bottomright":
                        a.style.cursor = "nwse-resize";
                        break;
                    case "move":
                        a.style.cursor = "move";
                        break;
                    default:
                        a.style.cursor = "default"
                }
            }
            function E() {
                z[b.L].fire(null)
            }
            function L() {
                var a = c.get()
                    , d = new I(new A(0, 0), l.v());
                a.isEqual(d) && p ? c.set(p) : (p = a,
                    c.set(d));
                c.Aa();
                E();
                z[b.N].fire({
                    rect: U(l, c.get())
                })
            }
            var l = null
                , u = null
                , H = null
                , B = "none"
                , C = null
                , p = null
                , z = {};
            z[b.ia] = new w;
            z[b.N] = new w;
            z[b.L] = new w;
            var G = !1
                , m = null
                , D = T.f("screenshot_plugin_tooltip");
            return {
                oa: function (b) {
                    l = new ta(b);
                    E();
                    b = l.a;
                    $(b).on("mousedown", h);
                    $(b).on("mousemove", e);
                    $(b).on("dblclick", a)
                },
                clear: function () {
                    c.clear();
                    E()
                },
                I: function () {
                    return c.get()
                },
                D: b,
                attachEvent: function (a, b) {
                    "undefined" !== typeof z[a] && z[a].add(b)
                },
                detachEvent: function (a, b) {
                    "undefined" !== typeof z[a] && z[a].remove(b)
                },
                lock: function () {
                    G = !0;
                    l.a.style.cursor = "default";
                    B = "none"
                },
                unlock: function () {
                    G = !1;
                    m && v(m)
                },
                fa: function (a, b) {
                    if (a && b)
                        if (c.Xa()) {
                            var d = c.get();
                            b.fillStyle = "rgba(0, 0, 0, 0.5)";
                            b.fillRect(0, 0, a.width, d.y);
                            b.fillRect(0, d.y, d.x, a.height - d.y);
                            b.fillRect(d.x, d.y + d.b, a.width - d.x, a.height - d.y - d.b);
                            b.fillRect(d.x + d.c, d.y, a.width - d.x - d.c, d.b);
                            b.lineWidth = 1 * window.devicePixelRatio;
                            b.lineJoin = "miter";
                            b.strokeStyle = "white";
                            S.ra(b, d.x, d.y, d.c, d.b);
                            b.strokeStyle = "black";
                            b.setLineDash([6]);
                            S.ra(b, d.x, d.y, d.c, d.b);
                            b.setLineDash([]);
                            b.fillStyle = "black";
                            b.strokeStyle = "white";
                            c.kb(function (a, c) {
                                "none" !== c && "move" !== c && (b.fillRect(a.x, a.y, a.c, a.b),
                                    S.ra(b, a.x, a.y, a.c, a.b));
                                return !0
                            });
                            var e = 14 * window.devicePixelRatio;
                            b.font = e + "px Helvetica";
                            b.fillStyle = "white";
                            b.textBaseline = "top";
                            a = d.c + "x" + d.b;
                            var r = new F(b.measureText(a).width, e);
                            e = 3 * window.devicePixelRatio;
                            r = new F(r.c + 2 * e, r.b + 2 * e);
                            var f = null;
                            f = new I(new A(d.x, d.y - 5 * window.devicePixelRatio - r.b), r);
                            S.bb(b, f.x, f.y, f.c, f.b, 3 * window.devicePixelRatio, "rgba(0,0,0,0.8)", "rgba(0,0,0,0.8)");
                            b.fillText(a, f.x + e, f.y + e - 1 * window.devicePixelRatio)
                        } else
                            b.fillStyle = "rgba(0, 0, 0, 0.5)",
                                b.fillRect(0, 0, a.width, a.height),
                                e = 50 * window.devicePixelRatio,
                                b.font = e + "px Helvetica",
                                b.fillStyle = "rgba(255, 255, 255, 0.5)",
                                b.textBaseline = "top",
                                r = new F(b.measureText(D).width, e),
                                d = new I(new A, r),
                                oa(d, new I(new A, new F(a.width, a.height))),
                                b.fillText(D, d.x, d.y)
                },
                cb: L,
                offset: function (a, d) {
                    var e = new I(c.get());
                    e.x += a;
                    e.y += d;
                    a = new I(new A(0, 0), l.v());
                    e = na(e, a);
                    e.size().isEqual(c.get().size()) && (c.set(e),
                        E(),
                        z[b.N].fire({
                            rect: U(l, c.get())
                        }))
                },
                ca: function (a, d) {
                    var e = new I(c.get());
                    e.c += a;
                    e.b += d;
                    e.A() || (a = new I(new A(0, 0), l.v()),
                        e = na(e, a),
                        c.set(e),
                        E(),
                        z[b.N].fire({
                            rect: U(l, c.get())
                        }))
                }
            }
        }();
    d.oa(a);
    return d
}
; function xa(a, b) {
    this.l = a;
    this.$a = b;
    this.a = null;
    this.o = "default";
    this.ja()
}
xa.prototype.ja = function () {
    this.l.id = this.l.id || pa.la("item_")
}
    ;
xa.prototype.ka = function () { }
    ;
xa.prototype.getState = function () {
    return this.o
}
    ;
function ya(a, b) {
    ya.s.constructor.apply(this, arguments);
    this.a = document.createElement("div");
    this.a.id = this.l.id;
    this.a.className = "toolbar-separator"
}
Q.extend(ya, xa);
function W(a, b) {
    W.s.constructor.apply(this, arguments);
    this.ja();
    this.ya();
    za(this)
}
Q.extend(W, xa);
W.prototype.ja = function () { }
    ;
W.prototype.ya = function () {
    this.a = document.createElement("img");
    this.a.id = this.l.id;
    this.a.alt = this.l.caption;
    this.a.title = this.l.caption;
    this.a.className = "toolbar-button ";
    Aa(this)
}
    ;
function za(a) {
    $(a.a).on("click", function () {
        var b = a.$a;
        b.O[b.X.C].fire(a.l.id);
        return !1
    });
    $(a.a).on("mousedown", !1);
    $(a.a).on("mouseover", function () {
        Ba(a)
    });
    $(a.a).on("mouseout", function () {
        "active" != a.o && Aa(a)
    })
}
function Aa(a) {
    a.a.src = a.l.g;
    a.a.srcset = a.l.h + " 2x"
}
function Ba(a) {
    a.a.src = a.l.i;
    a.a.srcset = a.l.j + " 2x"
}
W.prototype.ka = function () {
    "active" == this.o ? Ba(this) : Aa(this)
}
    ;
function Ca(a, b) {
    Ca.s.constructor.apply(this, arguments);
    this.l.u(this)
}
Q.extend(Ca, W);
Ca.prototype.ya = function () {
    this.a = document.createElement("canvas");
    this.a.id = this.l.id;
    this.a.className = "toolbar-button-owner-draw";
    this.a.title = this.l.caption;
    this.a.width = 26 * window.devicePixelRatio;
    this.a.height = 27 * window.devicePixelRatio;
    this.a.getContext("2d").scale(window.devicePixelRatio, window.devicePixelRatio)
}
    ;
function Da(a) {
    this.H = a;
    this.P = [];
    this.O = {};
    this.O[this.X.C] = new w;
    this.H.id = this.H.id || pa.la("toolbar_");
    this.H.layout = this.H.layout || [];
    this.a = document.createElement("div");
    this.a.id = this.H.id;
    this.a.className = "toolbar " + this.H.className;
    document.getElementsByTagName("body")[0].appendChild(this.a);
    for (a = 0; a < this.H.layout.length; a++)
        if ("copy" != this.H.layout[a].id || "function" === typeof navigator.clipboard.write) {
            var b = this.H.layout[a];
            var c = null;
            "button" === b.type ? c = new W(b, this) : "button_owner_draw" === b.type ? c = new Ca(b, this) : "separator" === b.type && (c = new ya(b, this));
            if (b = c)
                this.P.push(b),
                    this.a.appendChild(b.a)
        }
}
n = Da.prototype;
n.X = {
    C: "buttonClicked"
};
n.setPosition = function (a, b) {
    null == b && "undefined" !== typeof a.x && "undefined" !== typeof a.y ? (this.a.style.left = a.x + "px",
        this.a.style.top = a.y + "px") : (this.a.style.left = a + "px",
            this.a.style.top = b + "px")
}
    ;
n.v = function () {
    return new F($(this.a).outerWidth(), $(this.a).outerHeight())
}
    ;
n.I = function () {
    var a = $(this.a).offset();
    return new I(new A(a.left, a.top), this.v())
}
    ;
n.hide = function () {
    $(this.a).hide()
}
    ;
n.show = function () {
    $(this.a).show()
}
    ;
n.attachEvent = function (a, b) {
    "undefined" !== typeof this.O[a] && this.O[a].add(b)
}
    ;
n.detachEvent = function (a, b) {
    "undefined" !== typeof this.O[a] && this.O[a].remove(b)
}
    ;
function Ea(a) {
    for (var b = 0; b < a.P.length; b++) {
        var c = a.P[b];
        c.o = "default";
        c.ka()
    }
}
function Fa(a, b) {
    for (var c = 0; c < a.P.length; c++)
        if (a.P[c].l.id === b)
            return a.P[c];
    return null
}
; function Ga() {
    function a(a) {
        if ("share" === a)
            if ($(f.a).is(":visible"))
                f.hide();
            else {
                if (f.show(),
                    a = (a = Fa(d, "share")) ? a.a.getBoundingClientRect() : null) {
                    var b = f.v()
                        , k = a.left + (a.right - a.left) / 2;
                    a.bottom + 6 + b.b < window.innerHeight ? (f.setPosition(k - b.c / 2, a.bottom + 6),
                        $(f.a).addClass("drop-down").removeClass("drop-up")) : (f.setPosition(k - b.c / 2, a.top - 8 - b.b),
                            $(f.a).addClass("drop-up").removeClass("drop-down"))
                }
            }
        else
            e[c.C].fire(a)
    }
    function b() {
        d.hide();
        f.hide();
        k.hide()
    }
    var c = {
        C: "buttonClicked"
    }
        , d = null
        , f = null
        , k = null
        , e = {};
    e[c.C] = new w;
    var g = sa.Ca(window).display
        , y = {
            id: "toolbar_actions",
            className: "toolbar-horizontal",
            layout: [
                {
                    id: "print",
                    type: "button",
                    caption: T.f("screenshot_plugin_print") + " (" + g + "+P)",
                    g: "toolbar_res/hor_print.png",
                    h: "toolbar_res/hor_print@2x.png",
                    i: "toolbar_res/hor_print_hover.png",
                    j: "toolbar_res/hor_print_hover@2x.png"
                }, {
                    id: "copy",
                    type: "button",
                    caption: T.f("screenshot_plugin_copy") + " (" + g + "+C)",
                    g: "toolbar_res/hor_copy.png",
                    h: "toolbar_res/hor_copy@2x.png",
                    i: "toolbar_res/hor_copy_hover.png",
                    j: "toolbar_res/hor_copy_hover@2x.png"
                }, {
                    id: "save",
                    type: "button",
                    caption: T.f("screenshot_plugin_save") + " (" + g + "+S)",
                    g: "toolbar_res/hor_save.png",
                    h: "toolbar_res/hor_save@2x.png",
                    i: "toolbar_res/hor_save_hover.png",
                    j: "toolbar_res/hor_save_hover@2x.png"
                }, {
                    type: "separator"
                }, {
                    id: "close",
                    type: "button",
                    caption: T.f("screenshot_plugin_close") + " (" + g + "+X)",
                    g: "toolbar_res/hor_close.png",
                    h: "toolbar_res/hor_close@2x.png",
                    i: "toolbar_res/hor_close_hover.png",
                    j: "toolbar_res/hor_close_hover@2x.png"
                }]
        }
        , h = {
            id: "toolbar_share",
            className: "subtoolbar-horizontal",
            layout: []
        };
    g = {
        id: "toolbar_edit",
        className: "toolbar-vertical",
        layout: [{
            id: "pencil",
            type: "button",
            caption: T.f("screenshot_plugin_edit_pencil"),
            g: "toolbar_res/draw_pencil.png",
            h: "toolbar_res/draw_pencil@2x.png",
            i: "toolbar_res/draw_pencil_hover.png",
            j: "toolbar_res/draw_pencil_hover@2x.png"
        }, {
            id: "line",
            type: "button",
            caption: T.f("screenshot_plugin_edit_line"),
            g: "toolbar_res/draw_line.png",
            h: "toolbar_res/draw_line@2x.png",
            i: "toolbar_res/draw_line_hover.png",
            j: "toolbar_res/draw_line_hover@2x.png"
        }, {
            id: "arrow",
            type: "button",
            caption: T.f("screenshot_plugin_edit_arrow"),
            g: "toolbar_res/draw_arrow.png",
            h: "toolbar_res/draw_arrow@2x.png",
            i: "toolbar_res/draw_arrow_hover.png",
            j: "toolbar_res/draw_arrow_hover@2x.png"
        }, {
            id: "rectangle",
            type: "button",
            caption: T.f("screenshot_plugin_edit_rect"),
            g: "toolbar_res/draw_rectangle.png",
            h: "toolbar_res/draw_rectangle@2x.png",
            i: "toolbar_res/draw_rectangle_hover.png",
            j: "toolbar_res/draw_rectangle_hover@2x.png"
        }, {
            id: "marker",
            type: "button",
            caption: T.f("screenshot_plugin_edit_marker"),
            g: "toolbar_res/draw_marker.png",
            h: "toolbar_res/draw_marker@2x.png",
            i: "toolbar_res/draw_marker_hover.png",
            j: "toolbar_res/draw_marker_hover@2x.png"
        }, {
            id: "text",
            type: "button",
            caption: T.f("screenshot_plugin_edit_text"),
            g: "toolbar_res/draw_text.png",
            h: "toolbar_res/draw_text@2x.png",
            i: "toolbar_res/draw_text_hover.png",
            j: "toolbar_res/draw_text_hover@2x.png"
        }, {
            id: "color",
            type: "button_owner_draw",
            caption: T.f("screenshot_plugin_edit_color"),
            za: {
                color: "#ff0000"
            },
            u: function (a) {
                var b = a.a;
                if (b && b.getContext) {
                    var c = b.getContext("2d");
                    c.clearRect(0, 0, b.width, b.height);
                    c.fillStyle = a.l.za.color;
                    c.fillRect(6, 5, 16, 17);
                    a = new Image;
                    a.src = "data:image/png;base64,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";
                    c.drawImage(a, .5, .5)
                }
            }
        }, {
            type: "separator"
        }, {
            id: "undo",
            type: "button",
            caption: T.f("screenshot_plugin_edit_undo") + " (" + g + "+Z)",
            g: "toolbar_res/draw_undo.png",
            h: "toolbar_res/draw_undo@2x.png",
            i: "toolbar_res/draw_undo_hover.png",
            j: "toolbar_res/draw_undo_hover@2x.png"
        }]
    };
    d = new Da(y);
    d.attachEvent(d.X.C, a);
    f = new Da(h);
    f.attachEvent(f.X.C, a);
    k = new Da(g);
    k.attachEvent(k.X.C, a);
    b();
    return {
        ta: function (a) {
            var b = new I({
                x: 0,
                y: 0,
                c: window.innerWidth,
                b: window.innerHeight
            })
                , c = d.v()
                , e = []
                , f = d.v();
            var g = N(a);
            e.push(new A(Math.max(g.x - f.c, 0), g.y + 5));
            g = K(a);
            e.push(new A(Math.max(g.x - f.c, 0), g.y - 5 - f.b));
            g = M(a);
            e.push(new A(g.x - 5 - f.c, g.y - f.b));
            g = N(a);
            e.push(new A(g.x + 5, g.y - f.b));
            g = N(a);
            e.push(new A(g.x - 5 - f.c, g.y - 5 - f.b));
            for (g = 0; g < e.length; g++)
                if (la(b, new I(e[g], c))) {
                    d.setPosition(e[g]);
                    break
                }
            c = d.I();
            e = k.v();
            f = [];
            g = d.v();
            var h = k.v()
                , v = d.I();
            var p = N(a);
            f.push(new A(p.x + 5, Math.max(p.y - h.b, 0)));
            p = M(a);
            f.push(new A(p.x - 5 - h.c, Math.max(p.y - h.b, 0)));
            p = N(a);
            f.push(new A(p.x - 5 - h.c, Math.max(p.y - 5 - h.b, 0)));
            p = N(a);
            f.push(new A(v.x + v.c + 5, Math.max(p.y - 5 - h.b, 0)));
            p = M(a);
            f.push(new A(v.x - 5 - h.c, Math.max(p.y - h.b, 0)));
            p = N(a);
            f.push(new A(p.x - h.c, p.y + 5 + g.b + 5));
            p = K(a);
            f.push(new A(p.x - h.c, p.y - 5 - g.b - 5 - h.b));
            for (g = 0; g < f.length; g++)
                if (a = new I(f[g], e),
                    la(b, a) && na(a, c).A()) {
                    k.setPosition(f[g]);
                    break
                }
        },
        Da: b,
        La: function () {
            d.show();
            k.show()
        },
        D: c,
        attachEvent: function (a, b) {
            "undefined" !== typeof e[a] && e[a].add(b)
        },
        detachEvent: function (a, b) {
            "undefined" !== typeof e[a] && e[a].remove(b)
        },
        fb: function (a, b) {
            Ea(k);
            if (a = Fa(k, a))
                a.o = b,
                    a.ka()
        },
        Ba: function () {
            Ea(k)
        },
        sa: function (a) {
            var b = Fa(k, "color");
            b.l.za.color = a;
            b.l.u(b)
        }
    }
}
; function Ha(a) {
    function b() {
        $(window).off("mouseup", b);
        $(window).off("mousemove", c);
        return !1
    }
    function c(b) {
        P.Ka(a, b.pageX - d, b.pageY - f);
        return !1
    }
    var d = 0
        , f = 0;
    $(a).on("mousedown", function (k) {
        if (k.target === a) {
            var e = $(a);
            $(window).on("mouseup", b);
            e = e.offset();
            d = k.pageX - e.left;
            f = k.pageY - e.top;
            $(window).on("mousemove", c);
            return !1
        }
        return !0
    })
}
function Ia(a) {
    a = a || {};
    var b = null
        , c = null
        , d = a.color || "#ff0000"
        , f = a.width || 10
        , k = a.fontFamily || "Helvetica";
    c = document.createElement("textarea");
    c.spellcheck = !1;
    b = document.createElement("div");
    b.appendChild(c);
    b.style.sb = "999999";
    b.style.background = "none";
    b.style.border = "dashed black 1px";
    b.style.padding = 2 * window.devicePixelRatio + "px";
    b.style.margin = "2px";
    b.style.cursor = "move";
    c.style.background = "none";
    c.style.border = "none";
    c.style.outline = "none";
    c.style.resize = "none";
    c.style.padding = "0";
    c.style.margin = "0";
    c.style.color = d;
    c.style.font = f + "px " + k;
    document.getElementsByTagName("body")[0].appendChild(b);
    P.qa(b);
    P.Ka(b, a.Ia.x, a.Ia.y);
    ja(c);
    Ha(b);
    c.focus();
    return {
        Va: function () {
            return c ? c.value : null
        },
        Ta: function () {
            return b ? $(c).offset() : null
        },
        Sa: function () {
            return Number.parseInt(window.getComputedStyle(c).height) / c.rows
        },
        eb: function () {
            b.parentNode.removeChild(b);
            c = b = null
        },
        R: function (a) {
            d = a;
            c.style.color = d
        },
        Y: function (a) {
            f = a;
            c.style.fontSize = f + "px";
            $(c).change()
        }
    }
}
; function Ja(a) {
    a = a || {};
    this.Za = a.S || "line";
    this.F = a.color || "#ff0000";
    this.w = a.width || 10;
    this.Ha = a.pb || 1;
    this.o = "new"
}
n = Ja.prototype;
n.getState = function () {
    return this.o
}
    ;
n.u = function () {
    alert("not implemented")
}
    ;
n.setStart = function () {
    alert("not implemented")
}
    ;
n.setEnd = function () {
    alert("not implemented")
}
    ;
n.aa = function () {
    alert("not implemented")
}
    ;
n.A = function () {
    alert("not implemented")
}
    ;
n.R = function () { }
    ;
n.Y = function (a) {
    "drawing" == this.o && (this.w = a)
}
    ;
function Ka(a) {
    Ka.s.constructor.apply(this, arguments)
}
Q.extend(Ka, Ja);
function X(a) {
    X.s.constructor.apply(this, arguments);
    this.G = this.M = null
}
Q.extend(X, Ka);
X.prototype.setStart = function (a) {
    this.G = this.M = a;
    this.o = "drawing"
}
    ;
X.prototype.setEnd = function (a) {
    a && (this.G = a);
    this.o = "finished"
}
    ;
X.prototype.aa = function (a) {
    "drawing" === this.o && (this.G = a)
}
    ;
X.prototype.A = function () {
    return null == this.M || null == this.G
}
    ;
function Y(a) {
    Y.s.constructor.apply(this, arguments);
    this.m = []
}
Q.extend(Y, Ka);
Y.prototype.setStart = function (a) {
    this.m = [];
    this.m.push(a);
    this.o = "drawing"
}
    ;
Y.prototype.setEnd = function (a) {
    a && this.m.push(a);
    this.o = "finished"
}
    ;
Y.prototype.aa = function (a) {
    if ("drawing" === this.o) {
        var b = this.m[this.m.length - 1];
        Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)) >= this.w / 8 && this.m.push(a)
    }
}
    ;
Y.prototype.A = function () {
    return 0 == this.m.length
}
    ;
function La(a) {
    a = a || {};
    a.S = "line";
    La.s.constructor.apply(this, arguments)
}
Q.extend(La, X);
La.prototype.u = function (a) {
    a.lineJoin = "round";
    a.lineCap = "round";
    a.strokeStyle = this.F;
    a.lineWidth = this.w * window.devicePixelRatio;
    a.beginPath();
    a.moveTo(this.M.x, this.M.y);
    a.lineTo(this.G.x, this.G.y);
    a.stroke()
}
    ;
function Ma(a) {
    a = a || {};
    a.S = "arrow";
    Ma.s.constructor.apply(this, arguments)
}
Q.extend(Ma, X);
Ma.prototype.u = function (a) {
    a.lineJoin = "round";
    a.lineCap = "round";
    S.Pa(a, this.M.x, this.M.y, this.G.x, this.G.y, this.F, this.w * window.devicePixelRatio)
}
    ;
function Oa(a) {
    a = a || {};
    a.S = "rectangle";
    Oa.s.constructor.apply(this, arguments)
}
Q.extend(Oa, X);
Oa.prototype.u = function (a) {
    a.lineJoin = "round";
    a.lineCap = "round";
    a.strokeStyle = this.F;
    a.lineWidth = this.w * window.devicePixelRatio;
    var b = O.Ja(this.M, this.G);
    a.strokeRect(b.x, b.y, b.c, b.b)
}
    ;
function Pa(a) {
    a = a || {};
    a.S = "pencil";
    Pa.s.constructor.apply(this, arguments)
}
Q.extend(Pa, Y);
Pa.prototype.u = function (a) {
    a.lineJoin = "round";
    a.lineCap = "round";
    a.strokeStyle = this.F;
    a.lineWidth = this.w * window.devicePixelRatio;
    if (1 == this.m.length || 2 == this.m.length && this.m[0].isEqual(this.m[1]))
        a.fillStyle = this.F,
            a.beginPath(),
            a.arc(this.m[0].x, this.m[0].y, this.w / 2 * window.devicePixelRatio, 0, 2 * Math.PI, !1),
            a.fill();
    else {
        a.beginPath();
        a.moveTo(this.m[0].x, this.m[0].y);
        for (var b = 1; b < this.m.length; b++)
            a.lineTo(this.m[b].x, this.m[b].y);
        a.stroke()
    }
}
    ;
function Qa(a) {
    a = a || {};
    a.S = "marker";
    Qa.s.constructor.apply(this, arguments);
    this.Ha = .5
}
Q.extend(Qa, Pa);
Qa.prototype.u = function (a) {
    var b = a.globalAlpha;
    a.globalAlpha = this.Ha;
    Qa.s.u.apply(this, arguments);
    a.globalAlpha = b
}
    ;
function Ra(a) {
    a = a || {};
    a.S = "text";
    Ra.s.constructor.apply(this, arguments);
    this.Fa = a.canvas;
    this.B = null;
    this.pa = "";
    this.J = null;
    this.Ga = "Helvetica";
    this.ea = 0
}
Q.extend(Ra, Ja);
n = Ra.prototype;
n.u = function (a) {
    if ("drawing" !== this.o && "finished" === this.o) {
        a.font = this.w * window.devicePixelRatio + "px " + this.Ga;
        a.fillStyle = this.F;
        a.textBaseline = "top";
        for (var b = this.pa.split("\n"), c = 0; c < b.length; c++)
            a.fillText(b[c], this.J.x, this.J.y + c * this.ea)
    }
}
    ;
n.setStart = function () { }
    ;
n.setEnd = function (a) {
    if (a) {
        var b = this.Fa;
        var c = b.a.getBoundingClientRect();
        b = P.ma(b.a);
        c = new A(a.x * b.x + c.left + $(document).scrollLeft(), a.y * b.y + c.top + $(document).scrollTop());
        this.B = Ia({
            Ia: c,
            color: this.F,
            width: this.w * window.devicePixelRatio,
            fontFamily: this.Ga
        });
        this.J = a
    }
    this.o = "drawing"
}
    ;
n.aa = function () { }
    ;
n.A = function () {
    return 0 == this.pa.length
}
    ;
n.R = function (a) {
    this.F = a;
    this.B && this.B.R(this.F)
}
    ;
n.Y = function (a) {
    this.w = a;
    this.B && this.B.Y(this.w * window.devicePixelRatio)
}
    ;
function Sa(a) {
    function b() {
        q = null;
        h()
    }
    function c(a) {
        if (!v() || p === l.TEXT)
            return !0;
        a = V(z, a);
        m && m.aa(a);
        q = a;
        h();
        return !1
    }
    function d(a) {
        1 != a.which && k(null);
        return !1
    }
    function f(a) {
        if (1 != a.which)
            return !0;
        a = a ? V(z, a) : null;
        k(a);
        return !1
    }
    function k(a) {
        var b = z.a;
        $(b).off("mouseup", f);
        $(b).off("mouseenter", d);
        m && m.setEnd(a);
        h();
        D[u.ga].fire()
    }
    function e(a) {
        if (1 != a.which || !v())
            return !0;
        g();
        var b = {
            color: H,
            width: y()
        };
        switch (p) {
            case l.va:
                m = new La(b);
                break;
            case l.ua:
                m = new Ma(b);
                break;
            case l.xa:
                m = new Oa(b);
                break;
            case l.wa:
                m = new Pa(b);
                break;
            case l.Z:
                b.color = B;
                m = new Qa(b);
                break;
            case l.TEXT:
                b.canvas = z;
                m = new Ra(b);
                break;
            default:
                console.log("_startNewObject: no such tool")
        }
        m && (a = V(z, a),
            m.setStart(a));
        h();
        a = z.a;
        $(a).on("mouseup", f);
        $(a).on("mouseenter", d);
        D[u.ha].fire();
        return !1
    }
    function g() {
        if (m) {
            if (m.Za === l.TEXT) {
                var a = m;
                a.pa = a.B.Va();
                a.ea = a.B.Sa();
                var b = a.B.Ta();
                a.J = ua(a.Fa, new A(b.left, b.top));
                "firefox" == ia().name ? a.J.y += Math.round(a.ea / 10) : "chrome" == ia().name && (a.J.y += Math.ceil(a.ea / 100));
                a.B.eb();
                a.B = null;
                a.o = "finished";
                h()
            }
            m.A() || G.push(m);
            m = null
        }
    }
    function y() {
        var a = 0;
        switch (p) {
            case l.va:
            case l.ua:
            case l.xa:
            case l.wa:
                a = 2 * C + 3;
                break;
            case l.Z:
                a = 2 * C + 16;
                break;
            case l.TEXT:
                a = 4 * C + 16
        }
        return a
    }
    function h() {
        D[u.L].fire(null)
    }
    function v() {
        return null !== p
    }
    function E() {
        L(null);
        h()
    }
    function L(a) {
        g();
        p = a
    }
    var l = {
        wa: "pencil",
        va: "line",
        ua: "arrow",
        xa: "rectangle",
        Z: "marker",
        TEXT: "text"
    }
        , u = {
            ha: "selectStart",
            ga: "selectEnd",
            L: "redraw"
        }
        , H = window.localStorage.mainColor || "#ff0000"
        , B = window.localStorage.markerColor || "#ffff00"
        , C = 0
        , p = null
        , z = new ta(a)
        , G = []
        , m = null
        , D = {}
        , q = null;
    D[u.ha] = new w;
    D[u.ga] = new w;
    D[u.L] = new w;
    (function () {
        var a = z.a;
        $(a).on("mousedown", e);
        $(a).on("mousemove", c);
        $(a).on("mouseleave", b)
    }
    )();
    return {
        hb: L,
        R: function (a) {
            p === l.Z ? (B = a,
                window.localStorage.markerColor = B) : (H = a,
                    window.localStorage.mainColor = H);
            m && m.R(a)
        },
        ba: function () {
            return p === l.Z ? B : H
        },
        ib: E,
        da: v,
        Ra: function () {
            return p
        },
        fa: function (a, b) {
            if (a && b) {
                for (a = 0; a < G.length; a++)
                    G[a].u(b);
                m && m.u(b);
                v() && p !== l.TEXT && q && (a = y(),
                    b.lineJoin = "round",
                    b.strokeStyle = "black",
                    b.lineWidth = 1 * window.devicePixelRatio,
                    b.beginPath(),
                    b.arc(q.x, q.y, a / 2 * window.devicePixelRatio, 0, 2 * Math.PI, !0),
                    b.stroke())
            }
        },
        jb: function () {
            g();
            G.pop();
            0 === G.length && E();
            h()
        },
        Oa: function () {
            v() && 0 < C && (--C,
                m && m.Y(y()),
                h())
        },
        Wa: function () {
            v() && 10 > C && (C += 1,
                m && m.Y(y()),
                h())
        },
        lb: l,
        D: u,
        attachEvent: function (a, b) {
            "undefined" !== typeof D[a] && D[a].add(b)
        },
        detachEvent: function (a, b) {
            "undefined" !== typeof D[a] && D[a].remove(b)
        }
    }
}
; function Ta() {
    function a(a) {
        var b = document.createElement("canvas");
        b.width = a.c;
        b.height = a.b;
        var c = b.getContext("2d")
            , f = new Image;
        f.src = d;
        c.drawImage(f, a.x, a.y, a.c, a.b, 0, 0, a.c, a.b);
        return b
    }
    function b(a, b) {
        var c = new Image;
        c.src = a;
        c.onload = function () {
            var d = c.width * window.devicePixelRatio
                , e = c.height * window.devicePixelRatio
                , f = document.createElement("canvas");
            f.width = d;
            f.height = e;
            f.getContext("2d").drawImage(c, 0, 0, c.width, c.height, 0, 0, d, e);
            a = f.toDataURL();
            b(a)
        }
    }
    var c = null
        , d = null;
    return {
        load: function (a, k) {
            c = a;
            chrome.runtime.sendMessage({
                cmd: "content-script-rendie-com",
                id: "load_screenshot"
            }, function (a) {
                var c = ia();
                "firefox" == c.name && 82 > c.versionInt && 1 != window.devicePixelRatio ? b(a, function (a) {
                    d = a;
                    k(d)
                }) : (d = a,
                    k(d))
            })
        },
        mb: function (b) {
            return a(b).toDataURL()
        },
        Qa: a
    }
}
//保存相关
var Z = function () {
    function a(a) {
        chrome.downloads.download({
            url: a,
            filename: "Screenshot.png",
            saveAs: !0
        }, function (a) {
            a ? function e(a) {
                chrome.downloads.search({
                    id: a
                }, function (b) {
                    b[0] && ("in_progress" === b[0].state ? window.setTimeout(function () {
                        e(a)
                    }, 100) : c())
                })
            }(a) : c()
        })
    }
    function b(a) {
        function b(a) {
            e && e == a.id && a.state && "in_progress" != a.state.current && (URL.revokeObjectURL(d),
                browser.downloads.onChanged.removeListener(b),
                c())
        }
        a = Uint8Array.from(atob(a.split(",")[1]), function (a) {
            return a.charCodeAt(0)
        });
        var d = URL.createObjectURL(new Blob([a], {
            type: "image/png"
        })), e;
        browser.downloads.onChanged.addListener(b);
        browser.downloads.download({
            url: d,
            filename: "Screenshot.png"
        }).then(function (a) {
            e = a
        })
    }
    function c() {
        chrome.runtime.sendMessage({
            cmd: "content-script-rendie-com",
            id: "close_screenshot_window"
        }, function () { })
    }
    return {
        close: c,
        upload: function (a) {
            console.log("没做...", a)
            // a.dataUrl && ra.gb("upload_scrn_", a, function (a) {
            //     chrome.runtime.sendMessage({
            //         name: "upload_screenshot",
            //         id: a
            //     }, function () {
            //         c()
            //     })
            // })
        },
        save: function (c) {
            c && ("firefox" == ia().name ? b(c) : a(c))
        },
        Ma: function (a) {
            a = new ClipboardItem({
                "image/png": a
            });
            navigator.clipboard.write([a]).then(function () {
                c()
            }, function () { })
        },
        print: function (a) {
            if (a) {
                var b = document.createElement("iframe");
                b.style.visibility = "hidden";
                b.style.position = "fixed";
                b.style.width = "0";
                b.style.height = "0";
                b.style.right = "0";
                b.style.bottom = "0";
                b.onload = function () {
                    var c = b.contentWindow.document
                        , d = c.getElementsByTagName("body")[0];
                    d.style.margin = "0";
                    d.style.padding = "0";
                    d.style.textAlign = "center";
                    c = c.createElement("img");
                    c.onload = function () {
                        b.contentWindow.print()
                    }
                        ;
                    c.src = a;
                    P.qa(c);
                    d.appendChild(c)
                }
                    ;
                document.getElementsByTagName("body")[0].appendChild(b)
            }
        }
    }
}()
    , Ua = function () {
        function a() {
            $(window).on("mousewheel", function (a) {
                x.da() && (0 < a.deltaY ? c() : 0 > a.deltaY && d())
            });
            $(window).on("contextmenu", !1)
        }
        function b() {
            function a(a, b) {
                $(window).on("keydown", null, a, b)
            }
            function b(a, b) {
                $(window).on("keydown", null, a, b);
                $(document).on("keydown", "textarea", a, b)
            }
            var g = sa.Ca(window).id;
            b("esc", f);
            b(g + "+=", d);
            b(g + "+-", c);
            b(g + "+c", function () {
                l();
                return !1
            });
            b(g + "+s", function () {
                e();
                Z.save(B());
                return !1
            });
            b(g + "+x", function () {
                e();
                Z.close();
                return !1
            });
            b(g + "+d", function () {
                u();
                return !1
            });
            b(g + "+p", function () {
                e();
                Z.print(B());
                return !1
            });
            b(g + "+z", function () {
                L();
                return !1
            });
            a(g + "+a", function () {
                q.cb();
                return !1
            });
            a("up", function () {
                q.offset(0, -1);
                return !1
            });
            a("down", function () {
                q.offset(0, 1);
                return !1
            });
            a("left", function () {
                q.offset(-1, 0);
                return !1
            });
            a("right", function () {
                q.offset(1, 0);
                return !1
            });
            a("shift+up", function () {
                q.ca(0, -1);
                return !1
            });
            a("shift+down", function () {
                q.ca(0, 1);
                return !1
            });
            a("shift+left", function () {
                q.ca(-1, 0);
                return !1
            });
            a("shift+right", function () {
                q.ca(1, 0);
                return !1
            })
        }
        function c() {
            x.Oa();
            return !1
        }
        function d() {
            x.Wa();
            return !1
        }
        function f() {
            x.da() ? e() : Z.close()
        }
        function k(a) {
            switch (a) {
                case "close":
                    e();
                    Z.close();
                    break;
                case "upload":
                    u();
                    break;
                case "save":
                    e();
                    Z.save(B());
                    break;
                case "copy":
                    l();
                    break;
                case "print":
                    e();
                    Z.print(B());
                    break;
                case "search_google":
                    u("search_google");
                    break;
                case "share_twitter":
                    u("share_twitter");
                    break;
                case "share_facebook":
                    u("share_facebook");
                    break;
                case "share_vk":
                    u("share_vk");
                    break;
                case "share_pinterest":
                    u("share_pinterest");
                    break;
                case "pencil":
                case "line":
                case "arrow":
                case "rectangle":
                case "marker":
                case "text":
                    x.da() && x.Ra() === a ? e() : (x.hb(a),
                        r.fb(a, "active"),
                        r.sa(x.ba()),
                        q.lock());
                    break;
                case "undo":
                    L()
            }
        }
        function e() {
            x.ib();
            r.Ba();
            q.unlock()
        }
        function g(a) {
            var b = R.a
                , c = R.Ya;
            b && c && (c.clearRect(0, 0, b.width, b.height),
                x.fa(b, c, a),
                q.fa(b, c, a))
        }
        function y() {
            r.La()
        }
        function h() {
            r.Da()
        }
        function v(a) {
            a.rect.A() || (r.La(),
                r.ta(a.rect))
        }
        function E() {
            r.Da()
        }
        function L() {
            x.jb();
            x.da() || (r.Ba(),
                q.unlock())
        }
        function l() {
            e();
            var a = C();
            a && a.toBlob(function (a) {
                Z.Ma(a)
            }, "image/png")
        }
        function u(a) {
            e();
            Z.upload(H(a))
        }
        function H(a) {
            var b = {
                dataUrl: B(),
                size: q.I().size(),
                dpr: window.devicePixelRatio
            };
            a && (b.cmdAfterUpload = a);
            return b
        }
        function B() {
            var a = C();
            return null != a ? a.toDataURL() : null
        }
        function C() {
            if (q.I().A())
                return null;
            var a = D.Qa(q.I())
                , b = q.I()
                , c = a.getContext("2d");
            c.translate(-b.x, -b.y);
            x.fa(a, c, null);
            return a
        }
        function p() {
            $("#color").colpick({
                colorScheme: "dark",
                layout: "rgbhex",
                color: x.ba(),
                onShow: function (a) {
                    $("#color").colpickSetColor(x.ba(), !0);
                    var b = N(U(R, q.I()))
                        , c = Math.max(b.x - 3 - $(a).width(), 0);
                    b = Math.max(b.y - 3 - $(a).height(), 0);
                    $(a).css({
                        left: c + "px",
                        top: b + "px"
                    })
                },
                onSubmit: function (a, b, c, d) {
                    a = "#" + b;
                    r.sa(a);
                    x.R(a);
                    $(d).colpickHide()
                }
            });
            $(R.a).on("mousedown", function () {
                $("#color").colpickHide()
            });
            r.sa(x.ba())
        }
        function z(a) {
            if (m.complete)
                a && a();
            else
                $(m).on("load", function Na() {
                    $(m).off("load", Na);
                    a && a()
                })
        }
        function G(a) {
            var b = document.getElementById("content");
            b && (m = document.createElement("img"),
                m.src = a,
                P.qa(m),
                b.appendChild(m))
        }
        var m = null
            , D = null
            , q = null
            , r = null
            , x = null
            , R = null;
        return {
            oa: function () {
                r = Ga();
                r.attachEvent(r.D.C, k);
                D = Ta();
                D.load("xxxx", function (c) {
                    G(c);
                    z(function () {
                        R = new va(m);
                        x = Sa(R.a);
                        x.attachEvent(x.D.ha, h);
                        x.attachEvent(x.D.ga, y);
                        x.attachEvent(x.D.L, g);
                        q = wa(R.a);
                        q.attachEvent(q.D.ia, E);
                        q.attachEvent(q.D.N, v);
                        q.attachEvent(q.D.L, g);
                        q.clear();
                        p();
                        b();
                        a()
                    })
                })
            }
        }
    }();
jQuery(function () {
    Ua.oa()
});
