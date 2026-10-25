/**
 * JM GameCore · CP10 Mesh Compiler — authored source to GPU-ready buffers.
 * Authority: Theodore Benjamin Scott / JMISJUSTME
 * Operation gate: JMOP-2ecbf4d767fce914f43bd0b6
 *
 * Independent, side-effect-free compiler; no scene, renderer or DOM dependency.
 * CP10 faces are zero-based triangle indices. Uint16 means max index 65,535.
 */
export class JMMeshCompiler {
  static compile(sourceCode) {
    if (typeof sourceCode !== 'string' || !sourceCode.trim()) {
      throw new TypeError('JMMeshCompiler: non-empty source string required');
    }

    const vertices = [];
    const faces = [];
    let color = 0x38bdf8;
    const deform = { type: 'none', amp: 0.15, freq: 2.0 };

    const requireFinite = (token, lineNo, field) => {
      if (token === undefined || token === '' || !Number.isFinite(Number(token))) {
        throw new SyntaxError('JM mesh line ' + lineNo + ': invalid ' + field);
      }
      const n = Number(token);
      if (Math.abs(n) > 3.4028234663852886e38) {
        throw new RangeError('JM mesh line ' + lineNo + ': ' + field + ' exceeds Float32 range');
      }
      return n;
    };

    sourceCode.split(/\r?\n/).forEach((raw, index) => {
      const lineNo = index + 1;
      const line = raw.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) return;
      const t = line.split(/\s+/);
      switch (t[0].toLowerCase()) {
        case 'v': {
          if (t.length !== 4) throw new SyntaxError('JM mesh line ' + lineNo + ': v expects x y z');
          vertices.push(
            requireFinite(t[1], lineNo, 'x'),
            requireFinite(t[2], lineNo, 'y'),
            requireFinite(t[3], lineNo, 'z')
          );
          break;
        }
        case 'f': {
          if (t.length !== 4 || !t.slice(1).every(s => /^(0|[1-9]\d*)$/.test(s))) {
            throw new SyntaxError('JM mesh line ' + lineNo + ': f expects 3 zero-based integer indices');
          }
          const f = t.slice(1).map(Number);
          if (!f.every(Number.isSafeInteger) || new Set(f).size !== 3) {
            throw new SyntaxError('JM mesh line ' + lineNo + ': invalid or degenerate face indices');
          }
          faces.push({ values: f, lineNo });
          break;
        }
        case 'color': {
          if (t.length !== 2) throw new SyntaxError('JM mesh line ' + lineNo + ': color expects #RRGGBB');
          const match = /^(?:#|0x)?([a-f\d]{6})$/i.exec(t[1]);
          if (!match) throw new SyntaxError('JM mesh line ' + lineNo + ': invalid six-digit color');
          color = Number.parseInt(match[1], 16);
          break;
        }
        case 'deform': {
          if (t.length < 2 || !['none', 'wave', 'pulse'].includes(t[1].toLowerCase())) {
            throw new SyntaxError('JM mesh line ' + lineNo + ': deform must be none, wave or pulse');
          }
          deform.type = t[1].toLowerCase();
          const seen = new Set();
          for (const arg of t.slice(2)) {
            const m = /^(amp|freq)=(.+)$/.exec(arg);
            if (!m || seen.has(m[1])) throw new SyntaxError('JM mesh line ' + lineNo + ': invalid deform argument');
            seen.add(m[1]);
            deform[m[1]] = requireFinite(m[2], lineNo, m[1]);
          }
          break;
        }
        default:
          // Ignore mesh wrappers and foreign extension lines; do not interpret other organs.
          break;
      }
    });

    const vertexCount = vertices.length / 3;
    if (!vertexCount || !faces.length) throw new SyntaxError('JM mesh: vertices and triangle faces required');
    if (vertexCount > 65_536) throw new RangeError('JM mesh: Uint16 index limit exceeded');
    const indices = [];
    for (const { values, lineNo } of faces) {
      if (values.some(n => n >= vertexCount)) {
        throw new RangeError('JM mesh line ' + lineNo + ': face index outside zero-based vertex range');
      }
      indices.push(...values);
    }
    return {
      vertexBuffer: new Float32Array(vertices),
      indexBuffer: new Uint16Array(indices),
      color,
      deform
    };
  }
}
