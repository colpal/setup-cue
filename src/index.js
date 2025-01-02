const os = require('os');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const semver = require('semver');

const capitalize = (s) => s.at(0).toUpperCase() + s.slice(1);

const fail = (message) => {
  core.setFailed(message);
  process.exit();
};

const getArchiveExtension = () => {
  switch (os.platform()) {
    case 'win32': return 'zip';
    case 'linux':
    case 'darwin':
      return 'tar.gz';
    default: return fail('Unsupported Platform');
  }
};

const getSystem = (version) => {
  const p = os.platform();
  const validPlatforms = new Set(['linux', 'win32', 'darwin']);
  if (!validPlatforms.has(p)) return fail('Unsupported Platform');

  const a = os.arch();
  const validArchitectures = new Set(['x64', 'arm64']);
  if (!validArchitectures.has(a)) return fail('Unsupported Architecture');

  if (semver.lt(version, '0.4.1-beta.6') && a === 'arm64' && p !== 'linux') {
    return fail('arm64 not supported on macOS/Windows before v0.4.1-beta.6');
  }

  if (semver.lt(version, '0.3.0-beta.6')) {
    return [capitalize(p), a === 'x64' ? 'x86_64' : a];
  }
  return [p, a === 'x64' ? 'amd64' : a];
};

const getURL = (version) => {
  const [platform, arch] = getSystem(version);
  const extension = getArchiveExtension();
  const prefix = semver.lte(version, '0.3.0-beta.5') ? '' : 'v';
  return `https://github.com/cue-lang/cue/releases/download/v${version}/cue_${prefix}${version}_${platform}_${arch}.${extension}`;
};

const extract = (archive) => {
  switch (getArchiveExtension()) {
    case 'zip': return tc.extractZip(archive);
    case 'tar.gz': return tc.extractTar(archive);
    default: return fail('Unsupported Archive Type');
  }
};

const cache = (fn) => async (version) => {
  const cached = tc.find('cue', version);
  if (cached !== '') return cached;
  const folder = await fn(version);
  return tc.cacheDir(folder, 'cue', version);
};

const getTool = cache(async (version) => {
  const url = getURL(version);
  const archive = await tc.downloadTool(url);
  return extract(archive);
});

(async () => {
  const version = core.getInput('cue-version', { required: true });
  const tool = await getTool(version);
  core.addPath(tool);
})().catch(core.setFailed);
