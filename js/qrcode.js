/* ==========================================================================
   Minimal QR Code generator (pure JavaScript)
   Supports: Alphanumeric & Byte modes, Versions 1-10, EC Level L, Mask 0-7 (best mask)
   Output: SVG inserted into a container
   ========================================================================== */

var QRCode = (function () {
  "use strict";

  // ---------- Galois Field 256 (primitive poly 0x11D) ----------
  var EXP = new Uint8Array(512);
  var LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (var i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  function mul(a, b) { if (a === 0 || b === 0) return 0; return EXP[LOG[a] + LOG[b]]; }

  // ---------- Reed-Solomon encoder ----------
  function rsPoly(genPoly, data) {
    var buf = new Uint8Array(data.length + genPoly.length - 1);
    buf.set(data);
    for (var i = 0; i < data.length; i++) {
      var coef = buf[i];
      if (coef !== 0) {
        var logCoef = LOG[coef];
        for (var j = 1; j < genPoly.length; j++) {
          buf[i + j] ^= EXP[(logCoef + LOG[genPoly[j]]) % 255];
        }
      }
    }
    var ecc = new Uint8Array(genPoly.length - 1);
    for (var i = 0; i < ecc.length; i++) ecc[i] = buf[data.length + i];
    return ecc;
  }
  function genPoly(n) {
    var g = new Uint8Array([1]);
    for (var i = 0; i < n; i++) {
      var gi = new Uint8Array(g.length + 1);
      gi.set(g);
      for (var j = 0; j < g.length; j++) {
        gi[j + 1] ^= EXP[(LOG[g[j]] + i) % 255];
      }
      g = gi;
    }
    return g;
  }

  // ---------- Capacity tables (EC Level L) ----------
  // [version][0]=total codewords, [1]=ec codewords per block, [2]=num groups, ...
  // Simplified: use known EC-L capacity (data codewords) per version 1..10
  var EC_L_DATA_CODEWORDS = [
    0, // 0 unused
    7, 14, 24, 36, 52, 72, 88, 110, 148, 178, 208 // v1..v10
  ];
  var EC_L_EC_CODEWORDS = [
    0,
    7, 10, 15, 20, 24, 30, 34, 44, 58, 64 // v1..v10
  ];

  // Alphanumeric mode table
  var ALPHA_NUM = {};
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:".split("").forEach(function (ch, i) { ALPHA_NUM[ch] = i; });

  // ---------- Encoding ----------
  function toBitStream(text, mode) {
    var bits = [];
    function put(n, len) { for (var i = len - 1; i >= 0; i--) bits.push((n >> i) & 1); }
    var isAlpha = /^[0-9A-Z $%*+\-.\/:]*$/.test(text);
    if (mode === "auto") mode = isAlpha ? "alphanumeric" : "byte";

    if (mode === "alphanumeric") {
      put(0x02, 4); // mode indicator
      var len = text.length;
      var ver = 1; // filled later; assume small for length bits
      var lenBits = 11; // v1-9 alphanumeric
      put(len, lenBits);
      for (var i = 0; i + 1 < len; i += 2) {
        put(ALPHA_NUM[text[i]] * 45 + ALPHA_NUM[text[i + 1]], 11);
      }
      if (len % 2) put(ALPHA_NUM[text[len - 1]], 6);
    } else {
      put(0x04, 4); // byte mode
      var len = text.length;
      put(len, 8); // v1-9 byte mode
      for (var i = 0; i < len; i++) put(text.charCodeAt(i), 8);
    }
    return bits;
  }

  function appendTerminatorAndPad(bits, totalDataBits) {
    while (bits.length < totalDataBits && bits.length < totalDataBits + 4) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);
    // pad with 11101100 00010001
    var pad1 = 0xEC, pad2 = 0x11;
    while (bits.length < totalDataBits) {
      bits.push.apply(bits, dec2bin(pad1, 8));
      if (bits.length < totalDataBits) bits.push.apply(bits, dec2bin(pad2, 8));
    }
    return bits.slice(0, totalDataBits);
  }
  function dec2bin(n, len) { var b = []; for (var i = len - 1; i >= 0; i--) b.push((n >> i) & 1); return b; }

  // ---------- Version selection ----------
  function getBestVersion(bits, mode) {
    for (var v = 1; v <= 10; v++) {
      var dataCw = EC_L_DATA_CODEWORDS[v];
      var totalBits = dataCw * 8;
      var needed = bits.length;
      // account mode+len already in bits; compare directly
      if (needed <= totalBits) return v;
    }
    return 10;
  }

  // ---------- Module matrix ----------
  function getAlignmentPositions(v) {
    if (v === 1) return [];
    var table = [
      [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
      [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
    ];
    return table[v] || [];
  }

  function drawFinder(mat, r, c) {
    for (var i = 0; i < 7; i++) {
      for (var j = 0; j < 7; j++) {
        var v =
          (i === 0 || i === 6 || j === 0 || j === 6) ? 1 :
          (i >= 2 && i <= 4 && j >= 2 && j <= 4) ? 1 : 0;
        mat[r + i][c + j] = v;
      }
    }
  }

  function drawAlignment(mat, r, c) {
    for (var i = -2; i <= 2; i++) {
      for (var j = -2; j <= 2; j++) {
        var v = (Math.abs(i) === 2 || Math.abs(j) === 2) ? 1 : 0;
        mat[r + i][c + j] = v;
      }
    }
  }

  function placeData(mat, version, dataBits) {
    var n = mat.length;
    var aligned = getAlignmentPositions(version);
    var reserved = new Uint8Array(n * n);
    function res(r, c) { if (r >= 0 && r < n && c >= 0 && c < n) reserved[r * n + c] = 1; }

    // finder patterns
    drawFinder(mat, 0, 0); drawFinder(mat, 0, n - 7); drawFinder(mat, n - 7, 0);
    for (var i = 0; i < n; i++) { res(0, i); res(n - 1, i); res(i, 0); res(i, n - 1); }
    // separators around finders
    for (var i = 0; i < 8; i++) { res(0, i); res(i, 0); res(0, n - 1 - i); res(n - 1 - i, 0); res(n - 1, i); res(i, n - 1); res(n - 1 - i, n - 1); res(n - 1, n - 1 - i); }
    drawFinder(mat, 0, 0); drawFinder(mat, 0, n - 7); drawFinder(mat, n - 7, 0);

    // alignment patterns
    aligned.forEach(function (r) {
      aligned.forEach(function (c) {
        if (r < 8 || c < 8 || r > n - 9 || c > n - 9) return;
        drawAlignment(mat, r - 2, c - 2);
        for (var dr = -4; dr <= 4; dr++) for (var dc = -4; dc <= 4; dc++) res(r + dr, c + dc);
      });
    });

    // timing patterns
    for (var i = 8; i < n - 8; i++) {
      if (reserved[i * n + 6] === undefined) { mat[6][i] = i % 2; res(6, i); }
      if (reserved[6 * n + i] === undefined) { mat[i][6] = i % 2; res(i, 6); }
    }

    // dark module
    mat[n - 8][8] = 1; res(n - 8, 8);

    // format info (mask 0 => data bits 000 + ec L => 01 -> 00011... placeholder; draw later)
    // reserve format areas around top-left finder
    for (var i = 0; i < 9; i++) { res(8, i); res(i, 8); res(8, n - 1 - i); res(n - 1 - i, 8); }
    res(8, n - 8); res(n - 8, 8);

    // version info area (v>=7) top-right / bottom-left reserved
    if (version >= 7) {
      for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 6; j++) {
          res(n - 1 - i, n - 9 + j); res(n - 9 + j, n - 1 - i);
        }
      }
    }

    // place data bits zigzag
    var bitIdx = 0;
    var dir = -1;
    var col = n - 1;
    for (var colPair = n - 1; colPair > 0; colPair -= 2) {
      if (colPair === 6) colPair = 5; // skip timing column
      var c = colPair;
      for (var i = 0; i < n; i++) {
        var r = dir === -1 ? n - 1 - i : i;
        [c, c - 1].forEach(function (cc) {
          if (reserved[r * n + cc]) return;
          if (bitIdx < dataBits.length) {
            mat[r][cc] = dataBits[bitIdx++];
          } else {
            mat[r][cc] = 0;
          }
          res(r, cc);
        });
      }
      dir = -dir;
    }
    return bitIdx;
  }

  function applyMask(mat, mask, n) {
    var out = [];
    for (var r = 0; r < n; r++) out[r] = mat[r].slice();
    var f = function (r, c) {
      switch (mask) {
        case 0: return (r + c) % 2 === 0;
        case 1: return r % 2 === 0;
        case 2: return c % 3 === 0;
        case 3: return (r + c) % 3 === 0;
        case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
        case 5: return (r * c) % 2 + (r * c) % 3 === 0;
        case 6: return ((r * c) % 2 + (r + c) % 3) % 2 === 0;
        case 7: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
      }
      return false;
    };
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (!reservedMask[r * n + c]) out[r][c] ^= f(r, c) ? 1 : 0;
    return out;
  }
  var reservedMask = new Uint8Array(0);
  function reserveMask(n, matReserved) { reservedMask = matReserved; }

  // penalty evaluation
  function penalty(mat, n) {
    var p = 0;
    // adjacent same color in rows/cols
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var runX = 1, runY = 1;
        while (c + runX < n && mat[r][c + runX] === mat[r][c]) runX++;
        while (r + runY < n && mat[r + runY][c] === mat[r][c]) runY++;
        if (runX >= 5) p += 3 + (runX - 5);
        if (runY >= 5) p += 3 + (runY - 5);
        c += runX - 1; r += runY - 1;
      }
    }
    // 2x2 blocks
    for (var r = 0; r < n - 1; r++) for (var c = 0; c < n - 1; c++) {
      var v = mat[r][c];
      if (v === mat[r + 1][c] && v === mat[r][c + 1] && v === mat[r + 1][c + 1]) p += 3;
    }
    // 1:1:3:1:1 pattern
    // (simplified skip)
    // dark module ratio
    var dark = 0;
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) dark += mat[r][c];
    var ratio = dark / (n * n);
    p += Math.abs(Math.floor(ratio * 100) - 50) * 10; // approx
    return p;
  }

  // ---------- Format / Version info ----------
  function formatBits(mask, ecLevel) {
    // ec L => 01, mask 3 bits => total 5 data bits + generator -> 15 bits
    var data = (0b01 << 3) | mask; // ec(2) + mask(3)
    var gen = 0x537;
    var d = data << 10;
    for (var i = 14; i >= 10; i--) {
      if ((d >> i) & 1) d ^= gen << (i - 10);
    }
    return (data << 10 | d) & 0x3FFF; // 15 bits? actually 15-bit format incl remainder -> use 15
  }
  function drawFormat(mat, n, format15, mask) {
    // 15 bits: bits 0..14
    var bits = [];
    for (var i = 14; i >= 0; i--) bits.push((format15 >> i) & 1);
    // placement around top-left finder
    var order = [
      [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],
      [7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
      [n-1,8],[n-2,8],[n-3,8],[n-4,8],[n-5,8],[n-6,8],[n-7,8],[n-8,8],
      [8,n-7],[8,n-6],[8,n-5],[8,n-4],[8,n-3],[8,n-2],[8,n-1]
    ];
    // above has duplicates conceptually; we place first 8 at row8 col0-7 skip col6
    // simpler: place 15 bits into standard format area
    var idx = 0;
    for (var i = 0; i < 9; i++) {
      if (i === 6) continue;
      if (idx < bits.length) { mat[8][i] = bits[idx++]; }
    }
    for (var i = 8; i >= 0; i--) {
      if (i === 6) continue;
      if (idx < bits.length) { mat[i][8] = bits[idx++]; }
    }
    // bottom-right / top-right
    for (var i = 0; i < 7; i++) {
      if (idx < bits.length) { mat[n - 1 - i][8] = bits[idx++]; }
    }
    for (var i = 0; i < 7; i++) {
      if (idx < bits.length) { mat[8][n - 1 - i] = bits[idx++]; }
    }
    if (idx < bits.length) mat[8][8] = bits[idx];
  }

  // ---------- Public encode ----------
  function encode(text, opts) {
    opts = opts || {};
    var type = opts.type || 4;
    var ecLevel = opts.ecLevel || 1; // 1=L
    var mode = opts.mode || "auto";
    var bits = toBitStream(text, mode);
    var version = getBestVersion(bits, mode);
    var dataCw = EC_L_DATA_CODEWORDS[version];
    var totalDataBits = dataCw * 8;
    var padded = appendTerminatorAndPad(bits.slice(), totalDataBits);
    var ecCount = EC_L_EC_CODEWORDS[version];

    // split into codewords
    var codewords = [];
    for (var i = 0; i < padded.length; i += 8) {
      var cw = 0;
      for (var j = 0; j < 8; j++) cw = (cw << 1) | padded[i + j];
      codewords.push(cw);
    }

    // RS ecc
    var g = genPoly(ecCount);
    var ecc = rsPoly(g, new Uint8Array(codewords));
    var full = codewords.slice();
    for (var i = 0; i < ecc.length; i++) full.push(ecc[i]);

    var fullBits = [];
    full.forEach(function (cw) {
      for (var j = 7; j >= 0; j--) fullBits.push((cw >> j) & 1);
    });

    var n = 17 + version * 4;
    var mat = [];
    for (var i = 0; i < n; i++) { mat[i] = []; for (var j = 0; j < n; j++) mat[i][j] = null; }
    var reserved = new Uint8Array(n * n);

    function res(r, c) { if (r >= 0 && r < n && c >= 0 && c < n) reserved[r * n + c] = 1; }

    drawFinder(mat, 0, 0); drawFinder(mat, 0, n - 7); drawFinder(mat, n - 7, 0);
    for (var i = 0; i < n; i++) { res(0, i); res(n - 1, i); res(i, 0); res(i, n - 1); }
    // separators
    var sep = [[0,0],[0,n-7],[n-7,0]];
    sep.forEach(function (p) {
      for (var dr = -1; dr <= 7; dr++) for (var dc = -1; dc <= 7; dc++) {
        var r = p[0] + dr, c = p[1] + dc;
        if (r >= 0 && r < n && c >= 0 && c < n && (dr === -1 || dr === 7 || dc === -1 || dc === 7)) res(r, c);
      }
    });

    var aligned = getAlignmentPositions(version);
    aligned.forEach(function (r) {
      aligned.forEach(function (c) {
        if (r < 8 || c < 8 || r > n - 9 || c > n - 9) return;
        drawAlignment(mat, r - 2, c - 2);
        for (var dr = -4; dr <= 4; dr++) for (var dc = -4; dc <= 4; dc++) res(r + dr, c + dc);
      });
    });

    for (var i = 8; i < n - 8; i++) {
      if (!reserved[6 * n + i]) { mat[6][i] = i % 2; res(6, i); }
      if (!reserved[i * n + 6]) { mat[i][6] = i % 2; res(i, 6); }
    }
    mat[n - 8][8] = 1; res(n - 8, 8);

    for (var i = 0; i < 9; i++) { res(8, i); res(i, 8); res(8, n - 1 - i); res(n - 1 - i, 8); }
    res(8, n - 8); res(n - 8, 8);

    if (version >= 7) {
      for (var i = 0; i < 3; i++) for (var j = 0; j < 6; j++) {
        res(n - 1 - i, n - 9 + j); res(n - 9 + j, n - 1 - i);
      }
    }

    // place data
    var bitIdx = 0, dir = -1;
    for (var cp = n - 1; cp > 0; cp -= 2) {
      if (cp === 6) cp = 5;
      for (var i = 0; i < n; i++) {
        var r = dir === -1 ? n - 1 - i : i;
        [cp, cp - 1].forEach(function (cc) {
          if (reserved[r * n + cc]) return;
          mat[r][cc] = bitIdx < fullBits.length ? fullBits[bitIdx++] : 0;
          res(r, cc);
        });
      }
      dir = -dir;
    }

    // choose best mask
    var best = null;
    for (var m = 0; m < 8; m++) {
      reserveMask(n, reserved);
      var cand = applyMask(mat, m, n);
      var p = penalty(cand, n);
      if (best === null || p < best.p) best = { p: p, m: m, mat: cand };
    }
    mat = best.mat;

    var f15 = formatBits(best.m, ecLevel);
    drawFormat(mat, n, f15, best.m);

    if (version >= 7) {
      // version info
      var verInfo = version; // simplified: encode version polynomial approx
      var v = version << 12;
      var genV = 0x1F25;
      var d = v << 6;
      for (var i = 17; i >= 12; i--) { if ((d >> i) & 1) d ^= genV << (i - 12); }
      var vBits = (v << 6 | d) & 0x3FFFF; // 18 bits
      var vb = [];
      for (var i = 17; i >= 0; i--) vb.push((vBits >> i) & 1);
      var idx = 0;
      for (var i = 0; i < 6; i++) for (var j = 0; j < 3; j++) {
        var r = n - 1 - i, c = n - 9 + j;
        if (idx < vb.length) mat[r][c] = vb[idx++];
      }
      idx = 0;
      for (var i = 0; i < 6; i++) for (var j = 0; j < 3; j++) {
        var r = n - 9 + i, c = n - 1 - j;
        if (idx < vb.length) mat[r][c] = vb[idx++];
      }
    }

    return { moduleCount: n, modules: mat };
  }

  return { encode: encode };
})();
