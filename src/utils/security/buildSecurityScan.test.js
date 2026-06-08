import { buildSecurityScan, importExternalSecurityScan } from './buildSecurityScan';

const secretValue = 'sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890';

function buildFixtureScan() {
  return buildSecurityScan({
    repoData: {
      repoInfo: { name: 'security-fixture', url: 'owner/security-fixture' },
      fileTree: [
        'src/config.js',
        'src/App.jsx',
        'api/user.js',
        'api/proxy.js',
        'api/exec.js',
        'server.js',
        'Dockerfile',
        '.github/workflows/ci.yml',
        'README.md',
        'package.json'
      ],
      packageJson: {
        dependencies: { lodash: '4.17.20' }
      },
      importantFiles: [
        {
          path: 'src/config.js',
          content: `const apiKey = "${secretValue}";\nconst local = "http://localhost:3001";`
        },
        {
          path: 'src/App.jsx',
          content: 'function App({ html }) { return <div dangerouslySetInnerHTML={{ __html: html }} />; }'
        },
        {
          path: 'api/user.js',
          content: 'db.query("SELECT * FROM users WHERE id=" + req.query.id);\nconst hash = crypto.createHash("md5");'
        },
        {
          path: 'api/proxy.js',
          content: 'const target = req.query.url;\nawait fetch(target);'
        },
        {
          path: 'api/exec.js',
          content: 'const cmd = req.query.cmd;\nchild_process.exec(cmd);'
        },
        {
          path: 'server.js',
          content: 'app.use(cors());\neval(req.body.code);\nconst f = new Function(req.body.src);'
        },
        {
          path: 'Dockerfile',
          content: 'FROM node:20\nCMD ["node", "server.js"]'
        },
        {
          path: '.github/workflows/ci.yml',
          content: 'permissions: write-all\nsteps:\n  - uses: actions/checkout@v4'
        },
        {
          path: 'README.md',
          content: 'Example only: apiKey = "sk-proj-your-example-placeholder-value"'
        }
      ]
    },
    codeAnalysis: { files: [], security: [] },
    dependencyFindings: [{
      id: 'dependency-vulnerability:lodash:4.17.20:CVE-2021-23337',
      title: 'Known vulnerability in lodash@4.17.20',
      severity: 'high',
      confidence: 'high',
      category: 'vulnerable-dependency',
      source: 'dependency-vulnerability',
      sourceTool: 'OSV dependency advisory',
      ruleId: 'sca.osv.vulnerability',
      file: 'package.json',
      redactedEvidence: 'lodash@4.17.20 affected by CVE-2021-23337',
      impact: 'Dependency has a known vulnerability.',
      recommendation: 'Upgrade lodash.'
    }],
    dependencyScan: {
      available: true,
      components: [{ name: 'lodash', version: '4.17.20', ecosystem: 'npm', purl: 'pkg:npm/lodash@4.17.20', source: 'package.json' }]
    }
  });
}

describe('buildSecurityScan', () => {
  test('detects deterministic source, secret, dependency, and posture findings with metadata', () => {
    const scan = buildFixtureScan();
    const rules = new Set(scan.findings.map(finding => finding.ruleId));

    expect(scan.schemaVersion).toBe(2);
    expect(Array.from(rules)).toEqual(expect.arrayContaining([
      'secret.provider-token',
      'js.react.dangerously-set-html',
      'sql.dynamic-query',
      'crypto.weak-hash',
      'web.ssrf.untrusted-url',
      'os.command-injection.untrusted-input',
      'web.cors.wildcard',
      'js.eval.unsafe',
      'js.function-constructor.unsafe',
      'supply-chain.docker.root-user',
      'supply-chain.github-actions.unpinned',
      'supply-chain.github-actions.broad-permissions',
      'sca.osv.vulnerability'
    ]));

    scan.findings.forEach(finding => {
      expect(finding.id).toBeTruthy();
      expect(finding.fingerprint).toBeTruthy();
      expect(finding.sourceTool).toBeTruthy();
      expect(Array.isArray(finding.locations)).toBe(true);
      expect(Array.isArray(finding.whyMatched)).toBe(true);
      expect(Array.isArray(finding.falsePositiveNotes)).toBe(true);
    });
  });

  test('redacts secrets across findings and export payloads', () => {
    const scan = buildFixtureScan();
    const text = JSON.stringify(scan);

    expect(text).not.toContain(secretValue);
    expect(text).toContain('redacted');
    expect(scan.findings.some(finding => finding.source === 'local-secret-scanner')).toBe(true);
    expect(JSON.stringify(scan.sections.exports.sarif)).not.toContain(secretValue);
    expect(JSON.stringify(scan.sections.exports.cyclonedx)).not.toContain(secretValue);
  });

  test('filters documentation and placeholder secret examples', () => {
    const scan = buildFixtureScan();
    const readmeFindings = scan.findings.filter(finding => finding.file === 'README.md');

    expect(readmeFindings).toHaveLength(0);
  });

  test('builds SARIF and CycloneDX-compatible exports', () => {
    const scan = buildFixtureScan();

    expect(scan.sections.exports.sarif.version).toBe('2.1.0');
    expect(scan.sections.exports.sarif.runs[0].results.length).toBeGreaterThan(0);
    expect(scan.sections.exports.cyclonedx.bomFormat).toBe('CycloneDX');
    expect(scan.sections.exports.cyclonedx.components[0].purl).toBe('pkg:npm/lodash@4.17.20');
  });
});

describe('importExternalSecurityScan', () => {
  test('normalizes SARIF findings into CodeAtlas findings', () => {
    const imported = importExternalSecurityScan({
      version: '2.1.0',
      runs: [{
        tool: {
          driver: {
            name: 'Semgrep',
            rules: [{
              id: 'javascript.lang.security.audit.detect-eval-with-expression',
              shortDescription: { text: 'Detected eval with expression' },
              help: { text: 'Avoid eval and use a safer parser or dispatch table.' },
              properties: { tags: ['CWE-95', 'A03 Injection'], precision: 'high' }
            }]
          }
        },
        results: [{
          ruleId: 'javascript.lang.security.audit.detect-eval-with-expression',
          level: 'error',
          message: { text: 'Detected eval with expression' },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: 'src/app.js' },
              region: { startLine: 12 }
            }
          }],
          partialFingerprints: { primaryLocationLineHash: 'abc123' }
        }]
      }]
    });

    expect(imported.available).toBe(true);
    expect(imported.findings).toHaveLength(1);
    expect(imported.findings[0]).toMatchObject({
      source: 'external-sarif',
      sourceTool: 'Semgrep',
      file: 'src/app.js',
      line: 12,
      confidence: 'high',
      severity: 'high'
    });
    expect(imported.findings[0].cwe).toContain('CWE-95');
  });
});
