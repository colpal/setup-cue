const os = require('os');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');

const getPlatform = () => {
  switch (os.platform()) {
    case 'linux': return 'Linux';
    case 'darwin': return 'Darwin';
    case 'win32': return 'Windows';
    default:
      core.setFailed('Unsupported Platform');
      return process.exit();
  }
};

const getArchitecture = () => {
  switch (os.arch()) {
    case 'x64': return 'x86_64';
    default:
      core.setFailed('Unsupported Architecture');
      return process.exit();
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
  const platform = getPlatform();
  const arch = getArchitecture();
  const extension = getArchiveExtension();
  return `https://github.com/cuelang/cue/releases/download/v${version}/cue_${version}_${platform}_${arch}.${extension}`;
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

(async () => {
  const version = core.getInput('cue-version', { required: true });
  const url = getURL(version);
  core.info(`Downloading "${url}"`);
  const archive = await tc.downloadTool(url);
  const folder = await extract(archive);
  const cache = await tc.cacheDir(folder, 'cue', version);
  core.addPath(cache);
})().catch(core.setFailed);
