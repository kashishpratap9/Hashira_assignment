function gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
}

function lcm(a, b) {
    if (a === 0n || b === 0n) return 0n;
    return (a * b) / gcd(a, b);
}

function decodeBigInt(baseStr, valStr) {
    const base = BigInt(parseInt(baseStr, 10));
    if (isNaN(parseInt(baseStr, 10)) || base < 2n || base > 36n)
        throw new Error(`Invalid base: ${baseStr}.`);

    let res = 0n, pow = 1n;
    for (let i = valStr.length - 1; i >= 0; --i) {
        const ch = valStr[i];
        let digit;

        if (ch >= '0' && ch <= '9') digit = BigInt(parseInt(ch, 10));
        else if (ch >= 'A' && ch <= 'Z') digit = BigInt(ch.charCodeAt(0) - 65 + 10);
        else if (ch >= 'a' && ch <= 'z') digit = BigInt(ch.charCodeAt(0) - 97 + 10);
        else throw new Error(`Invalid digit '${ch}'.`);

        if (digit >= base) throw new Error(`Digit '${ch}' out of base ${baseStr} range.`);

        res += digit * pow;
        pow *= base;
    }
    return res;
}

function getSecret(shares) {
    let commonDen = 1n;
    const n = shares.length;
    const fractions = [];

    for (let i = 0; i < n; ++i) {
        const [x, y] = shares[i];
        let num = 1n, den = 1n;

        for (let j = 0; j < n; ++j) {
            if (j === i) continue;
            const [xj] = shares[j];
            if (x === xj) throw new Error(`Duplicate x: ${x}`);
            num *= -xj;
            den *= x - xj;
        }

        fractions.push({ num: y * num, den });
        commonDen = lcm(commonDen, den);
    }

    let totalNum = 0n;
    for (const frac of fractions) {
        const scale = commonDen / frac.den;
        totalNum += frac.num * scale;
    }

    if (commonDen === 0n) throw new Error("Zero denominator.");
    if (totalNum % commonDen !== 0n) {
        throw new Error(`Secret not exact: ${totalNum}/${commonDen}`);
    }

    return totalNum / commonDen;
}

function solve(input) {
    const keys = input.keys || {};
    const n = keys.n, k = keys.k;

    if (typeof n !== 'number' || typeof k !== 'number' || k <= 0)
        throw new Error("Missing or invalid 'n' and 'k'.");

    const points = [];

    for (const key in input) {
        if (key === 'keys') continue;
        try {
            const x = BigInt(key);
            const data = input[key];
            const base = data.base, val = data.value;

            if (typeof base !== 'string' || typeof val !== 'string') continue;

            const y = decodeBigInt(base, val);
            points.push([x, y]);
        } catch (e) {
            console.warn(`Invalid share '${key}': ${e.message}`);
        }
    }

    if (points.length < k)
        throw new Error(`Only ${points.length} valid shares, need ${k}.`);

    const countMap = new Map();
    const combs = getComb(points, k);

    for (const group of combs) {
        try {
            const sec = getSecret(group);
            countMap.set(sec, (countMap.get(sec) || 0) + 1);
        } catch (e) {
            continue;
        }
    }

    let majorSecret = null, max = 0;
    for (const [sec, count] of countMap.entries()) {
        if (count > max) {
            max = count;
            majorSecret = sec;
        }
    }

    if (majorSecret === null) {
        throw new Error("No majority secret found.");
    }

    return majorSecret;
}

(function () {
    const inputs = [
        `{
            "keys": { "n": 4, "k": 3 },
            "1": { "base": "10", "value": "4" },
            "2": { "base": "2", "value": "111" },
            "3": { "base": "10", "value": "12" },
            "6": { "base": "4", "value": "213" }
        }`,
        `{
            "keys": { "n": 3, "k": 2 },
            "10": { "base": "10", "value": "100" },
            "20": { "base": "10", "value": "200" },
            "30": { "base": "10", "value": "300" }
        }`,
        `{
            "keys": { "n": 10, "k": 7 },
            "1": { "base": "6", "value": "13444211440455345511" },
            "2": { "base": "15", "value": "aed7015a346d63" },
            "3": { "base": "15", "value": "6aeeb69631c227c" },
            "4": { "base": "16", "value": "e1b5e05623d881f" },
             "5": { "base": "8", "value": "316034514573652620673" },
            "6": { "base": "3", "value": "2122212201122002221120200210011020220200" },
            "7": { "base": "3", "value": "20120221122211000100210021102001201112121" },
            "8": { "base": "6", "value": "20220554335330240002224253" },
            "9": { "base": "12", "value": "45153788322a1255483" },
            "10": { "base": "7", "value": "1101613130313526312514143" }
        }`
    ];

    const names = ["testcase1.json", "testcase2.json", "testcase3.json"];

    inputs.forEach((data, i) => {
        console.log(`${names[i]} `);
        try {
            const parsed = JSON.parse(data);
            const secret = solve(parsed);
            console.log(`Secret: ${secret}`);
        } catch (e) {
            console.error(`Error: ${e.message}`);
        }
    
    });
})();
