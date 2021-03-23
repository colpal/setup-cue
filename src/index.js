const os = require('os');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const semver = require('semver');

const getPlatform = (version) => {
  const platform = os.platform();
  if (semver.lte(version, '0.3.0-beta.5')) {
    switch (platform) {
      case 'linux': return 'Linux';
      case 'darwin': return 'Darwin';
      case 'win32': return 'Windows';
      default:
        core.setFailed('Unsupported Platform');
        return process.exit();
    }
  } else {
    switch (platform) {
      case 'linux': return 'linux';
      case 'darwin': return 'darwin';
      case 'win32': return 'windows';
      default:
        core.setFailed('Unsupported Platform');
        return process.exit();
    }
  }
};

const getArchitecture = (version) => {
  const arch = os.arch();
  if (semver.lte(version, '0.3.0-beta.5')) {
    switch (arch) {
      case 'x64': return 'x86_64';
      default:
        core.setFailed('Unsupported Architecture');
        return process.exit();
    }
  } else {
    switch (arch) {
      case 'x64': return 'amd64';
      default:
        core.setFailed('Unsupported Architecture');
        return process.exit();
    }
  }
};

const getArchiveExtension = () => {
  switch (os.platform()) {
    case 'win32': return 'zip';
    case 'linux':
    case 'darwin':
      return 'tar.gz';
    default:
      core.setFailed('Unsupported Platform');
      return process.exit();
  }
};

const getURL = (version) => {
  const platform = getPlatform(version);
  const arch = getArchitecture(version);
  const extension = getArchiveExtension();
  const prefix = semver.lte(version, '0.3.0-beta.5') ? '' : 'v';
  return `https://github.com/cuelang/cue/releases/download/v${version}/cue_${prefix}${version}_${platform}_${arch}.${extension}`;
};

const extract = (archive) => {
  switch (getArchiveExtension()) {
    case 'zip': return tc.extractZip(archive);
    case 'tar.gz': return tc.extractTar(archive);
    default:
      core.setFailed('Unsupported Archive Type');
      return process.exit();
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
