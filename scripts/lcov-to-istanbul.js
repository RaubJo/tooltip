#!/usr/bin/env node

// Converts bun's lcov.info to Istanbul coverage-final.json for `fallow health --coverage`.
// Uses the TypeScript AST to recover per-function coverage from line-hit data,
// since bun's lcov reporter omits FN:/FNDA: lines.
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import ts from "typescript"

const lcovPath = process.argv[2] ?? "coverage/lcov.info"
const outPath = process.argv[3] ?? "coverage/coverage-final.json"
const cwd = process.cwd()

// ── Parse lcov ─────────────────────────────────────────────────────────────
// Bun emits one block per test file, so the same SF: may appear many times.
// Aggregate DA: counts by summing across all blocks.

const lineHits = new Map() // absPath → Map<lineNo, sumCount>

let currentPath = null
for (const raw of readFileSync(lcovPath, "utf-8").split("\n")) {
    const line = raw.trim()
    if (line.startsWith("SF:")) {
        currentPath = resolve(cwd, line.slice(3))
        if (!lineHits.has(currentPath)) lineHits.set(currentPath, new Map())
    } else if (line.startsWith("DA:") && currentPath) {
        const [ln, count] = line.slice(3).split(",")
        const map = lineHits.get(currentPath)
        map.set(+ln, (map.get(+ln) ?? 0) + +count)
    } else if (line === "end_of_record") {
        currentPath = null
    }
}

// ── TypeScript AST helpers ─────────────────────────────────────────────────

const FUNCTION_LIKE_KINDS = new Set([
    ts.SyntaxKind.FunctionDeclaration,
    ts.SyntaxKind.FunctionExpression,
    ts.SyntaxKind.ArrowFunction,
    ts.SyntaxKind.MethodDeclaration,
    ts.SyntaxKind.Constructor,
    ts.SyntaxKind.GetAccessor,
    ts.SyntaxKind.SetAccessor,
])

function isFunctionLike(node) {
    return FUNCTION_LIKE_KINDS.has(node.kind)
}

/** Name for a function-like node with no usable `.name` (anonymous
 *  expression/arrow): the enclosing `const x = ...` binding if there is
 *  one, else a kind-specific placeholder. */
function anonymousFnName(node, sf) {
    const p = node.parent
    if (p && ts.isVariableDeclaration(p) && p.name) return p.name.getText(sf)
    return ts.isArrowFunction(node) ? "<arrow>" : "<anonymous>"
}

function fnName(node, sf) {
    if (ts.isConstructorDeclaration(node)) return "constructor"
    if (ts.isGetAccessor(node)) return `get ${node.name.getText(sf)}`
    if (ts.isSetAccessor(node)) return `set ${node.name.getText(sf)}`
    if (node.name) return node.name.getText(sf)
    return anonymousFnName(node, sf)
}

/** Return the 1-indexed line of the first statement in the function body,
 *  falling back to the declaration line itself. */
function bodyStartLine(node, sf) {
    const body = node.body
    if (!body) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart())
        return line + 1
    }
    if (ts.isBlock(body) && body.statements.length > 0) {
        const { line } = sf.getLineAndCharacterOfPosition(body.statements[0].getStart())
        return line + 1
    }
    const { line } = sf.getLineAndCharacterOfPosition(body.getStart())
    return line + 1
}

function extractFunctions(filePath) {
    if (!existsSync(filePath)) return []
    const source = readFileSync(filePath, "utf-8")
    const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true)
    const fns = []
    function visit(node) {
        if (isFunctionLike(node)) {
            const declLine = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1
            fns.push({ name: fnName(node, sf), declLine, bodyLine: bodyStartLine(node, sf) })
        }
        ts.forEachChild(node, visit)
    }
    visit(sf)
    return fns
}

// ── Build Istanbul JSON ────────────────────────────────────────────────────

const coverage = {}

for (const [filePath, lineMap] of lineHits) {
    const fns = extractFunctions(filePath)

    const statementMap = {}
    const s = {}
    let si = 0
    for (const [lineNo, count] of lineMap) {
        statementMap[si] = { start: { line: lineNo, column: 0 }, end: { line: lineNo, column: 9999 } }
        s[si] = count
        si++
    }

    const fnMap = {}
    const f = {}
    for (let i = 0; i < fns.length; i++) {
        const { name, declLine, bodyLine } = fns[i]
        fnMap[i] = {
            name,
            decl: { start: { line: declLine, column: 0 }, end: { line: declLine, column: 0 } },
            loc: { start: { line: declLine, column: 0 }, end: { line: declLine, column: 0 } },
            line: declLine,
        }
        // A function is considered invoked if its body start line was hit.
        // Fall back to checking nearby lines (±2) to handle brace-on-same-line patterns.
        let hits = lineMap.get(bodyLine) ?? 0
        if (hits === 0) {
            for (let d = 1; d <= 2; d++) {
                hits = (lineMap.get(bodyLine - d) ?? 0) + (lineMap.get(bodyLine + d) ?? 0)
                if (hits > 0) break
            }
        }
        f[i] = hits
    }

    coverage[filePath] = { path: filePath, statementMap, fnMap, branchMap: {}, s, f, b: {} }
}

writeFileSync(outPath, JSON.stringify(coverage))
const fileCount = Object.keys(coverage).length
const fnTotal = Object.values(coverage).reduce((n, c) => n + Object.keys(c.fnMap).length, 0)
console.log(`${outPath}: ${fileCount} files, ${fnTotal} functions mapped`)
