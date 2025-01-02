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
  const arch = os.arch();
  const platform = os.platform();

  if (semver.lt(version, '0.3.0-beta.6')) {
    switch (arch) {
      case 'x64':
        switch (platform) {
          case 'linux': return ['Linux', 'x86_64'];
          case 'darwin': return ['Darwin', 'x86_64'];
          case 'win32': return ['Windows', 'x86_64'];
          default: return fail('Unsupported Platform');
        }
      case 'arm64':
        switch (platform) {
          case 'linux': return ['Linux', 'arm64'];
          default: return fail('arm64 not supported on macOS/Windows before v0.4.1-beta.6');
        }
      default: return fail('Unsupported Architecture');
    }
  } else if (semver.lt(version, '0.4.1-beta.6')) {
    switch (arch) {
      case 'x64':
        switch (platform) {
          case 'linux': return ['linux', 'amd64'];
          case 'win32': return ['windows', 'amd64'];
          case 'darwin': return ['darwin', 'amd64'];
          default: return fail('Unsupported Platform');
        }
      case 'arm64':
        switch (platform) {
          case 'linux': return ['linux', 'arm64'];
          default: return fail('arm64 not supported on macOS/Windows before v0.4.1-beta.6');
        }
      default: return fail('Unsupported Architecture');
    }
  } else {
    const validPlatforms = new Set(['linux', 'windows', 'darwin']);
    const p = (platform === 'win32') ? 'windows' : platform;
    if (!validPlatforms.has(p)) return fail('Unsupported Platform');

    const validArchitectures = new Set(['amd64', 'arm64']);
    const a = (arch === 'x64') ? 'amd64' : arch;
    if (!validArchitectures.has(a)) return fail('Unsupported Architecture');

    return [p, a];
  }
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
    default: fail('Unsupported Archive Type');
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
